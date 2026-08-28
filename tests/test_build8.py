import math

import pytest

from qcds_fabric import (
    BaseBundle,
    ClassicalInferenceKernel,
    ExactOracle,
    ExpansionSpec,
    FabricLayer,
    OracleStack,
    StatevectorGroverSubstrate,
    Syntract,
    TruthDistribution,
    compile_syntract_expansion,
    contract_expansion,
    run_expansion_cycle,
    run_syntract_expansion,
)


def make_distribution(probabilities):
    support = tuple(probabilities)
    probs = tuple(probabilities[state] for state in support)
    ordering = sorted(range(len(support)), key=lambda i: (-probs[i], support[i]))
    return TruthDistribution(
        support=support,
        probabilities=probs,
        raw_scores=probs,
        top_k=tuple(support[i] for i in ordering),
        entropy=TruthDistribution.shannon_entropy(probs),
        oracle_agreement=1.0,
        contradiction_markers=(),
        normalization="test",
        provenance={"test": True},
    )


def source_syntract(probabilities=None):
    distribution = make_distribution(probabilities or {(0,): 0.25, (1,): 0.75})
    return Syntract(
        syntract_id="source",
        bound_distribution=distribution,
        evidence_provenance={"final_dimension_ids": ("s0",)},
        contradiction_provenance=(),
        composition_provenance={"test": True},
    )


def empty_stack(name="empty"):
    return OracleStack(name, "1", ())


def test_compile_expansion_opens_new_binary_space_without_collapsing_source():
    compilation = compile_syntract_expansion(
        source_syntract(),
        ExpansionSpec("x", ("e0", "e1")),
        empty_stack(),
    )
    assert compilation.bundle.dimension_ids == ("s0", "e0", "e1")
    assert compilation.bundle.values == ("?", "?", "?")
    assert compilation.provenance["candidate_binary_space"] == "2^3"
    assert compilation.provenance["projected_expansion_space"] == "2^2"
    assert compilation.provenance["hard_collapse"] is False
    assert compilation.oracle_stack.oracle_ids[0] == "bound-source:source"


def test_bound_source_distribution_is_preserved_in_expansion_baseline():
    result = run_syntract_expansion(
        source_syntract(),
        ExpansionSpec("preserve", ("e0", "e1")),
        empty_stack(),
    )
    joint = result.suite.baseline_distribution
    source_one_mass = sum(
        probability
        for state, probability in zip(joint.support, joint.probabilities)
        if state[0] == 1
    )
    source_zero_mass = sum(
        probability
        for state, probability in zip(joint.support, joint.probabilities)
        if state[0] == 0
    )
    assert math.isclose(source_one_mass, 0.75, abs_tol=1e-12)
    assert math.isclose(source_zero_mass, 0.25, abs_tol=1e-12)
    assert all(math.isclose(p, 0.25, abs_tol=1e-12) for p in result.baseline_projection.probabilities)


def test_expansion_oracles_rank_compatible_branch_without_external_generator():
    proposal = OracleStack(
        "proposal",
        "1",
        (ExactOracle("branch", {"e0": 1, "e1": 0}),),
    )
    result = run_syntract_expansion(
        source_syntract(),
        ExpansionSpec("rank", ("e0", "e1")),
        proposal,
    )
    assert result.baseline_projection.top_k[0] == (1, 0)
    assert math.isclose(dict(zip(result.baseline_projection.support, result.baseline_projection.probabilities))[(1, 0)], 1.0)
    assert result.stabilized_projection.top_k[0] == (1, 0)
    assert result.candidate_branch_count == 4


def test_conflicting_expansion_oracles_remain_explicit_in_baseline_projection():
    proposal = OracleStack(
        "conflict",
        "1",
        (
            ExactOracle("zero", {"e0": 0}),
            ExactOracle("one", {"e0": 1}),
        ),
    )
    result = run_syntract_expansion(
        source_syntract(),
        ExpansionSpec("conflict", ("e0",)),
        proposal,
    )
    assert "all_candidate_states_rejected" in result.baseline_projection.contradiction_markers
    assert len({round(p, 12) for p in result.baseline_projection.probabilities}) == 1


def test_expansion_dimension_collision_fails_closed():
    with pytest.raises(ValueError, match="collide"):
        compile_syntract_expansion(
            source_syntract(),
            ExpansionSpec("bad", ("s0",)),
            empty_stack(),
        )


def test_expansion_width_guard_is_explicit():
    with pytest.raises(ValueError, match="max_total_width"):
        compile_syntract_expansion(
            source_syntract(),
            ExpansionSpec("wide", ("e0", "e1"), max_total_width=2),
            empty_stack(),
        )


def test_source_dimensions_can_be_recovered_from_recursive_engine_slice_provenance():
    source = Syntract(
        syntract_id="slice-source",
        bound_distribution=make_distribution({(0, 1): 0.4, (1, 0): 0.6}),
        evidence_provenance={
            "final_source_slices": {
                "a#0": ("a#0::x",),
                "b#1": ("b#1::y",),
            }
        },
        contradiction_provenance=(),
        composition_provenance={},
    )
    compilation = compile_syntract_expansion(
        source,
        ExpansionSpec("slice", ("e0",)),
        empty_stack(),
    )
    assert compilation.source_dimension_ids == ("a#0::x", "b#1::y")


def test_expansion_runs_on_statevector_substrate_without_changing_topology():
    deterministic = source_syntract({(0,): 0.0, (1,): 1.0})
    proposal = OracleStack("proposal", "1", (ExactOracle("e", {"e0": 1}),))
    layer = FabricLayer(kernel=StatevectorGroverSubstrate(iterations=1))
    result = run_syntract_expansion(
        deterministic,
        ExpansionSpec("sv", ("e0",)),
        proposal,
        fabric_layer=layer,
    )
    assert result.suite.baseline_view.substrate_target == "statevector_grover_simulator"
    assert result.baseline_projection.top_k[0] == (1,)


def test_contract_expansion_binds_tested_branches_without_hard_collapse():
    expansion = run_syntract_expansion(
        source_syntract(),
        ExpansionSpec("contract", ("e0", "e1")),
        empty_stack(),
    )
    validation = OracleStack("validation", "1", (ExactOracle("keep", {"e0": 1}),))
    contracted = contract_expansion(expansion, validation)
    assert contracted.syntract.bound_distribution.top_k[0][0] == 1
    assert contracted.syntract.composition_provenance["cycle"] == "expand_test_contract_bind"
    assert contracted.syntract.composition_provenance["hard_collapse"] is False
    assert contracted.syntract.evidence_provenance["source_syntract_id"] == "source"


def test_full_expansion_cycle_returns_new_bound_syntract_and_keeps_provenance():
    proposal = OracleStack("proposal", "1", (ExactOracle("proposal-e0", {"e0": 1}),))
    validation = OracleStack("validation", "1", (ExactOracle("validation-e1", {"e1": 0}),))
    cycle = run_expansion_cycle(
        source_syntract(),
        ExpansionSpec("cycle", ("e0", "e1")),
        proposal,
        validation,
        syntract_id="syntract:cycle",
    )
    assert cycle.expansion.baseline_projection.top_k[0][0] == 1
    assert cycle.contraction.syntract.syntract_id == "syntract:cycle"
    assert cycle.contraction.syntract.composition_provenance["prior_direction"] == "1_to_N"
    assert cycle.contraction.syntract.composition_provenance["direction"] == "N_to_1"
    assert cycle.contraction.provenance["canonical_spec_modified"] is False
