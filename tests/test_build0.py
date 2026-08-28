import math

import pytest

from qcds_fabric import (
    BaseBundle,
    ClassicalInferenceKernel,
    ExactOracle,
    FabricLayer,
    MaskOracle,
    OracleStack,
    logical_space_accounting,
)
from qcds_fabric.models import ChannelView


def bundle3(values=("?", "?", "?")):
    return BaseBundle("b", ("b0", "b1", "b2"), tuple(values), provenance={"source": "test"})


def stack(*oracles):
    return OracleStack("test-stack", "1", tuple(oracles))


def test_null_is_structurally_distinct_from_zero_and_wildcard():
    bundle = bundle3((0, "?", 1))
    view = ChannelView.null_dimension(bundle, 1, oracle_stack_version="s@1", oracle_ids=())
    assert view.present == (True, False, True)
    assert view.null_dimension_id == "b1"
    assert view.candidate_states() == ((0, -1, 1),)
    assert bundle.values[0] == 0
    assert bundle.values[1] == "?"


def test_full_null_bank_has_exactly_one_unique_absent_dimension_per_view():
    result = FabricLayer().run_null_bank(bundle3(), stack())
    assert len(result.null_views) == 3
    assert {v.null_dimension_id for v in result.null_views} == {"b0", "b1", "b2"}
    assert all(sum(not x for x in v.present) == 1 for v in result.null_views)


def test_same_oracle_regime_is_replicated_before_every_comparable_channel():
    oracle_stack = stack(ExactOracle("o1", {"b0": 1}))
    result = FabricLayer().run_null_bank(bundle3(), oracle_stack)
    expected = oracle_stack.identity
    assert result.baseline_view.active_oracle_stack_version == expected
    assert all(v.active_oracle_stack_version == expected for v in result.null_views)
    assert all(v.oracle_map == oracle_stack.oracle_ids for v in result.null_views)


def test_null_dimension_does_not_contribute_to_oracle_scoring_or_normalization():
    bundle = bundle3()
    oracle = ExactOracle("exact", {"b0": 1, "b1": 1})
    oracle_stack = stack(oracle)
    view = ChannelView.null_dimension(bundle, 0, oracle_stack_version=oracle_stack.identity, oracle_ids=oracle_stack.oracle_ids)
    distribution = ClassicalInferenceKernel().run(view, oracle_stack)
    active = [view.state_as_mapping(s) for s, p in zip(distribution.support, distribution.probabilities) if p > 0]
    assert active
    assert all(mapping["b1"] == 1 for mapping in active)
    assert all("b0" not in mapping for mapping in active)


def test_contradiction_is_explicit_not_a_hidden_peak():
    oracle_stack = stack(
        ExactOracle("requires-zero", {"b0": 0}),
        ExactOracle("requires-one", {"b0": 1}),
    )
    view = ChannelView.baseline(bundle3(), oracle_stack_version=oracle_stack.identity, oracle_ids=oracle_stack.oracle_ids)
    distribution = ClassicalInferenceKernel().run(view, oracle_stack)
    assert "all_candidate_states_rejected" in distribution.contradiction_markers
    assert distribution.normalization.startswith("explicit_global_contradiction")
    assert len(set(round(p, 12) for p in distribution.probabilities)) == 1


def test_stabilized_distribution_is_normalized_and_uncertainty_bearing():
    oracle_stack = stack(MaskOracle("mask", {"b0": 1, "b1": "?", "b2": 0}))
    result = FabricLayer().run_null_bank(bundle3(), oracle_stack)
    stabilized = result.stabilized_return.stabilized_distribution
    assert math.isclose(sum(stabilized.probabilities), 1.0)
    assert stabilized.entropy >= 0.0
    assert set(result.stabilized_return.per_dimension_influence) == {"b0", "b1", "b2"}
    assert result.stabilized_return.pruning_actions == ()


def test_logical_space_accounting_does_not_count_views_as_independent_dimensions():
    accounting = logical_space_accounting(B=8, G=64, Vd=8, Vp=2, Vo=3)
    assert accounting.independent_dimensions == 512
    assert accounting.execution_perspectives == 64 * 8 * 2 * 3
    assert accounting.candidate_binary_space_label == "2^512"


def test_invalid_condition_cannot_smuggle_null_into_base_bundle():
    with pytest.raises(ValueError):
        BaseBundle("bad", ("b0",), (None,))
