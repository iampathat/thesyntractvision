from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence

from .logical_space import LogicalBinding
from .logical_transform import LogicalSpaceResolver, LogicalTransformRule
from .logical_universe import (
    CsvLogicalUniverseStore,
    LogicalRuleGovernance,
    LogicalUniverse,
    LogicalUniverseError,
    RuleDriftPolicy,
)


class LogicalUniverseRunnerError(ValueError):
    """Raised when an executable Logical Universe MVP spec is invalid."""


def _require_mapping(value: Any, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise LogicalUniverseRunnerError(f"{label} must be an object")
    return value


def _require_sequence(value: Any, label: str) -> Sequence[Any]:
    if isinstance(value, (str, bytes)) or not isinstance(value, Sequence):
        raise LogicalUniverseRunnerError(f"{label} must be an array")
    return value


def _tuple_of_strings(value: Any, label: str) -> tuple[str, ...]:
    items = _require_sequence(value, label)
    resolved = tuple(str(item).strip() for item in items if str(item).strip())
    if not resolved:
        raise LogicalUniverseRunnerError(f"{label} must contain at least one term")
    return resolved


@dataclass(frozen=True)
class UniverseRunResult:
    universe_id: str
    universe_mode: str
    base_binding_count: int
    active_rule_count: int
    added_bindings: int
    rule_outcomes: tuple[Mapping[str, Any], ...]
    syntractfilter_results: tuple[Mapping[str, Any], ...]
    universe_directory: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "universe_id": self.universe_id,
            "universe_mode": self.universe_mode,
            "base_binding_count": self.base_binding_count,
            "active_rule_count": self.active_rule_count,
            "added_bindings": self.added_bindings,
            "rule_outcomes": list(self.rule_outcomes),
            "syntractfilter_results": list(self.syntractfilter_results),
            "universe_directory": self.universe_directory,
            "mvp_boundary": {
                "overlay_only": True,
                "qcds_core_modified": False,
                "canonical_spec_modified": False,
                "derived_logic_materialized_into_base_space": False,
            },
        }


@dataclass
class LogicalUniverseMvpRunner:
    """Thin executable layer above BUILD 17-19 Logical Space/Universe APIs.

    This runner deliberately contains no QCDS kernel, oracle-kernel, Fabric,
    rotation, nulling or Syntract-binding implementation. It creates/scopes a
    Logical Universe, seeds explicit base bindings, submits logical rules to the
    existing drift-governance layer, and exposes a resolved query view labelled
    ``syntractfilter_results``. The layer is therefore replaceable without
    changing the QCDS/Fabric cores.
    """

    store_root: str | Path

    def __post_init__(self) -> None:
        self.store_root = Path(self.store_root)
        self.store_root.mkdir(parents=True, exist_ok=True)
        self.universes = CsvLogicalUniverseStore(self.store_root)

    def _ensure_universe(self, spec: Mapping[str, Any]) -> LogicalUniverse:
        universe_id = str(spec.get("universe_id", "")).strip()
        mode = str(spec.get("mode", "")).strip()
        if not universe_id or not mode:
            raise LogicalUniverseRunnerError("universe requires universe_id and mode")

        authority = str(spec.get("authority", "")).strip()
        description = str(spec.get("description", "")).strip()
        provenance = _require_mapping(spec.get("provenance", {}), "universe.provenance")

        if universe_id == "reality":
            universe = self.universes.ensure_reality()
            if mode != universe.mode:
                raise LogicalUniverseRunnerError(
                    f"reality universe mode is fixed as {universe.mode}"
                )
            return universe

        existing = self.universes.get(universe_id)
        if existing is not None:
            if existing.mode != mode:
                raise LogicalUniverseRunnerError("existing universe mode does not match spec")
            if existing.mode == "declared" and existing.authority != authority:
                raise LogicalUniverseRunnerError("existing declared-universe authority does not match spec")
            return existing

        return self.universes.create(
            LogicalUniverse(
                universe_id=universe_id,
                mode=mode,
                description=description,
                authority=authority,
                provenance=dict(provenance),
            )
        )

    @staticmethod
    def _binding_from_spec(item: Mapping[str, Any], universe_id: str) -> LogicalBinding:
        binding_id = str(item.get("binding_id", "")).strip()
        source_id = str(item.get("source_id", "spec:seed")).strip()
        terms = _tuple_of_strings(item.get("terms", ()), "seed_bindings[].terms")
        if len(terms) < 2:
            raise LogicalUniverseRunnerError("seed binding requires at least two terms")
        return LogicalBinding(
            binding_id=binding_id,
            terms=terms,
            source_id=source_id,
            confidence=float(item.get("confidence", 1.0)),
            polarity=bool(item.get("polarity", True)),
            source_uri=str(item.get("source_uri", "")).strip() or None,
            mission_id=str(item.get("mission_id", "")).strip(),
            observation_id=str(item.get("observation_id", "")).strip(),
            excerpt=str(item.get("excerpt", "")).strip(),
            provenance={
                **dict(_require_mapping(item.get("provenance", {}), "seed binding provenance")),
                "universe_id": universe_id,
                "ingress": "logical_universe_mvp_spec",
            },
        )

    @staticmethod
    def _policy_from_spec(spec: Mapping[str, Any]) -> RuleDriftPolicy:
        allowed = {
            "max_changed_fraction",
            "max_changed_bindings",
            "max_term_delta_per_binding",
            "require_challenge_for_observed",
            "allow_zero_effect",
        }
        unknown = set(spec) - allowed
        if unknown:
            raise LogicalUniverseRunnerError(
                f"unsupported drift_policy fields: {sorted(unknown)}"
            )
        return RuleDriftPolicy(**dict(spec))

    def _run_rule(
        self,
        universe: LogicalUniverse,
        governance: LogicalRuleGovernance,
        item: Mapping[str, Any],
    ) -> Mapping[str, Any]:
        candidate_id = str(item.get("candidate_id", "")).strip()
        rule_id = str(item.get("rule_id", "")).strip()
        source_id = str(item.get("source_id", "")).strip()
        if not candidate_id or not rule_id or not source_id:
            raise LogicalUniverseRunnerError(
                "rule requires candidate_id, rule_id and source_id"
            )

        rule = LogicalTransformRule(
            rule_id=rule_id,
            match_terms=_tuple_of_strings(item.get("match_terms", ()), "rules[].match_terms"),
            emit_terms=_tuple_of_strings(item.get("emit_terms", ()), "rules[].emit_terms"),
            source_id=source_id,
            confidence=float(item.get("confidence", 1.0)),
            provenance={
                **dict(_require_mapping(item.get("provenance", {}), "rule provenance")),
                "universe_id": universe.universe_id,
                "ingress": "logical_universe_mvp_spec",
            },
        )
        operation = str(item.get("operation", "install")).strip() or "install"
        promote = bool(item.get("promote", True))
        challenge_passed = bool(item.get("challenge_passed", False))
        approval_source = str(item.get("approval_source", "")).strip()
        override_blast = bool(item.get("override_blast", False))

        current = self.universes.rules(universe.universe_id).get(rule_id)
        if operation == "install" and current is not None:
            same = (
                tuple(current.match_terms) == tuple(rule.match_terms)
                and tuple(current.emit_terms) == tuple(rule.emit_terms)
                and current.source_id == rule.source_id
                and current.status == "active"
            )
            if not same:
                raise LogicalUniverseRunnerError(
                    f"rule {rule_id} already exists with different logic; use operation=replace"
                )
            return {
                "candidate_id": candidate_id,
                "rule_id": rule_id,
                "status": "already_active",
                "promoted": False,
                "idempotent_reuse": True,
            }

        candidate = governance.propose(
            universe.universe_id,
            candidate_id=candidate_id,
            rule=rule,
            operation=operation,
            provenance={"runner": "build20_overlay"},
        )
        report = candidate.drift_report
        outcome: dict[str, Any] = {
            "candidate_id": candidate_id,
            "rule_id": rule_id,
            "status": candidate.status,
            "promoted": False,
            "changed_bindings": report.changed_bindings if report else None,
            "changed_fraction": report.changed_fraction if report else None,
            "drift_reasons": list(report.reasons) if report else [],
        }
        if not promote:
            return outcome

        if universe.mode == "declared" and approval_source != universe.authority:
            raise LogicalUniverseRunnerError(
                "declared-universe promotion approval_source must equal universe authority"
            )
        if not approval_source:
            raise LogicalUniverseRunnerError("promoted rules require approval_source")

        governance.promote(
            candidate,
            challenge_passed=challenge_passed,
            approval_source=approval_source,
            override_blast=override_blast,
        )
        outcome["promoted"] = True
        outcome["status"] = "promoted"
        return outcome

    def run(self, spec: Mapping[str, Any]) -> UniverseRunResult:
        universe_spec = _require_mapping(spec.get("universe"), "universe")
        universe = self._ensure_universe(universe_spec)
        space = self.universes.space(universe.universe_id)

        seed_specs = _require_sequence(spec.get("seed_bindings", ()), "seed_bindings")
        bindings = tuple(
            self._binding_from_spec(_require_mapping(item, "seed_bindings[]"), universe.universe_id)
            for item in seed_specs
        )
        added = space.append(bindings)

        policy_spec = _require_mapping(spec.get("drift_policy", {}), "drift_policy")
        governance = LogicalRuleGovernance(
            self.universes,
            policy=self._policy_from_spec(policy_spec),
            max_rounds=int(spec.get("max_rule_rounds", 16)),
        )

        rule_specs = _require_sequence(spec.get("rules", ()), "rules")
        outcomes = tuple(
            self._run_rule(
                universe,
                governance,
                _require_mapping(item, "rules[]"),
            )
            for item in rule_specs
        )

        resolver = LogicalSpaceResolver(
            space,
            self.universes.rules(universe.universe_id),
            max_rounds=int(spec.get("max_rule_rounds", 16)),
        )
        query_specs = _require_sequence(spec.get("queries", ()), "queries")
        filtered: list[Mapping[str, Any]] = []
        for raw in query_specs:
            item = _require_mapping(raw, "queries[]")
            query_id = str(item.get("query_id", "")).strip()
            terms = _tuple_of_strings(item.get("terms", ()), "queries[].terms")
            matches = resolver.query(*terms)
            filtered.append({
                "query_id": query_id,
                "terms": list(terms),
                "match_count": len(matches),
                "matches": [
                    {
                        "base_binding_id": match.base_binding_id,
                        "base_terms": list(match.base_terms),
                        "resolved_terms": list(match.resolved_terms),
                        "applied_rules": list(match.applied_rules),
                    }
                    for match in matches
                ],
            })

        return UniverseRunResult(
            universe_id=universe.universe_id,
            universe_mode=universe.mode,
            base_binding_count=len(space.bindings()),
            active_rule_count=len(self.universes.rules(universe.universe_id).rules(active_only=True)),
            added_bindings=added,
            rule_outcomes=outcomes,
            syntractfilter_results=tuple(filtered),
            universe_directory=str(self.universes.universe_root(universe.universe_id)),
        )


def load_universe_spec(path: str | Path) -> Mapping[str, Any]:
    with Path(path).open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return _require_mapping(payload, "root spec")


def run_universe_spec(
    spec: Mapping[str, Any],
    *,
    store_root: str | Path = "./intelligence_store",
) -> UniverseRunResult:
    return LogicalUniverseMvpRunner(store_root).run(spec)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run a bounded Logical Universe MVP above the existing QCDS/Syntract implementation."
    )
    parser.add_argument("spec", help="Path to a Logical Universe JSON spec")
    parser.add_argument("--store", default="./intelligence_store", help="Persistent intelligence-store root")
    args = parser.parse_args(argv)

    try:
        result = run_universe_spec(load_universe_spec(args.spec), store_root=args.store)
    except (OSError, json.JSONDecodeError, LogicalUniverseError, LogicalUniverseRunnerError, ValueError) as exc:
        parser.error(str(exc))
        return 2

    print(json.dumps(result.as_dict(), ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
