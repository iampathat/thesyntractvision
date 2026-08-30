from __future__ import annotations

import json
from pathlib import Path

from qcds_fabric.living_robot_public_fix49 import living_robot_public_fix49_html
from qcds_fabric.robots.legal.sweden_housing.quick_question import run_public_question


CASE = Path("robots/legal/sweden_housing/cases/jb_unauthorized_sublet_forfeiture_2026.json")


def test_public_legal_question_uses_bounded_qcds_path_not_full_research_pass() -> None:
    payload = json.loads(CASE.read_text(encoding="utf-8"))
    payload["question"] = "Can the tenancy be forfeited because of this unauthorized second-hand sublet?"

    result = run_public_question(payload)

    assert result["public_execution_profile"] == "bounded_legal_question"
    assert result["full_praxis_pass_executed"] is False
    assert result["full_dual_substrate_pass_executed"] is False
    assert result["canonical_qcds_core_modified"] is False
    assert result["question_ingress"]["recognized"] is True
    assert result["question_ingress"]["logical_scope_terms"] == ["issue:forfeiture"]
    assert result["question_ingress"]["path"] == "question/material -> translator -> Logical Space -> oracle filters -> QCDS four phases -> TruthDistribution -> Syntract"
    assert result["qcds_core"]["core_execution"] == "qcds_fabric.problem.problem_to_syntract"
    assert result["qcds_core"]["syntract_id"]
    assert "jordabalk_12" in result["primary_regimes"]
    assert result["applied_rules"]


def test_public_legal_run_question_has_visible_inline_feedback_and_fast_worker_route() -> None:
    html = living_robot_public_fix49_html(static_mode=True)

    assert 'id="publicLegalInlineStatus"' in html
    assert 'id="publicLegalQuickResult"' in html
    assert "legal_question_run" in html
    assert "window.publicRunLegalQuestion=async function" in html
    assert "Loading the represented material" in html
    assert "Translating the question into legal scope" in html
    assert "Running the bounded legal Logical Space through QCDS" in html
    assert "SHOW / HIDE QCDS DETAILS" in html
    assert "full praxis/dual-substrate research pass: not run by this button" in html
    assert "No second null percentage is presented as another answer" in html
