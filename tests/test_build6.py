import math

import pytest

from qcds_fabric import (
    BaseBundle,
    ChannelView,
    ClassicalInferenceKernel,
    DistributionOracle,
    ExactOracle,
    FabricLayer,
    InferenceSubstrate,
    OracleStack,
    StatevectorGroverSubstrate,
    run_substrate_benchmark,
)


def bundle2(bundle_id="b"):
    return BaseBundle(bundle_id, ("b0", "b1"), ("?", "?"))


def target_stack():
    return OracleStack(
        "target",
        "1",
        (ExactOracle("target-state", {"b0": 1, "b1": 0}),),
    )


def test_classical_kernel_satisfies_explicit_substrate_interface():
    kernel = ClassicalInferenceKernel()
    assert isinstance(kernel, InferenceSubstrate)
    assert kernel.substrate_id == "classical"


def test_one_grover_iteration_amplifies_one_marked_state_in_four_state_space():
    bundle = bundle2()
    stack = target_stack()
    view = ChannelView.baseline(
        bundle,
        oracle_stack_version=stack.identity,
        oracle_ids=stack.oracle_ids,
    )
    substrate = StatevectorGroverSubstrate(iterations=1)
    distribution = substrate.run(view, stack)
    observed = dict(zip(distribution.support, distribution.probabilities))

    assert math.isclose(observed[(1, 0)], 1.0, abs_tol=1e-12)
    assert distribution.top_k[0] == (1, 0)
    assert distribution.provenance["kernel"] == "statevector_grover_reference"
    assert distribution.provenance["native_qpu"] is False
    assert distribution.provenance["quantum_advantage_claim"] is False


def test_weighted_phase_statevector_output_remains_normalized():
    bundle = bundle2("weighted")
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
    view = ChannelView.baseline(
        bundle,
        oracle_stack_version=stack.identity,
        oracle_ids=stack.oracle_ids,
    )
    distribution = StatevectorGroverSubstrate(iterations=1).run(view, stack)

    assert math.isclose(sum(distribution.probabilities), 1.0, abs_tol=1e-12)
    assert distribution.normalization == "statevector_grover_probability"
    assert distribution.provenance["phase_policy"] == "phase_scale_times_score_over_view_max_score"


def test_statevector_preserves_explicit_contradiction_state():
    bundle = bundle2("contradiction")
    stack = OracleStack(
        "conflict",
        "1",
        (
            ExactOracle("zero", {"b0": 0}),
            ExactOracle("one", {"b0": 1}),
        ),
    )
    view = ChannelView.baseline(
        bundle,
        oracle_stack_version=stack.identity,
        oracle_ids=stack.oracle_ids,
    )
    distribution = StatevectorGroverSubstrate().run(view, stack)

    assert distribution.contradiction_markers == ("all_candidate_states_rejected",)
    assert len({round(p, 12) for p in distribution.probabilities}) == 1


def test_fabric_retargets_every_view_to_selected_statevector_substrate():
    substrate = StatevectorGroverSubstrate(iterations=1)
    result = FabricLayer(kernel=substrate).run_null_bank(bundle2("retarget"), target_stack())

    assert result.baseline_view.substrate_target == substrate.substrate_id
    assert all(view.substrate_target == substrate.substrate_id for view in result.null_views)
    assert all(
        view.transformation_provenance["substrate_target"] == substrate.substrate_id
        for view in result.null_views
    )


def test_same_fabric_topology_runs_on_classical_and_statevector_substrates():
    bundle = bundle2("same-topology")
    stack = target_stack()
    classical = FabricLayer(kernel=ClassicalInferenceKernel()).run_stabilized_rotation_suite(
        bundle,
        stack,
        include_positional=True,
        include_oracle_exposure=True,
        include_crossed=False,
    )
    statevector = FabricLayer(kernel=StatevectorGroverSubstrate(iterations=1)).run_stabilized_rotation_suite(
        bundle,
        stack,
        include_positional=True,
        include_oracle_exposure=True,
        include_crossed=False,
    )

    assert tuple(classical.families) == tuple(statevector.families)
    assert {
        name: len(bank.views) for name, bank in classical.families.items()
    } == {
        name: len(bank.views) for name, bank in statevector.families.items()
    }
    assert classical.baseline_view.substrate_target == "classical"
    assert statevector.baseline_view.substrate_target == "statevector_grover_simulator"


def test_substrate_benchmark_holds_topology_fixed_and_assumes_no_winner():
    bundle = bundle2("benchmark")
    stack = target_stack()
    report = run_substrate_benchmark(
        bundle,
        stack,
        {(1, 0): 1.0},
        include_positional=False,
        include_oracle_exposure=False,
        include_crossed=False,
    )

    assert set(report.by_name) == {"classical_reference", "statevector_grover_m1"}
    assert report.provenance["same_conditions"] is True
    assert report.provenance["same_oracle_regime"] is True
    assert report.provenance["same_rotation_topology"] is True
    assert report.provenance["superiority_assumed"] is False
    assert report.provenance["quantum_advantage_claim"] is False
    assert set(report.pairwise_baseline_l1) == {
        "classical_reference::statevector_grover_m1"
    }
    assert set(report.pairwise_stabilized_l1) == {
        "classical_reference::statevector_grover_m1"
    }


def test_statevector_guard_prevents_accidental_simulator_explosion():
    bundle = BaseBundle("wide", ("b0", "b1", "b2"), ("?", "?", "?"))
    stack = OracleStack("empty", "1", ())
    view = ChannelView.baseline(
        bundle,
        oracle_stack_version=stack.identity,
        oracle_ids=stack.oracle_ids,
    )
    with pytest.raises(ValueError, match="exceeds max_states"):
        StatevectorGroverSubstrate(max_states=4).run(view, stack)
