from __future__ import annotations

import json
from pathlib import Path

from qcds_fabric.legal_assessment_robot import (
    SwedishHousingAssessmentRobot,
    load_legal_praxis,
)
from qcds_fabric.legal_logical_robot import SwedishHousingLegalRobot


ROOT = Path(__file__).resolve().parents[1]


def _case(name: str) -> dict[str, object]:
    return json.loads((ROOT / "examples" / name).read_text(encoding="utf-8"))


def test_praxis_corpus_is_real_source_attributed_and_not_rules() -> None:
    praxis = load_legal_praxis()

    assert praxis["praxis_id"] == "swedish-housing-praxis-2026-08-29"
    assert len(praxis["precedents"]) >= 5
    assert all(row["court"] == "Högsta domstolen" for row in praxis["precedents"])
    assert all(str(row["source_uri"]).startswith("https://") for row in praxis["precedents"])
    assert praxis["boundary"]["precedent_is_not_rule_installation"] is True
    assert praxis["boundary"]["authority_is_not_similarity"] is True
    assert praxis["boundary"]["similarity_is_not_outcome"] is True


def test_statutory_result_is_preserved_when_praxis_layer_is_added() -> None:
    case = _case("swedish_housing_case_2026.json")
    base = SwedishHousingLegalRobot().run_case(case).as_dict()
    assessed = SwedishHousingAssessmentRobot().run_case(case).as_dict()

    assert assessed["primary_regimes"] == base["primary_regimes"]
    assert assessed["conclusions"] == base["conclusions"]
    assert assessed["applied_rules"] == base["applied_rules"]
    assert assessed["assessment_model"]["statutory_result_preserved"] is True
    assert assessed["assessment_model"]["canonical_spec_modified"] is False


def test_second_hand_facts_activate_real_hd_praxis_and_qcds_pass() -> None:
    result = SwedishHousingAssessmentRobot().run_case(
        _case("swedish_housing_case_2026.json")
    ).as_dict()
    praxis = result["praxis_assessment"]

    matched_ids = {row["precedent_id"] for row in praxis["matched_precedents"]}
    assert "NJA-2022-329" in matched_ids
    assert praxis["qcds_execution"] == "qcds_fabric.problem.problem_to_syntract"
    assert praxis["evidence_claim_count"] >= 1
    assert len(praxis["stabilized_relevance"]) >= 5
    assert praxis["boundary"]["precedent_installed_as_rule"] is False
    assert praxis["boundary"]["praxis_changes_statutory_conclusions_automatically"] is False


def test_material_defect_activates_competing_interpretive_precedents() -> None:
    case = {
        "case_id": "material-defect-assessment",
        "as_of_date": "2026-08-29",
        "contract_date": "2026-08-10",
        "facts": {
            "landlord_type": "natural_person",
            "residential_use": True,
            "holiday_purpose": False,
            "landlord_holds_unit_as_tenant": False,
            "regular_external_units": 1,
            "fixed_term": False,
            "material_defect": True,
            "landlord_promptly_remedied_after_notice": False,
        },
    }
    result = SwedishHousingAssessmentRobot().run_case(case).as_dict()
    praxis = result["praxis_assessment"]
    matched_ids = {row["precedent_id"] for row in praxis["matched_precedents"]}

    assert "NJA-2022-188" in matched_ids
    assert "NJA-2019-445" in matched_ids
    assert "tenant_immediate_termination_ground_material_defect" in result["conclusions"]
    assert praxis["qcds_execution"] == "qcds_fabric.problem.problem_to_syntract"
    assert praxis["evidence_claim_count"] >= 4


def test_praxis_layer_returns_no_fake_answer_when_no_factor_matches() -> None:
    case = {
        "case_id": "plain-current-case",
        "as_of_date": "2026-08-29",
        "contract_date": "2026-08-10",
        "facts": {
            "landlord_type": "natural_person",
            "residential_use": True,
            "holiday_purpose": False,
            "landlord_holds_unit_as_tenant": False,
            "regular_external_units": 1,
            "fixed_term": False,
        },
    }
    result = SwedishHousingAssessmentRobot().run_case(case).as_dict()
    praxis = result["praxis_assessment"]

    # Classification precedent may be relevant because residential use itself is
    # represented, but no precedent may silently change the statutory result.
    assert praxis["boundary"]["similarity_equals_outcome"] is False
    assert result["primary_regimes"] == ["privatuthyrningslag_2026_772"]


def test_public_legal_cli_routes_through_assessment_robot() -> None:
    pyproject = (ROOT / "pyproject.toml").read_text(encoding="utf-8")

    assert 'version = "1.30.0"' in pyproject
    assert 'qcds-legal-robot = "qcds_fabric.legal_assessment_robot:main"' in pyproject
