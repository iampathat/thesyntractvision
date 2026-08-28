from dataclasses import replace

import pytest

from qcds_fabric import (
    ExactOracle,
    FabricLayer,
    OracleChallengeSuite,
    OracleEvolutionConfig,
    OracleFailureObservation,
    OracleGap,
    OracleGapDiscoveryConfig,
    OracleGenesisError,
    OracleStack,
    PairwiseSemanticRuleGenesisGenerator,
    ProblemQuery,
    SemanticClaim,
    SemanticProblemFrame,
    SemanticRuleOracle,
    StatevectorGroverSubstrate,
    challenge_case_from_problem,
    compile_problem_frame,
    discover_oracle_gaps,
    extract_problem_rule_population,
    run_oracle_genesis_cycle,
)
from qcds_fabric.oracle_genesis import DiscoveredGapProposalGenerator


def scene_frame(color="red", *, mission_id="scene"):
    return SemanticProblemFrame(
        mission_id=mission_id,
        raw_text="structured scene",
        queries=(
            ProblemQuery("car-color", "car", "color", ("red", "blue")),
            ProblemQuery("driver", "driver", "identity", ("alice", "bob")),
        ),
        claims=(SemanticClaim("car", "color", color, f"camera-{color}", 0.95),),
        analyzer_id="external:test",
    )


def external_only_config(**overrides):
    values = {
        "include_contradiction_resolution": False,
        "include_null_influence": False,
    }
    values.update(overrides)
    return OracleGapDiscoveryConfig(**values)


def challenge_suite_for_scene():
    red = compile_problem_frame(scene_frame("red", mission_id="red-case"))
    blue = compile_problem_frame(scene_frame("blue", mission_id="blue-case"))
    selection = challenge_case_from_problem(
        red,
        population_oracle_ids=(),
        expected_assignments={"car-color": "red", "driver": "alice"},
        case_id="red-implies-alice",
        role="selection",
    )
    holdout = challenge_case_from_problem(
        blue,
        population_oracle_ids=(),
        expected_assignments={"car-color": "blue", "driver": "bob"},
        case_id="blue-implies-bob",
        role="holdout",
    )
    return OracleChallengeSuite("scene-generalization", (selection, holdout))


def driver_failure():
    return OracleFailureObservation(
        "driver-wrong",
        "prediction_failure",
        query_ids=("driver",),
        severity=1.0,
        description="driver prediction failed external validation",
    )


def test_failure_observation_is_structurally_target_blind():
    observation = driver_failure()
    assert observation.target_visible_to_discovery is False
    assert not hasattr(observation, "expected_value")
    assert not hasattr(observation, "target_distribution")


def test_failure_observation_rejects_target_visibility():
    with pytest.raises(OracleGenesisError, match="may not receive target"):
        OracleFailureObservation(
            "leak",
            "prediction_failure",
            query_ids=("driver",),
            target_visible_to_discovery=True,
        )


def test_external_prediction_failure_maps_query_to_all_candidate_dimensions():
    compilation = compile_problem_frame(scene_frame())
    discovery = discover_oracle_gaps(
        compilation,
        observations=(driver_failure(),),
        config=external_only_config(),
    )
    gap = discovery.gaps[0]
    assert gap.query_ids == ("driver",)
    assert gap.affected_dimension_ids == compilation.group_dimensions["driver::identity"]
    assert set(gap.signal_kinds) == {"prediction_failure"}


def test_expansion_failure_is_a_valid_target_blind_gap_signal():
    compilation = compile_problem_frame(scene_frame())
    observation = OracleFailureObservation(
        "expansion-branch-failed",
        "expansion_failure",
        query_ids=("car-color",),
        severity=0.8,
    )
    discovery = discover_oracle_gaps(
        compilation,
        observations=(observation,),
        config=external_only_config(),
    )
    assert discovery.gaps[0].signal_kinds == ("expansion_failure",)
    assert discovery.provenance["external_target_values_visible"] is False


def test_unknown_failure_query_fails_closed():
    compilation = compile_problem_frame(scene_frame())
    with pytest.raises(OracleGenesisError, match="non-executable queries"):
        discover_oracle_gaps(
            compilation,
            observations=(OracleFailureObservation("bad", "prediction_failure", query_ids=("missing",)),),
            config=external_only_config(),
        )


def test_unknown_failure_dimension_fails_closed():
    compilation = compile_problem_frame(scene_frame())
    with pytest.raises(OracleGenesisError, match="unknown dimensions"):
        discover_oracle_gaps(
            compilation,
            observations=(OracleFailureObservation("bad", "prediction_failure", dimension_ids=("missing",)),),
            config=external_only_config(),
        )


def test_gap_context_excludes_affected_query_group():
    compilation = compile_problem_frame(scene_frame())
    discovery = discover_oracle_gaps(
        compilation,
        observations=(driver_failure(),),
        config=external_only_config(),
    )
    gap = discovery.gaps[0]
    assert not (set(gap.affected_dimension_ids) & set(gap.context_dimension_ids))
    assert set(gap.context_dimension_ids) == set(compilation.group_dimensions["car::color"])


def test_failure_signals_for_same_query_aggregate_into_one_gap():
    compilation = compile_problem_frame(scene_frame())
    observations = (
        driver_failure(),
        OracleFailureObservation("driver-expansion", "expansion_failure", query_ids=("driver",), severity=0.5),
    )
    discovery = discover_oracle_gaps(
        compilation,
        observations=observations,
        config=external_only_config(),
    )
    assert len(discovery.gaps) == 1
    assert set(discovery.gaps[0].signal_kinds) == {"prediction_failure", "expansion_failure"}
    assert discovery.gaps[0].score == pytest.approx(1.5)


def test_gap_discovery_respects_max_gap_bound():
    compilation = compile_problem_frame(scene_frame())
    observations = (
        OracleFailureObservation("a", "prediction_failure", query_ids=("driver",)),
        OracleFailureObservation("b", "prediction_failure", query_ids=("car-color",)),
    )
    discovery = discover_oracle_gaps(
        compilation,
        observations=observations,
        config=external_only_config(max_gaps=1),
    )
    assert len(discovery.gaps) == 1


def test_null_influence_can_open_a_gap_without_external_target():
    compilation = compile_problem_frame(scene_frame())
    discovery = discover_oracle_gaps(
        compilation,
        config=OracleGapDiscoveryConfig(
            include_contradiction_resolution=False,
            include_null_influence=True,
            min_abs_agreement_delta=0.0,
            min_abs_entropy_delta=0.0,
        ),
    )
    assert discovery.baseline_distribution is not None
    assert any(signal.kind == "null_influence" for signal in discovery.signals)
    assert discovery.provenance["holdout_visible"] is False


def test_contradiction_resolution_localizes_a_candidate_gap_dimension():
    compilation = compile_problem_frame(scene_frame())
    dimension = compilation.group_dimensions["driver::identity"][0]
    contradictory = OracleStack(
        "contradictory",
        "1",
        (
            ExactOracle("zero", {dimension: 0}),
            ExactOracle("one", {dimension: 1}),
        ),
    )
    compilation = replace(compilation, oracle_stack=contradictory)
    discovery = discover_oracle_gaps(
        compilation,
        config=OracleGapDiscoveryConfig(
            include_contradiction_resolution=True,
            include_null_influence=False,
        ),
    )
    signals = [signal for signal in discovery.signals if signal.kind == "contradiction_resolution"]
    assert any(dimension in signal.dimension_ids for signal in signals)


def test_pairwise_genesis_emits_competing_rule_kinds_and_directions():
    compilation = compile_problem_frame(scene_frame())
    gap = discover_oracle_gaps(
        compilation,
        observations=(driver_failure(),),
        config=external_only_config(),
    ).gaps[0]
    generator = PairwiseSemanticRuleGenesisGenerator()
    proposals = generator.propose_gap(gap, compilation, extract_problem_rule_population(compilation), generation=1)
    kinds = {proposal.oracle.kind for proposal in proposals}
    assert kinds == {"implies", "excludes", "equivalent"}
    assert any(proposal.oracle.consequent_dimension in gap.affected_dimension_ids for proposal in proposals)
    assert any(proposal.oracle.antecedent_dimension in gap.affected_dimension_ids for proposal in proposals)
    assert all(proposal.provenance["target_visible_to_generator"] is False for proposal in proposals)


def test_pairwise_genesis_does_not_create_within_group_rules():
    compilation = compile_problem_frame(scene_frame())
    driver_dims = compilation.group_dimensions["driver::identity"]
    gap = OracleGap(
        "same-group",
        ("driver",),
        (driver_dims[0],),
        (driver_dims[1],),
        ("manual",),
        ("prediction_failure",),
        1.0,
    )
    proposals = PairwiseSemanticRuleGenesisGenerator().propose_gap(
        gap,
        compilation,
        extract_problem_rule_population(compilation),
        generation=1,
    )
    assert proposals == ()


def test_pairwise_genesis_skips_semantically_existing_rule():
    compilation = compile_problem_frame(scene_frame())
    gap = discover_oracle_gaps(
        compilation,
        observations=(driver_failure(),),
        config=external_only_config(),
    ).gaps[0]
    antecedent = gap.context_dimension_ids[0]
    consequent = gap.affected_dimension_ids[0]
    existing = SemanticRuleOracle("existing", antecedent, consequent, "implies", "logical", 1.0, "manual")
    population = OracleStack("rules", "1", (existing,))
    proposals = PairwiseSemanticRuleGenesisGenerator().propose_gap(gap, compilation, population, generation=1)
    signatures = {
        (p.oracle.antecedent_dimension, p.oracle.consequent_dimension, p.oracle.kind, p.oracle.confidence)
        for p in proposals
    }
    assert (antecedent, consequent, "implies", 1.0) not in signatures


def test_pairwise_genesis_respects_proposal_bound():
    compilation = compile_problem_frame(scene_frame())
    gap = discover_oracle_gaps(
        compilation,
        observations=(driver_failure(),),
        config=external_only_config(),
    ).gaps[0]
    proposals = PairwiseSemanticRuleGenesisGenerator(max_proposals_per_gap=3).propose_gap(
        gap,
        compilation,
        extract_problem_rule_population(compilation),
        generation=1,
    )
    assert len(proposals) == 3


def test_gap_bound_generator_relabels_proposals_for_build11_contract():
    compilation = compile_problem_frame(scene_frame())
    gap = discover_oracle_gaps(
        compilation,
        observations=(driver_failure(),),
        config=external_only_config(),
    ).gaps[0]
    bound = DiscoveredGapProposalGenerator(gap, compilation, PairwiseSemanticRuleGenesisGenerator(max_proposals_per_gap=1))
    proposal = bound.propose(extract_problem_rule_population(compilation), generation=1)[0]
    assert proposal.generator_id == bound.generator_id
    assert proposal.provenance["holdout_visible_to_generator"] is False


def test_genesis_cycle_with_no_gap_stops_without_population_change():
    compilation = compile_problem_frame(scene_frame())
    suite = challenge_suite_for_scene()
    result = run_oracle_genesis_cycle(
        compilation,
        suite,
        discovery_config=external_only_config(),
        evolution_config=OracleEvolutionConfig(evaluation_mode="baseline", max_generations=1),
    )
    assert result.stopped_reason == "no_oracle_gaps"
    assert result.evolution is None
    assert result.newly_added_oracle_ids == ()


def test_genesis_cycle_discovers_adds_challenges_and_reinjects_new_oracle():
    compilation = compile_problem_frame(scene_frame("red", mission_id="live"))
    result = run_oracle_genesis_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=OracleEvolutionConfig(
            evaluation_mode="baseline",
            max_generations=1,
            min_selection_cases=1,
            min_holdout_cases=1,
        ),
    )
    assert result.evolution is not None
    assert result.promotion_count == 1
    assert result.newly_added_oracle_ids
    assert result.evolved_compilation.provenance["oracle_evolution_applied"] is True
    assert result.evolution.lineage[0].mutation == "genesis:add_semantic_rule"
    driver = {item.value: item.probability for item in result.inference.baseline_queries["driver"]}
    assert driver["alice"] > driver["bob"]


def test_genesis_challenge_rejects_candidates_when_promotion_gate_is_impossible():
    compilation = compile_problem_frame(scene_frame("red", mission_id="reject"))
    result = run_oracle_genesis_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=OracleEvolutionConfig(
            evaluation_mode="baseline",
            max_generations=1,
            min_selection_mean_l1_improvement=10.0,
        ),
    )
    assert result.evolution is not None
    assert result.promotion_count == 0
    assert result.stopped_reason == "no_promotable_hypotheses"
    assert all(not evaluation.promotable for evaluation in result.evolution.generations[0].evaluations)


def test_genesis_cycle_runs_through_statevector_substrate_without_topology_rewrite():
    compilation = compile_problem_frame(scene_frame("red", mission_id="statevector-genesis"))
    layer = FabricLayer(kernel=StatevectorGroverSubstrate(iterations=1))
    result = run_oracle_genesis_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=OracleEvolutionConfig(
            evaluation_mode="baseline",
            max_generations=1,
            min_selection_mean_l1_improvement=10.0,
        ),
        fabric_layer=layer,
    )
    assert result.inference.suite.baseline_view.substrate_target == "statevector_grover_simulator"
    assert result.provenance["canonical_spec_modified"] is False


def test_genesis_provenance_keeps_canon_and_holdout_outside_mutation_boundary():
    compilation = compile_problem_frame(scene_frame("red", mission_id="audit"))
    result = run_oracle_genesis_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=OracleEvolutionConfig(evaluation_mode="baseline", max_generations=1),
    )
    assert result.discovery.provenance["external_target_values_visible"] is False
    assert result.provenance["holdout_visible_to_proposal"] is False
    assert result.provenance["automatic_canonical_rewrite"] is False
    assert result.provenance["canonical_spec_modified"] is False
