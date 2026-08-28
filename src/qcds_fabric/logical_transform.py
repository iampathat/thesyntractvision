from __future__ import annotations

import csv
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Sequence

from .logical_assertion import normalize_logic_text
from .logical_space import CsvLogicalSpace, LogicalBinding


class LogicalTransformError(ValueError):
    """Raised when a global logical transform cannot be represented safely."""


def _norm_terms(values: Sequence[str]) -> tuple[str, ...]:
    return tuple(dict.fromkeys(normalize_logic_text(value) for value in values if normalize_logic_text(value)))


@dataclass(frozen=True)
class LogicalTransformRule:
    """One reusable logical transform over the shared Logical Space.

    A rule is intentionally generic: every binding containing ``match_terms``
    acquires ``emit_terms`` in the resolved view. The base Logical Space is not
    rewritten. Rules are hypotheses/logic supplied with provenance; this class
    does not make them externally true or bypass QCDS oracle challenge.
    """

    rule_id: str
    match_terms: tuple[str, ...]
    emit_terms: tuple[str, ...]
    source_id: str
    confidence: float = 1.0
    version: int = 1
    status: str = "active"
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.rule_id.strip() or not self.source_id.strip():
            raise LogicalTransformError("logical transform requires rule_id and source_id")
        if not _norm_terms(self.match_terms) or not _norm_terms(self.emit_terms):
            raise LogicalTransformError("logical transform requires non-empty match and emit terms")
        if self.version <= 0:
            raise LogicalTransformError("logical transform version must be positive")
        if self.status not in {"active", "retired"}:
            raise LogicalTransformError("logical transform status must be active or retired")
        if not 0.5 <= self.confidence <= 1.0:
            raise LogicalTransformError("logical transform confidence must be in [0.5, 1.0]")


RULE_FIELDS = (
    "rule_id", "match_terms", "emit_terms", "source_id", "confidence",
    "version", "status", "provenance",
)
HISTORY_FIELDS = (
    "event", "rule_id", "version", "match_terms", "emit_terms", "source_id",
    "confidence", "status", "previous_version", "previous_match_terms",
    "previous_emit_terms", "provenance",
)


def _rule_row(rule: LogicalTransformRule) -> dict[str, Any]:
    return {
        "rule_id": rule.rule_id,
        "match_terms": json.dumps(_norm_terms(rule.match_terms), ensure_ascii=False, separators=(",", ":")),
        "emit_terms": json.dumps(_norm_terms(rule.emit_terms), ensure_ascii=False, separators=(",", ":")),
        "source_id": rule.source_id,
        "confidence": rule.confidence,
        "version": rule.version,
        "status": rule.status,
        "provenance": json.dumps(dict(rule.provenance), ensure_ascii=False, sort_keys=True, separators=(",", ":")),
    }


def _row_rule(row: Mapping[str, str]) -> LogicalTransformRule:
    return LogicalTransformRule(
        rule_id=row["rule_id"],
        match_terms=tuple(json.loads(row["match_terms"])),
        emit_terms=tuple(json.loads(row["emit_terms"])),
        source_id=row["source_id"],
        confidence=float(row["confidence"]),
        version=int(row["version"]),
        status=row["status"],
        provenance=json.loads(row.get("provenance", "") or "{}"),
    )


@dataclass
class CsvLogicalTransformStore:
    """Human-readable global logical-rule store for the MVP."""

    root: str | Path

    def __post_init__(self) -> None:
        self.root = Path(self.root)
        self.root.mkdir(parents=True, exist_ok=True)

    @property
    def current_path(self) -> Path:
        return self.root / "logical_rules.csv"

    @property
    def history_path(self) -> Path:
        return self.root / "logical_rule_history.csv"

    def rules(self, *, active_only: bool = False) -> tuple[LogicalTransformRule, ...]:
        if not self.current_path.exists():
            return ()
        with self.current_path.open("r", encoding="utf-8", newline="") as handle:
            rules = tuple(_row_rule(row) for row in csv.DictReader(handle))
        if active_only:
            rules = tuple(rule for rule in rules if rule.status == "active")
        return tuple(sorted(rules, key=lambda rule: rule.rule_id))

    def get(self, rule_id: str) -> LogicalTransformRule | None:
        return next((rule for rule in self.rules() if rule.rule_id == rule_id), None)

    def _write_current(self, rules: Sequence[LogicalTransformRule]) -> None:
        temporary = self.current_path.with_suffix(".csv.tmp")
        with temporary.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(RULE_FIELDS), extrasaction="ignore")
            writer.writeheader()
            for rule in sorted(rules, key=lambda item: item.rule_id):
                writer.writerow(_rule_row(rule))
        temporary.replace(self.current_path)

    def _append_history(
        self,
        event: str,
        rule: LogicalTransformRule,
        previous: LogicalTransformRule | None,
    ) -> None:
        exists = self.history_path.exists()
        with self.history_path.open("a", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(HISTORY_FIELDS), extrasaction="ignore")
            if not exists:
                writer.writeheader()
            writer.writerow({
                "event": event,
                **_rule_row(rule),
                "previous_version": previous.version if previous else "",
                "previous_match_terms": json.dumps(_norm_terms(previous.match_terms), ensure_ascii=False, separators=(",", ":")) if previous else "",
                "previous_emit_terms": json.dumps(_norm_terms(previous.emit_terms), ensure_ascii=False, separators=(",", ":")) if previous else "",
            })

    def install(self, rule: LogicalTransformRule) -> LogicalTransformRule:
        if self.get(rule.rule_id) is not None:
            raise LogicalTransformError(f"logical rule already exists: {rule.rule_id}")
        current = list(self.rules())
        current.append(rule)
        self._write_current(current)
        self._append_history("GENESIS", rule, None)
        return rule

    def replace(
        self,
        rule_id: str,
        *,
        match_terms: Sequence[str] | None = None,
        emit_terms: Sequence[str] | None = None,
        source_id: str | None = None,
        confidence: float | None = None,
        provenance: Mapping[str, Any] | None = None,
    ) -> LogicalTransformRule:
        previous = self.get(rule_id)
        if previous is None:
            raise LogicalTransformError(f"unknown logical rule: {rule_id}")
        replacement = LogicalTransformRule(
            rule_id=previous.rule_id,
            match_terms=tuple(match_terms) if match_terms is not None else previous.match_terms,
            emit_terms=tuple(emit_terms) if emit_terms is not None else previous.emit_terms,
            source_id=source_id or previous.source_id,
            confidence=previous.confidence if confidence is None else confidence,
            version=previous.version + 1,
            status="active",
            provenance={**dict(previous.provenance), **dict(provenance or {})},
        )
        current = [replacement if rule.rule_id == rule_id else rule for rule in self.rules()]
        self._write_current(current)
        self._append_history("REPLACED", replacement, previous)
        return replacement

    def retire(self, rule_id: str, *, provenance: Mapping[str, Any] | None = None) -> LogicalTransformRule:
        previous = self.get(rule_id)
        if previous is None:
            raise LogicalTransformError(f"unknown logical rule: {rule_id}")
        retired = LogicalTransformRule(
            rule_id=previous.rule_id,
            match_terms=previous.match_terms,
            emit_terms=previous.emit_terms,
            source_id=previous.source_id,
            confidence=previous.confidence,
            version=previous.version + 1,
            status="retired",
            provenance={**dict(previous.provenance), **dict(provenance or {})},
        )
        current = [retired if rule.rule_id == rule_id else rule for rule in self.rules()]
        self._write_current(current)
        self._append_history("RETIRED", retired, previous)
        return retired


@dataclass(frozen=True)
class ResolvedLogicalBinding:
    base_binding_id: str
    base_terms: tuple[str, ...]
    resolved_terms: tuple[str, ...]
    applied_rules: tuple[str, ...]
    source_id: str
    provenance: Mapping[str, Any] = field(default_factory=dict)


@dataclass
class LogicalSpaceResolver:
    """Resolve a shared Logical Space through active global rules without materializing them."""

    space: CsvLogicalSpace
    rules: CsvLogicalTransformStore
    max_rounds: int = 16

    def __post_init__(self) -> None:
        if self.max_rounds <= 0:
            raise LogicalTransformError("max_rounds must be positive")

    def resolve_binding(self, binding: LogicalBinding) -> ResolvedLogicalBinding:
        terms = list(_norm_terms(binding.terms))
        known = set(terms)
        applied: list[str] = []
        active = self.rules.rules(active_only=True)
        for _ in range(self.max_rounds):
            changed = False
            for rule in active:
                match = set(_norm_terms(rule.match_terms))
                if not match.issubset(known):
                    continue
                emitted = _norm_terms(rule.emit_terms)
                new_terms = [term for term in emitted if term not in known]
                if not new_terms:
                    continue
                terms.extend(new_terms)
                known.update(new_terms)
                applied.append(f"{rule.rule_id}@{rule.version}")
                changed = True
            if not changed:
                break
        return ResolvedLogicalBinding(
            base_binding_id=binding.binding_id,
            base_terms=_norm_terms(binding.terms),
            resolved_terms=tuple(terms),
            applied_rules=tuple(applied),
            source_id=binding.source_id,
            provenance={
                "resolution": "non_materialized_global_logic_v0",
                "base_logical_space_modified": False,
                "rule_count": len(active),
            },
        )

    def resolved_bindings(self) -> tuple[ResolvedLogicalBinding, ...]:
        return tuple(self.resolve_binding(binding) for binding in self.space.bindings())

    def query(self, *terms: str) -> tuple[ResolvedLogicalBinding, ...]:
        wanted = set(_norm_terms(terms))
        if not wanted:
            return self.resolved_bindings()
        return tuple(
            binding for binding in self.resolved_bindings()
            if wanted.issubset(set(binding.resolved_terms))
        )
