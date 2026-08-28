import math

import pytest

from qcds_fabric import (
    AdaptiveGroverSubstrate,
    BaseBundle,
    ChannelView,
    DistributionOracle,
    ExactOracle,
    FabricLayer,
    GroverDepthConfig,
    OracleStack,
    StatevectorGroverSubstrate,
    ideal_binary_grover_m_star,
    run_grover_depth_benchmark,
    select_grover_depth,
)


def bundle3(bundle_id="b3"):
    return BaseBundle(
        bundle_id,
        ("b0", "b1", "b2"),
        ("?", "?", "?"),
        provenance={"source": "build7-test"},
    )


def target_stack():
    return OracleStack(
        "target",
        "1",
        (ExactOracle("target-state", {"b0": 1, "b1": 0, "b2": 1}),),
    )


def baseline_view(bundle, stack):
    return ChannelView.baseline(
        bundle,
        oracle_stack_version=stack.identity,
        oracle_ids=stack.oracle_ids,
    )


def test_zero_iterations_is_explicit_unamplified_statevector_control():
    bundle = bundle3("m0")
    stack = target_stack()
    distribution = StatevectorGroverSubstrate(iterations=0).run(
        baseline_view(bundle, stack),
        stack,
    )
    observed = dict(zip(distribution.support, distribution.probabilities))

    assert math.isclose(observed[(1, 0, 1)], 1.0 / 8.0, abs_tol=1e-12)
    assert distribution.normalization == "statevector_unamplified_control"
    assert distribution.provenance["grover_iterations"] == 0


def test_negative_grover_depth_is_rejected():
    with pytest.raises(ValueError, match="non-negative"):
        StatevectorGroverSubstrate(iterations=-1)


def test_binary_theoretical_m_star_is_available_as_diagnostic():
    scores = (0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0)
    assert ideal_binary_grover_m_star(scores) == 2
    assert ideal_binary_grover_m_star((0.1, 0.2, 0.3, 0.4)) is None


def test_adaptive_search_selects_first_peak_before_overshoot():
    bundle = bundle3("adaptive")
    stack = target_stack()
    selection = select_grover_depth(
        baseline_view(bundle, stack),
        stack,
        config=GroverDepthConfig(max_iterations=6),
    )

    assert selection.m_star == 2
    assert selection.ideal_binary_m_star == 2
    assert selection.overshoot_detected is True
    assert selection.stop_reason == "overshoot_detected"
    assert [trial.iterations for trial in selection.trials] == [0, 1, 2, 3]
    objectives = [trial.expected_normalized_oracle_score for trial in selection.trials]
    assert objectives[0] < objectives[1] < objectives[2]
    assert objectives[3] < objectives[2]
    assert selection.selected_distribution.top_k[0] == (1, 0, 1)
    assert selection.selected_distribution.provenance["selected_grover_iterations"] == 2
    assert selection.selected_distribution.provenance["external_target_used_for_depth_selection"] is False


def test_non_discriminative_oracle_profile_does_not_amplify():
    bundle = bundle3("flat")
    stack = OracleStack("empty", "1", ())
    selection = select_grover_depth(
        baseline_view(bundle, stack),
        stack,
        config=GroverDepthConfig(max_iterations=6),
    )

    assert selection.m_star == 0
    assert selection.stop_reason == "non_discriminative_oracle_profile"
    assert len(selection.trials) == 1


def test_weighted_score_profile_is_not_mislabeled_as_binary_m_star():
    bundle = BaseBundle("weighted", ("b0", "b1"), ("?", "?"))
    oracle = DistributionOracle(
        "soft",
        ("b0", "b1"),
        {
            (0, 0): 0.55,
            (0, 1): 0.15,
            (1, 0): 0.20,
            (1, 1): 0.10,
        },
    )
    stack = OracleStack("soft-stack", "1", (oracle,))
    selection = select_grover_depth(
        baseline_view(bundle, stack),
        stack,
        config=GroverDepthConfig(max_iterations=4),
    )

    assert selection.ideal_binary_m_star is None
    assert selection.provenance["external_target_used"] is False


def test_adaptive_substrate_can_choose_different_depth_per_view():
    bundle = bundle3("heterogeneous-views")
    stack = target_stack()
    layer = FabricLayer(
        kernel=AdaptiveGroverSubstrate(
            GroverDepthConfig(max_iterations=4)
        )
    )
    result = layer.run_null_bank(bundle, stack)

    assert result.baseline_distribution.provenance["selected_grover_iterations"] == 2
    assert {
        distribution.provenance["selected_grover_iterations"]
        for distribution in result.null_distributions
    } == {1}
    assert result.baseline_view.substrate_target == "statevector_grover_adaptive_simulator"
    assert all(
        view.substrate_target == "statevector_grover_adaptive_simulator"
        for view in result.null_views
    )


def test_depth_benchmark_keeps_external_target_out_of_adaptive_selection():
    bundle = bundle3("depth-benchmark")
    stack = target_stack()
    report = run_grover_depth_benchmark(
        bundle,
        stack,
        {(1, 0, 1): 1.0},
        config=GroverDepthConfig(max_iterations=3),
        fixed_iterations=(0, 1, 2, 3),
        include_positional=False,
        include_oracle_exposure=False,
        include_crossed=False,
    )

    assert set(report.fixed_by_m) == {0, 1, 2, 3}
    assert report.adaptive_selected_iterations["baseline"] == 2
    null_depths = {
        depth
        for key, depth in report.adaptive_selected_iterations.items()
        if key.startswith("dimension_null:")
    }
    assert null_depths == {1}
    assert report.external_best_fixed_iterations in {0, 1, 2, 3}
    assert report.provenance["external_target_used_for_adaptive_selection"] is False
    assert report.provenance["external_target_used_for_posthoc_evaluation"] is True
    assert report.provenance["superiority_assumed"] is False
    assert report.provenance["quantum_advantage_claim"] is False


def test_adaptive_search_respects_explicit_maximum_when_no_overshoot_seen_yet():
    bundle = bundle3("bounded")
    stack = target_stack()
    selection = select_grover_depth(
        baseline_view(bundle, stack),
        stack,
        config=GroverDepthConfig(max_iterations=1),
    )

    assert selection.m_star == 1
    assert selection.stop_reason == "max_iterations_reached"
    assert selection.overshoot_detected is False
    assert [trial.iterations for trial in selection.trials] == [0, 1]
