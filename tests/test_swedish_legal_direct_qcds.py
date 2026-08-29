from __future__ import annotations

import json
from pathlib import Path

from qcds_fabric.robots.legal.sweden_housing.robot import SwedishHousingAssessmentRobot


ROOT = Path(__file__).resolve().parents[1]
CASES = ROOT / "robots" / "legal" / "sweden_housing" / "cases"


def _run(name: str) -> dict[str, object]:
    case = json.loads((CASES / name).read_text(encoding="utf-8"))
    return SwedishHousingAssessmentRobot().run_case(case).as_dict()


def test_jordabalk_case_is_real_binary_qcds_space_not_regime_projection() -> None:
    result = _run("jb_late_rent_recovery_2026.json")
    qcds = result["qcds_core"]

    assert qcds["core_execution"] == "qcds_fabric.FabricLayer.run_stabilized_rotation_suite"
    assert qcds["direct_qcds_base_bundle"] is True
    assert qcds["csv_in_memory"] is True
    assert qcds["candidate_state_count"] == 2 ** qcds["unknown_dimension_count"]
    assert qcds["candidate_state_count"] > 1
    assert qcds["candidate_binary_space"] == f"2^{qcds['unknown_dimension_count']}"
    assert qcds["oracle_count"] >= 2

    terms = {row["term"] for row in qcds["marginals"]}
    assert "conclusion:jb12_forfeiture_ground_late_residential_rent" in terms
    assert "conclusion:jb12_late_rent_tenancy_recovered_under_represented_section44_conditions" in terms

    # The old narrow regime pass survives only as a diagnostic/provenance object.
    assert result["statutory_regime_projection"]["core_execution"] == "qcds_fabric.problem.problem_to_syntract"
    assert result["swarm_packet"]["syntract_id"] == qcds["syntract_id"]
    assert result["assessment_model"]["final_answer_is_qcds_distribution"] is True
    assert result["assessment_model"]["statutory_result_preserved"] is False


def test_open_assessment_remains_a_live_qcds_dimension_when_rule_path_uses_it() -> None:
    qcds = _run("jb_apartment_exchange_2026.json")["qcds_core"]
    terms = {row["term"] for row in qcds["marginals"]}

    assert "question:jb35_exchange_requires_noteworthy_reasons_landlord_inconvenience_compensation_and_residence_duration_checks" in terms
    assert any(row["kind"] == "assessment" for row in qcds["marginals"])


def test_material_defect_reenters_statutory_syntract_and_expands_with_praxis() -> None:
    result = _run("material_defect_praxis_2026.json")
    qcds = result["qcds_core"]

    assert qcds["reentered_statutory_syntract"] is True
    assert qcds["syntract_id"].endswith(":final")
    assert qcds["statutory_syntract_id"].endswith(":statutory")
    assert qcds["syntract_id"] != qcds["statutory_syntract_id"]
    assert qcds["candidate_state_count"] == 2 ** qcds["unknown_dimension_count"]
    assert qcds["candidate_state_count"] >= qcds["statutory_pass"]["candidate_state_count"]
    assert qcds["active_precedent_ids"]

    terms = {row["term"] for row in qcds["marginals"]}
    assert "conclusion:tenant_immediate_termination_ground_material_defect" in terms
    assert any(term.startswith("precedent:") for term in terms)


def test_qcds_provenance_exposes_all_four_canonical_phases() -> None:
    qcds = _run("jb_apartment_exchange_2026.json")["qcds_core"]

    phases = qcds["phases"]
    assert set(phases) == {
        "1_condition_formation",
        "2_conditional_evolution",
        "3_recursive_inference",
        "4_truth_alignment_verification",
    }
    assert "2^N" in phases["3_recursive_inference"]
    assert qcds["canonical_spec_modified"] is False
