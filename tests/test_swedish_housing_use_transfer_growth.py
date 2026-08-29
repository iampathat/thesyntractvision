from __future__ import annotations

import json
from pathlib import Path

from qcds_fabric.legal_assessment_robot import SwedishHousingAssessmentRobot, load_legal_praxis
from qcds_fabric.legal_logical_robot import load_legal_corpus


ROOT = Path(__file__).resolve().parents[1]
CASES = ROOT / "robots" / "legal" / "sweden_housing" / "cases"


def _case(name: str) -> dict[str, object]:
    return json.loads((CASES / name).read_text(encoding="utf-8"))


def _run(name: str) -> dict[str, object]:
    return SwedishHousingAssessmentRobot().run_case(_case(name)).as_dict()


def test_use_transfer_expansion_is_loaded_as_separate_layer() -> None:
    corpus = load_legal_corpus()

    assert "swedish-housing-jb12-core-2026-08-29" in corpus["expansion_ids"]
    assert "swedish-housing-use-transfer-2026-08-29" in corpus["expansion_ids"]
    section_ids = {row["section_id"] for row in corpus["sections"]}
    rule_ids = {row["rule_id"] for row in corpus["rules"]}
    assert {"JB-12:24", "JB-12:25", "JB-12:25a", "JB-12:26", "JB-12:32", "JB-12:34", "JB-12:35", "JB-12:38"} <= section_ids
    assert {"jb-ordinary-disturbance-forfeiture-ground", "jb-access-refusal-forfeiture-ground", "jb-transfer-unreasonable-refusal-termination", "jb-exchange-main-criteria-met"} <= rule_ids
    assert len(corpus["sections"]) >= 44
    assert len(corpus["rules"]) >= 45


def test_disturbance_case_preserves_procedure_and_open_safeguard() -> None:
    result = _run("jb_disturbance_after_warning_2026.json")

    assert result["primary_regimes"] == ["jordabalk_12"]
    assert "jb12_forfeiture_ground_repeated_disturbance_after_required_procedure" in result["conclusions"]
    assert "jb25_42_ordinary_disturbance_requires_tolerability_warning_social_notice_and_rectification_checks" in result["unresolved_questions"]
    assert "jb42_minor_significance_and_proportionality_still_require_check" in result["unresolved_questions"]
    matched = {row["precedent_id"] for row in result["praxis_assessment"]["matched_precedents"]}
    assert "SVEA-OH-11710-21" in matched


def test_access_refusal_can_hold_forfeiture_and_rectification_together() -> None:
    result = _run("jb_access_refusal_rectified_2026.json")

    assert "jb12_forfeiture_ground_refusal_of_required_access" in result["conclusions"]
    assert "jb12_rectification_blocks_eviction_on_represented_access_refusal_ground" in result["conclusions"]


def test_unreasonable_transfer_refusal_opens_tenant_termination_route() -> None:
    result = _run("jb_transfer_unreasonable_refusal_2026.json")

    assert "jb12_transfer_normally_requires_landlord_consent_or_specific_statutory_route" in result["conclusions"]
    assert "jb12_tenant_may_terminate_after_unreasonable_transfer_refusal" in result["conclusions"]


def test_exchange_case_keeps_permission_assessment_and_activates_guiding_praxis() -> None:
    result = _run("jb_apartment_exchange_2026.json")

    assert "jb12_represented_section35_exchange_conditions_met_subject_to_tribunal_permission" in result["conclusions"]
    assert "jb35_exchange_requires_noteworthy_reasons_landlord_inconvenience_compensation_and_residence_duration_checks" in result["unresolved_questions"]
    matched = {row["precedent_id"] for row in result["praxis_assessment"]["matched_precedents"]}
    assert "SVEA-OH-9885-20" in matched


def test_damage_case_activates_evidence_praxis_without_inventing_negligence() -> None:
    result = _run("jb_damage_evidence_2026.json")

    assert "jb12_tenant_damage_liability_on_represented_negligence_facts" not in result["conclusions"]
    matched = {row["precedent_id"] for row in result["praxis_assessment"]["matched_precedents"]}
    assert "SVEA-OH-14177-21" in matched


def test_praxis_expansion_grows_full_universe_but_active_space_stays_case_bounded() -> None:
    praxis = load_legal_praxis()
    ids = {row["precedent_id"] for row in praxis["precedents"]}

    assert "swedish-housing-praxis-use-transfer-2026-08-29" in praxis["expansion_ids"]
    assert {"SVEA-OH-11710-21", "SVEA-OH-9885-20", "SVEA-OH-10365-19"} <= ids
    assert len(ids) >= 16

    result = _run("jb_apartment_exchange_2026.json")
    assessed = result["praxis_assessment"]
    assert assessed["represented_precedent_count"] >= 16
    assert 1 <= assessed["active_precedent_count"] < assessed["represented_precedent_count"]
    assert assessed["active_binary_space"] == f"2^{assessed['active_precedent_count']}"
