from __future__ import annotations

import json
from pathlib import Path

from qcds_fabric.living_robot_legal_qcds import living_robot_legal_qcds_html
from qcds_fabric.robots.legal.sweden_housing.robot import (
    SwedishHousingAssessmentRobot,
    load_legal_praxis,
    run_case_json,
)


ROOT = Path(__file__).resolve().parents[1]


def test_public_web_adds_real_legal_world_without_removing_existing_lab() -> None:
    html = living_robot_legal_qcds_html(static_mode=True)

    assert "TRY SWEDISH LAW" in html
    assert "SPECIALIZED LOGICAL ROBOT · SWEDISH HOUSING LAW" in html
    assert "SFS · HD · SVEA · QCDS" in html
    assert "OPEN ADVANCED LOGICAL SPACE LAB" in html
    assert "TRY BIOLOGY" in html
    assert "TRY ROBOTICS" in html
    assert "runLegalCase" in html
    assert "legal_run" in html


def test_legal_web_explains_direct_qcds_and_exposes_all_fifteen_cases() -> None:
    html = living_robot_legal_qcds_html(static_mode=True)

    for phrase in (
        "1 · CASE FACTS",
        "2 · LEGAL GATE",
        "3 · HARD RULES",
        "4 · ASSESSMENT ZONE",
        "5 · PRAXIS",
        "DIRECT QCDS → LEGAL SYNTRACT",
        "CONDITION FORMATION",
        "CONDITIONAL EVOLUTION",
        "2^N INFERENCE",
        "TRUTH ALIGNMENT",
        "Statutory Syntract",
        "Final Legal Syntract",
        "DistributionOracle",
        "actual states",
        "live ? dimensions",
        "CSV in RAM",
        "authority ≠ factual similarity ≠ outcome",
        "rules used in this case",
        "represented decisions",
        "active decisions",
        "active praxis space",
        "The robot deliberately refuses to collapse",
        "the displayed statutory rule path is Condition Formation/provenance, not the final QCDS answer.",
    ):
        assert phrase in html

    fixtures = (
        "new_private_let_2026.json",
        "legacy_private_let_2026.json",
        "jordabalk_12_fallback_2026.json",
        "material_defect_praxis_2026.json",
        "jb_unauthorized_sublet_forfeiture_2026.json",
        "jb_late_rent_recovery_2026.json",
        "jb_extension_renovation_balance_2026.json",
        "jb_excess_second_hand_rent_2026.json",
        "jb_outsider_reasonableness_2026.json",
        "jb_second_hand_permission_2026.json",
        "jb_disturbance_after_warning_2026.json",
        "jb_access_refusal_rectified_2026.json",
        "jb_transfer_unreasonable_refusal_2026.json",
        "jb_apartment_exchange_2026.json",
        "jb_damage_evidence_2026.json",
    )
    assert len(fixtures) == 15
    for fixture in fixtures:
        assert f"runLegalCase('{fixture}')" in html
        assert f"'{fixture}':" in html

    for title in (
        "Disturbance after warning",
        "Refused access, then rectified",
        "Unreasonable refusal to transfer",
        "Apartment exchange",
        "Damage without invented negligence",
    ):
        assert title in html


def test_browser_worker_routes_legal_run_to_packaged_python_robot() -> None:
    worker = (ROOT / "web" / "session_core_worker.js").read_text(encoding="utf-8")

    assert "run_swedish_housing_case_json" in worker
    assert "qcds_fabric.robots.legal.sweden_housing.robot" in worker
    assert "msg.type !== 'run' && msg.type !== 'legal_run'" in worker
    assert "run_session_json" in worker


def test_pages_packages_recursive_python_direct_qcds_and_case_fixtures() -> None:
    workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")

    assert "python -m qcds_fabric.living_robot_legal_full_qcds" in workflow
    assert "root.rglob('*')" in workflow
    assert "path.suffix in {'.py', '.json'}" in workflow
    assert "robots/legal/sweden_housing/cases/*.json" in workflow


def test_praxis_has_grown_with_recent_hd_and_svea_material() -> None:
    praxis = load_legal_praxis()
    ids = {row["precedent_id"] for row in praxis["precedents"]}

    assert len(ids) >= 16
    assert "NJA-2024-657" in ids
    assert "NJA-2025-515" in ids
    assert "SVEA-OH-9160-21" in ids
    assert "SVEA-H-14449-22" in ids
    assert "SVEA-OH-4781-18" in ids
    assert "SVEA-OH-11710-21" in ids
    assert "SVEA-OH-9885-20" in ids
    assert "SVEA-OH-10365-19" in ids


def test_material_defect_fixture_runs_direct_qcds_plus_active_praxis_path() -> None:
    case = json.loads(
        (ROOT / "robots" / "legal" / "sweden_housing" / "cases" / "material_defect_praxis_2026.json").read_text(encoding="utf-8")
    )
    result = SwedishHousingAssessmentRobot().run_case(case).as_dict()
    praxis = result["praxis_assessment"]
    qcds = result["qcds_core"]
    matched = {row["precedent_id"] for row in praxis["matched_precedents"]}

    assert result["primary_regimes"] == ["privatuthyrningslag_2026_772"]
    assert "tenant_immediate_termination_ground_material_defect" in result["conclusions"]
    assert "NJA-2022-188" in matched
    assert "NJA-2019-445" in matched
    assert "NJA-2024-657" in matched
    assert praxis["qcds_execution"] == "qcds_fabric.problem.problem_to_syntract"
    assert praxis["final_syntract_produced_here"] is False
    assert praxis["active_precedent_count"] < praxis["represented_precedent_count"]
    assert len(praxis["stabilized_relevance"]) == praxis["active_precedent_count"]
    assert qcds["core_execution"] == "qcds_fabric.FabricLayer.run_stabilized_rotation_suite"
    assert qcds["reentered_statutory_syntract"] is True
    assert qcds["active_precedent_ids"]


def test_json_bridge_returns_same_specialized_robot_shape() -> None:
    case = json.loads(
        (ROOT / "robots" / "legal" / "sweden_housing" / "cases" / "new_private_let_2026.json").read_text(encoding="utf-8")
    )
    result = json.loads(run_case_json(json.dumps(case)))

    assert result["architecture_boundary"]["talks_to_qcds_core"] is True
    assert result["architecture_boundary"]["qcds_core_modified"] is False
    assert "praxis_assessment" in result
    assert result["qcds_core"]["direct_qcds_base_bundle"] is True
    assert result["qcds_core"]["csv_in_memory"] is True
    assert result["legal_boundary"]["not_legal_advice"] is True
    assert result["legal_boundary"]["open_textured_standards_remain_assessment_questions"] is True
    assert result["corpus_stats"]["section_count"] >= 44
    assert result["corpus_stats"]["rule_count"] >= 45
