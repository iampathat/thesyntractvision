from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

from .logical_transform import LogicalTransformRule
from .logical_universe import CsvLogicalUniverseStore


def _json_tuple(value: str | None) -> tuple[str, ...]:
    if not value:
        return ()
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return ()
    return tuple(str(item) for item in parsed) if isinstance(parsed, list) else ()


def _csv_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    try:
        with path.open("r", encoding="utf-8", newline="") as handle:
            return [dict(row) for row in csv.DictReader(handle)]
    except (OSError, csv.Error):
        return []


def _resolve_terms(base_terms: Sequence[str], rules: Iterable[LogicalTransformRule], *, max_rounds: int = 16) -> tuple[str, ...]:
    terms = list(dict.fromkeys(str(term) for term in base_terms))
    known = set(terms)
    active = tuple(rule for rule in rules if rule.status == "active")
    for _ in range(max_rounds):
        changed = False
        for rule in active:
            if not set(rule.match_terms).issubset(known):
                continue
            for term in rule.emit_terms:
                if term not in known:
                    known.add(term)
                    terms.append(term)
                    changed = True
        if not changed:
            break
    return tuple(terms)


@dataclass
class IntelligenceGrowthView:
    """Read-only explanation of how governed logic changes resolved Reality.

    This is a BUILD 29 manifestation layer. It reads the persistent Reality
    bindings/rules/candidate records and computes a before/after projection. It
    has no authority to generate, challenge, promote, retire, or rewrite logic.
    """

    store_root: Path

    def __init__(self, store_root: str | Path = "./intelligence_store") -> None:
        self.store_root = Path(store_root)
        self.store_root.mkdir(parents=True, exist_ok=True)
        self.universes = CsvLogicalUniverseStore(self.store_root)
        self.universes.ensure_reality()

    def _latest_active_history(self, active: Mapping[str, LogicalTransformRule]) -> dict[str, str] | None:
        rows = _csv_rows(self.store_root / "logical_rule_history.csv")
        for row in reversed(rows):
            rule = active.get(row.get("rule_id", ""))
            if rule is None:
                continue
            try:
                version = int(row.get("version", "0") or 0)
            except ValueError:
                version = 0
            if version == rule.version and row.get("event") in {"GENESIS", "REPLACED"}:
                return row
        return None

    def _before_rules(
        self,
        active_rules: Sequence[LogicalTransformRule],
        latest: dict[str, str] | None,
    ) -> tuple[LogicalTransformRule, ...]:
        if latest is None:
            return tuple(active_rules)
        rule_id = latest.get("rule_id", "")
        event = latest.get("event", "")
        before = [rule for rule in active_rules if rule.rule_id != rule_id]
        if event == "REPLACED":
            previous_match = _json_tuple(latest.get("previous_match_terms"))
            previous_emit = _json_tuple(latest.get("previous_emit_terms"))
            if previous_match and previous_emit:
                try:
                    previous_version = int(latest.get("previous_version", "0") or 0)
                    confidence = float(latest.get("confidence", "1") or 1)
                except ValueError:
                    previous_version, confidence = 1, 1.0
                before.append(LogicalTransformRule(
                    rule_id=rule_id,
                    match_terms=previous_match,
                    emit_terms=previous_emit,
                    source_id=latest.get("source_id", "history") or "history",
                    confidence=max(0.5, min(1.0, confidence)),
                    version=max(1, previous_version),
                    status="active",
                    provenance={"build29_historical_projection": True},
                ))
        return tuple(before)

    def snapshot(self, *, example_limit: int = 6) -> dict[str, Any]:
        space = self.universes.space("reality")
        rule_store = self.universes.rules("reality")
        bindings = tuple(space.bindings())
        active_rules = tuple(rule_store.rules(active_only=True))
        active_by_id = {rule.rule_id: rule for rule in active_rules}
        latest = self._latest_active_history(active_by_id)
        before_rules = self._before_rules(active_rules, latest)

        changed: list[dict[str, Any]] = []
        added_term_instances = 0
        for binding in bindings:
            before = _resolve_terms(binding.terms, before_rules)
            after = _resolve_terms(binding.terms, active_rules)
            if before == after:
                continue
            added = tuple(term for term in after if term not in set(before))
            removed = tuple(term for term in before if term not in set(after))
            added_term_instances += len(added)
            if len(changed) < max(1, example_limit):
                changed.append({
                    "binding_id": binding.binding_id,
                    "base_terms": list(binding.terms),
                    "before": list(before),
                    "after": list(after),
                    "added": list(added),
                    "removed": list(removed),
                })

        candidate_rows = _csv_rows(self.store_root / "logical_rule_candidates.csv")
        candidate_dispositions: dict[str, int] = {}
        for row in candidate_rows:
            key = (row.get("disposition") or row.get("status") or "unknown").strip().lower()
            candidate_dispositions[key] = candidate_dispositions.get(key, 0) + 1

        promotion: dict[str, Any] | None = None
        if latest is not None:
            rule = active_by_id.get(latest.get("rule_id", ""))
            if rule is not None:
                direct_matches = sum(set(rule.match_terms).issubset(set(binding.terms)) for binding in bindings)
                try:
                    provenance = json.loads(latest.get("provenance", "") or "{}")
                except json.JSONDecodeError:
                    provenance = {}
                promotion = {
                    "event": latest.get("event"),
                    "rule_id": rule.rule_id,
                    "version": rule.version,
                    "match_terms": list(rule.match_terms),
                    "emit_terms": list(rule.emit_terms),
                    "rule_text": f"{' + '.join(rule.match_terms)} ⇒ {' + '.join(rule.emit_terms)}",
                    "confidence": rule.confidence,
                    "source_id": rule.source_id,
                    "direct_matches": direct_matches,
                    "resolved_bindings_changed": len(changed),
                    "new_resolved_term_instances": added_term_instances,
                    "examples": changed,
                    "provenance": provenance,
                }

        return {
            "stage_counts": {
                "observed_base_bindings": len(bindings),
                "candidate_rule_records": len(candidate_rows),
                "active_governed_rules": len(active_rules),
                "quarantined_candidate_records": sum(
                    count for key, count in candidate_dispositions.items() if "quarant" in key
                ),
            },
            "candidate_dispositions": candidate_dispositions,
            "latest_promotion": promotion,
            "before_after": {
                "basis": "Reality resolved without vs with the latest active governed rule version",
                "resolved_bindings_changed": len(changed),
                "new_resolved_term_instances": added_term_instances,
                "examples": changed,
            },
            "provenance": {
                "build": 29,
                "read_only_manifestation": True,
                "base_logical_space_modified": False,
                "rule_store_modified": False,
                "qcds_core_modified": False,
                "canonical_spec_modified": False,
            },
        }
