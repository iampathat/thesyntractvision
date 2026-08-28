import math

import pytest

from qcds_fabric import (
    BaseBundle,
    DistributionOracle,
    ExactOracle,
    FabricLayer,
    InjectedBiasKernel,
    MaskOracle,
    OracleExposureBias,
    OracleStack,
    SlotBias,
    evaluate_against_target,
    probe_contradictions,
    run_ablation_benchmark,
    run_oracle_leave_one_out,
)


def bundle2(bundle_id="b"):
    return BaseBundle(bundle_id, ("b0", "b1"), ("?", "?"))


def target_distribution():
    return {
        (0, 0): 0.70,
        (0, 1): 0.10,
        (1, 0): 0.15,
        (1, 1): 0.05,
    }


def target_stack():
    return OracleStack(
        "target",
        "1",
        (DistributionOracle("truth-factor", ("b0", "b1"), target_distribution()),),
    )


def test_unbiased_reference_matches_external_soft_target_exactly():
    report = run_ablation_benchmark(bundle2(), target_stack(), target_distribution())
    baseline = report.by_name["no_diagnostics"]
    assert math.isclose(baseline.metrics.l1_to_target, 0.0, abs_tol=1e-12)
    assert baseline.metrics.target_mode_hit is True
    assert report.provenance["superiority_assumed"] is False


def test_slot_bias_changes_baseline_and_position_rotation_exposes_orientation_dependence():
    layer = FabricLayer(
        kernel=InjectedBiasKernel(slot_biases=(SlotBias(slot=0, preferred_value=1, multiplier=5.0),))
    )
    report = run_ablation_benchmark(bundle2(), target_stack(), target_distribution(), fabric_layer=layer)
    assert report.by_name["no_diagnostics"].metrics.l1_to_target > 0.0
    assert report.by_name["null_plus_position"].diagnostics["position_pairwise_l1_spread"] > 0.0


def test_oracle_exposure_bias_is_visible_when_oracle_order_rotates():
    stack = OracleStack(
        "neutral-map",
        "1",
        (
            MaskOracle("a", {"b0": "?"}),
            MaskOracle("b", {"b1": "?"}),
        ),
    )
    layer = FabricLayer(
        kernel=InjectedBiasKernel(
            oracle_exposure_biases=(
                OracleExposureBias(
                    oracle_id="a",
                    exposure_position=0,
                    dimension_id="b0",
                    preferred_value=1,
                    multiplier=4.0,
                ),
            )
        )
    )
    uniform = {(0, 0): 0.25, (0, 1): 0.25, (1, 0): 0.25, (1, 1): 0.25}
    report = run_ablation_benchmark(bundle2(), stack, uniform, fabric_layer=layer)
    assert report.by_name["null_plus_oracle"].diagnostics["oracle_exposure_pairwise_l1_spread"] > 0.0


def test_dimension_null_contradiction_probe_identifies_conflicting_dimension():
    stack = OracleStack(
        "conflict",
        "1",
        (
            ExactOracle("zero", {"b0": 0}),
            ExactOracle("one", {"b0": 1}),
        ),
    )
    probe = probe_contradictions(bundle2(), stack)
    assert "all_candidate_states_rejected" in probe.baseline.contradiction_markers
    assert probe.resolution_candidates == ("b0",)
    assert probe.agreement_deltas["b0"] > probe.agreement_deltas["b1"]


def test_leave_one_out_can_surface_a_known_bad_oracle_without_auto_retiring_it():
    truth = DistributionOracle("truth", ("b0", "b1"), target_distribution())
    bad = ExactOracle("bad", {"b0": 1})
    stack = OracleStack("mixed", "1", (truth, bad))
    report = run_oracle_leave_one_out(bundle2(), stack, target_distribution())
    assert report.baseline.l1_to_target > 0.0
    assert report.best_l1_omission == "bad"
    bad_removed = next(item for item in report.leave_one_out if item.omitted_oracle_id == "bad")
    assert math.isclose(bad_removed.metrics.l1_to_target, 0.0, abs_tol=1e-12)
    assert report.provenance["automatic_oracle_retirement"] is False


def test_bias_kernel_with_no_faults_is_reference_equivalent():
    stack = target_stack()
    bundle = bundle2()
    reference = FabricLayer().run_null_bank(bundle, stack).baseline_distribution
    injected = FabricLayer(kernel=InjectedBiasKernel()).run_null_bank(bundle, stack).baseline_distribution
    assert injected.support == reference.support
    assert injected.probabilities == reference.probabilities


def test_ablation_matrix_preserves_normalization_and_matched_variant_names():
    report = run_ablation_benchmark(bundle2(), target_stack(), target_distribution())
    assert tuple(result.variant for result in report.results) == (
        "no_diagnostics",
        "null_only",
        "null_plus_position",
        "null_plus_oracle",
        "full_diagnostics",
    )
    for result in report.results:
        assert math.isclose(sum(result.distribution.probabilities), 1.0, abs_tol=1e-12)
    assert report.provenance["diagnostic_views_count_as_independent_dimensions"] is False


def test_invalid_external_target_is_rejected():
    distribution = FabricLayer().run_null_bank(bundle2(), OracleStack("empty", "1", ())).baseline_distribution
    with pytest.raises(ValueError):
        evaluate_against_target(distribution, {})
    with pytest.raises(ValueError):
        evaluate_against_target(distribution, {(0, 0): -1.0})
