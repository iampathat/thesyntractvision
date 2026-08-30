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
from .robots.legal.sweden_housing.qcds_space import LegalQCDSSpaceError, run_integrated_legal_qcds
from .semantic import SemanticClaim


class LegalPraxisError(ValueError):
    """Raised when the precedent layer cannot be represented safely."""


def _mapping(value: Any, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise LegalPraxisError(f"{label} must be an object")
    return value


def _merge_praxis_expansions(praxis: Mapping[str, Any]) -> Mapping[str, Any]:
    merged = dict(praxis)
    rows = [dict(_mapping(row, "precedents[]")) for row in praxis["precedents"]]
    seen = {str(row.get("precedent_id", "")) for row in rows}
    expansion_ids: list[str] = []
    for filename in ("sweden_housing_praxis_use_transfer_2026.json",):
        resource = files("qcds_fabric").joinpath("legal_data").joinpath(filename)
        if not resource.is_file():
            continue
        with resource.open("r", encoding="utf-8") as handle:
            expansion = _mapping(json.load(handle), f"praxis expansion {filename}")
        for raw in expansion.get("precedents", ()):
            row = dict(_mapping(raw, "precedents[]"))
            precedent_id = str(row.get("precedent_id", ""))
            if not precedent_id:
                raise LegalPraxisError("praxis expansion precedent missing precedent_id")
            if precedent_id in seen:
                continue
            rows.append(row)
            seen.add(precedent_id)
        expansion_ids.append(str(expansion.get("expansion_id", filename)))
    merged["precedents"] = rows
    merged["expansion_ids"] = expansion_ids
    return merged


def load_legal_praxis(path: str | Path | None = None) -> Mapping[str, Any]:
    if path is None:
        resource = files("qcds_fabric").joinpath("legal_data").joinpath("sweden_housing_praxis_2026.json")
        with resource.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        payload = _merge_praxis_expansions(_mapping(payload, "legal praxis"))
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
    """Legacy readable praxis projection retained as diagnostics.

    The final Legal Syntract is no longer produced here. It is produced by the
    integrated direct QCDS legal space in qcds_space.py. This projection remains
    useful for explaining which cases activated and why.
    """
    known = _norm_terms(resolved_terms)
    precedents = _precedent_rows(praxis)
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

    active_candidates = tuple(normalize_logic_text(str(row["precedent_id"])) for row in matched)
    represented_count = len(precedents)
    active_count = len(active_candidates)
    common = {
        "praxis_id": praxis["praxis_id"],
        "snapshot_date": praxis.get("snapshot_date"),
        "praxis_expansion_ids": list(praxis.get("expansion_ids", ())),
        "represented_precedent_count": represented_count,
        "active_precedent_count": active_count,
        "represented_binary_space": f"2^{represented_count}",
        "active_binary_space": f"2^{active_count}",
        "condition_formation": "The full praxis corpus remains represented. Only precedents with an explicit similarity or counter-factor enter the active QCDS working space for this case.",
        "authority_scale": dict(_mapping(praxis.get("authority_scale", {}), "authority_scale")),
        "source_hierarchy_note": "Authority is reported separately from factual similarity. Relevance does not make a lower court authoritative over a higher source.",
        "final_syntract_produced_here": False,
    }

    if not claims or not active_candidates:
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
        raw_text="Diagnostic projection of which active represented housing-law precedents are most relevant to the current legal case factors.",
        queries=(ProblemQuery(
            query_id="praxis-relevance",
            subject=case_id,
            predicate="precedent_relevance",
            candidate_values=active_candidates,
            original_text="Which active represented precedents are most relevant to this case?",
        ),),
        claims=tuple(claims),
        analyzer_id="legal_praxis_diagnostic_projection_v2",
        provenance={
            "praxis_id": praxis["praxis_id"],
            "condition_formation_active_subset": True,
            "precedent_is_not_rule_installation": True,
            "authority_is_not_similarity": True,
            "similarity_is_not_outcome": True,
            "final_legal_syntract_produced_elsewhere": True,
            "canonical_spec_modified": False,
        },
    )
    result = problem_to_syntract(frame, max_width=max(8, active_count))
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
        "diagnostic_syntract_id": result.syntract.syntract_id,
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
    """Bind one final Legal Syntract from statute, case facts and active praxis."""

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
        integrated_qcds = run_integrated_legal_qcds(
            case_id=str(statutory["case_id"]),
            case_terms=tuple(str(value) for value in statutory["case_terms"]),
            resolved_terms=tuple(str(value) for value in statutory["resolved_terms"]),
            unresolved_questions=tuple(str(value) for value in statutory["unresolved_questions"]),
            corpus=self.legal_robot.corpus,
            applied_rule_ids=tuple(str(value) for value in statutory["applied_rules"]),
            praxis=self.praxis,
            # Legacy Build-40 compatibility path only. The current full robot has
            # explicit execution profiles and a separate unpruned Quantum Full
            # Space contract. Allow this exact classical compatibility runner one
            # additional live bit as the represented praxis corpus has expanded.
            max_unknown_dimensions=19,
        )
        swarm = {
            **dict(_mapping(statutory["swarm_packet"], "swarm_packet")),
            "syntract_id": integrated_qcds["syntract_id"],
            "qcds_space": integrated_qcds["candidate_binary_space"],
        }
        payload = {
            **statutory,
            "statutory_regime_projection": statutory["qcds_core"],
            "qcds_core": integrated_qcds,
            "praxis_assessment": praxis,
            "swarm_packet": swarm,
            "assessment_model": {
                "hard_layer": "source-attributed statute / transition / scope / procedural conditions become active QCDS constraints, not a precomputed final answer",
                "assessment_layer": "open-textured statutory standards remain live '?' dimensions unless evidence and constraints discriminate them",
                "praxis_layer": "active HD/Svea precedent dimensions are added during QCDS re-entry; authority metadata remains separate from factual similarity",
                "condition_formation": "case facts activate a bounded statutory rule set and its legal dimensions; the active table is serialized and loaded in memory as CSV",
                "qcds_role": "enumerate the exact active 2^N legal state space, apply source-attributed oracle constraints, rotate/challenge it, re-enter the statutory Syntract with praxis, and bind the stabilized final Legal Syntract",
                "statutory_result_preserved": False,
                "statutory_constraints_preserved": True,
                "final_answer_is_qcds_distribution": True,
                "canonical_spec_modified": False,
            },
        }
        return LegalAssessmentResult(payload)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run Swedish housing law as an integrated exact classical QCDS logical space and bind the final Legal Syntract."
    )
    parser.add_argument("case", help="Path to a housing-law case JSON")
    parser.add_argument("--praxis", help="Optional alternate praxis JSON")
    args = parser.parse_args(argv)
    try:
        robot = SwedishHousingAssessmentRobot(
            praxis=load_legal_praxis(args.praxis) if args.praxis else None,
        )
        result = robot.run_case(load_legal_case(args.case))
    except (OSError, json.JSONDecodeError, LegalLogicalRobotError, LegalPraxisError, LegalQCDSSpaceError, ValueError) as exc:
        parser.error(str(exc))
        return 2
    print(json.dumps(result.as_dict(), ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
