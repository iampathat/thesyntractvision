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
    """Raised when a legal case cannot be represented without invention."""


def _mapping(value: Any, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise LegalLogicalRobotError(f"{label} must be an object")
    return value


def _date(value: Any, label: str) -> date:
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError) as exc:
        raise LegalLogicalRobotError(f"{label} must be YYYY-MM-DD") from exc


def _bool(facts: Mapping[str, Any], key: str) -> bool | None:
    if key not in facts or facts[key] is None:
        return None
    if not isinstance(facts[key], bool):
        raise LegalLogicalRobotError(f"facts.{key} must be true, false or null")
    return bool(facts[key])


def _slug(value: str) -> str:
    chars: list[str] = []
    sep = False
    for char in normalize_logic_text(value):
        if char.isalnum():
            chars.append(char)
            sep = False
        elif not sep:
            chars.append("-")
            sep = True
    return "".join(chars).strip("-") or "case"


def _merge_rows(base: list[Any], extra: Sequence[Any], *, id_key: str, label: str) -> list[Any]:
    out = list(base)
    seen = {str(_mapping(row, label).get(id_key, "")) for row in out}
    for raw in extra:
        row = _mapping(raw, label)
        row_id = str(row.get(id_key, ""))
        if not row_id:
            raise LegalLogicalRobotError(f"{label} missing {id_key}")
        if row_id in seen:
            continue
        out.append(dict(row))
        seen.add(row_id)
    return out


def _merge_default_expansions(corpus: Mapping[str, Any]) -> Mapping[str, Any]:
    merged = dict(corpus)
    expansion_ids: list[str] = []
    for filename in (
        "sweden_housing_expansion_2026.json",
        "sweden_housing_use_transfer_2026.json",
    ):
        resource = files("qcds_fabric").joinpath("legal_data").joinpath(filename)
        if not resource.is_file():
            continue
        with resource.open("r", encoding="utf-8") as handle:
            expansion = _mapping(json.load(handle), f"legal expansion {filename}")
        merged["sources"] = _merge_rows(list(merged["sources"]), expansion.get("sources", ()), id_key="source_id", label="sources[]")
        merged["sections"] = _merge_rows(list(merged["sections"]), expansion.get("sections", ()), id_key="section_id", label="sections[]")
        merged["rules"] = _merge_rows(list(merged["rules"]), expansion.get("rules", ()), id_key="rule_id", label="rules[]")
        expansion_ids.append(str(expansion.get("expansion_id", filename)))
    merged["expansion_ids"] = expansion_ids
    return merged


def load_legal_corpus(path: str | Path | None = None) -> Mapping[str, Any]:
    if path is None:
        resource = files("qcds_fabric").joinpath("legal_data").joinpath("sweden_housing_2026.json")
        with resource.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        payload = _merge_default_expansions(_mapping(payload, "legal corpus"))
    else:
        with Path(path).open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    corpus = _mapping(payload, "legal corpus")
    for key in ("corpus_id", "snapshot_date", "authority", "sources", "sections", "rules", "primary_regime_candidates"):
        if key not in corpus:
            raise LegalLogicalRobotError(f"legal corpus missing {key}")
    return corpus


def _case_terms(case: Mapping[str, Any], snapshot: date) -> tuple[tuple[str, ...], tuple[str, ...]]:
    case_id = str(case.get("case_id", "")).strip()
    if not case_id:
        raise LegalLogicalRobotError("case_id is required")
    as_of = _date(case.get("as_of_date"), "as_of_date")
    contract = _date(case.get("contract_date"), "contract_date")
    if contract > as_of:
        raise LegalLogicalRobotError("contract_date cannot be after as_of_date")
    facts = _mapping(case.get("facts", {}), "facts")

    terms = [
        f"case:{_slug(case_id)}", "jurisdiction:sweden", "domain:housing-law",
        f"as-of:{as_of.isoformat()}", f"contract-date:{contract.isoformat()}",
    ]
    questions: list[str] = []
    if as_of > snapshot:
        questions.append("question:law_snapshot_may_be_stale_for_as_of_date")

    if contract < date(2013, 2, 1):
        terms.append("contract:before_2013_02_01")
    elif contract < date(2026, 7, 1):
        terms.append("contract:2013_02_01_through_2026_06_30")
    else:
        terms.append("contract:from_2026_07_01")

    landlord = str(facts.get("landlord_type", "")).strip().lower()
    if landlord in {"natural_person", "natural-person", "person"}:
        terms += ["landlord:natural_person", "landlord:eligible_private_actor"]
    elif landlord in {"estate", "deceased_estate", "death-estate"}:
        terms += ["landlord:estate", "landlord:eligible_private_actor"]
    elif landlord:
        terms.append(f"landlord:{_slug(landlord)}")
    else:
        questions.append("question:landlord_type")

    def flag(key: str, yes: str, no: str, question: str) -> None:
        value = _bool(facts, key)
        if value is True:
            terms.append(yes)
        elif value is False:
            terms.append(no)
        else:
            questions.append(question)

    def optional_flag(key: str, yes: str, no: str) -> bool | None:
        if key not in facts or facts[key] is None:
            return None
        value = _bool(facts, key)
        terms.append(yes if value else no)
        return value

    residential = _bool(facts, "residential_use")
    if residential is True:
        terms += ["use:residential", "tenancy:residential"]
    elif residential is False:
        terms += ["use:not_residential", "tenancy:non_residential"]
    else:
        questions.append("question:residential_use")
    flag("holiday_purpose", "purpose:holiday", "purpose:not_holiday", "question:holiday_purpose")
    flag("landlord_holds_unit_as_tenant", "landlord:holds_tenancy", "landlord:not_holds_tenancy", "question:landlord_holds_unit_as_tenant")

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

    if date(2013, 2, 1) <= contract < date(2026, 7, 1):
        flag("outside_business", "business:outside", "business:inside", "question:outside_business")
        flag("unit_is_tenancy_sublet", "unit:tenancy_sublet", "unit:not_tenancy_sublet", "question:unit_is_tenancy_sublet")
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

    fixed = _bool(facts, "fixed_term")
    if fixed is True:
        terms.append("contract:fixed_term")
    elif fixed is False:
        terms.append("contract:indefinite")
    if _bool(facts, "adverse_tenant_clause") is True:
        terms.append("contract:adverse_tenant_clause")
    if facts.get("issue_rent_review") is True:
        terms.append("issue:rent_review")
    if facts.get("issue_forfeiture") is True:
        terms.append("issue:forfeiture")
    if facts.get("issue_extension") is True:
        terms.append("issue:extension")
    if facts.get("issue_transfer") is True:
        terms.append("issue:transfer")
    if facts.get("issue_exchange") is True:
        terms.append("issue:exchange")

    if facts.get("rent_delay_days") is not None:
        try:
            delay = int(facts["rent_delay_days"])
        except (TypeError, ValueError) as exc:
            raise LegalLogicalRobotError("facts.rent_delay_days must be an integer") from exc
        if delay < 0:
            raise LegalLogicalRobotError("facts.rent_delay_days cannot be negative")
        terms.append("rent:delay_over_7_days" if delay > 7 else "rent:delay_not_over_7_days")
        if delay > 14:
            terms.append("rent:delay_over_14_days")
            cured = _bool(facts, "rent_cured_before_termination")
            if cured is True:
                terms.append("rent:cured_before_termination")
            elif cured is False:
                terms.append("rent:not_cured_before_termination")
            else:
                questions.append("question:rent_cured_before_termination")
        else:
            terms.append("rent:delay_not_over_14_days")

    optional_flag("landlord_terminated_for_rent_delay", "rent:landlord_terminated_for_delay", "rent:landlord_not_terminated_for_delay")
    optional_flag("rent_recovered_within_three_weeks_after_notice", "rent:recovered_within_three_weeks_after_notice", "rent:not_recovered_within_three_weeks_after_notice")

    independent = _bool(facts, "independent_sublet_without_consent")
    if independent is True:
        terms += ["sublet:independent_without_consent", "sublet:second_hand", "sublet:no_landlord_consent"]
        excuse = _bool(facts, "valid_excuse_for_sublet")
        if excuse is True:
            terms.append("sublet:valid_excuse")
        elif excuse is False:
            terms.append("sublet:no_valid_excuse")
        else:
            questions.append("question:valid_excuse_for_sublet")
    elif independent is False:
        terms.append("sublet:not_independent_without_consent")

    optional_flag("second_hand_let", "sublet:second_hand", "sublet:not_second_hand")
    landlord_consent = optional_flag("sublet_permission_from_landlord", "sublet:landlord_consent", "sublet:no_landlord_consent")
    tribunal_permission = optional_flag("sublet_permission_from_hyresnamnd", "sublet:tribunal_permission", "sublet:no_tribunal_permission")
    if landlord_consent is False and tribunal_permission is False:
        terms.append("sublet:no_permission")
    if facts.get("sublet_permission_requested") is True:
        terms.append("sublet:permission_requested")
        if facts.get("sublet_considerable_reasons") is None:
            questions.append("question:sublet_considerable_reasons")
        if facts.get("landlord_justified_refusal") is None:
            questions.append("question:landlord_justified_refusal")
        if residential is True and facts.get("sublet_rent_reasonable") is None:
            questions.append("question:sublet_rent_reasonable")
    optional_flag("sublet_considerable_reasons", "sublet:considerable_reason", "sublet:no_considerable_reason")
    refusal = optional_flag("landlord_justified_refusal", "sublet:landlord_justified_refusal", "sublet:landlord_no_justified_refusal")
    optional_flag("sublet_rent_reasonable", "sublet:rent_reasonable", "sublet:rent_not_reasonable")
    optional_flag("second_hand_rent_above_allowed_ceiling", "rent:above_second_hand_ceiling", "rent:not_above_second_hand_ceiling")
    if facts.get("second_hand_rent_above_allowed_ceiling") is not None:
        terms.append("sublet:second_hand")
    if refusal is True:
        terms.append("interpretive_pressure:landlord_refusal")

    outsider_questionable = optional_flag("outsider_use_questionable", "outsiders:extent_questionable", "outsiders:extent_not_questionable")
    outsider_unreasonable = optional_flag("outsider_use_unreasonable_extent", "outsiders:extent_unreasonable", "outsiders:extent_acceptable")
    optional_flag("rectified_before_termination", "breach:rectified_before_termination", "breach:not_rectified_before_termination")
    if outsider_questionable is True and outsider_unreasonable is None:
        questions.append("question:outsider_use_unreasonable_extent")

    if _bool(facts, "material_defect") is True:
        terms.append("defect:material")
        remedied = _bool(facts, "landlord_promptly_remedied_after_notice")
        if remedied is True:
            terms.append("defect:landlord_promptly_remedied_after_notice")
        elif remedied is False:
            terms.append("defect:landlord_not_promptly_remedied_after_notice")
        else:
            questions.append("question:landlord_promptly_remedied_after_notice")
    optional_flag("damage_arose_during_tenancy", "evidence:damage_arose_during_tenancy", "evidence:damage_preexisted_tenancy")
    optional_flag("damage_typically_requires_negligence", "evidence:damage_typically_requires_negligence", "evidence:damage_not_typically_negligence")
    optional_flag("tenant_or_responsible_person_negligent_damage", "damage:tenant_or_responsible_person_negligent", "damage:no_represented_tenant_negligence")
    optional_flag("urgent_damage_serious_risk", "damage:urgent_serious_risk", "damage:not_urgent_serious_risk")
    notified = optional_flag("tenant_notified_landlord_promptly", "damage:tenant_notified_promptly", "damage:tenant_did_not_notify_promptly")
    if facts.get("urgent_damage_serious_risk") is True and notified is None:
        questions.append("question:tenant_notified_landlord_promptly")

    disturbance = optional_flag("disturbance_occurred", "conduct:disturbance", "conduct:no_disturbance")
    serious = optional_flag("disturbance_specially_serious", "conduct:specially_serious", "conduct:not_specially_serious")
    optional_flag("landlord_warned_to_stop", "conduct:landlord_warned", "conduct:landlord_not_warned")
    optional_flag("social_committee_notified", "conduct:social_committee_notified", "conduct:social_committee_not_notified")
    optional_flag("disturbance_rectified_after_warning", "conduct:rectified_after_warning", "conduct:not_rectified_after_warning")
    if disturbance is True and serious is None:
        questions.append("question:disturbance_specially_serious")

    access_required = optional_flag("statutory_access_required", "access:statutory_access_required", "access:no_statutory_access_requirement")
    access_refused = optional_flag("access_refused", "access:refused", "access:not_refused")
    access_excuse = optional_flag("valid_excuse_for_access_refusal", "access:valid_excuse", "access:no_valid_excuse")
    if access_required is True and access_refused is True and access_excuse is None:
        questions.append("question:valid_excuse_for_access_refusal")

    optional_flag("tenant_obligations_seriously_breached", "extension:tenant_obligations_seriously_breached", "extension:tenant_obligations_not_seriously_breached")
    optional_flag("major_renovation_planned", "extension:major_renovation", "extension:no_major_renovation")
    optional_flag("one_or_two_family_nonbusiness", "extension:one_or_two_family_nonbusiness", "extension:not_one_or_two_family_nonbusiness")
    optional_flag("landlord_personal_disposal_interest", "extension:landlord_personal_disposal_interest", "extension:no_landlord_personal_disposal_interest")
    optional_flag("tenant_hardship_strong", "extension:tenant_hardship_strong", "extension:tenant_hardship_not_strong")
    optional_flag("extension_dispute_pending_after_term", "extension:dispute_pending_after_term", "extension:dispute_not_pending_after_term")

    if facts.get("transfer_requested") is True:
        terms.append("transfer:requested")
    optional_flag("landlord_transfer_refused", "transfer:landlord_refused", "transfer:landlord_not_refused")
    optional_flag("transfer_refusal_reasonable", "transfer:refusal_reasonable_cause", "transfer:refusal_without_reasonable_cause")
    answer_three_weeks = optional_flag("landlord_transfer_answer_within_three_weeks", "transfer:answer_within_three_weeks", "transfer:no_answer_within_three_weeks")
    if facts.get("transfer_requested") is True and answer_three_weeks is None:
        questions.append("question:landlord_transfer_answer_within_three_weeks")
    optional_flag("transfer_to_close_relative", "transfer:close_relative", "transfer:not_close_relative")
    optional_flag("permanent_cohabitation_with_transferee", "transfer:permanent_cohabitation", "transfer:no_permanent_cohabitation")
    optional_flag("landlord_can_reasonably_accept_transferee", "transfer:landlord_can_reasonably_accept", "transfer:landlord_cannot_reasonably_accept")

    if facts.get("exchange_requested") is True:
        terms.append("exchange:requested")
    optional_flag("exchange_noteworthy_reasons", "exchange:noteworthy_reasons", "exchange:no_noteworthy_reasons")
    inconvenience = optional_flag("exchange_material_landlord_inconvenience", "exchange:material_landlord_inconvenience", "exchange:no_material_landlord_inconvenience")
    compensation = optional_flag("exchange_prohibited_compensation", "exchange:prohibited_compensation", "exchange:no_prohibited_compensation")
    residence_year = optional_flag("exchange_resident_at_least_one_year", "exchange:resident_at_least_one_year", "exchange:resident_under_one_year")
    optional_flag("exchange_exceptional_reasons", "exchange:exceptional_reasons", "exchange:no_exceptional_reasons")
    if facts.get("exchange_requested") is True:
        if facts.get("exchange_noteworthy_reasons") is None:
            questions.append("question:exchange_noteworthy_reasons")
        if inconvenience is None:
            questions.append("question:exchange_material_landlord_inconvenience")
        if compensation is None:
            questions.append("question:exchange_prohibited_compensation")
        if residence_year is None:
            questions.append("question:exchange_residence_duration")

    return tuple(dict.fromkeys(terms)), tuple(dict.fromkeys(questions))


def _source_index(corpus: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    return {str(row["source_id"]): _mapping(row, "sources[]") for row in corpus["sources"]}


def _section_bindings(corpus: Mapping[str, Any]) -> list[dict[str, Any]]:
    sources = _source_index(corpus)
    out: list[dict[str, Any]] = []
    for index, raw in enumerate(corpus["sections"], 1):
        row = _mapping(raw, "sections[]")
        source_id = str(row["source_id"])
        source = sources[source_id]
        out.append({
            "binding_id": f"legal-section:{index:03d}:{_slug(str(row['section_id']))}",
            "terms": ["legal-source-section", f"section:{row['section_id']}", f"topic:{row['topic']}", f"source:{source_id}"],
            "source_id": source_id,
            "source_uri": str(source.get("uri", "")),
            "confidence": 1.0,
            "excerpt": str(row.get("summary", "")),
            "provenance": {
                "declared_legal_source": True,
                "source_class": source.get("source_class", "statute"),
                "verbatim_statute_text": False,
                "snapshot_date": corpus["snapshot_date"],
            },
        })
    return out


def _rules(corpus: Mapping[str, Any]) -> list[dict[str, Any]]:
    authority = str(corpus["authority"])
    out: list[dict[str, Any]] = []
    for index, raw in enumerate(corpus["rules"], 1):
        row = _mapping(raw, "rules[]")
        out.append({
            "candidate_id": f"legal-rule-candidate:{index:03d}",
            "rule_id": str(row["rule_id"]),
            "match_terms": list(row["match_terms"]),
            "emit_terms": list(row["emit_terms"]),
            "source_id": str(row["source_id"]),
            "confidence": 1.0,
            "promote": True,
            "approval_source": authority,
            "override_blast": True,
            "provenance": {"declared_legal_rule": True, "section_id": row.get("section_id", ""), "explanation": row.get("explanation", "")},
        })
    return out


def _emit_lookup(corpus: Mapping[str, Any]) -> dict[str, str]:
    return {
        normalize_logic_text(str(term)): str(term)
        for raw in corpus["rules"]
        for term in _mapping(raw, "rules[]")["emit_terms"]
    }


def _qcds_regime_pass(case_id: str, regimes: Sequence[str], corpus: Mapping[str, Any], applied_rules: Sequence[str]) -> Mapping[str, Any]:
    candidates = tuple(str(value) for value in corpus["primary_regime_candidates"])
    positives = set(regimes) or {"unresolved"}
    claims = tuple(
        SemanticClaim(
            subject=case_id,
            predicate="primary_legal_regime",
            value=candidate,
            source_id=f"legal-resolver:{index:02d}",
            confidence=1.0,
            polarity=candidate in positives,
            original_text="Declared legal-universe regime projection",
        )
        for index, candidate in enumerate(candidates)
    )
    frame = SemanticProblemFrame(
        mission_id=f"legal-{_slug(case_id)}",
        raw_text="Determine the primary modeled Swedish housing-law regime.",
        queries=(ProblemQuery("primary-regime", case_id, "primary_legal_regime", candidates, "Which modeled legal regime applies?"),),
        claims=claims,
        analyzer_id="legal_logical_robot_declared_universe_v1",
        provenance={"legal_corpus_id": corpus["corpus_id"], "applied_rule_ids": tuple(applied_rules), "canonical_spec_modified": False},
    )
    result = problem_to_syntract(frame, max_width=8)
    return {
        "status": "ok",
        "core_execution": "qcds_fabric.problem.problem_to_syntract",
        "syntract_id": result.syntract.syntract_id,
        "leading_candidates": list(result.inference.leading_candidates("primary-regime")),
        "baseline": [{"value": x.value, "probability": x.probability} for x in result.inference.baseline_queries["primary-regime"]],
        "stabilized": [{"value": x.value, "probability": x.probability} for x in result.inference.stabilized_queries["primary-regime"]],
        "conflict_markers": list(result.inference.conflict_markers),
        "canonical_spec_modified": False,
    }


@dataclass(frozen=True)
class LegalRobotResult:
    payload: Mapping[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return dict(self.payload)


class SwedishHousingLegalRobot:
    """Specialized legal body that uses existing Logical Universe + QCDS core paths."""

    def __init__(self, corpus: Mapping[str, Any] | None = None) -> None:
        self.corpus = dict(corpus or load_legal_corpus())
        self.snapshot = _date(self.corpus["snapshot_date"], "corpus.snapshot_date")
        self.sources = _source_index(self.corpus)
        self.rule_index = {str(row["rule_id"]): _mapping(row, "rules[]") for row in self.corpus["rules"]}
        self.emit_lookup = _emit_lookup(self.corpus)

    def run_case(self, case: Mapping[str, Any]) -> LegalRobotResult:
        case = _mapping(case, "case")
        case_id = str(case.get("case_id", "")).strip()
        as_of = _date(case.get("as_of_date"), "as_of_date")
        case_terms, questions = _case_terms(case, self.snapshot)
        universe_id = str(self.corpus["corpus_id"])
        binding_id = f"legal-case:{_slug(case_id)}"
        spec = {
            "universe": {
                "universe_id": universe_id,
                "mode": "declared",
                "description": str(self.corpus.get("purpose", "")),
                "authority": str(self.corpus["authority"]),
                "provenance": {"legal_corpus_id": universe_id, "snapshot_date": self.corpus["snapshot_date"], "canonical_spec_modified": False},
            },
            "seed_bindings": [
                *_section_bindings(self.corpus),
                {"binding_id": binding_id, "terms": [*case_terms, *questions], "source_id": f"case:{case_id}", "confidence": 1.0, "provenance": {"case_fact_binding": True, "user_supplied_facts": True}},
            ],
            "drift_policy": {"max_changed_fraction": 1.0, "max_changed_bindings": 1000, "max_term_delta_per_binding": 64, "require_challenge_for_observed": True, "allow_zero_effect": True},
            "max_rule_rounds": 32,
            "rules": _rules(self.corpus),
            "queries": [],
        }

        with tempfile.TemporaryDirectory(prefix="qcds-legal-") as root:
            runner = LogicalUniverseMvpRunner(root)
            universe = runner.run(spec)
            space = runner.universes.space(universe_id)
            binding = next((item for item in space.bindings() if item.binding_id == binding_id), None)
            if binding is None:
                raise LegalLogicalRobotError("case binding missing after universe run")
            resolved = LogicalSpaceResolver(space, runner.universes.rules(universe_id), max_rounds=32).resolve_binding(binding)

        canonical = tuple(self.emit_lookup.get(term, term) for term in resolved.resolved_terms)
        applied = tuple(dict.fromkeys(item.split("@", 1)[0] for item in resolved.applied_rules))
        regimes = tuple(dict.fromkeys(term.split(":", 1)[1] for term in canonical if term.startswith("primary_regime:")))
        conclusions = tuple(dict.fromkeys(term.split(":", 1)[1] for term in canonical if term.startswith("conclusion:")))
        unresolved = tuple(dict.fromkeys(term.split(":", 1)[1] for term in canonical if term.startswith("question:")))

        source_rows: list[Mapping[str, Any]] = []
        seen: set[tuple[str, str]] = set()
        for rule_id in applied:
            row = self.rule_index.get(rule_id)
            if row is None:
                continue
            source_id = str(row["source_id"])
            section_id = str(row.get("section_id", ""))
            if (source_id, section_id) in seen:
                continue
            seen.add((source_id, section_id))
            source = self.sources[source_id]
            source_rows.append({
                "source_id": source_id,
                "source_class": source.get("source_class", "statute"),
                "section_id": section_id,
                "title": source.get("title"),
                "uri": source.get("uri"),
                "rule_id": rule_id,
                "explanation": row.get("explanation", ""),
            })

        core = _qcds_regime_pass(case_id, regimes, self.corpus, applied)
        swarm = {
            "packet_type": "qcds.logical_robot.capability_result.v1",
            "robot_kind": "legal_logical_robot",
            "capability": "swedish_housing_law",
            "case_id": case_id,
            "universe_id": universe_id,
            "snapshot_date": self.corpus["snapshot_date"],
            "as_of_date": as_of.isoformat(),
            "primary_regimes": list(regimes),
            "conclusions": list(conclusions),
            "unresolved_questions": list(unresolved),
            "applied_rule_ids": list(applied),
            "source_ids": list(dict.fromkeys(row["source_id"] for row in source_rows)),
            "syntract_id": core["syntract_id"],
            "raw_case_included": False,
            "authoritative_over_peer_reality": False,
        }
        return LegalRobotResult({
            "case_id": case_id,
            "corpus_id": universe_id,
            "universe_id": universe_id,
            "snapshot_date": self.corpus["snapshot_date"],
            "as_of_date": as_of.isoformat(),
            "input_facts": dict(_mapping(case.get("facts", {}), "facts")),
            "corpus_stats": {
                "source_count": len(self.corpus["sources"]),
                "section_count": len(self.corpus["sections"]),
                "rule_count": len(self.corpus["rules"]),
                "expansion_ids": list(self.corpus.get("expansion_ids", ())),
            },
            "base_binding_count": universe.base_binding_count,
            "active_rule_count": universe.active_rule_count,
            "case_terms": list(case_terms),
            "resolved_terms": list(canonical),
            "primary_regimes": list(regimes),
            "conclusions": list(conclusions),
            "unresolved_questions": list(unresolved),
            "applied_rules": list(applied),
            "sources": source_rows,
            "qcds_core": core,
            "swarm_packet": swarm,
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
                "open_textured_standards_remain_assessment_questions": True,
                "snapshot_must_be_checked_for_later_dates": True,
            },
        })


def load_legal_case(path: str | Path) -> Mapping[str, Any]:
    with Path(path).open("r", encoding="utf-8") as handle:
        return _mapping(json.load(handle), "legal case")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the Swedish Housing Law Logical Robot above the unchanged QCDS core.")
    parser.add_argument("case", help="Path to a housing-law case JSON")
    parser.add_argument("--corpus", help="Optional alternate legal-corpus JSON")
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
