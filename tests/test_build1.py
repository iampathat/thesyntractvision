import math

import pytest

from qcds_fabric import (
    BaseBundle,
    ChannelView,
    ClassicalInferenceKernel,
    ExactOracle,
    FabricLayer,
    MaskOracle,
    OracleStack,
    circular_oracle_maps,
    circular_position_maps,
)


def bundle2(values=("?", "?")):
    return BaseBundle("b2", ("b0", "b1"), tuple(values), provenance={"source": "build1-test"})


def stack2():
    return OracleStack(
        "stack",
        "1",
        (
            ExactOracle("o0", {"b0": 1}),
            MaskOracle("o1", {"b1": 0}),
        ),
    )


def test_circular_position_maps_are_complete_permutations():
    maps = circular_position_maps(3)
    assert len(maps) == 3
    assert len(set(maps)) == 3
    assert all(sorted(m) == [0, 1, 2] for m in maps)


def test_positional_rotation_preserves_canonical_distribution_on_unbiased_kernel():
    oracle_stack = stack2()
    result = FabricLayer().run_positional_bank(bundle2(), oracle_stack)
    assert len(result.views) == 2
    assert len({view.position_map for view in result.views}) == 2
    first = result.distributions[0]
    assert all(distribution.support == first.support for distribution in result.distributions)
    assert all(distribution.probabilities == first.probabilities for distribution in result.distributions)
    assert math.isclose(result.diagnostics["entropy_spread"], 0.0)
    assert math.isclose(result.diagnostics["oracle_agreement_spread"], 0.0)


def test_oracle_exposure_rotation_is_same_stack_different_order():
    oracle_stack = stack2()
    maps = circular_oracle_maps(oracle_stack.oracle_ids)
    assert maps == (("o0", "o1"), ("o1", "o0"))
    result = FabricLayer().run_oracle_exposure_bank(bundle2(), oracle_stack)
    assert {view.oracle_map for view in result.views} == set(maps)
    assert all(view.active_oracle_stack_version == oracle_stack.identity for view in result.views)
    first = result.distributions[0]
    assert all(distribution.probabilities == first.probabilities for distribution in result.distributions)


def test_stabilized_suite_reuses_exact_classical_position_and_oracle_invariances():
    result = FabricLayer(kernel=ClassicalInferenceKernel()).run_stabilized_rotation_suite(bundle2(), stack2())

    # Exact unbiased reference only: all requested views remain represented, but
    # position/oracle-order views may reuse the mathematically identical baseline.
    assert len(result.families["position"].views) == 2
    assert len(result.families["oracle_exposure"].views) == 2
    assert all(
        distribution.provenance.get("equivalent_classical_rotation_reuse") is True
        for distribution in result.families["position"].distributions
    )
    assert all(
        distribution.provenance.get("equivalent_classical_rotation_reuse") is True
        for distribution in result.families["oracle_exposure"].distributions
    )
    assert result.families["position"].diagnostics["view_count"] == 2.0
    assert result.families["oracle_exposure"].diagnostics["view_count"] == 2.0


def test_classical_subclass_executes_every_rotation_for_bias_diagnostics():
    calls: list[ChannelView] = []

    class CountingClassicalKernel(ClassicalInferenceKernel):
        def run(self, view, oracle_stack):
            calls.append(view)
            return super().run(view, oracle_stack)

    result = FabricLayer(kernel=CountingClassicalKernel()).run_stabilized_rotation_suite(bundle2(), stack2())

    # Baseline + 2 null + 2 position + 2 oracle-exposure. Subclasses are never
    # assumed unbiased, so they must execute every requested diagnostic view.
    assert len(calls) == 7
    assert all(
        distribution.provenance.get("equivalent_classical_rotation_reuse") is not True
        for distribution in result.families["position"].distributions
    )
    assert all(
        distribution.provenance.get("equivalent_classical_rotation_reuse") is not True
        for distribution in result.families["oracle_exposure"].distributions
    )


def test_crossed_bank_preserves_null_position_and_oracle_provenance():
    oracle_stack = stack2()
    result = FabricLayer().run_crossed_bank(bundle2(), oracle_stack)
    # B null choices × B positional rotations × O oracle rotations = 2×2×2.
    assert len(result.views) == 8
    assert result.diagnostics["view_count"] == 8.0
    assert {view.null_dimension_id for view in result.views} == {"b0", "b1"}
    for view in result.views:
        provenance = view.transformation_provenance
        assert provenance["rotation"] == "crossed"
        assert "dimension_null" in provenance["axes"]
        assert "position" in provenance["axes"]
        assert "oracle_exposure" in provenance["axes"]
        assert provenance["position_map"] == view.position_map
        assert provenance["oracle_map"] == view.oracle_map


def test_null_absence_stays_on_canonical_dimension_when_position_rotates():
    oracle_stack = stack2()
    view = ChannelView.transformed(
        bundle2(),
        oracle_stack_version=oracle_stack.identity,
        oracle_ids=oracle_stack.oracle_ids,
        null_index=0,
        position_map=(1, 0),
    )
    assert view.execution_slot_for_dimension(0) == 1
    assert view.canonical_index_at_slot(1) == 0
    assert all(state[0] == -1 for state in view.candidate_states())
    assert all("b0" not in view.state_as_mapping(state) for state in view.candidate_states())


def test_oracle_stack_identity_mismatch_fails_closed():
    oracle_stack = stack2()
    view = ChannelView.baseline(
        bundle2(),
        oracle_stack_version="other@99",
        oracle_ids=oracle_stack.oracle_ids,
    )
    with pytest.raises(ValueError, match="expected"):
        oracle_stack.score(view, (0, 0))
