import math

import pytest

from qcds_fabric import (
    BaseBundle,
    ConvergenceConfig,
    ExactOracle,
    MaskOracle,
    OracleStack,
    RecursiveFabricEngine,
    automatic_contraction_widths,
    compare_truth_distributions,
)


def one_bit_stack():
    return OracleStack("one", "1", (ExactOracle("target", {"b0": 1}),))


def one_bit_bundle(bundle_id="b"):
    return BaseBundle(bundle_id, ("b0",), ("?",))


def two_bit_stack():
    return OracleStack(
        "two",
        "1",
        (
            ExactOracle("o0", {"b0": 1}),
            MaskOracle("o1", {"b1": 0}),
        ),
    )


def two_bit_bundle(bundle_id):
    return BaseBundle(bundle_id, ("b0", "b1"), ("?", "?"))


def test_automatic_contraction_widths_are_balanced_and_end_at_one():
    assert automatic_contraction_widths(8) == (4, 2, 1)
    assert automatic_contraction_widths(5) == (3, 2, 1)
    assert automatic_contraction_widths(1) == (1,)
    with pytest.raises(ValueError):
        automatic_contraction_widths(0)


def test_engine_runs_full_infer_stabilize_funnel_reentry_loop_and_returns_syntract():
    engine = RecursiveFabricEngine(
        config=ConvergenceConfig(max_cycles=3, min_cycles=2, patience=1, max_reentry_width=8)
    )
    result = engine.run(
        tuple(two_bit_bundle(f"b{i}") for i in range(4)),
        two_bit_stack(),
        syntract_id="syntract:test",
    )
    assert result.syntract.syntract_id == "syntract:test"
    assert result.trace.funnel_widths == (2, 1)
    assert result.trace.initial_funnel.final_condition is not None
    assert len(result.trace.initial_suites) == 4
    assert 1 <= len(result.trace.cycles) <= 3
    assert math.isclose(sum(result.syntract.bound_distribution.probabilities), 1.0)
    assert result.syntract.composition_provenance["recursive_reentry"] is True
    assert result.trace.provenance["canonical_spec_modified"] is False


def test_engine_stops_when_distribution_is_stable_for_required_patience():
    config = ConvergenceConfig(
        max_cycles=5,
        min_cycles=2,
        patience=1,
        l1_tolerance=0.0,
        entropy_tolerance=0.0,
        topk_jaccard_threshold=1.0,
        peak_probability_tolerance=0.0,
        max_reentry_width=2,
    )
    result = RecursiveFabricEngine(config=config).run((one_bit_bundle(),), one_bit_stack())
    assert result.converged is True
    assert result.trace.termination_reason == "converged"
    assert len(result.trace.cycles) == 2
    snapshot = result.trace.cycles[-1].convergence
    assert snapshot is not None
    assert snapshot.within_thresholds is True
    assert snapshot.l1_distance == 0.0


def test_patience_requires_multiple_consecutive_stable_comparisons():
    config = ConvergenceConfig(
        max_cycles=5,
        min_cycles=2,
        patience=2,
        l1_tolerance=0.0,
        entropy_tolerance=0.0,
        topk_jaccard_threshold=1.0,
        peak_probability_tolerance=0.0,
        max_reentry_width=2,
    )
    result = RecursiveFabricEngine(config=config).run((one_bit_bundle(),), one_bit_stack())
    assert result.converged is True
    assert len(result.trace.cycles) == 3


def test_max_cycles_is_explicit_termination_not_false_convergence():
    config = ConvergenceConfig(
        max_cycles=1,
        min_cycles=1,
        patience=1,
        max_reentry_width=2,
    )
    result = RecursiveFabricEngine(config=config).run((one_bit_bundle(),), one_bit_stack())
    assert result.converged is False
    assert result.trace.termination_reason == "max_cycles"
    assert len(result.trace.cycles) == 1


def test_engine_rejects_funnel_schedule_that_does_not_end_at_one():
    engine = RecursiveFabricEngine(config=ConvergenceConfig(max_cycles=1, min_cycles=1, max_reentry_width=8))
    with pytest.raises(ValueError, match="end at 1"):
        engine.run(
            tuple(two_bit_bundle(f"b{i}") for i in range(4)),
            two_bit_stack(),
            funnel_widths=(2,),
        )


def test_engine_preserves_full_cycle_trace_and_reentry_provenance():
    engine = RecursiveFabricEngine(
        config=ConvergenceConfig(max_cycles=2, min_cycles=2, patience=1, max_reentry_width=4)
    )
    result = engine.run((two_bit_bundle("left"), two_bit_bundle("right")), two_bit_stack())
    assert len(result.trace.cycles) == 2
    for cycle in result.trace.cycles:
        assert cycle.reentry.compilation.provenance["hard_collapse"] is False
        assert cycle.provenance["hard_collapse"] is False
        assert cycle.reentry.compilation.provenance["logical_width"] == 4
        assert cycle.reentry.suite.stabilized_return.provenance["dimension_ids"]


def test_compare_truth_distributions_reports_vector_not_single_truth_score():
    config = ConvergenceConfig(max_cycles=2, min_cycles=2)
    engine = RecursiveFabricEngine(config=config)
    result = engine.run((one_bit_bundle(),), one_bit_stack())
    first = result.trace.cycles[0].reentry.suite.stabilized_return.stabilized_distribution
    second = result.trace.cycles[1].reentry.suite.stabilized_return.stabilized_distribution
    snapshot = compare_truth_distributions(first, second, config)
    assert snapshot.l1_distance >= 0.0
    assert snapshot.entropy_delta >= 0.0
    assert 0.0 <= snapshot.topk_jaccard <= 1.0
    assert snapshot.peak_probability_delta >= 0.0
