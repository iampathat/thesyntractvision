from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Sequence

from .logical_assertion import normalize_logic_text
from .logical_space import CsvLogicalSpace, LogicalBinding
from .logical_transform import (
    CsvLogicalTransformStore,
    LogicalTransformError,
    LogicalTransformRule,
)


class LogicalUniverseError(ValueError):
    """Raised when a logical-universe operation would violate isolation/governance."""


def _norm(value: str) -> str:
    return normalize_logic_text(value)


def _norm_terms(values: Sequence[str]) -> tuple[str, ...]:
    return tuple(dict.fromkeys(_norm(value) for value in values if _norm(value)))


def _safe_universe_id(value: str) -> str:
    value = value.strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,79}", value):
        raise LogicalUniverseError("universe_id must be a simple stable identifier")
    return value


UNIVERSE_MODES = {"observed", "declared", "hypothetical", "simulation"}


@dataclass(frozen=True)
class LogicalUniverse:
    universe_id: str
    mode: str
    description: str = ""
    authority: str = ""
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        _safe_universe_id(self.universe_id)
        if self.mode not in UNIVERSE_MODES:
            raise LogicalUniverseError(f"unsupported logical universe mode: {self.mode}")
        if self.mode == "declared" and not self.authority.strip():
            raise LogicalUniverseError("declared universes require an authority")


UNIVERSE_FIELDS = (
    "universe_id", "mode", "description", "authority", "provenance",
)


@dataclass
class CsvLogicalUniverseStore:
    """Registry and isolated roots for multiple logical universes.

    The existing root Logical Space is retained as the special ``reality``
    universe for backward compatibility. Other universes are isolated below
    ``universes/<universe_id>/``.
    """

    root: str | Path

    def __post_init__(self) -> None:
        self.root = Path(self.root)
        self.root.mkdir(parents=True, exist_ok=True)

    @property
    def registry_path(self) -> Path:
        return self.root / "logical_universes.csv"

    def universe_root(self, universe_id: str) -> Path:
        universe_id = _safe_universe_id(universe_id)
        if universe_id == "reality":
            return self.root
        return self.root / "universes" / universe_id

    def universes(self) -> tuple[LogicalUniverse, ...]:
        if not self.registry_path.exists():
            return ()
        with self.registry_path.open("r", encoding="utf-8", newline="") as handle:
            rows = tuple(csv.DictReader(handle))
        return tuple(
            LogicalUniverse(
                universe_id=row["universe_id"],
                mode=row["mode"],
                description=row["description"],
                authority=row["authority"],
                provenance=json.loads(row["provenance"] or "{}"),
            )
            for row in rows
        )

    def get(self, universe_id: str) -> LogicalUniverse | None:
        universe_id = _safe_universe_id(universe_id)
        return next((item for item in self.universes() if item.universe_id == universe_id), None)

    def ensure_reality(self) -> LogicalUniverse:
        existing = self.get("reality")
        if existing is not None:
            return existing
        return self.create(
            LogicalUniverse(
                universe_id="reality",
                mode="observed",
                description="Observed/source-attributed logical universe",
                provenance={"legacy_root_compatible": True, "external_truth_claim": False},
            )
        )

    def create(self, universe: LogicalUniverse) -> LogicalUniverse:
        if self.get(universe.universe_id) is not None:
            raise LogicalUniverseError(f"logical universe already exists: {universe.universe_id}")
        rows = list(self.universes())
        rows.append(universe)
        temporary = self.registry_path.with_suffix(".csv.tmp")
        with temporary.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(UNIVERSE_FIELDS))
            writer.writeheader()
            for item in sorted(rows, key=lambda row: row.universe_id):
                writer.writerow({
                    "universe_id": item.universe_id,
                    "mode": item.mode,
                    "description": item.description,
                    "authority": item.authority,
                    "provenance": json.dumps(dict(item.provenance), ensure_ascii=False, sort_keys=True, separators=(",", ":")),
                })
        temporary.replace(self.registry_path)
        root = self.universe_root(universe.universe_id)
        root.mkdir(parents=True, exist_ok=True)
        return universe

    def space(self, universe_id: str) -> CsvLogicalSpace:
        if self.get(universe_id) is None:
            raise LogicalUniverseError(f"unknown logical universe: {universe_id}")
        return CsvLogicalSpace(self.universe_root(universe_id))

    def rules(self, universe_id: str) -> CsvLogicalTransformStore:
        if self.get(universe_id) is None:
            raise LogicalUniverseError(f"unknown logical universe: {universe_id}")
        return CsvLogicalTransformStore(self.universe_root(universe_id))


@dataclass(frozen=True)
class RuleDriftPolicy:
    """Conservative MVP limits for a proposed logical rule change."""

    max_changed_fraction: float = 0.25
    max_changed_bindings: int = 500
    max_term_delta_per_binding: int = 8
    require_challenge_for_observed: bool = True
    allow_zero_effect: bool = False

    def __post_init__(self) -> None:
        if not 0.0 <= self.max_changed_fraction <= 1.0:
            raise LogicalUniverseError("max_changed_fraction must be in [0, 1]")
        if self.max_changed_bindings < 0 or self.max_term_delta_per_binding <= 0:
            raise LogicalUniverseError("drift policy bounds must be positive")


@dataclass(frozen=True)
class RuleDriftReport:
    universe_id: str
    candidate_id: str
    rule_id: str
    operation: str
    total_bindings: int
    directly_matched_bindings: int
    changed_bindings: int
    changed_fraction: float
    added_term_instances: int
    removed_term_instances: int
    max_term_delta_per_binding: int
    sample_changed_binding_ids: tuple[str, ...]
    disposition: str
    reasons: tuple[str, ...]


@dataclass(frozen=True)
class LogicalRuleCandidate:
    candidate_id: str
    universe_id: str
    rule: LogicalTransformRule
    operation: str = "install"
    status: str = "proposed"
    drift_report: RuleDriftReport | None = None
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.candidate_id.strip():
            raise LogicalUniverseError("logical rule candidate requires candidate_id")
        _safe_universe_id(self.universe_id)
        if self.operation not in {"install", "replace"}:
            raise LogicalUniverseError("candidate operation must be install or replace")
        if self.status not in {"proposed", "promotable", "quarantined", "promoted", "rejected"}:
            raise LogicalUniverseError("unsupported candidate status")


CANDIDATE_FIELDS = (
    "candidate_id", "universe_id", "operation", "status", "rule_id",
    "match_terms", "emit_terms", "source_id", "confidence", "rule_version",
    "total_bindings", "directly_matched_bindings", "changed_bindings",
    "changed_fraction", "added_term_instances", "removed_term_instances",
    "max_term_delta_per_binding", "disposition", "reasons", "provenance",
)


@dataclass
class LogicalRuleGovernance:
    universe_store: CsvLogicalUniverseStore
    policy: RuleDriftPolicy = field(default_factory=RuleDriftPolicy)
    max_rounds: int = 16

    def __post_init__(self) -> None:
        if self.max_rounds <= 0:
            raise LogicalUniverseError("max_rounds must be positive")

    def _candidate_path(self, universe_id: str) -> Path:
        return self.universe_store.universe_root(universe_id) / "logical_rule_candidates.csv"

    def _resolve_terms(
        self,
        binding: LogicalBinding,
        rules: Sequence[LogicalTransformRule],
    ) -> tuple[str, ...]:
        terms = list(_norm_terms(binding.terms))
        known = set(terms)
        active = tuple(rule for rule in rules if rule.status == "active")
        for _ in range(self.max_rounds):
            changed = False
            for rule in active:
                if not set(_norm_terms(rule.match_terms)).issubset(known):
                    continue
                for term in _norm_terms(rule.emit_terms):
                    if term not in known:
                        known.add(term)
                        terms.append(term)
                        changed = True
            if not changed:
                break
        return tuple(terms)

    def analyze(
        self,
        universe_id: str,
        *,
        candidate_id: str,
        rule: LogicalTransformRule,
        operation: str = "install",
    ) -> RuleDriftReport:
        universe = self.universe_store.get(universe_id)
        if universe is None:
            raise LogicalUniverseError(f"unknown logical universe: {universe_id}")
        store = self.universe_store.rules(universe_id)
        baseline_rules = list(store.rules(active_only=True))
        existing = store.get(rule.rule_id)
        if operation == "install" and existing is not None:
            raise LogicalUniverseError(f"rule already exists; use replace: {rule.rule_id}")
        if operation == "replace" and existing is None:
            raise LogicalUniverseError(f"cannot replace unknown rule: {rule.rule_id}")

        proposed_rules = [item for item in baseline_rules if item.rule_id != rule.rule_id]
        proposed_rules.append(rule)
        bindings = self.universe_store.space(universe_id).bindings()
        changed_ids: list[str] = []
        direct = 0
        added = 0
        removed = 0
        max_delta = 0
        wanted = set(_norm_terms(rule.match_terms))
        for binding in bindings:
            before = set(self._resolve_terms(binding, baseline_rules))
            if wanted.issubset(before):
                direct += 1
            after = set(self._resolve_terms(binding, proposed_rules))
            if before == after:
                continue
            changed_ids.append(binding.binding_id)
            added_here = len(after - before)
            removed_here = len(before - after)
            added += added_here
            removed += removed_here
            max_delta = max(max_delta, added_here + removed_here)

        total = len(bindings)
        changed = len(changed_ids)
        fraction = (changed / total) if total else 0.0
        reasons: list[str] = []
        if changed == 0 and not self.policy.allow_zero_effect:
            reasons.append("zero_effect")
        if fraction > self.policy.max_changed_fraction:
            reasons.append("changed_fraction_exceeds_policy")
        if changed > self.policy.max_changed_bindings:
            reasons.append("changed_bindings_exceed_policy")
        if max_delta > self.policy.max_term_delta_per_binding:
            reasons.append("term_delta_exceeds_policy")
        disposition = "quarantine" if reasons else "promotable"
        return RuleDriftReport(
            universe_id=universe_id,
            candidate_id=candidate_id,
            rule_id=rule.rule_id,
            operation=operation,
            total_bindings=total,
            directly_matched_bindings=direct,
            changed_bindings=changed,
            changed_fraction=fraction,
            added_term_instances=added,
            removed_term_instances=removed,
            max_term_delta_per_binding=max_delta,
            sample_changed_binding_ids=tuple(changed_ids[:12]),
            disposition=disposition,
            reasons=tuple(reasons),
        )

    def _append_candidate(self, candidate: LogicalRuleCandidate) -> None:
        path = self._candidate_path(candidate.universe_id)
        exists = path.exists()
        report = candidate.drift_report
        with path.open("a", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(CANDIDATE_FIELDS))
            if not exists:
                writer.writeheader()
            writer.writerow({
                "candidate_id": candidate.candidate_id,
                "universe_id": candidate.universe_id,
                "operation": candidate.operation,
                "status": candidate.status,
                "rule_id": candidate.rule.rule_id,
                "match_terms": json.dumps(_norm_terms(candidate.rule.match_terms), ensure_ascii=False, separators=(",", ":")),
                "emit_terms": json.dumps(_norm_terms(candidate.rule.emit_terms), ensure_ascii=False, separators=(",", ":")),
                "source_id": candidate.rule.source_id,
                "confidence": candidate.rule.confidence,
                "rule_version": candidate.rule.version,
                "total_bindings": report.total_bindings if report else "",
                "directly_matched_bindings": report.directly_matched_bindings if report else "",
                "changed_bindings": report.changed_bindings if report else "",
                "changed_fraction": report.changed_fraction if report else "",
                "added_term_instances": report.added_term_instances if report else "",
                "removed_term_instances": report.removed_term_instances if report else "",
                "max_term_delta_per_binding": report.max_term_delta_per_binding if report else "",
                "disposition": report.disposition if report else "",
                "reasons": json.dumps(report.reasons if report else (), separators=(",", ":")),
                "provenance": json.dumps(dict(candidate.provenance), ensure_ascii=False, sort_keys=True, separators=(",", ":")),
            })

    def propose(
        self,
        universe_id: str,
        *,
        candidate_id: str,
        rule: LogicalTransformRule,
        operation: str = "install",
        provenance: Mapping[str, Any] | None = None,
    ) -> LogicalRuleCandidate:
        report = self.analyze(
            universe_id,
            candidate_id=candidate_id,
            rule=rule,
            operation=operation,
        )
        status = "promotable" if report.disposition == "promotable" else "quarantined"
        candidate = LogicalRuleCandidate(
            candidate_id=candidate_id,
            universe_id=universe_id,
            rule=rule,
            operation=operation,
            status=status,
            drift_report=report,
            provenance={
                **dict(provenance or {}),
                "active_space_modified": False,
                "blast_radius_measured": True,
                "canonical_spec_modified": False,
            },
        )
        self._append_candidate(candidate)
        return candidate

    def promote(
        self,
        candidate: LogicalRuleCandidate,
        *,
        challenge_passed: bool = False,
        approval_source: str,
        override_blast: bool = False,
    ) -> LogicalTransformRule:
        universe = self.universe_store.get(candidate.universe_id)
        if universe is None:
            raise LogicalUniverseError(f"unknown logical universe: {candidate.universe_id}")
        if not approval_source.strip():
            raise LogicalUniverseError("promotion requires approval_source")
        report = candidate.drift_report
        if report is None:
            raise LogicalUniverseError("candidate must have a drift report")
        if report.disposition == "quarantine" and not override_blast:
            raise LogicalUniverseError("quarantined rule requires explicit blast-radius override")
        if universe.mode == "observed" and self.policy.require_challenge_for_observed and not challenge_passed:
            raise LogicalUniverseError("observed-universe promotion requires challenge_passed")
        if universe.mode == "declared" and not universe.authority.strip():
            raise LogicalUniverseError("declared-universe promotion requires universe authority")

        store = self.universe_store.rules(candidate.universe_id)
        promotion_provenance = {
            **dict(candidate.rule.provenance),
            **dict(candidate.provenance),
            "candidate_id": candidate.candidate_id,
            "approval_source": approval_source,
            "challenge_passed": challenge_passed,
            "blast_override": override_blast,
            "universe_id": candidate.universe_id,
            "universe_mode": universe.mode,
            "drift_changed_bindings": report.changed_bindings,
            "drift_changed_fraction": report.changed_fraction,
        }
        if candidate.operation == "install":
            promoted = LogicalTransformRule(
                rule_id=candidate.rule.rule_id,
                match_terms=candidate.rule.match_terms,
                emit_terms=candidate.rule.emit_terms,
                source_id=candidate.rule.source_id,
                confidence=candidate.rule.confidence,
                version=candidate.rule.version,
                status="active",
                provenance=promotion_provenance,
            )
            return store.install(promoted)
        try:
            return store.replace(
                candidate.rule.rule_id,
                match_terms=candidate.rule.match_terms,
                emit_terms=candidate.rule.emit_terms,
                source_id=candidate.rule.source_id,
                confidence=candidate.rule.confidence,
                provenance=promotion_provenance,
            )
        except LogicalTransformError as exc:
            raise LogicalUniverseError(str(exc)) from exc
