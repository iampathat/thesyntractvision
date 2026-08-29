from __future__ import annotations

import argparse
import json
import tempfile
from dataclasses import dataclass
from datetime import date
from importlib.resources import files
from pathlib import Path
from typing import Any, Mapping, Sequence

from .logical_assertion import normalize_logic_text
from .logical_transform import LogicalSpaceResolver
from .logical_universe_runner import LogicalUniverseMvpRunner
from .problem import ProblemQuery, SemanticProblemFrame, problem_to_syntract
from .semantic import SemanticClaim


class LegalLogicalRobotError(ValueError):
    """Raised when a legal-robot case cannot be represented without invention."""


_DEFAULT_CORPUS = "legal_data/sweden_housing_2026.json"


def _require_mapping(value: Any, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise LegalLogicalRobotError(f"{label} must be an object")
    return value


def _parse_date(value: Any, label: str) -> date:
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError) as exc:
        raise LegalLogicalRobotError(f"{label} must be YYYY-MM-DD") from exc


def _optional_bool(facts: Mapping[str, Any], key: str) -> bool | None:
    if key not in facts or facts[key] is None:
        return None
    value = facts[key]
    if not isinstance(value, bool):
        raise LegalLogicalRobotError(f"facts.{key} must be true, false or null")
    return value


def _slug(value: str) -> str:
    resolved = []
    prior = False
    for char in normalize_logic_text(value):
        if char.isalnum():
            resolved.append(char)
            prior = False
        elif not prior:
            resolved.append("-")
            prior = True
    return "".join(resolved).strip("-") or "case"


def load_legal_corpus(path: str | Path | None = None) -> Mapping[str, Any]:
    if path is None:
        resource = files("qcds_fabric").joinpath(_DEFAULT_CORPUS)
        with resource.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    else:
        with Path(path).open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    corpus = _require_mapping(payload, "legal corpus")
    for field in ("corpus_id", "snapshot_date", "authority", "sources", "sections", "rules", "primary_regime_candidates"):
        if field not in corpus:
            raise LegalLogicalRobotError(f"legal corpus missing {field}")
    return corpus


def _case_terms(case: Mapping[str, Any], *, snapshot_date: date) -> tuple[tuple[str, ...], tuple[str, ...]]:
    case_id = str(case.get("case_id", "")).strip()
    if not case_id:
        raise LegalLogicalRobotError("case_id is required")
    as_of = _parse_date(case.get("as_of_date"), "as_of_date")
    contract = _parse_date(case.get("contract_date"), "contract_date")
    if contract > as_of:
        raise LegalLogicalRobotError("contract_date cannot be after as_of_date")

    facts = _require_mapping(case.get("facts", {}), "facts")
    terms: list[str] = [
        f"case:{_slug(case_id)}",
        "jurisdiction:sweden",
        "domain:housing-law",
        f"as-of:{as_of.isoformat()}",
        f"contract-date:{contract.isoformat()}",
    ]
    questions: list[str] = []

    if as_of > snapshot_date:
        questions.append("question:law_snapshot_may_be_stale_for_as_of_date")

    legacy_start = date(2013, 2, 1)
    new_start = date(2026, 7, 1)
    if contract < legacy_start:
        terms.append("contract:before_2013_02_01")
    elif contract < new_start:
        terms.append("contract:2013_02_01_through_2026_06_30")
    else:
        terms.append("contract:from_2026_07_01")

    landlord_type = str(facts.get("landlord_type", "")).strip().lower()
    if landlord_type in {"natural_person", "natural-person", "person"}:
        terms.extend(("landlord:natural_person", "landlord:eligible_private_actor"))
    elif landlord_type in {"estate", "deceased_estate", "death-estate"}:
        terms.extend(("landlord:estate", "landlord:eligible_private_actor"))
    elif landlord_type:
        terms.append(f"landlord:{_slug(landlord_type)}")
    else:
        questions.append("question:landlord_type")

    def add_boolean(key: str, yes: str, no: str, question: str) -> None:
        value = _optional_bool(facts, key)
        if value is True:
            terms.append(yes)
        elif value is False:
            terms.append(no)
        else:
            questions.append(question)

    add_boolean("residential_use", "use:residential", "use:not_residential", "question:residential_use")
    add_boolean("holiday_purpose", "purpose:holiday", "purpose:not_holiday", "question:holiday_purpose")
    add_boolean("landlord_holds_unit_as_tenant", "landlord:holds_tenancy", "landlord:not_holds_tenancy", "question:landlord_holds_unit_as_tenant")

    units = facts.get("regular_external_units")
    if units is None:
        questions.append("question:regular_external_units")
    else:
        try:
            count = int(units)
        except (TypeError, ValueError) as exc:
            raise LegalLogicalRobotError("facts.regular_external_units must be an integer") from exc
        if count < 0:
            raise LegalLogicalRobotError("facts.regular_external_units cannot be negative")
        terms.append("landlord:regular_more_than_two_external_units" if count > 2 else "landlord:not_regular_more_than_two_external_units")

    if contract < new_start and contract >= legacy_start:
        add_boolean("outside_business", "business:outside", "business:inside", "question:outside_business")
        add_boolean("unit_is_tenancy_sublet", "unit:tenancy_sublet", "unit:not_tenancy_sublet", "question:unit_is_tenancy_sublet")
        sequence = facts.get("private_let_sequence")
        if sequence is None:
            questions.append("question:private_let_sequence")
        else:
            try:
                position = int(sequence)
            except (TypeError, ValueError) as exc:
                raise LegalLogicalRobotError("facts.private_let_sequence must be an integer") from exc
            if position <= 0:
                raise LegalLogicalRobotError("facts.private_let_sequence must be positive")
            terms.append("private_let:first" if position == 1 else "private_let:not_first")

    fixed_term = _optional_bool(facts, "fixed_term")
    if fixed_term is True:
        terms.append("contract:fixed_term")
    elif fixed_term is False:
        terms.append("contract:indefinite")

    adverse = _optional_bool(facts, "adverse_tenant_clause")
    if adverse is True:
        terms.append("contract:adverse_tenant_clause")

    if bool(facts.get("issue_rent_review", False)):
        terms.append("issue:rent_review")

    rent_delay = facts.get("rent_delay_days")
    if rent_delay is not None:
        try:
            delay_days = int(rent_delay)
        except (TypeError, ValueError) as exc:
            raise LegalLogicalRobotError("facts.rent_delay_days must be an integer") from exc
        if delay_days < 0:
            raise LegalLogicalRobotError("facts.rent_delay_days cannot be negative")
        if delay_days > 14:
            terms.append("rent:delay_over_14_days")
            cured = _optional_bool(facts, "rent_cured_before_termination")
            if cured is True:
                terms.append("rent:cured_before_termination")
            elif cured is False:
                terms.append("rent:not_cured_before_termination")
            else:
                questions.append("question:rent_cured_before_termination")
        else:
            terms.append("rent:delay_not_over_14_days")

    independent_sublet = _optional_bool(facts, "independent_sublet_without_consent")
    if independent_sublet is True:
        terms.append("sublet:independent_without_consent")
        excuse = _optional_bool(facts, "valid_excuse_for_sublet")
        if excuse is True:
            terms.append("sublet:valid_excuse")
        elif excuse is False:
            terms.append("sublet:no_valid_excuse")
        else:
            questions.append("question:valid_excuse_for_sublet")

    material_defect = _optional_bool(facts, "material_defect")
    if material_defect is True:
        terms.append("defect:material")
        remedied = _optional_bool(facts, "landlord_promptly_remedied_after_notice")
        if remedied is False:
            terms.append("defect:landlord_not_promptly_remedied_after_notice")
        elif remedied is True:
            terms.append("defect:landlord_promptly_remedied_after_notice")
        else:
            questions.append("question:landlord_promptly_remedied_after_notice")

    return tuple(dict.fromkeys(terms)), tuple(dict.fromkeys(questions))


def _source_index(corpus: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    return {
        str(item["source_id"]): _require_mapping(item, "sources[]")
        for item in corpus["sources"]
    }


def _section_bindings(corpus: Mapping[str, Any]) -> list[dict[str, Any]]:
    sources = _source_index(corpus)
    bindings: list[dict[str, Any]] = []
    for index, raw in enumerate(corpus["sections"], start=1):
        section = _require_mapping(raw, "sections[]")
        source_id = str(section["source_id"])
        source = sources[source_id]
        section_id = str(section["section_id"])
        bindings.append({
            "binding_id": f"legal-section:{index:03d}:{_slug(section_id)}",
            "terms": [
                "statute-section",
                f"section:{section_id}",
                f"topic:{section['topic']}",
                f"source:{source_id}",
            ],
            "source_id": source_id,
            "source_uri": str(source.get("uri", "")),
            "confidence": 1.0,
            "excerpt": str(section.get("summary", "")),
            "provenance": {
                "declared_legal_source": True,
                "section_id": section_id,
                "snapshot_date": corpus["snapshot_date"],
                "verbatim_statute_text": False,
            },
        })
    return bindings


def _runner_rules(corpus: Mapping[str, Any]) -> list[dict[str, Any]]:
    authority = str(corpus["authority"])
    rules: list[dict[str, Any]] = []
    for index, raw in enumerate(corpus["rules"], start=1):
        item = _require_mapping(raw, "rules[]")
        rules.append({
            "candidate_id": f"legal-rule-candidate:{index:03d}",
            "rule_id": str(item["rule_id"]),
            "match_terms": list(item["match_terms"]),
            "emit_terms": list(item["emit_terms"]),
            "source_id": str(item["source_id"]),
            "confidence": 1.0,
            "promote": True,
            "approval_source": authority,
            "override_blast": True,
            "provenance": {
                "declared_legal_rule": True,
                "section_id": str(item.get("section_id", "")),
                "explanation": str(item.get("explanation", "")),
                "snapshot_date": corpus["snapshot_date"],
            },
        })
    return rules


def _canonical_emit_lookup(corpus: Mapping[str, Any]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for raw in corpus["rules"]:
        item = _require_mapping(raw, "rules[]")
        for term in item["emit_terms"]:
            lookup[normalize_logic_text(str(term))] = str(term)
    return lookup


def _core_regime_pass(
    *,
    case_id: str,
    primary_regimes: Sequence[str],
    corpus: Mapping[str, Any],
    applied_rules: Sequence[str],
) -> Mapping[str, Any]:
    candidates = tuple(str(value) for value in corpus["primary_regime_candidates"])
    positives = set(primary_regimes)
    claims: list[SemanticClaim] = []
    for index, candidate in enumerate(candidates):
        claims.append(SemanticClaim(
            subject=case_id,
            predicate="primary_legal_regime",
            value=candidate,
            source_id=f"legal-resolver:{index:02d}",
            confidence=1.0,
            polarity=candidate in positives if positives else candidate == "unresolved",
            original_text="Source-attributed declared legal-universe regime projection",
        ))
    frame = SemanticProblemFrame(
        mission_id=f"legal-{_slug(case_id)}",
        raw_text="Determine the primary modeled Swedish housing-law regime for the supplied case facts.",
        queries=(ProblemQuery(
            query_id="primary-regime",
            subject=case_id,
            predicate="primary_legal_regime",
            candidate_values=candidates,
            original_text="Which modeled legal regime applies?",
        ),),
        claims=tuple(claims),
        analyzer_id="legal_logical_robot_declared_universe_v1",
        provenance={
            "legal_corpus_id": corpus["corpus_id"],
            "applied_rule_ids": tuple(applied_rules),
            "declared_legal_universe": True,
            "external_truth_claim": False,
            "legal_advice_claim": False,
            "canonical_spec_modified": False,
        },
    )
    result = problem_to_syntract(frame, max_width=8)
    return {
        "status": "ok",
        "core_execution": "qcds_fabric.problem.problem_to_syntract",
        "syntract_id": result.syntract.syntract_id,
        "leading_candidates": list(result.inference.leading_candidates("primary-regime")),
        "baseline": [
            {"value": item.value, "probability": item.probability}
            for item in result.inference.baseline_queries["primary-regime"]
        ],
        "stabilized": [
            {"value": item.value, "probability": item.probability}
            for item in result.inference.stabilized_queries["primary-regime"]
        ],
        "conflict_markers": list(result.inference.conflict_markers),
        "canonical_spec_modified": False,
    }


@dataclass(frozen=True)
class LegalRobotResult:
    case_id: str
    corpus_id: str
    universe_id: str
    snapshot_date: str
    as_of_date: str
    base_binding_count: int
    active_rule_count: int
    case_terms: tuple[str, ...]
    resolved_terms: tuple[str, ...]
    applied_rules: tuple[str, ...]
    primary_regimes: tuple[str, ...]
    conclusions: tuple[str, ...]
    unresolved_questions: tuple[str, ...]
    sources: tuple[Mapping[str, Any], ...]
    qcds_core: Mapping[str, Any]
    swarm_packet: Mapping[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {
            "case_id": self.case_id,
            "corpus_id": self.corpus_id,
            "universe_id": self.universe_id,
            "snapshot_date": self.snapshot_date,
            "as_of_date": self.as_of_date,
            "base_binding_count": self.base_binding_count,
            "active_rule_count": self.active_rule_count,
            "case_terms": list(self.case_terms),
            "resolved_terms": list(self.resolved_terms),
            "primary_regimes": list(self.primary_regimes),
            "conclusions": list(self.conclusions),
            "unresolved_questions": list(self.unresolved_questions),
            "applied_rules": list(self.applied_rules),
            "sources": list(self.sources),
            "qcds_core": dict(self.qcds_core),
            "swarm_packet": dict(self.swarm_packet),
            "architecture_boundary": {
                "specialized_logical_robot_body": True,
                "uses_existing_logical_universe_governance": True,
                "talks_to_qcds_core": True,
                "qcds_core_modified": False,
                "canonical_spec_modified": False,
                "authoritative_over_peer_reality": False,
            },
            "legal_boundary": {
                "source_attributed_declared_universe": True,
                "not_legal_advice": True,
                "case_facts_are_user_supplied": True,
                "snapshot_must_be_checked_for_later_dates": True,
            },
        }


class SwedishHousingLegalRobot:
    """Specialized Logical Robot body for a bounded Swedish housing-law universe.

    It compiles case facts into one logical binding, runs declared source-attributed
    rules through the existing Logical Universe governance/resolution path, then
    sends the primary-regime projection through the existing QCDS
    ``problem_to_syntract`` core. It is not another QCDS implementation.
    """

    def __init__(self, corpus: Mapping[str, Any] | None = None) -> None:
        self.corpus = dict(corpus or load_legal_corpus())
        self.snapshot = _parse_date(self.corpus["snapshot_date"], "corpus.snapshot_date")
        self.sources = _source_index(self.corpus)
        self.rule_index = {
            str(item["rule_id"]): _require_mapping(item, "rules[]")
            for item in self.corpus["rules"]
        }
        self.emit_lookup = _canonical_emit_lookup(self.corpus)

    def run_case(self, case: Mapping[str, Any]) -> LegalRobotResult:
        case = _require_mapping(case, "case")
        case_id = str(case.get("case_id", "")).strip()
        as_of = _parse_date(case.get("as_of_date"), "as_of_date")
        case_terms, pre_questions = _case_terms(case, snapshot_date=self.snapshot)
        binding_id = f"legal-case:{_slug(case_id)}"
        universe_id = str(self.corpus["corpus_id"])

        spec = {
            "universe": {
                "universe_id": universe_id,
                "mode": "declared",
                "description": str(self.corpus.get("purpose", "")),
                "authority": str(self.corpus["authority"]),
                "provenance": {
                    "legal_corpus_id": self.corpus["corpus_id"],
                    "snapshot_date": self.corpus["snapshot_date"],
                    "external_truth_claim": False,
                    "canonical_spec_modified": False,
                },
            },
            "seed_bindings": [
                *_section_bindings(self.corpus),
                {
                    "binding_id": binding_id,
                    "terms": list(case_terms) + list(pre_questions),
                    "source_id": f"case:{case_id}",
                    "confidence": 1.0,
                    "provenance": {
                        "case_fact_binding": True,
                        "user_supplied_facts": True,
                        "as_of_date": as_of.isoformat(),
                    },
                },
            ],
            "drift_policy": {
                "max_changed_fraction": 1.0,
                "max_changed_bindings": 1000,
                "max_term_delta_per_binding": 64,
                "require_challenge_for_observed": true,
                "allow_zero_effect": true
            },
            "max_rule_rounds": 32,
            "rules": _runner_rules(self.corpus),
            "queries": [],
        }

        with tempfile.TemporaryDirectory(prefix="qcds-legal-") as root:
            runner = LogicalUniverseMvpRunner(root)
            universe_result = runner.run(spec)
            space = runner.universes.space(universe_id)
            binding = next((item for item in space.bindings() if item.binding_id == binding_id), None)
            if binding is None:
                raise LegalLogicalRobotError("case binding disappeared from the legal universe")
            resolver = LogicalSpaceResolver(space, runner.universes.rules(universe_id), max_rounds=32)
            resolved = resolver.resolve_binding(binding)

        canonical_terms = tuple(self.emit_lookup.get(term, term) for term in resolved.resolved_terms)
        applied_rule_ids = tuple(dict.fromkeys(item.split("@", 1)[0] for item in resolved.applied_rules))
        primary = tuple(
            dict.fromkeys(term.split(":", 1)[1] for term in canonical_terms if term.startswith("primary_regime:"))
        )
        conclusions = tuple(
            dict.fromkeys(term.split(":", 1)[1] for term in canonical_terms if term.startswith("conclusion:"))
        )
        questions = tuple(
            dict.fromkeys(term.split(":", 1)[1] for term in canonical_terms if term.startswith("question:"))
        )

        source_rows: list[Mapping[str, Any]] = []
        seen_sections: set[tuple[str, str]] = set()
        for rule_id in applied_rule_ids:
            rule = self.rule_index.get(rule_id)
            if rule is None:
                continue
            source_id = str(rule["source_id"])
            section_id = str(rule.get("section_id", ""))
            key = (source_id, section_id)
            if key in seen_sections:
                continue
            seen_sections.add(key)
            source = self.sources[source_id]
            source_rows.append({
                "source_id": source_id,
                "section_id": section_id,
                "title": source.get("title"),
                "uri": source.get("uri"),
                "rule_id": rule_id,
                "explanation": rule.get("explanation", ""),
            })

        core = _core_regime_pass(
            case_id=case_id,
            primary_regimes=primary,
            corpus=self.corpus,
            applied_rules=applied_rule_ids,
        )
        packet = {
            "packet_type": "qcds.logical_robot.capability_result.v1",
            "robot_kind": "legal_logical_robot",
            "capability": "swedish_housing_law",
            "case_id": case_id,
            "universe_id": universe_id,
            "snapshot_date": self.corpus["snapshot_date"],
            "as_of_date": as_of.isoformat(),
            "primary_regimes": list(primary),
            "conclusions": list(conclusions),
            "unresolved_questions": list(questions),
            "applied_rule_ids": list(applied_rule_ids),
            "source_ids": list(dict.fromkeys(row["source_id"] for row in source_rows)),
            "syntract_id": core["syntract_id"],
            "raw_case_included": False,
            "authoritative_over_peer_reality": False,
        }

        return LegalRobotResult(
            case_id=case_id,
            corpus_id=str(self.corpus["corpus_id"]),
            universe_id=universe_id,
            snapshot_date=str(self.corpus["snapshot_date"]),
            as_of_date=as_of.isoformat(),
            base_binding_count=universe_result.base_binding_count,
            active_rule_count=universe_result.active_rule_count,
            case_terms=case_terms,
            resolved_terms=canonical_terms,
            applied_rules=applied_rule_ids,
            primary_regimes=primary,
            conclusions=conclusions,
            unresolved_questions=questions,
            sources=tuple(source_rows),
            qcds_core=core,
            swarm_packet=packet,
        )


def load_legal_case(path: str | Path) -> Mapping[str, Any]:
    with Path(path).open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return _require_mapping(payload, "legal case")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run the specialized Swedish Housing Law Logical Robot above the unchanged QCDS core."
    )
    parser.add_argument("case", help="Path to a Swedish housing-law case JSON file")
    parser.add_argument("--corpus", help="Optional legal corpus JSON path; defaults to the packaged 2026-08-29 snapshot")
    args = parser.parse_args(argv)

    try:
        robot = SwedishHousingLegalRobot(load_legal_corpus(args.corpus) if args.corpus else None)
        result = robot.run_case(load_legal_case(args.case))
    except (OSError, json.JSONDecodeError, LegalLogicalRobotError, ValueError) as exc:
        parser.error(str(exc))
        return 2

    print(json.dumps(result.as_dict(), ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
