from __future__ import annotations

from qcds_fabric.robots.legal.sweden_housing.emulation_projection import project_praxis_for_emulation
from qcds_fabric.robots.legal.sweden_housing.execution import (
    browser_emulation_resource_profile,
    central_emulation_resource_profile,
    macbook_emulation_resource_profile,
)


def _praxis() -> dict[str, object]:
    return {
        "praxis_id": "test-praxis",
        "precedents": [
            {
                "precedent_id": "P-A",
                "activation_terms": ["fact:a", "fact:b"],
                "counter_terms": [],
                "authority_weight": 0.8,
            },
            {
                "precedent_id": "P-B",
                "activation_terms": ["fact:a"],
                "counter_terms": [],
                "authority_weight": 1.0,
            },
            {
                "precedent_id": "P-C",
                "activation_terms": ["fact:a"],
                "counter_terms": [],
                "authority_weight": 0.5,
            },
            {
                "precedent_id": "P-INACTIVE",
                "activation_terms": ["fact:other"],
                "counter_terms": [],
                "authority_weight": 1.0,
            },
        ],
    }


def test_resource_profiles_scale_without_changing_qcds_semantics() -> None:
    browser = browser_emulation_resource_profile()
    macbook = macbook_emulation_resource_profile()
    central = central_emulation_resource_profile()

    assert browser.max_unknown_dimensions < macbook.max_unknown_dimensions < central.max_unknown_dimensions
    assert browser.grover_max_states < macbook.grover_max_states < central.grover_max_states
    assert browser.as_dict()["changes_qcds_semantics"] is False
    assert macbook.as_dict()["applies_to_quantum_full_space"] is False
    assert central.as_dict()["projection_allowed"] is True


def test_software_projection_is_explicit_deterministic_and_does_not_mutate_full_praxis() -> None:
    original = _praxis()
    original_ids = [row["precedent_id"] for row in original["precedents"]]  # type: ignore[index]

    projected, manifest = project_praxis_for_emulation(
        original,
        represented_terms=("fact:a", "fact:b"),
        statutory_unknown_dimensions=8,
        max_unknown_dimensions=10,
    )

    assert projected is not None
    assert manifest.status == "projected_for_resource_profile"
    assert manifest.executed_active_precedent_ids == ("P-A", "P-B")
    assert manifest.projected_out_active_precedent_ids == ("P-C",)
    assert manifest.as_dict()["truth_promoted_by_projection"] is False
    assert manifest.as_dict()["quantum_full_space_affected"] is False
    assert [row["precedent_id"] for row in original["precedents"]] == original_ids  # type: ignore[index]
    projected_ids = [row["precedent_id"] for row in projected["precedents"]]  # type: ignore[index]
    assert "P-INACTIVE" in projected_ids
    assert "P-C" not in projected_ids
