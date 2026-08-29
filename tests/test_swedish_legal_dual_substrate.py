from __future__ import annotations

from qcds_fabric.models import BaseBundle
from qcds_fabric.oracles import OracleStack
from qcds_fabric.robots.legal.sweden_housing.execution import (
    classical_exact_profile,
    grover_emulated_profile,
    profile_payload,
    run_profile,
)
from qcds_fabric.semantic import EvidenceOracle


def _small_problem() -> tuple[BaseBundle, OracleStack]:
    bundle = BaseBundle(
        bundle_id="dual-substrate-test",
        dimension_ids=("a", "b", "c"),
        values=("?", "?", "?"),
    )
    stack = OracleStack(
        stack_id="dual-substrate-test",
        version="1",
        oracles=(
            EvidenceOracle("e:a", "a", 1, 0.95, "test", "a is supported"),
            EvidenceOracle("e:b", "b", 1, 0.80, "test", "b is supported"),
        ),
    )
    return bundle, stack


def test_same_bundle_and_oracles_run_classical_exact_and_grover_emulated() -> None:
    bundle, stack = _small_problem()

    exact_profile, exact_fabric = classical_exact_profile()
    grover_profile, grover_fabric = grover_emulated_profile(max_states=64, max_iterations=4)

    exact = run_profile(exact_profile, exact_fabric, bundle, stack)
    grover = run_profile(grover_profile, grover_fabric, bundle, stack)

    assert exact.baseline_distribution.support == grover.baseline_distribution.support
    assert len(exact.baseline_distribution.support) == 8
    assert exact.baseline_distribution.provenance.get("kernel") == "classical_reference"
    assert grover.baseline_distribution.provenance.get("adaptive_grover_depth") is True

    exact_payload = profile_payload(exact_profile, exact)
    grover_payload = profile_payload(grover_profile, grover)
    assert exact_payload["profile_id"] == "classical_exact"
    assert grover_payload["profile_id"] == "grover_emulated"
    assert grover_payload["selected_grover_iterations"]
    assert grover_payload["native_qpu"] is False
    assert grover_payload["quantum_advantage_claim"] is False
