from __future__ import annotations

import json
from pathlib import Path

from qcds_fabric.legal_logical_robot import SwedishHousingLegalRobot, load_legal_corpus


ROOT = Path(__file__).resolve().parents[1]


def _case(name: str) -> dict[str, object]:
    return json.loads((ROOT / "examples" / name).read_text(encoding="utf-8"))


def test_legal_corpus_is_non_toy_and_source_attributed() -> None:
    corpus = load_legal_corpus()

    assert corpus["corpus_id"] == "swedish-housing-law-2026-08-29"
    assert corpus["snapshot_date"] == "2026-08-29"
    assert len(corpus["sources"]) == 3
    assert len(corpus["sections"]) >= 20
    assert len(corpus["rules"]) >= 20
    uris = {row["uri"] for row in corpus["sources"]}
    assert all(uri.startswith("https://www.riksdagen.se/") for uri in uris)


def test_current_2026_case_resolves_real_rule_path_and_calls_qcds_core() -> None:
    result = SwedishHousingLegalRobot().run_case(_case("swedish_housing_case_2026.json")).as_dict()

    assert result["primary_regimes"] == ["privatuthyrningslag_2026_772"]
    conclusions = set(result["conclusions"])
    assert {
        "adverse_clause_without_effect_against_tenant",
        "landlord_immediate_termination_ground_late_rent",
        "independent_sublet_without_consent_prohibited",
        "landlord_immediate_termination_ground_unauthorized_sublet",
        "rent_review_uses_comparable_private_lettings_test",
        "fixed_term_ends_at_term",
        "tenant_notice_three_months",
    }.issubset(conclusions)
    assert result["base_binding_count"] >= 24
    assert result["active_rule_count"] >= 20
    assert "regime-new-2026" in result["applied_rules"]
    assert result["qcds_core"]["core_execution"] == "qcds_fabric.problem.problem_to_syntract"
    assert result["qcds_core"]["canonical_spec_modified"] is False
    assert result["architecture_boundary"]["qcds_core_modified"] is False
    assert result["architecture_boundary"]["canonical_spec_modified"] is False
    assert any(source["source_id"] == "sfs:2026:772" for source in result["sources"])


def test_transition_case_preserves_legacy_2012_regime() -> None:
    result = SwedishHousingLegalRobot().run_case(_case("swedish_housing_case_legacy_2026.json")).as_dict()

    assert result["primary_regimes"] == ["legacy_2012_978_with_jb12"]
    conclusions = set(result["conclusions"])
    assert {
        "tenant_notice_one_month",
        "landlord_notice_three_months",
        "no_tenant_extension_right_unless_agreed",
        "rent_review_uses_capital_and_operating_cost_framework",
        "adverse_clause_without_effect_against_tenant",
    }.issubset(conclusions)
    assert "regime-legacy-2012" in result["applied_rules"]
    assert any(source["source_id"] == "sfs:2012:978" for source in result["sources"])


def test_scope_exclusion_falls_back_to_modeled_chapter12_track() -> None:
    result = SwedishHousingLegalRobot().run_case(_case("swedish_housing_case_jb12_2026.json")).as_dict()

    assert result["primary_regimes"] == ["jordabalk_12"]
    assert "regime-new-excluded-volume" in result["applied_rules"]
    assert "rent_review_uses_jordabalk_chapter12_framework" in result["conclusions"]
    assert any(source["source_id"] == "sfs:1970:994:12" for source in result["sources"])


def test_missing_scope_facts_remain_questions_instead_of_becoming_law() -> None:
    case = {
        "case_id": "missing-facts",
        "as_of_date": "2026-08-29",
        "contract_date": "2026-08-10",
        "facts": {
            "landlord_type": "natural_person",
            "residential_use": True,
        },
    }
    result = SwedishHousingLegalRobot().run_case(case).as_dict()

    assert result["primary_regimes"] == []
    unresolved = " | ".join(result["unresolved_questions"])
    assert "holiday purpose" in unresolved
    assert "regular external units" in unresolved
    assert "landlord holds unit as tenant" in unresolved
    assert result["qcds_core"]["core_execution"] == "qcds_fabric.problem.problem_to_syntract"
    assert result["swarm_packet"]["raw_case_included"] is False


def test_swarm_packet_is_bounded_and_non_authoritative() -> None:
    result = SwedishHousingLegalRobot().run_case(_case("swedish_housing_case_2026.json")).as_dict()
    packet = result["swarm_packet"]

    assert packet["packet_type"] == "qcds.logical_robot.capability_result.v1"
    assert packet["robot_kind"] == "legal_logical_robot"
    assert packet["capability"] == "swedish_housing_law"
    assert packet["raw_case_included"] is False
    assert packet["authoritative_over_peer_reality"] is False
    assert packet["syntract_id"] == result["qcds_core"]["syntract_id"]
