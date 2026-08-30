from __future__ import annotations

import json
from pathlib import Path

from qcds_fabric.living_robot_public import living_robot_public_html
from qcds_fabric.robots.legal.sweden_housing.quick_question import run_public_question
from qcds_fabric.session_sandbox_core import run_session


ROOT = Path(__file__).resolve().parents[1]
CASES = ROOT / "robots" / "legal" / "sweden_housing" / "cases"
WORKER = ROOT / "web" / "session_core_worker.js"

LEGAL_QUESTIONS = {
    "jb_unauthorized_sublet_forfeiture_2026.json": "Can the tenancy be forfeited because of this unauthorized second-hand sublet?",
    "jb_late_rent_recovery_2026.json": "Can late rent forfeit the tenancy, and can the represented recovery rule restore it?",
    "jb_extension_renovation_balance_2026.json": "Can the tenant retain or extend the tenancy despite the planned major renovation?",
    "jb_second_hand_permission_2026.json": "Can the tenant obtain permission for this second-hand sublet?",
    "material_defect_praxis_2026.json": "What legal consequences follow from the represented material defect?",
    "jb_excess_second_hand_rent_2026.json": "Is the second-hand rent excessive and can repayment be required?",
    "new_private_let_2026.json": "Which legal regime governs this new private residential letting?",
    "legacy_private_let_2026.json": "Which legal regime governs this private residential letting contract made before the 2026 reform?",
}


def test_deployed_worker_supports_every_public_qcds_message_route() -> None:
    html = living_robot_public_html(static_mode=True)
    worker = WORKER.read_text(encoding="utf-8")

    for message_type in ("run", "legal_question_run", "legal_run"):
        assert f"type:'{message_type}'" in html or f'type: "{message_type}"' in html
        assert f"msg.type !== '{message_type}'" in worker or f"msg.type === '{message_type}'" in worker

    assert "run_session_json" in worker
    assert "run_swedish_housing_question_json" in worker
    assert "run_swedish_housing_case_json" in worker
    assert "qcds_fabric.zip" in html
    assert "session_core_worker.js" in html


def test_every_legal_question_dropdown_case_runs_through_bounded_qcds_path() -> None:
    html = living_robot_public_html(static_mode=True)

    for filename, question in LEGAL_QUESTIONS.items():
        assert f'<option value="{filename}">' in html
        payload = json.loads((CASES / filename).read_text(encoding="utf-8"))
        payload["question"] = question
        result = run_public_question(payload)

        assert result["public_execution_profile"] == "bounded_legal_question", filename
        assert result["full_praxis_pass_executed"] is False, filename
        assert result["full_dual_substrate_pass_executed"] is False, filename
        assert result["canonical_qcds_core_modified"] is False, filename
        assert result["qcds_core"]["core_execution"] == "qcds_fabric.problem.problem_to_syntract", filename
        assert result["qcds_core"]["syntract_id"], filename
        assert result["applied_rules"], filename


def test_pick_a_world_public_worker_target_runs_one_truth_distribution() -> None:
    request = {
        "space": {
            "domain_id": "public-runtime-contract",
            "title": "Public runtime contract",
            "tagline": "One Logical Space, competing worlds.",
            "audience": "Public demo",
            "universe_mode": "simulation",
            "description": "Representative public Pick a World runtime contract.",
            "challenge": "Which represented world best survives the translated constraints?",
            "learning_target": "One distribution, one leader.",
            "explore_prompt": "Preserve uncertainty across all candidates.",
            "observations": [
                {"binding_id": "oracle-001", "terms": ["system", "obstacle", "low"], "source_id": "translator:1", "confidence": 1.0},
                {"binding_id": "oracle-002", "terms": ["system", "traction", "high"], "source_id": "translator:2", "confidence": 1.0},
                {"binding_id": "oracle-003", "terms": ["system", "visibility", "clear"], "source_id": "translator:3", "confidence": 1.0},
                {"binding_id": "oracle-004", "terms": ["system", "human-zone", "clear"], "source_id": "translator:4", "confidence": 1.0},
            ],
            "starter_rules": [],
            "truth_boundary": {"external_truth_claim": False, "solution_rule_supplied": False, "starting_lab_modifies_reality": False},
        },
        "probe": {"subject": "system", "predicate": "world", "candidate_values": ["alpha", "beta", "gamma", "delta"]},
        "evidence": [
            {"subject": "system", "predicate": "world", "value": "alpha", "source_id": "translator:world:1", "confidence": 0.96, "polarity": True},
            {"subject": "system", "predicate": "world", "value": "beta", "source_id": "translator:world:2", "confidence": 0.78, "polarity": True},
            {"subject": "system", "predicate": "world", "value": "gamma", "source_id": "translator:world:3", "confidence": 0.66, "polarity": True},
            {"subject": "system", "predicate": "world", "value": "delta", "source_id": "translator:world:4", "confidence": 0.55, "polarity": True},
        ],
        "max_width": 20,
    }

    result = run_session(request)

    assert result["logical_width"] == 4
    assert len(result["baseline"]) == 4
    assert len(result["stabilized"]) == 4
    assert len(result["leading_candidates"]) == 1
    assert result["truth_effect_on_reality"] == 0
