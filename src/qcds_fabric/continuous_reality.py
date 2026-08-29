from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Sequence

from .logical_robot_observatory import LogicalRobotEventLog
from .logical_transform import LogicalSpaceResolver
from .logical_universe import CsvLogicalUniverseStore
from .public_web_reality import PublicWebRealityError, run_public_web_reality_spec


class ContinuousRealityError(ValueError):
    """Raised when BUILD 25 would exceed its represented frontier or policy."""


def _mapping(value: Any, name: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise ContinuousRealityError(f"{name} must be an object")
    return value


def _sequence(value: Any, name: str) -> Sequence[Any]:
    if isinstance(value, (str, bytes, bytearray)) or not isinstance(value, Sequence):
        raise ContinuousRealityError(f"{name} must be an array")
    return value


def _terms(value: Any) -> tuple[str, ...]:
    return tuple(str(item).strip() for item in _sequence(value, "probe_terms") if str(item).strip())


def _mission_id(spec: Mapping[str, Any]) -> str:
    value = str(spec.get("mission_id", "")).strip()
    if not value:
        raise ContinuousRealityError("every continuous Reality mission requires mission_id")
    return value


def _max_failure_severity(spec: Mapping[str, Any]) -> float:
    values: list[float] = []
    for raw in _sequence(spec.get("failure_observations", ()), "failure_observations"):
        item = _mapping(raw, "failure_observations[]")
        values.append(float(item.get("severity", 0.0)))
    return max(values, default=0.0)


def _target_candidate_pressure(spec: Mapping[str, Any]) -> int:
    problem = _mapping(spec.get("problem", {}), "problem")
    queries = _sequence(problem.get("queries", ()), "problem.queries")
    failures = _sequence(spec.get("failure_observations", ()), "failure_observations")
    failed_ids = {
        str(query_id).strip()
        for raw in failures
        for query_id in _sequence(_mapping(raw, "failure_observations[]").get("query_ids", ()), "query_ids")
    }
    pressure = 0
    for raw in queries:
        query = _mapping(raw, "problem.queries[]")
        if str(query.get("query_id", "")).strip() not in failed_ids:
            continue
        pressure = max(pressure, len(_sequence(query.get("candidate_values", ()), "candidate_values")))
    return pressure


@dataclass(frozen=True)
class ContinuousGrowthPolicy:
    max_cycles: int = 5
    stop_on_conflict: bool = True
    stop_on_quarantine: bool = False
    stop_on_error: bool = True
    allow_revisit_within_run: bool = False

    def __post_init__(self) -> None:
        if self.max_cycles <= 0 or self.max_cycles > 100:
            raise ValueError("max_cycles must be in [1, 100]")


@dataclass(frozen=True)
class FrontierCandidate:
    mission_id: str
    score: float
    severity: float
    candidate_pressure: int
    probe_terms: tuple[str, ...]


@dataclass(frozen=True)
class ContinuousRealityResult:
    run_id: str
    status: str
    cycles: int
    selected_missions: tuple[str, ...]
    cycle_statuses: tuple[str, ...]
    remaining_unresolved: tuple[str, ...]
    active_reality_rule_count: int
    event_path: str
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "status": self.status,
            "cycles": self.cycles,
            "selected_missions": list(self.selected_missions),
            "cycle_statuses": list(self.cycle_statuses),
            "remaining_unresolved": list(self.remaining_unresolved),
            "active_reality_rule_count": self.active_reality_rule_count,
            "event_path": self.event_path,
            "provenance": dict(self.provenance),
        }


@dataclass
class ContinuousRealityRunner:
    """Bounded autonomous Reality-growth overlay.

    The runner re-evaluates the represented unresolved frontier after each cycle
    and selects the next gap by epistemic pressure. Input order is not execution
    order. It cannot invent unrepresented missions, exceed max_cycles, or bypass
    BUILD 22 challenge and BUILD 19 governance.
    """

    store_root: Path

    def __init__(self, store_root: str | Path = "./intelligence_store") -> None:
        self.store_root = Path(store_root)
        self.store_root.mkdir(parents=True, exist_ok=True)
        self.events = LogicalRobotEventLog(self.store_root)
        self.universes = CsvLogicalUniverseStore(self.store_root)
        self.universes.ensure_reality()
        self.cursor_path = self.store_root / "logical_robot_inbox.cursor"

    def _resolved(self, spec: Mapping[str, Any]) -> bool:
        terms = _terms(spec.get("probe_terms", ()))
        if not terms:
            return False
        resolver = LogicalSpaceResolver(self.universes.space("reality"), self.universes.rules("reality"))
        return bool(resolver.query(*terms))

    def _frontier(
        self,
        missions: Mapping[str, Mapping[str, Any]],
        attempted: set[str],
        *,
        allow_revisit: bool,
    ) -> tuple[FrontierCandidate, ...]:
        candidates: list[FrontierCandidate] = []
        for mission_id, spec in missions.items():
            if self._resolved(spec):
                continue
            if mission_id in attempted and not allow_revisit:
                continue
            severity = _max_failure_severity(spec)
            pressure = _target_candidate_pressure(spec)
            score = severity * 100.0 + pressure
            candidates.append(FrontierCandidate(mission_id, score, severity, pressure, _terms(spec.get("probe_terms", ()))))
        return tuple(sorted(candidates, key=lambda item: (-item.score, item.mission_id)))

    def _read_new_inputs(self) -> tuple[dict[str, Any], ...]:
        try:
            cursor = int(self.cursor_path.read_text(encoding="utf-8").strip()) if self.cursor_path.exists() else 0
        except (OSError, ValueError):
            cursor = 0
        rows = self.events.inbox(after=cursor)
        if rows:
            self.cursor_path.write_text(str(max(int(row.get("input_id", 0)) for row in rows)), encoding="utf-8")
        return rows

    def _operator_directive(
        self,
        mission_ids: set[str],
    ) -> tuple[str | None, str | None]:
        forced: str | None = None
        terminal: str | None = None
        for item in self._read_new_inputs():
            text = str(item.get("text", "")).strip()
            lowered = text.casefold()
            if lowered == "/pause":
                terminal = "paused_by_human"
                self.events.emit("growth_paused_by_human", {"input_id": item.get("input_id")}, source="human")
            elif lowered == "/stop":
                terminal = "stopped_by_human"
                self.events.emit("growth_stopped_by_human", {"input_id": item.get("input_id")}, source="human")
            elif lowered.startswith("/run "):
                requested = text[5:].strip()
                if requested in mission_ids:
                    forced = requested
                    self.events.emit("frontier_human_priority", {"mission_id": requested}, source="human")
                else:
                    self.events.emit("human_command_rejected", {"reason": "unknown_mission", "text": text}, source="logical_robot")
            elif lowered == "/status":
                self.events.emit("human_status_request", self.events.state(), source="logical_robot")
            else:
                self.events.emit(
                    "human_input_received_uncompiled",
                    {"text": text, "truth_effect": 0},
                    source="logical_robot",
                )
        return forced, terminal

    def run(
        self,
        spec: Mapping[str, Any],
        *,
        tools: Sequence[Any] | None = None,
    ) -> ContinuousRealityResult:
        run_id = str(spec.get("run_id", "continuous-reality-growth")).strip()
        if not run_id:
            raise ContinuousRealityError("run_id must be non-empty")
        policy_raw = _mapping(spec.get("policy", {}), "policy")
        policy = ContinuousGrowthPolicy(
            max_cycles=int(policy_raw.get("max_cycles", 5)),
            stop_on_conflict=bool(policy_raw.get("stop_on_conflict", True)),
            stop_on_quarantine=bool(policy_raw.get("stop_on_quarantine", False)),
            stop_on_error=bool(policy_raw.get("stop_on_error", True)),
            allow_revisit_within_run=bool(policy_raw.get("allow_revisit_within_run", False)),
        )
        mission_items = _sequence(spec.get("missions", ()), "missions")
        missions: dict[str, Mapping[str, Any]] = {}
        for raw in mission_items:
            mission = _mapping(raw, "missions[]")
            mission_id = _mission_id(mission)
            if mission_id in missions:
                raise ContinuousRealityError(f"duplicate mission_id: {mission_id}")
            missions[mission_id] = mission
        if not missions:
            raise ContinuousRealityError("continuous Reality requires at least one represented mission")

        self.events.emit(
            "continuous_growth_started",
            {"run_id": run_id, "max_cycles": policy.max_cycles, "represented_frontier": sorted(missions)},
            mission_id=run_id,
        )
        attempted: set[str] = set()
        selected: list[str] = []
        statuses: list[str] = []
        terminal_status = "frontier_exhausted"

        for cycle in range(1, policy.max_cycles + 1):
            forced, operator_terminal = self._operator_directive(set(missions))
            if operator_terminal:
                terminal_status = operator_terminal
                break
            frontier = self._frontier(
                missions,
                attempted,
                allow_revisit=policy.allow_revisit_within_run,
            )
            self.events.emit(
                "frontier_scored",
                {"cycle": cycle, "candidates": [candidate.__dict__ for candidate in frontier]},
                mission_id=run_id,
            )
            if not frontier:
                terminal_status = "frontier_resolved" if all(self._resolved(item) for item in missions.values()) else "frontier_exhausted"
                break
            chosen = next((candidate for candidate in frontier if candidate.mission_id == forced), frontier[0])
            selected.append(chosen.mission_id)
            attempted.add(chosen.mission_id)
            self.events.emit(
                "frontier_selected",
                {
                    "cycle": cycle,
                    "mission_id": chosen.mission_id,
                    "score": chosen.score,
                    "severity": chosen.severity,
                    "candidate_pressure": chosen.candidate_pressure,
                    "human_priority": forced == chosen.mission_id,
                },
                mission_id=chosen.mission_id,
            )
            try:
                result = run_public_web_reality_spec(
                    missions[chosen.mission_id],
                    store_root=self.store_root,
                    tools=tools,
                    event_log=self.events,
                )
                status = result.status
            except (PublicWebRealityError, ValueError) as exc:
                status = "error"
                self.events.emit("continuous_cycle_error", {"error": str(exc)}, mission_id=chosen.mission_id)
            statuses.append(status)
            self.events.emit(
                "continuous_cycle_completed",
                {"cycle": cycle, "mission_id": chosen.mission_id, "status": status},
                mission_id=chosen.mission_id,
            )
            if status == "error" and policy.stop_on_error:
                terminal_status = "stopped_on_error"
                break
            if status == "conflicting_identifying_evidence" and policy.stop_on_conflict:
                terminal_status = "stopped_on_conflict"
                break
            if status == "quarantined" and policy.stop_on_quarantine:
                terminal_status = "stopped_on_quarantine"
                break
            terminal_status = "max_cycles_reached" if cycle == policy.max_cycles else "frontier_progressing"

        remaining = tuple(candidate.mission_id for candidate in self._frontier(missions, set(), allow_revisit=True))
        active_rules = len(self.universes.rules("reality").active_rules())
        result = ContinuousRealityResult(
            run_id=run_id,
            status=terminal_status,
            cycles=len(selected),
            selected_missions=tuple(selected),
            cycle_statuses=tuple(statuses),
            remaining_unresolved=remaining,
            active_reality_rule_count=active_rules,
            event_path=str(self.events.events_path),
            provenance={
                "build": 25,
                "overlay_only": True,
                "frontier_re_evaluated_after_each_cycle": True,
                "execution_order_equals_input_order": False,
                "can_invent_unrepresented_missions": False,
                "bounded_by_policy": True,
                "build24_public_web_body_reused": True,
                "build22_challenge_reused": True,
                "build19_governance_reused": True,
                "qcds_core_modified": False,
                "canonical_spec_modified": False,
            },
        )
        self.events.emit("continuous_growth_completed", result.as_dict(), mission_id=run_id)
        return result


def load_continuous_reality_spec(path: str | Path) -> Mapping[str, Any]:
    with Path(path).open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return _mapping(payload, "root spec")


def run_continuous_reality_spec(
    spec: Mapping[str, Any],
    *,
    store_root: str | Path = "./intelligence_store",
    tools: Sequence[Any] | None = None,
) -> ContinuousRealityResult:
    return ContinuousRealityRunner(store_root).run(spec, tools=tools)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run BUILD 25: bounded continuous Reality growth over a represented unresolved frontier."
    )
    parser.add_argument("spec", help="Path to a BUILD 25 JSON spec containing a mission frontier")
    parser.add_argument("--store", default="./intelligence_store", help="Persistent intelligence-store root")
    args = parser.parse_args(argv)
    try:
        result = run_continuous_reality_spec(load_continuous_reality_spec(args.spec), store_root=args.store)
    except (OSError, json.JSONDecodeError, ContinuousRealityError, ValueError) as exc:
        parser.error(str(exc))
        return 2
    print(json.dumps(result.as_dict(), ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
