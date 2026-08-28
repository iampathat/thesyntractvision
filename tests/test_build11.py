import math

import pytest

from qcds_fabric import (
    BaseBundle,
    EvidenceOracle,
    ExactOracle,
    FabricLayer,
    OracleChallengeCase,
    OracleChallengeSuite,
    OracleEvolutionConfig,
    OracleEvolutionError,
    OracleHypothesis,
    OracleRetirementGenerator,
    OracleStack,
    ProblemQuery,
    SemanticAtom,
    SemanticClaim,
    SemanticProblemFrame,
    SemanticRule,
    SemanticRuleMutationGenerator,
    SemanticRuleOracle,
    StatevectorGroverSubstrate,
    apply_evolved_oracle_population,
    challenge_case_from_problem,
    evaluate_oracle_hypothesis,
    evolve_oracle_population,
    extract_problem_rule_population,
    problem_to_syntract,
    compile_problem_frame,
    run_problem_compilation,
    target_distribution_for_problem_assignments,
)


def simple_rule_population(kind="excludes"):
    rule = SemanticRuleOracle(
        oracle_id="rule:model",
        antecedent_dimension="a",
        consequent_dimension="b",
        kind=kind,
        relation_class="causal",
        confidence=1.0,
        source_id="model",
    )
    return OracleStack("population", "1", (rule,))


def rule_challenge_suite():
    selection = OracleChallengeCase(
        "selection-a1",
        BaseBundle("selection", ("a", "b"), ("?", "?")),
        {(1, 1): 1.0},
        role="selection",
        context_oracles=(ExactOracle("evidence:a1", {"a": 1}),),
    )
    holdout = OracleChallengeCase(
        "holdout-a0",
        BaseBundle("holdout", ("a", "b"), (0, "?")),
        {(0, 0): 0.5, (0, 1): 0.5},
        role="holdout",
    )
    return OracleChallengeSuite("rule-suite", (selection, holdout))


def baseline_config(**kwargs):
    values = dict(
        max_generations=3,
        evaluation_mode="baseline",
        max_case_l1_regression=0.0,
    )
    values.update(kwargs)
    return OracleEvolutionConfig(**values)


def test_rule_mutation_generator_never_receives_challenge_targets():
    population = simple_rule_population()
    generator = SemanticRuleMutationGenerator()
    proposals = generator.propose(population, generation=1)
    assert proposals
    assert all(item.provenance["target_visible_to_generator"] is False for item in proposals)
    assert all(item.generator_id == generator.generator_id for item in proposals)


def test_rule_mutation_generator_changes_only_semantic_rule_oracles_by_default():
    population = OracleStack(
        "mixed",
        "1",
        (
            EvidenceOracle("evidence", "a", 1, 0.8, "sensor"),
            simple_rule_population().oracles[0],
        ),
    )
    proposals = SemanticRuleMutationGenerator().propose(population, generation=1)
    assert proposals
    assert {item.replace_oracle_id for item in proposals} == {"rule:model"}
    assert all(item.replace_oracle_id != "evidence" for item in proposals)


def test_wrong_excludes_rule_evolves_to_implies_under_selection_and_holdout():
    result = evolve_oracle_population(
        simple_rule_population("excludes"),
        rule_challenge_suite(),
        (SemanticRuleMutationGenerator(),),
        config=baseline_config(),
    )
    assert result.promotion_count == 1
    assert len(result.final_stack.oracles) == 1
    assert result.final_stack.oracles[0].kind == "implies"
    assert result.stopped_reason == "no_promotable_hypotheses"


def test_holdout_rejects_equivalent_rule_that_overfits_selection_case():
    population = simple_rule_population("excludes")
    generator = SemanticRuleMutationGenerator()
    equivalent = next(
        hypothesis
        for hypothesis in generator.propose(population, generation=1)
        if hypothesis.oracle.kind == "equivalent"
    )
    evaluation = evaluate_oracle_hypothesis(
        population,
        equivalent,
        rule_challenge_suite(),
        config=baseline_config(),
    )
    assert evaluation.selection_mean_l1_improvement > 0
    assert evaluation.holdout_mean_l1_improvement < 0
    assert evaluation.promotable is False
    assert "holdout_regression_or_insufficient_improvement" in evaluation.rejection_reasons


def test_implies_rule_survives_selection_and_nonregressing_holdout():
    population = simple_rule_population("excludes")
    implies = next(
        hypothesis
        for hypothesis in SemanticRuleMutationGenerator().propose(population, generation=1)
        if hypothesis.oracle.kind == "implies"
    )
    evaluation = evaluate_oracle_hypothesis(
        population,
        implies,
        rule_challenge_suite(),
        config=baseline_config(),
    )
    assert evaluation.selection_mean_l1_improvement > 0
    assert math.isclose(evaluation.holdout_mean_l1_improvement, 0.0, abs_tol=1e-12)
    assert evaluation.promotable is True


def test_default_promotion_requires_holdout_case():
    suite = OracleChallengeSuite("selection-only", (rule_challenge_suite().selection_cases[0],))
    population = simple_rule_population("excludes")
    implies = next(
        hypothesis
        for hypothesis in SemanticRuleMutationGenerator().propose(population, generation=1)
        if hypothesis.oracle.kind == "implies"
    )
    evaluation = evaluate_oracle_hypothesis(
        population,
        implies,
        suite,
        config=baseline_config(),
    )
    assert evaluation.promotable is False
    assert "insufficient_holdout_cases" in evaluation.rejection_reasons


def test_retirement_is_explicit_challenged_leave_one_out_not_hidden_pruning():
    population = OracleStack(
        "contradictory",
        "1",
        (
            ExactOracle("good", {"x": 1}),
            ExactOracle("bad", {"x": 0}),
        ),
    )
    cases = (
        OracleChallengeCase("selection", BaseBundle("s", ("x",), ("?",)), {(1,): 1.0}),
        OracleChallengeCase("holdout", BaseBundle("h", ("x",), ("?",)), {(1,): 1.0}, role="holdout"),
    )
    result = evolve_oracle_population(
        population,
        OracleChallengeSuite("retire-suite", cases),
        (OracleRetirementGenerator(("bad",)),),
        config=baseline_config(max_generations=1),
    )
    assert result.promotion_count == 1
    assert result.final_stack.oracle_ids == ("good",)
    assert result.lineage[0].new_oracle_id is None
    assert result.lineage[0].mutation == "retire_oracle"


def test_bad_retirement_is_rejected_by_external_challenge():
    population = OracleStack(
        "single",
        "1",
        (ExactOracle("good", {"x": 1}),),
    )
    suite = OracleChallengeSuite(
        "keep-good",
        (
            OracleChallengeCase("s", BaseBundle("s", ("x",), ("?",)), {(1,): 1.0}),
            OracleChallengeCase("h", BaseBundle("h", ("x",), ("?",)), {(1,): 1.0}, role="holdout"),
        ),
    )
    result = evolve_oracle_population(
        population,
        suite,
        (OracleRetirementGenerator(("good",)),),
        config=baseline_config(max_generations=1),
    )
    assert result.promotion_count == 0
    assert result.final_stack.oracle_ids == ("good",)
    assert result.stopped_reason == "no_promotable_hypotheses"


def test_oracle_lineage_records_replacement_and_versioned_result():
    result = evolve_oracle_population(
        simple_rule_population(),
        rule_challenge_suite(),
        (SemanticRuleMutationGenerator(),),
        config=baseline_config(),
    )
    lineage = result.lineage[0]
    assert lineage.replaced_oracle_id == "rule:model"
    assert lineage.new_oracle_id.startswith("evo:g1:")
    assert "+e1.1" in lineage.resulting_stack_identity
    assert result.provenance["promotion_is_reversible_by_lineage"] is True


def test_candidate_with_no_observable_effect_cannot_promote():
    population = OracleStack("empty-pop", "1", ())
    hypothesis = OracleHypothesis(
        "irrelevant",
        ExactOracle("irrelevant-oracle", {"missing": 1}),
        generation=1,
        generator_id="test",
    )
    suite = OracleChallengeSuite(
        "effect",
        (
            OracleChallengeCase("s", BaseBundle("s", ("x",), ("?",)), {(1,): 1.0}),
            OracleChallengeCase("h", BaseBundle("h", ("x",), ("?",)), {(1,): 1.0}, role="holdout"),
        ),
    )
    evaluation = evaluate_oracle_hypothesis(
        population,
        hypothesis,
        suite,
        config=baseline_config(min_selection_mean_l1_improvement=0.0),
    )
    assert evaluation.effect_case_count == 0
    assert evaluation.promotable is False
    assert "candidate_has_insufficient_observable_effect" in evaluation.rejection_reasons


def test_challenge_context_cannot_collide_with_population_oracle_ids():
    population = OracleStack("p", "1", (ExactOracle("same", {"x": 1}),))
    hypothesis = OracleHypothesis(
        "add",
        ExactOracle("new", {"x": 1}),
        generation=1,
        generator_id="test",
    )
    suite = OracleChallengeSuite(
        "collision",
        (
            OracleChallengeCase(
                "s",
                BaseBundle("s", ("x",), ("?",)),
                {(1,): 1.0},
                context_oracles=(ExactOracle("same", {"x": 1}),),
            ),
            OracleChallengeCase("h", BaseBundle("h", ("x",), ("?",)), {(1,): 1.0}, role="holdout"),
        ),
    )
    with pytest.raises(OracleEvolutionError, match="collide"):
        evaluate_oracle_hypothesis(population, hypothesis, suite, config=baseline_config())


def test_stabilized_challenge_mode_runs_through_fabric_diagnostics():
    population = simple_rule_population("excludes")
    implies = next(
        hypothesis
        for hypothesis in SemanticRuleMutationGenerator().propose(population, generation=1)
        if hypothesis.oracle.kind == "implies"
    )
    evaluation = evaluate_oracle_hypothesis(
        population,
        implies,
        rule_challenge_suite(),
        config=OracleEvolutionConfig(
            evaluation_mode="stabilized",
            min_selection_mean_l1_improvement=0.0,
            min_holdout_mean_l1_improvement=-2.0,
            max_case_l1_regression=2.0,
        ),
    )
    assert evaluation.provenance["evaluation_mode"] == "stabilized"
    assert all(math.isclose(sum(case.candidate_distribution.probabilities), 1.0) for case in evaluation.cases)


def test_oracle_challenge_can_use_statevector_substrate():
    population = simple_rule_population("excludes")
    implies = next(
        hypothesis
        for hypothesis in SemanticRuleMutationGenerator().propose(population, generation=1)
        if hypothesis.oracle.kind == "implies"
    )
    evaluation = evaluate_oracle_hypothesis(
        population,
        implies,
        rule_challenge_suite(),
        fabric_layer=FabricLayer(kernel=StatevectorGroverSubstrate(iterations=1)),
        config=baseline_config(
            min_selection_mean_l1_improvement=-2.0,
            min_holdout_mean_l1_improvement=-2.0,
            max_case_l1_regression=2.0,
        ),
    )
    assert all(math.isclose(sum(case.candidate_distribution.probabilities), 1.0, abs_tol=1e-12) for case in evaluation.cases)


def problem_frame(*, mission_id, claim=True):
    return SemanticProblemFrame(
        mission_id=mission_id,
        raw_text="structured",
        queries=(
            ProblemQuery("qa", "a", "state", ("yes", "no")),
            ProblemQuery("qb", "b", "state", ("yes", "no")),
        ),
        claims=(SemanticClaim("a", "state", "yes", "sensor", 1.0),) if claim else (),
        rules=(
            SemanticRule(
                "model-rule",
                SemanticAtom("a", "state", "yes"),
                SemanticAtom("b", "state", "yes"),
                kind="excludes",
                relation_class="causal",
                confidence=1.0,
                source_id="model",
            ),
        ),
        analyzer_id="external:test",
    )


def test_problem_assignment_target_is_explicit_and_normalized():
    compilation = compile_problem_frame(problem_frame(mission_id="target"))
    target = target_distribution_for_problem_assignments(compilation, {"qa": "yes", "qb": "yes"})
    assert math.isclose(sum(target.values()), 1.0, abs_tol=1e-12)
    assert len(target) == 1


def test_partial_problem_assignment_keeps_other_query_uncertain():
    compilation = compile_problem_frame(problem_frame(mission_id="partial-target", claim=False))
    target = target_distribution_for_problem_assignments(compilation, {"qa": "no"})
    assert math.isclose(sum(target.values()), 1.0, abs_tol=1e-12)
    assert len(target) == 2
    assert set(target.values()) == {0.5}


def test_problem_challenge_case_separates_population_from_case_evidence():
    compilation = compile_problem_frame(problem_frame(mission_id="case"))
    population = extract_problem_rule_population(compilation)
    case = challenge_case_from_problem(
        compilation,
        population_oracle_ids=population.oracle_ids,
        expected_assignments={"qa": "yes", "qb": "yes"},
        case_id="selection",
        role="selection",
    )
    assert set(population.oracle_ids).isdisjoint({oracle.oracle_id for oracle in case.context_oracles})
    assert any(oracle.oracle_id.startswith("evidence:") for oracle in case.context_oracles)
    assert case.provenance["target_is_external_reference"] is True


def test_problem_rule_population_can_evolve_and_reenter_problem_inference():
    selection_compilation = compile_problem_frame(problem_frame(mission_id="selection-problem"))
    holdout_compilation = compile_problem_frame(problem_frame(mission_id="holdout-problem", claim=False))
    population = extract_problem_rule_population(selection_compilation)
    cases = (
        challenge_case_from_problem(
            selection_compilation,
            population_oracle_ids=population.oracle_ids,
            expected_assignments={"qa": "yes", "qb": "yes"},
            case_id="selection",
            role="selection",
        ),
        challenge_case_from_problem(
            holdout_compilation,
            population_oracle_ids=population.oracle_ids,
            expected_assignments={"qa": "no"},
            case_id="holdout",
            role="holdout",
        ),
    )
    evolution = evolve_oracle_population(
        population,
        OracleChallengeSuite("problem-suite", cases),
        (SemanticRuleMutationGenerator(),),
        config=baseline_config(),
    )
    evolved_compilation = apply_evolved_oracle_population(selection_compilation, evolution)
    inference = run_problem_compilation(evolved_compilation)
    probabilities = {item.value: item.probability for item in inference.baseline_queries["qb"]}
    assert evolution.final_stack.oracles[0].kind == "implies"
    assert probabilities["yes"] > probabilities["no"]
    assert evolved_compilation.provenance["oracle_evolution_applied"] is True


def test_problem_population_extraction_does_not_evolve_evidence_or_onehot_logic():
    compilation = compile_problem_frame(problem_frame(mission_id="extract"))
    population = extract_problem_rule_population(compilation)
    assert len(population.oracles) == 1
    assert isinstance(population.oracles[0], SemanticRuleOracle)
    assert all(not oracle.oracle_id.startswith("evidence:") for oracle in population.oracles)
    assert all(not oracle.oracle_id.startswith("logic:onehot:") for oracle in population.oracles)


def test_external_generator_cannot_force_promotion_of_a_worse_candidate():
    class BadGenerator:
        generator_id = "bad-generator"

        def propose(self, oracle_stack, *, generation):
            current = oracle_stack.oracles[0]
            candidate = SemanticRuleOracle(
                "bad:equivalent",
                current.antecedent_dimension,
                current.consequent_dimension,
                "equivalent",
                current.relation_class,
                current.confidence,
                current.source_id,
            )
            return (
                OracleHypothesis(
                    "bad-proposal",
                    candidate,
                    replace_oracle_id=current.oracle_id,
                    generation=generation,
                    generator_id=self.generator_id,
                    mutation="external_bad_proposal",
                ),
            )

    result = evolve_oracle_population(
        simple_rule_population("excludes"),
        rule_challenge_suite(),
        (BadGenerator(),),
        config=baseline_config(max_generations=1),
    )
    assert result.promotion_count == 0
    assert result.final_stack.oracles[0].kind == "excludes"


def test_evolution_never_claims_canonical_self_rewrite():
    result = evolve_oracle_population(
        simple_rule_population(),
        rule_challenge_suite(),
        (SemanticRuleMutationGenerator(),),
        config=baseline_config(),
    )
    assert result.provenance["automatic_canonical_rewrite"] is False
    assert result.provenance["canonical_spec_modified"] is False
    assert all(evaluation.provenance["canonical_spec_modified"] is False for generation in result.generations for evaluation in generation.evaluations)
