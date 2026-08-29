from __future__ import annotations

import json
from pathlib import Path

from qcds_fabric.living_robot_legal import living_robot_legal_html
from qcds_fabric.robots.legal.sweden_housing.robot import (
    SwedishHousingAssessmentRobot,
    load_legal_praxis,
    run_case_json,
)


ROOT = Path(__file__).resolve().parents[1]


def test_public_web_adds_real_legal_world_without_removing_existing_lab() -> None:
    html = living_robot_legal_html(static_mode=True)

    assert "TRY SWEDISH LAW" in html
    assert "SPECIALIZED LOGICAL ROBOT · SWEDISH HOUSING LAW" in html
    assert "SFS + PRAXIS + QCDS" in html
    assert "OPEN ADVANCED LOGICAL SPACE LAB" in html
    assert "TRY BIOLOGY" in html
    assert "TRY ROBOTICS" in html
    assert "runLegalCase" in html
    assert "legal_run" in html


def test_browser_worker_routes_legal_run_to_packaged_python_robot() -> None:
    worker = (ROOT / "web" / "session_core_worker.js").read_text(encoding="utf-8")

    assert "run_swedish_housing_case_json" in worker
    assert "qcds_fabric.robots.legal.sweden_housing.robot" in worker
    assert "msg.type !== 'run' && msg.type !== 'legal_run'" in worker
    assert "run_session_json" in worker


def test_pages_packages_recursive_python_legal_data_and_case_fixtures() -> None:
    workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")

    assert "python -m qcds_fabric.living_robot_legal" in workflow
    assert "root.rglob('*')" in workflow
    assert "path.suffix in {'.py', '.json'}" in workflow
    assert "robots/legal/sweden_housing/cases/*.json" in workflow


def test_praxis_has_grown_with_recent_hd_precedents() -> None:
    praxis = load_legal_praxis()
    ids = {row["precedent_id"] for row in praxis["precedents"]}

    assert len(ids) >= 7
    assert "NJA-2024-657" in ids
    assert "NJA-2025-515" in ids


def test_material_defect_fixture_runs_full_statute_plus_praxis_path() -> None:
    case = json.loads(
        (ROOT / "robots" / "legal" / "sweden_housing" / "cases" / "material_defect_praxis_2026.json").read_text(encoding="utf-8")
    )
    result = SwedishHousingAssessmentRobot().run_case(case).as_dict()
    matched = {row["precedent_id"] for row in result["praxis_assessment"]["matched_precedents"]}

    assert result["primary_regimes"] == ["privatuthyrningslag_2026_772"]
    assert "tenant_immediate_termination_ground_material_defect" in result["conclusions"]
    assert "NJA-2022-188" in matched
    assert "NJA-2019-445" in matched
    assert "NJA-2024-657" in matched
    assert result["praxis_assessment"]["qcds_execution"] == "qcds_fabric.problem.problem_to_syntract"


def test_json_bridge_returns_same_specialized_robot_shape() -> None:
    case = json.loads(
        (ROOT / "robots" / "legal" / "sweden_housing" / "cases" / "new_private_let_2026.json").read_text(encoding="utf-8")
    )
    result = json.loads(run_case_json(json.dumps(case)))

    assert result["architecture_boundary"]["talks_to_qcds_core"] is True
    assert result["architecture_boundary"]["qcds_core_modified"] is False
    assert "praxis_assessment" in result
    assert result["legal_boundary"]["not_legal_advice"] is True
