from __future__ import annotations

import pytest

from qcds_fabric.models import BaseBundle
from qcds_fabric.robots.legal.sweden_housing.execution import (
    classical_exact_profile,
    grover_emulated_profile,
    quantum_full_space_profile,
    run_profile,
    target_profile_payload,
    validate_execution_contract,
)
from qcds_fabric.oracles import OracleStack


def _bundle() -> BaseBundle:
    return BaseBundle(
        bundle_id="test-full-space",
        dimension_ids=("a", "b", "c", "d"),
        values=("?", "?", "?", "?"),
        provenance={"test": True},
        semantic_domain={"kind": "test"},
    )


def test_classical_and_grover_emulation_allow_resource_bounded_projection_policy() -> None:
    classical, _ = classical_exact_profile()
    grover, _ = grover_emulated_profile(max_states=16)

    assert classical.resource_bounded_emulation is True
    assert classical.semantic_projection_allowed is True
    assert grover.resource_bounded_emulation is True
    assert grover.semantic_projection_allowed is True

    # A resource-bounded emulator may intentionally receive a smaller active
    # projection than the total represented universe.
    validate_execution_contract(
        classical,
        represented_dimension_ids=("a", "b", "c", "d"),
        execution_dimension_ids=("a", "c"),
    )
    validate_execution_contract(
        grover,
        represented_dimension_ids=("a", "b", "c", "d"),
        execution_dimension_ids=("a", "c"),
    )


def test_quantum_full_space_forbids_semantic_prefiltering() -> None:
    quantum = quantum_full_space_profile()

    assert quantum.native_quantum_target is True
    assert quantum.semantic_projection_allowed is False
    assert quantum.resource_bounded_emulation is False
    assert quantum.requires_full_logical_universe is True

    validate_execution_contract(
        quantum,
        represented_dimension_ids=("a", "b", "c", "d"),
        execution_dimension_ids=("a", "b", "c", "d"),
    )

    with pytest.raises(ValueError, match="forbids semantic pre-filtering"):
        validate_execution_contract(
            quantum,
            represented_dimension_ids=("a", "b", "c", "d"),
            execution_dimension_ids=("a", "c"),
        )


def test_quantum_full_space_is_target_contract_not_fake_software_qpu() -> None:
    quantum = quantum_full_space_profile()
    payload = target_profile_payload(quantum)

    assert payload["status"] == "target_contract_only"
    assert payload["native_qpu_connected"] is False
    assert payload["requires_full_logical_universe"] is True
    assert payload["semantic_projection_allowed"] is False

    with pytest.raises(NotImplementedError, match="no physical QPU backend"):
        # Deliberately pass a classical FabricLayer-shaped object only to prove
        # the quantum target cannot accidentally execute through emulation.
        _, classical_fabric = classical_exact_profile()
        run_profile(quantum, classical_fabric, _bundle(), OracleStack("empty", "1", ()))
