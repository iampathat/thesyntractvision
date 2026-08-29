from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from importlib.resources import files
from pathlib import Path
from typing import Any, Mapping, Sequence

from .legal_logical_robot import (
    LegalLogicalRobotError,
    SwedishHousingLegalRobot,
    load_legal_case,
)
from .logical_assertion import normalize_logic_text
from .problem import ProblemQuery, SemanticProblemFrame, problem_to_syntract
from .semantic import SemanticClaim


class LegalPraxisError(ValueError):
    """Raised when the precedent layer cannot be represented safely."""


def _mapping(value: Any, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise LegalPraxisError(f"{label} must be an object")
    return value


def load_legal_praxis(path: str | Path | None = None) -> Mapping[str, Any]:
    if path is None:
        resource = files("qcds_fabric").joinpath("legal_data").joinpath("sweden_housing_praxis_2026.json")
        with resource.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    else:
        with Path(path).open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    praxis = _mapping(payload, "legal praxis")
    if not praxis.get("praxis_id") or not praxis.get("precedents"):
        raise LegalPraxisError("praxis layer requires praxis_id and precedents")
    return praxis


def _norm_terms(values: Sequence[str]) -> set[str]:
    return {normalize_logic_text(str(value)) for value in values if normalize_logic_text(str(value))}


def _precedent_rows(praxis: Mapping[str, Any]) -> tuple[Mapping[str, Any], ...]:
    rows = tuple(_mapping(row, "precedents[]") for row in praxis["precedents"])
    ids = [normalize_logic_text(str(row.get("precedent_id", ""))) for row in rows]
    if not all(ids) or len(set(ids)) != len(ids):
        raise LegalPraxisError("precedent ids must be non-empty and unique")
    return rows


def _praxis_qcds_pass(
    *,
    case_id: str,
    resolved_terms: Sequence[str],
    praxis: Mapping[str, Any],
) -> Mapping[str, Any]:
    known = _norm_terms(resolved_terms)
    precedents = _precedent_rows(praxis)
    candidates = tuple(normalize_logic_text(str(row["precedent_id"])) for row in precedents)
    claims: list[SemanticClaim] = []
    matched: list[dict[str, Any]] = []

    for row in precedents:
        precedent_id = normalize_logic_text(str(row["precedent_id"]))
        activation = [str(term) for term in row.get("activation_terms", ())]
        counter = [str(term) for term in row.get("counter_terms", ())]
        activation_hits = [term for term in activation if normalize_logic_text(term) in known]
        counter_hits = [term for term in counter if normalize_logic_text(term) in known]
        if not activation_hits and not counter_hits:
            continue

        for index, term in enumerate(activation_hits):
            claims.append(SemanticClaim(
                subject=case_id,
                predicate="precedent_relevance",
                value=precedent_id,
                source_id=f"{precedent_id}:activation:{index}",
                confidence=1.0,
                polarity=True,
                original_text=f"Case contains represented similarity factor: {term}",
            ))
        for index, term in enumerate(counter_hits):
            claims.append(SemanticClaim(
                subject=case_id,
                predicate="precedent_relevance",
                value=precedent_id,
                source_id=f"{precedent_id}:counter:{index}",
                confidence=1.0,
                polarity=False,
                original_text=f"Case contains represented counter-factor: {term}",
            ))

        matched.append({
            "precedent_id": str(row["precedent_id"]),
            "court": row.get("court"),
            "case_number": row.get("case_number"),
            "name": row.get("name"),
            "decision_date": row.get("decision_date"),
            "authority_class": row.get("authority_class"),
            "authority_weight": row.get("authority_weight"),
            "role": row.get("role"),
            "matched_similarity_factors": activation_hits,
            "matched_counter_factors": counter_hits,
            "statutory_links": list(row.get("statutory_links", ())),
            "principles": list(row.get("principles", ())),
            "source_uri": row.get("source_uri"),
        })

    common = {
        "praxis_id": praxis["praxis_id"],
        "snapshot_date": praxis.get("snapshot_date"),
        "represented_precedent_count": len(precedents),
        "authority_scale": dict(_mapping(praxis.get("authority_scale", {}), "authority_scale")),
        "source_hierarchy_note": "Authority is reported separately from factual similarity. The QCDS relevance pass below compares represented similarity/counter-factors; it does not let a lower court outrank a higher court merely by being factually close.",
    }

    if not claims:
        return {
            **common,
            "status": "no_represented_praxis_match",
            "matched_precedents": [],
            "qcds_execution": None,
            "leading_precedents": [],
            "stabilized_relevance": [],
            "boundary": {
                "precedent_installed_as_rule": False,
                "praxis_changes_statutory_conclusions_automatically": False,
                "authority_equals_similarity": False,
                "canonical_spec_modified": False,
            },
        }

    frame = SemanticProblemFrame(
        mission_id=f"praxis-{normalize_logic_text(case_id).replace(' ', '-')}",
        raw_text="Assess which represented housing-law precedents are most relevant to the current legal case factors.",
        queries=(ProblemQuery(
            query_id="praxis-relevance",
            subject=case_id,
            predicate="precedent_relevance",
            candidate_values=candidates,
            original_text="Which represented precedents are most relevant to this case?",
        ),),
        claims=tuple(claims),
        analyzer_id="legal_praxis_similarity_v2",
        provenance={
            "praxis_id": praxis["praxis_id"],
            "precedent_is_not_rule_installation": True,
            "authority_is_not_similarity": True,
            "similarity_is_not_outcome": True,
            "candidate_count": len(candidates),
            "canonical_spec_modified": False,
        },
    )
    result = problem_to_syntract(frame, max_width=max(8, len(candidates)))
    stabilized = [
        {"precedent_id": item.value, "probability": item.probability}
        for item in result.inference.stabilized_queries["praxis-relevance"]
    ]
    leaders = list(result.inference.leading_candidates("praxis-relevance"))
    leader_set = {normalize_logic_text(value) for value in leaders}
    leader_principles = [
        {
            "precedent_id": row["precedent_id"],
            "name": row["name"],
            "court": row["court"],
            "authority_class": row["authority_class"],
            "authority_weight": row["authority_weight"],
            "principles": row["principles"],
            "source_uri": row["source_uri"],
        }
        for row in matched
        if normalize_logic_text(str(row["precedent_id"])) in leader_set
    ]
    return {
        **common,
        "status": "ok",
        "matched_precedents": matched,
        "qcds_execution": "qcds_fabric.problem.problem_to_syntract",
        "syntract_id": result.syntract.syntract_id,
        "evidence_claim_count": len(claims),
        "leading_precedents": leaders,
        "stabilized_relevance": stabilized,
        "leader_principles": leader_principles,
        "conflict_markers": list(result.inference.conflict_markers),
        "boundary": {
            "precedent_installed_as_rule": False,
            "praxis_changes_statutory_conclusions_automatically": False,
            "authority_equals_similarity": False,
            "similarity_equals_outcome": False,
            "canonical_spec_modified": False,
        },
    }


@dataclass(frozen=True)
class LegalAssessmentResult:
    payload: Mapping[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return dict(self.payload)


class SwedishHousingAssessmentRobot:
    """Compose hard statutory logic with a separate QCDS interpretive layer."""

    def __init__(
        self,
        *,
        legal_robot: SwedishHousingLegalRobot | None = None,
        praxis: Mapping[str, Any] | None = None,
    ) -> None:
        self.legal_robot = legal_robot or SwedishHousingLegalRobot()
        self.praxis = dict(praxis or load_legal_praxis())

    def run_case(self, case: Mapping[str, Any]) -> LegalAssessmentResult:
        statutory = self.legal_robot.run_case(case).as_dict()
        praxis = _praxis_qcds_pass(
            case_id=str(statutory["case_id"]),
            resolved_terms=tuple(str(value) for value in statutory["resolved_terms"]),
            praxis=self.praxis,
        )
        payload = {
            **statutory,
            "praxis_assessment": praxis,
            "assessment_model": {
                "hard_layer": "source-attributed statute / transition / scope / procedural conditions",
                "assessment_layer": "open-textured statutory standards, missing discriminators, factual similarity and counter-factors",
                "praxis_layer": "HD precedent plus identified Svea hovrätt guidance, with authority class kept separate from factual similarity",
                "qcds_role": "stabilize competing represented interpretive relevance without turning precedent into automatic truth",
                "statutory_result_preserved": True,
                "canonical_spec_modified": False,
            },
        }
        return LegalAssessmentResult(payload)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run Swedish housing statutory logic plus QCDS precedent assessment above the unchanged core."
    )
    parser.add_argument("case", help="Path to a housing-law case JSON")
    parser.add_argument("--praxis", help="Optional alternate praxis JSON")
    args = parser.parse_args(argv)
    try:
        robot = SwedishHousingAssessmentRobot(
            praxis=load_legal_praxis(args.praxis) if args.praxis else None,
        )
        result = robot.run_case(load_legal_case(args.case))
    except (OSError, json.JSONDecodeError, LegalLogicalRobotError, LegalPraxisError, ValueError) as exc:
        parser.error(str(exc))
        return 2
    print(json.dumps(result.as_dict(), ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
