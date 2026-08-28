import math

import pytest

from qcds_fabric import (
    BaseBundle,
    ChannelView,
    DistributionStabilizer,
    ExactOracle,
    FabricLayer,
    MaskOracle,
    OracleStack,
    TruthDistribution,
    recursive_contraction_funnel,
)


def stack2():
    return OracleStack(
        "suite",
        "1",
        (
            ExactOracle("o0", {"b0": 1}),
            MaskOracle("o1", {"b1": 0}),
        ),
    )


def bundle2(bundle_id="b", values=("?", "?")):
    return BaseBundle(bundle_id, ("b0", "b1"), tuple(values), provenance={"source": "build2-test"})


def test_stabilized_rotation_suite_is_normalized_and_family_auditable():
    result = FabricLayer().run_stabilized_rotation_suite(bundle2(), stack2())
    stabilized = result.stabilized_return
    assert set(result.families) == {"dimension_null", "position", "oracle_exposure"}
    assert math.isclose(sum(stabilized.stabilized_distribution.probabilities), 1.0)
    assert stabilized.stabilized_distribution.normalization == "equal_family_mean_of_canonicalized_views"
    assert stabilized.provenance["family_weighting"] == "equal_family"
    assert stabilized.provenance["automatic_pruning"] is False
    assert set(stabilized.per_dimension_influence) == {"b0", "b1"}


def test_crossed_null_views_are_canonicalized_before_final_stabilization():
    result = FabricLayer().run_stabilized_rotation_suite(bundle2(), stack2(), include_crossed=True)
    crossed = result.families["crossed"]
    assert len(crossed.views) == 8
    support = result.stabilized_return.stabilized_distribution.support
    assert all(-1 not in state for state in support)
    assert math.isclose(sum(result.stabilized_return.stabilized_distribution.probabilities), 1.0)


def test_equal_family_weighting_is_not_hidden_view_count_weighting():
    bundle = BaseBundle("one", ("b0",), ("?",))
    view = ChannelView.baseline(bundle, oracle_stack_version="empty@1", oracle_ids=())
    support = ((0,), (1,))

    left = TruthDistribution(
        support=support,
        probabilities=(1.0, 0.0),
        raw_scores=(1.0, 0.0),
        top_k=((0,),),
        entropy=0.0,
        oracle_agreement=1.0,
        contradiction_markers=(),
        normalization="test",
        provenance={},
    )
    right = TruthDistribution(
        support=support,
        probabilities=(0.0, 1.0),
        raw_scores=(0.0, 1.0),
        top_k=((1,),),
        entropy=0.0,
        oracle_agreement=1.0,
        contradiction_markers=(),
        normalization="test",
        provenance={},
    )
    baseline = TruthDistribution(
        support=support,
        probabilities=(0.5, 0.5),
        raw_scores=(0.5, 0.5),
        top_k=support,
        entropy=1.0,
        oracle_agreement=1.0,
        contradiction_markers=(),
        normalization="test",
        provenance={},
    )

    stabilized = DistributionStabilizer().stabilize_families(
        bundle,
        baseline,
        {
            "family_many": ((view, left), (view, left), (view, left)),
            "family_one": ((view, right),),
        },
        oracle_stack_identity="empty@1",
    )
    assert stabilized.stabilized_distribution.probabilities == (0.5, 0.5)
    assert stabilized.comparison_metrics["family_many_view_count"] == 3.0
    assert stabilized.comparison_metrics["family_one_view_count"] == 1.0


def test_contraction_funnel_preserves_every_leaf_distribution_and_provenance():
    layer = FabricLayer()
    oracle_stack = stack2()
    returns = tuple(
        layer.run_stabilized_rotation_suite(bundle2(f"b{i}"), oracle_stack).stabilized_return
        for i in range(4)
    )

    trace = recursive_contraction_funnel(returns, (2, 1))
    assert [layer_result.output_count for layer_result in trace.layers] == [2, 1]
    final = trace.final_condition
    assert final is not None
    assert final.leaf_count == 4
    assert set(final.source_bundle_ids) == {"b0", "b1", "b2", "b3"}
    assert final.provenance["hard_collapse"] is False
    assert final.leaf_returns[0] is returns[0]
    expected_uncertainty = sum(item.retained_uncertainty for item in returns) / 4
    assert math.isclose(final.retained_uncertainty, expected_uncertainty)


def test_contraction_funnel_rejects_expansion():
    layer = FabricLayer()
    returns = (layer.run_null_bank(bundle2("only"), stack2()).stabilized_return,)
    with pytest.raises(ValueError, match="cannot expand"):
        recursive_contraction_funnel(returns, (2,))


def test_partial_funnel_can_stop_before_one_without_claiming_final_single_condition():
    layer = FabricLayer()
    oracle_stack = stack2()
    returns = tuple(layer.run_null_bank(bundle2(f"p{i}"), oracle_stack).stabilized_return for i in range(4))
    trace = recursive_contraction_funnel(returns, (2,))
    assert len(trace.final_conditions) == 2
    assert trace.final_condition is None
    assert sum(condition.leaf_count for condition in trace.final_conditions) == 4
