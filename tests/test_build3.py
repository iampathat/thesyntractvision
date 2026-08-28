import math

import pytest

from qcds_fabric import (
    BaseBundle,
    ChannelView,
    DistributionOracle,
    ExactOracle,
    FabricLayer,
    MaskOracle,
    OracleStack,
    baseline_reentry_distribution,
    compile_bound_condition,
    funnel_step,
    recursive_contraction_funnel,
    run_bound_condition_reentry,
)


def source_stack():
    return OracleStack(
        "source",
        "1",
        (
            ExactOracle("o0", {"b0": 1}),
            MaskOracle("o1", {"b1": 0}),
        ),
    )


def source_bundle(bundle_id):
    return BaseBundle(bundle_id, ("b0", "b1"), ("?", "?"))


def test_distribution_oracle_marginalizes_logical_absence():
    bundle = BaseBundle("d", ("d0", "d1"), ("?", "?"))
    oracle = DistributionOracle(
        "p",
        ("d0", "d1"),
        {
            (0, 0): 0.8,
            (1, 0): 0.2,
        },
    )
    stack = OracleStack("s", "1", (oracle,))

    baseline = ChannelView.baseline(bundle, oracle_stack_version=stack.identity, oracle_ids=stack.oracle_ids)
    assert math.isclose(oracle.score(baseline, (0, 0)), 0.8)
    assert math.isclose(oracle.score(baseline, (1, 0)), 0.2)
    assert math.isclose(oracle.score(baseline, (0, 1)), 0.0)

    null_d0 = ChannelView.null_dimension(bundle, 0, oracle_stack_version=stack.identity, oracle_ids=stack.oracle_ids)
    assert math.isclose(oracle.score(null_d0, (-1, 0)), 1.0)

    null_d1 = ChannelView.null_dimension(bundle, 1, oracle_stack_version=stack.identity, oracle_ids=stack.oracle_ids)
    assert math.isclose(oracle.score(null_d1, (0, -1)), 0.8)
    assert math.isclose(oracle.score(null_d1, (1, -1)), 0.2)


def test_stabilized_return_records_dimension_identity_for_future_reentry():
    result = FabricLayer().run_null_bank(source_bundle("a"), source_stack()).stabilized_return
    assert result.provenance["bundle_id"] == "a"
    assert result.provenance["dimension_ids"] == ("b0", "b1")


def two_leaf_condition():
    layer = FabricLayer()
    stack = source_stack()
    left = layer.run_null_bank(source_bundle("left"), stack).stabilized_return
    right = layer.run_null_bank(source_bundle("right"), stack).stabilized_return
    condition = funnel_step((left, right), next_count=1, layer_id="F0").conditions[0]
    return left, right, condition


def test_compile_bound_condition_namespaces_dimensions_and_preserves_distributions():
    left, right, condition = two_leaf_condition()
    compilation = compile_bound_condition(condition, max_width=4)
    assert compilation.bundle.width == 4
    assert compilation.bundle.values == ("?", "?", "?", "?")
    assert len(set(compilation.bundle.dimension_ids)) == 4
    assert len(compilation.oracle_stack.oracles) == 2
    assert compilation.provenance["hard_collapse"] is False
    assert compilation.provenance["candidate_binary_space"] == "2^4"

    first = compilation.oracle_stack.oracles[0]
    assert isinstance(first, DistributionOracle)
    assert dict(first.probabilities) == dict(
        zip(left.stabilized_distribution.support, left.stabilized_distribution.probabilities)
    )
    second = compilation.oracle_stack.oracles[1]
    assert dict(second.probabilities) == dict(
        zip(right.stabilized_distribution.support, right.stabilized_distribution.probabilities)
    )


def test_reentry_baseline_is_product_of_preserved_leaf_truth_distributions():
    left, right, condition = two_leaf_condition()
    compilation = compile_bound_condition(condition, max_width=4)
    distribution = baseline_reentry_distribution(compilation)
    actual = dict(zip(distribution.support, distribution.probabilities))
    left_map = dict(zip(left.stabilized_distribution.support, left.stabilized_distribution.probabilities))
    right_map = dict(zip(right.stabilized_distribution.support, right.stabilized_distribution.probabilities))

    for state, probability in actual.items():
        expected = left_map[state[:2]] * right_map[state[2:]]
        assert math.isclose(probability, expected, rel_tol=1e-12, abs_tol=1e-12)


def test_bound_condition_can_execute_qcds_null_stabilization_again():
    _, _, condition = two_leaf_condition()
    result = run_bound_condition_reentry(condition, max_width=4)
    assert result.compilation.bundle.width == 4
    assert set(result.suite.families) == {"dimension_null"}
    assert len(result.suite.families["dimension_null"].views) == 4
    stabilized = result.suite.stabilized_return.stabilized_distribution
    assert math.isclose(sum(stabilized.probabilities), 1.0)
    assert result.suite.stabilized_return.provenance["dimension_ids"] == result.compilation.bundle.dimension_ids


def test_reentry_width_guard_prevents_accidental_classical_explosion():
    _, _, condition = two_leaf_condition()
    with pytest.raises(ValueError, match="exceeds max_width"):
        compile_bound_condition(condition, max_width=3)


def test_end_to_end_four_leaf_funnel_can_reenter_as_bounded_eight_dimensional_pass():
    layer = FabricLayer()
    stack = source_stack()
    returns = tuple(layer.run_null_bank(source_bundle(f"b{i}"), stack).stabilized_return for i in range(4))
    trace = recursive_contraction_funnel(returns, (2, 1))
    final = trace.final_condition
    assert final is not None
    result = run_bound_condition_reentry(final, max_width=8)
    assert result.compilation.bundle.width == 8
    assert result.compilation.provenance["candidate_binary_space"] == "2^8"
    assert len(result.suite.families["dimension_null"].views) == 8
    assert math.isclose(sum(result.suite.stabilized_return.stabilized_distribution.probabilities), 1.0)
