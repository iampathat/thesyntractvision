from __future__ import annotations

import json
from pathlib import Path

from qcds_fabric.legal_assessment_robot import SwedishHousingAssessmentRobot
from qcds_fabric.legal_logical_robot import load_legal_corpus


ROOT = Path(__file__).resolve().parents[1]
CASES = ROOT / "robots" / "legal" / "sweden_housing" / "cases"


def _case(name: str) -> dict[str, object]:
    return json.loads((CASES / name).read_text(encoding="utf-8"))


def _run(name: str) -> dict[str, object]:
    return SwedishHousingAssessmentRobot().run_case(_case(name)).as_dict()


def test_default_corpus_merges_chapter12_expansion_without_replacing_base() -> None:
    corpus = load_legal_corpus()

    assert corpus["corpus_id"] == "swedish-housing-law-2026-08-29"
    assert "swedish-housing-jb12-core-2026-08-29" in corpus["expansion_ids"]
    section_ids = {row["section_id"] for row in corpus["sections"]}
    rule_ids = {row["rule_id"] for row in corpus["rules"]}
    assert {"JB-12:39", "JB-12:40", "JB-12:41", "JB-12:42", "JB-12:43", "JB-12:44", "JB-12:46", "JB-12:55", "JB-12:55f"} <= section_ids
    assert {"jb-unauthorized-second-hand-forfeiture-ground", "jb-residential-rent-recovered", "jb-extension-major-renovation-assessment", "jb-excess-second-hand-rent"} <= rule_ids
    assert len(corpus["sections"]) >= 35
    assert len(corpus["rules"]) >= 30


def test_unauthorized_second_hand_case_combines_hard_rule_with_open_checks() -> None:
    result = _run("jb_unauthorized_sublet_forfeiture_2026.json")

    assert result["primary_regimes"] == ["jordabalk_12"]
    assert "jb12_independent_second_hand_use_requires_consent_or_permission" in result["conclusions"]
    assert "jb12_forfeiture_ground_unauthorized_second_hand_use" in result["conclusions"]
    assert "jb42_minor_significance_and_jb43_time_limits_still_require_check" in result["unresolved_questions"]
    matched = {row["precedent_id"] for row in result["praxis_assessment"]["matched_precedents"]}
    assert "SVEA-OH-9160-21" in matched


def test_late_rent_case_can_hold_forfeiture_and_recovery_together() -> None:
    result = _run("jb_late_rent_recovery_2026.json")

    assert result["primary_regimes"] == ["jordabalk_12"]
    assert "jb12_forfeiture_ground_late_residential_rent" in result["conclusions"]
    assert "jb12_late_rent_tenancy_recovered_under_represented_section44_conditions" in result["conclusions"]
    assert "jb44_recovery_may_restore_tenancy_if_notice_and_payment_conditions_are_met" in result["unresolved_questions"]


def test_major_renovation_case_preserves_reasonableness_balance() -> None:
    result = _run("jb_extension_renovation_balance_2026.json")

    assert result["primary_regimes"] == ["jordabalk_12"]
    assert "jb12_extension_right_exists_subject_to_section46_exceptions" in result["conclusions"]
    assert "jb12_tenant_may_remain_while_extension_dispute_is_pending_subject_to_enforcement_exception" in result["conclusions"]
    assert "jb46_4_major_renovation_requires_necessity_and_tenant_reasonableness_balance" in result["unresolved_questions"]
    matched = {row["precedent_id"] for row in result["praxis_assessment"]["matched_precedents"]}
    assert "SVEA-OH-4781-18" in matched


def test_excess_second_hand_rent_connects_statute_and_guiding_praxis() -> None:
    result = _run("jb_excess_second_hand_rent_2026.json")

    assert "jb12_second_hand_rent_not_reasonable" in result["conclusions"]
    assert "jb55f_repayment_requires_amount_period_and_application_facts" in result["unresolved_questions"]
    matched = {row["precedent_id"] for row in result["praxis_assessment"]["matched_precedents"]}
    assert "SVEA-H-14449-22" in matched


def test_section41_case_refuses_to_fake_a_binary_answer() -> None:
    result = _run("jb_outsider_reasonableness_2026.json")

    assert result["primary_regimes"] == ["jordabalk_12"]
    assert "jb41_reasonableness_requires_size_duration_conditions_management_and_disturbance_balance" in result["unresolved_questions"]
    assert "outsider use unreasonable extent" in result["unresolved_questions"]


def test_section40_permission_case_can_show_conditions_met_without_installing_decision() -> None:
    result = _run("jb_second_hand_permission_2026.json")

    assert "jb12_represented_section40_permission_conditions_met" in result["conclusions"]
    assert "jb40_permission_requires_all_statutory_criteria_and_overall_assessment" in result["unresolved_questions"]
    assert result["legal_boundary"]["open_textured_standards_remain_assessment_questions"] is True
    assert result["architecture_boundary"]["qcds_core_modified"] is False
