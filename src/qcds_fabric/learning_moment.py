from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from .intelligence_growth import IntelligenceGrowthView


def _jsonl_rows(path: Path) -> tuple[dict[str, Any], ...]:
    if not path.exists():
        return ()
    rows: list[dict[str, Any]] = []
    try:
        with path.open("r", encoding="utf-8") as handle:
            for raw in handle:
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    value = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if isinstance(value, dict):
                    rows.append(value)
    except OSError:
        return ()
    return tuple(rows)


def _mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


@dataclass
class LearningMomentView:
    """BUILD 31 read-only explanation of an actual logical capability gain.

    The view joins the BUILD 29 before/after Reality projection with the most
    recent BUILD 22 discovery audit that produced the same governed logical
    rule. It has no mutation path into QCDS, oracle genesis, governance or the
    persistent logical stores.
    """

    store_root: Path

    def __init__(self, store_root: str | Path = "./intelligence_store") -> None:
        self.store_root = Path(store_root)
        self.growth = IntelligenceGrowthView(self.store_root)

    @property
    def discovery_history_path(self) -> Path:
        return self.store_root / "reality_discovery_history.jsonl"

    def _matching_discovery(self, logical_rule_id: str) -> dict[str, Any] | None:
        for row in reversed(_jsonl_rows(self.discovery_history_path)):
            reality = _mapping(row.get("reality_result"))
            outcomes = reality.get("governed_rule_outcomes")
            if not isinstance(outcomes, list):
                continue
            for outcome in outcomes:
                mapped = _mapping(outcome)
                if mapped.get("logical_rule_id") == logical_rule_id and mapped.get("active") is True:
                    return row
        return None

    def snapshot(self) -> dict[str, Any]:
        growth = self.growth.snapshot()
        promotion = growth.get("latest_promotion")
        if not isinstance(promotion, Mapping):
            return {
                "status": "no_promoted_logic",
                "headline": "NO PROMOTED LOGIC YET",
                "message": (
                    "The Logical Robot may have observations, gaps or candidate logic, "
                    "but Reality has not gained a new governed logical capability yet."
                ),
                "learning_id": None,
                "promotion": None,
                "capability_change": growth.get("before_after", {}),
                "discovery": {"linked": False},
                "truth_boundary": {
                    "browser_direct_truth_authority": 0,
                    "browser_can_install_rules_directly": False,
                    "evidence_is_not_automatic_truth": True,
                },
                "provenance": {
                    "build": 31,
                    "read_only_manifestation": True,
                    "qcds_core_modified": False,
                    "canonical_spec_modified": False,
                },
            }

        rule_id = str(promotion.get("rule_id", ""))
        version = _int(promotion.get("version")) or 1
        audit = self._matching_discovery(rule_id)
        discovery: dict[str, Any] = {"linked": False}
        if audit is not None:
            reality = _mapping(audit.get("reality_result"))
            outcomes = reality.get("governed_rule_outcomes")
            matching_outcome: Mapping[str, Any] = {}
            if isinstance(outcomes, list):
                for outcome in outcomes:
                    mapped = _mapping(outcome)
                    if mapped.get("logical_rule_id") == rule_id and mapped.get("active") is True:
                        matching_outcome = mapped
                        break
            source_ids = audit.get("robot_source_ids")
            if not isinstance(source_ids, list):
                source_ids = []
            discovery = {
                "linked": True,
                "mission_id": audit.get("mission_id"),
                "status": audit.get("status"),
                "oracle_gaps": _int(audit.get("oracle_gap_count")),
                "rival_hypotheses": _int(audit.get("rival_hypothesis_count"))
                or _int(reality.get("oracle_hypothesis_count")),
                "hypotheses_rejected": _int(reality.get("oracle_rejected_count")),
                "oracles_promoted": _int(reality.get("oracle_promoted_count")),
                "robot_observations": _int(audit.get("robot_observation_count")),
                "independent_sources": len(dict.fromkeys(str(item) for item in source_ids)),
                "source_ids": list(dict.fromkeys(str(item) for item in source_ids)),
                "challenge_cases": _int(audit.get("challenge_case_count")),
                "selection_cases": _int(audit.get("selection_case_count")),
                "holdout_cases": _int(audit.get("holdout_case_count")),
                "knowledge_before": _int(reality.get("before_probe_count")),
                "knowledge_after": _int(reality.get("after_probe_count")),
                "knowledge_gain": _int(reality.get("knowledge_gain")),
                "base_space_unchanged_by_derived_logic": bool(
                    reality.get("base_space_unchanged_by_derived_logic", False)
                ),
                "governance": {
                    "changed_bindings": _int(matching_outcome.get("changed_bindings")),
                    "changed_fraction": _float(matching_outcome.get("changed_fraction")),
                    "blast_override": bool(matching_outcome.get("blast_override", False)),
                    "status": matching_outcome.get("status"),
                },
                "manual_challenge_supplied": bool(
                    _mapping(audit.get("provenance")).get("manual_challenge_supplied", False)
                ),
                "robot_received_expected_answers": bool(
                    _mapping(audit.get("provenance")).get("robot_received_expected_answers", False)
                ),
            }

        examples = promotion.get("examples")
        if not isinstance(examples, list):
            examples = []
        first_example = examples[0] if examples and isinstance(examples[0], Mapping) else None
        added_terms = [] if first_example is None else list(first_example.get("added", []))

        return {
            "status": "learned",
            "headline": "THE LOGICAL ROBOT LEARNED SOMETHING",
            "message": (
                "A governed rule changed what the resolved Reality space can derive. "
                "This is logical capability growth, not merely another retrieved document."
            ),
            "learning_id": f"{rule_id}:v{version}",
            "promotion": dict(promotion),
            "capability_change": {
                "before": None if first_example is None else list(first_example.get("before", [])),
                "after": None if first_example is None else list(first_example.get("after", [])),
                "added_terms": added_terms,
                "resolved_bindings_changed": _int(promotion.get("resolved_bindings_changed")) or 0,
                "new_resolved_term_instances": _int(promotion.get("new_resolved_term_instances")) or 0,
                "direct_base_matches": _int(promotion.get("direct_matches")) or 0,
                "example_binding_id": None if first_example is None else first_example.get("binding_id"),
            },
            "discovery": discovery,
            "truth_boundary": {
                "browser_direct_truth_authority": 0,
                "browser_can_install_rules_directly": False,
                "evidence_is_not_automatic_truth": True,
                "solution_rule_supplied_by_ui": False,
            },
            "provenance": {
                "build": 31,
                "read_only_manifestation": True,
                "growth_build": 29,
                "discovery_audit_linked": bool(discovery.get("linked")),
                "qcds_core_modified": False,
                "canonical_spec_modified": False,
            },
        }


def recorded_verified_learning_moment() -> dict[str, Any]:
    """Published BUILD 22 proof used by static GitHub Pages.

    This is deliberately labelled recorded proof by the caller and never exposed
    as a live runtime snapshot.
    """
    return {
        "status": "learned",
        "headline": "THE LOGICAL ROBOT LEARNED SOMETHING",
        "message": (
            "Recorded verified proof: the system moved from unresolved ability to governed reusable logic."
        ),
        "learning_id": "recorded-build22-winged-flies",
        "promotion": {
            "rule_id": "genesis:winged:implies:flies",
            "version": 1,
            "rule_text": "winged ⇒ flies",
            "confidence": 1.0,
            "resolved_bindings_changed": 2,
            "new_resolved_term_instances": 2,
        },
        "capability_change": {
            "before": ["bird-a", "winged"],
            "after": ["bird-a", "winged", "flies"],
            "added_terms": ["flies"],
            "resolved_bindings_changed": 2,
            "new_resolved_term_instances": 2,
            "direct_base_matches": 2,
            "example_binding_id": "recorded-proof-example",
        },
        "discovery": {
            "linked": True,
            "mission_id": "build22-recorded-proof",
            "status": "expanded",
            "oracle_gaps": 1,
            "rival_hypotheses": 12,
            "hypotheses_rejected": 9,
            "oracles_promoted": 1,
            "robot_observations": 3,
            "independent_sources": 3,
            "source_ids": ["source-a", "source-b", "source-c"],
            "challenge_cases": 3,
            "selection_cases": 2,
            "holdout_cases": 1,
            "knowledge_before": 0,
            "knowledge_after": 2,
            "knowledge_gain": 2,
            "base_space_unchanged_by_derived_logic": True,
            "governance": {
                "changed_bindings": 2,
                "changed_fraction": 0.25,
                "blast_override": False,
                "status": "promoted_to_reality",
            },
            "manual_challenge_supplied": False,
            "robot_received_expected_answers": False,
        },
        "truth_boundary": {
            "browser_direct_truth_authority": 0,
            "browser_can_install_rules_directly": False,
            "evidence_is_not_automatic_truth": True,
            "solution_rule_supplied_by_ui": False,
        },
        "provenance": {
            "build": 31,
            "recorded_verified_proof": True,
            "proof_run": 33210935010,
            "qcds_core_modified": False,
            "canonical_spec_modified": False,
        },
    }
