from __future__ import annotations

# Calendar Tribute License 1.0 — see LICENSE_CALENDAR_TRIBUTE.md

import json
import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence

from .problem import ProblemQuery, SemanticAtom, SemanticProblemFrame, SemanticRule
from .semantic import SemanticClaim
from .syntract_system import SyntractSystem


class CalendarRobotError(ValueError):
    pass


def _clean(value: str, *, field_name: str) -> str:
    out = " ".join(str(value).strip().split())
    if not out:
        raise CalendarRobotError(f"{field_name} must be non-empty")
    return out


def _dt(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError) as exc:
        raise CalendarRobotError(f"invalid ISO date/time: {value!r}") from exc
    return parsed


def _cmp_dt(value: str) -> datetime:
    parsed = _dt(value)
    if parsed.tzinfo is not None:
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _json_value(value: Any) -> Any:
    try:
        json.dumps(value)
    except (TypeError, ValueError) as exc:
        raise CalendarRobotError("calendar dimensions must be JSON serializable") from exc
    return value


@dataclass(frozen=True)
class CalendarPerson:
    person_id: str
    name: str
    dimensions: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        _clean(self.person_id, field_name="person_id")
        _clean(self.name, field_name="name")
        for key, value in self.dimensions.items():
            _clean(str(key), field_name="dimension name")
            _json_value(value)

    def as_dict(self) -> dict[str, Any]:
        return {
            "person_id": self.person_id,
            "name": self.name,
            "dimensions": dict(self.dimensions),
        }


@dataclass(frozen=True)
class CalendarEvent:
    event_id: str
    title: str
    start: str
    end: str
    people: tuple[str, ...] = ()
    location: str = ""
    all_day: bool = False
    locked: bool = False
    dimensions: Mapping[str, Any] = field(default_factory=dict)
    constraints: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        _clean(self.event_id, field_name="event_id")
        _clean(self.title, field_name="title")
        if _cmp_dt(self.end) <= _cmp_dt(self.start):
            raise CalendarRobotError("event end must be after start")
        if len(set(self.people)) != len(self.people):
            raise CalendarRobotError("event people must be unique")
        for key, value in self.dimensions.items():
            _clean(str(key), field_name="dimension name")
            _json_value(value)
        for key, value in self.constraints.items():
            _clean(str(key), field_name="constraint name")
            _json_value(value)

    @property
    def duration(self) -> timedelta:
        return _cmp_dt(self.end) - _cmp_dt(self.start)

    def as_dict(self) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "title": self.title,
            "start": self.start,
            "end": self.end,
            "people": list(self.people),
            "location": self.location,
            "all_day": self.all_day,
            "locked": self.locked,
            "dimensions": dict(self.dimensions),
            "constraints": dict(self.constraints),
        }

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any], *, event_id: str | None = None) -> "CalendarEvent":
        resolved_id = str(event_id or value.get("event_id") or f"event-{uuid.uuid4().hex[:12]}")
        raw_people = value.get("people") or ()
        if not isinstance(raw_people, (list, tuple)):
            raise CalendarRobotError("event people must be an array")
        dimensions = value.get("dimensions") or {}
        constraints = value.get("constraints") or {}
        if not isinstance(dimensions, Mapping) or not isinstance(constraints, Mapping):
            raise CalendarRobotError("event dimensions and constraints must be objects")
        return cls(
            event_id=resolved_id,
            title=str(value.get("title") or "Untitled event"),
            start=str(value.get("start") or ""),
            end=str(value.get("end") or ""),
            people=tuple(str(item) for item in raw_people if str(item).strip()),
            location=str(value.get("location") or ""),
            all_day=bool(value.get("all_day", False)),
            locked=bool(value.get("locked", False)),
            dimensions={str(key): val for key, val in dimensions.items()},
            constraints={str(key): val for key, val in constraints.items()},
        )


@dataclass(frozen=True)
class CalendarConflict:
    left_event_id: str
    right_event_id: str
    people: tuple[str, ...]
    start: str
    end: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "left_event_id": self.left_event_id,
            "right_event_id": self.right_event_id,
            "people": list(self.people),
            "start": self.start,
            "end": self.end,
        }


class CalendarSpace:
    """Persistent Calendar Space: one domain Logical Space, many projections."""

    FORMAT_VERSION = 1

    def __init__(self, store_root: str | Path = "./calendar_store") -> None:
        self.store_root = Path(store_root)
        self.store_root.mkdir(parents=True, exist_ok=True)
        self.path = self.store_root / "calendar_space.json"
        self._lock = threading.RLock()
        self.people: dict[str, CalendarPerson] = {}
        self.events: dict[str, CalendarEvent] = {}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise CalendarRobotError(f"cannot read Calendar Space: {exc}") from exc
        for item in raw.get("people", []):
            person = CalendarPerson(
                person_id=str(item.get("person_id") or ""),
                name=str(item.get("name") or ""),
                dimensions=dict(item.get("dimensions") or {}),
            )
            self.people[person.person_id] = person
        for item in raw.get("events", []):
            event = CalendarEvent.from_mapping(item)
            self.events[event.event_id] = event

    def _save(self) -> None:
        body = {
            "format": "qcds-calendar-space",
            "version": self.FORMAT_VERSION,
            "people": [person.as_dict() for person in self.people.values()],
            "events": [event.as_dict() for event in self.events.values()],
        }
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(body, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
        tmp.replace(self.path)

    def upsert_person(self, payload: Mapping[str, Any]) -> CalendarPerson:
        person_id = str(payload.get("person_id") or f"person-{uuid.uuid4().hex[:10]}")
        dimensions = payload.get("dimensions") or {}
        if not isinstance(dimensions, Mapping):
            raise CalendarRobotError("person dimensions must be an object")
        person = CalendarPerson(
            person_id=person_id,
            name=str(payload.get("name") or "Person"),
            dimensions={str(key): val for key, val in dimensions.items()},
        )
        with self._lock:
            self.people[person.person_id] = person
            self._save()
        return person

    def upsert_event(self, payload: Mapping[str, Any]) -> CalendarEvent:
        event_id = str(payload.get("event_id") or f"event-{uuid.uuid4().hex[:12]}")
        event = CalendarEvent.from_mapping(payload, event_id=event_id)
        missing = [person_id for person_id in event.people if person_id not in self.people]
        if missing:
            raise CalendarRobotError(f"unknown people: {', '.join(missing)}")
        with self._lock:
            self.events[event.event_id] = event
            self._save()
        return event

    def delete_event(self, event_id: str) -> None:
        with self._lock:
            if event_id not in self.events:
                raise CalendarRobotError(f"unknown event: {event_id}")
            del self.events[event_id]
            self._save()

    def move_event(
        self,
        event_id: str,
        *,
        start: str,
        end: str | None = None,
        people: Sequence[str] | None = None,
    ) -> CalendarEvent:
        with self._lock:
            current = self.events.get(event_id)
            if current is None:
                raise CalendarRobotError(f"unknown event: {event_id}")
            if current.locked:
                raise CalendarRobotError("locked event cannot be moved")
            resolved_end = end
            if resolved_end is None:
                resolved_end = (_cmp_dt(start) + current.duration).isoformat(timespec="minutes")
            resolved_people = current.people if people is None else tuple(str(item) for item in people)
            replacement = CalendarEvent(
                event_id=current.event_id,
                title=current.title,
                start=start,
                end=resolved_end,
                people=resolved_people,
                location=current.location,
                all_day=current.all_day,
                locked=current.locked,
                dimensions=current.dimensions,
                constraints=current.constraints,
            )
            missing = [person_id for person_id in replacement.people if person_id not in self.people]
            if missing:
                raise CalendarRobotError(f"unknown people: {', '.join(missing)}")
            self.events[event_id] = replacement
            self._save()
            return replacement

    @staticmethod
    def _overlap(left: CalendarEvent, right: CalendarEvent) -> tuple[datetime, datetime] | None:
        start = max(_cmp_dt(left.start), _cmp_dt(right.start))
        end = min(_cmp_dt(left.end), _cmp_dt(right.end))
        return (start, end) if start < end else None

    def conflicts(self, *, exclude_event_id: str | None = None) -> tuple[CalendarConflict, ...]:
        values = [event for event in self.events.values() if event.event_id != exclude_event_id]
        out: list[CalendarConflict] = []
        for index, left in enumerate(values):
            for right in values[index + 1 :]:
                shared = tuple(sorted(set(left.people).intersection(right.people)))
                if not shared:
                    continue
                overlap = self._overlap(left, right)
                if overlap is None:
                    continue
                out.append(
                    CalendarConflict(
                        left_event_id=left.event_id,
                        right_event_id=right.event_id,
                        people=shared,
                        start=overlap[0].isoformat(timespec="minutes"),
                        end=overlap[1].isoformat(timespec="minutes"),
                    )
                )
        return tuple(out)

    def dimension_catalog(self) -> dict[str, list[Any]]:
        values: dict[str, set[str]] = {
            "person": set(),
            "location": set(),
            "event": set(),
            "day": set(),
        }
        for person in self.people.values():
            values["person"].add(person.name)
            for key, value in person.dimensions.items():
                values.setdefault(key, set()).add(json.dumps(value, ensure_ascii=False, sort_keys=True))
        for event in self.events.values():
            values["event"].add(event.title)
            values["day"].add(_cmp_dt(event.start).date().isoformat())
            if event.location:
                values["location"].add(event.location)
            for key, value in event.dimensions.items():
                values.setdefault(key, set()).add(json.dumps(value, ensure_ascii=False, sort_keys=True))
        return {key: sorted(items) for key, items in sorted(values.items())}

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "space_id": "family-calendar",
                "logical_space": True,
                "people": [person.as_dict() for person in self.people.values()],
                "events": [event.as_dict() for event in sorted(self.events.values(), key=lambda item: item.start)],
                "conflicts": [item.as_dict() for item in self.conflicts()],
                "dimensions": self.dimension_catalog(),
            }

    def _candidate_blocked(self, event_id: str, candidate: CalendarEvent) -> tuple[bool, list[str]]:
        reasons: list[str] = []
        for other in self.events.values():
            if other.event_id == event_id:
                continue
            if not set(candidate.people).intersection(other.people):
                continue
            if self._overlap(candidate, other) is not None:
                reasons.append(f"overlap:{other.event_id}")

        not_before = candidate.constraints.get("not_before")
        if not_before and _cmp_dt(candidate.start) < _cmp_dt(str(not_before)):
            reasons.append("constraint:not_before")
        not_after = candidate.constraints.get("not_after")
        if not_after and _cmp_dt(candidate.end) > _cmp_dt(str(not_after)):
            reasons.append("constraint:not_after")
        return bool(reasons), reasons

    def build_placement_frame(
        self,
        event_id: str,
        candidates: Sequence[Mapping[str, Any]],
    ) -> tuple[SemanticProblemFrame, dict[str, dict[str, Any]]]:
        current = self.events.get(event_id)
        if current is None:
            raise CalendarRobotError(f"unknown event: {event_id}")
        if not 2 <= len(candidates) <= 8:
            raise CalendarRobotError("QCDS placement projection requires 2 to 8 candidate states")

        worlds: dict[str, dict[str, Any]] = {}
        rules: list[SemanticRule] = []
        for index, raw in enumerate(candidates, start=1):
            candidate_id = str(raw.get("candidate_id") or f"candidate-{index}")
            if candidate_id in worlds:
                raise CalendarRobotError("candidate ids must be unique")
            merged = current.as_dict()
            merged.update({key: value for key, value in raw.items() if key != "candidate_id"})
            merged["event_id"] = current.event_id
            candidate = CalendarEvent.from_mapping(merged, event_id=current.event_id)
            blocked, reasons = self._candidate_blocked(event_id, candidate)
            worlds[candidate_id] = {
                "candidate_id": candidate_id,
                "start": candidate.start,
                "end": candidate.end,
                "people": list(candidate.people),
                "location": candidate.location,
                "dimensions": dict(candidate.dimensions),
                "fit": "blocked" if blocked else "clear",
                "reasons": reasons,
            }
            rules.append(
                SemanticRule(
                    rule_id=f"calendar:{event_id}:{candidate_id}:fit",
                    antecedent=SemanticAtom(event_id, "placement", candidate_id),
                    consequent=SemanticAtom(event_id, "fit", "blocked" if blocked else "clear"),
                    kind="implies",
                    relation_class="temporal",
                    confidence=1.0,
                    source_id=f"calendar-space:{event_id}",
                    original_text=f"Placement {candidate_id} is {'blocked' if blocked else 'clear'} under represented calendar event oracles.",
                )
            )

        frame = SemanticProblemFrame(
            mission_id=f"calendar-placement-{event_id}",
            raw_text=f"Which represented placement for {current.title} remains coherent in Calendar Space?",
            queries=(
                ProblemQuery(
                    query_id="placement",
                    subject=event_id,
                    predicate="placement",
                    candidate_values=tuple(worlds.keys()),
                    original_text="Which represented event placement remains coherent?",
                ),
                ProblemQuery(
                    query_id="fit",
                    subject=event_id,
                    predicate="fit",
                    candidate_values=("clear", "blocked"),
                    original_text="Does the placement satisfy the represented calendar constraints?",
                ),
            ),
            claims=(
                SemanticClaim(
                    subject=event_id,
                    predicate="fit",
                    value="clear",
                    source_id=f"calendar-space:{event_id}:required-fit",
                    confidence=1.0,
                    polarity=True,
                    original_text="The selected placement must remain clear under represented calendar constraints.",
                ),
            ),
            rules=tuple(rules),
            analyzer_id="family_calendar_logical_space_v1",
            provenance={
                "calendar_space": True,
                "events_are_oracle_constructions": True,
                "candidate_states": len(worlds),
                "single_qcds_architecture": True,
                "qcds_core_replaced": False,
            },
        )
        return frame, worlds


class CalendarRobotService:
    """Standalone Family Calendar manifestation over the shared SyntractSystem."""

    def __init__(self, store_root: str | Path = "./calendar_store") -> None:
        self.space = CalendarSpace(store_root)
        self.system = SyntractSystem(default_universe_id="family-calendar")

    def state(self) -> dict[str, Any]:
        state = self.space.snapshot()
        state["provenance"] = {
            "product": "Family Calendar Logical Robot",
            "system_boundary": "SyntractSystem",
            "single_qcds_architecture": True,
            "qcds_core_modified": False,
            "calendar_is_manifestation": True,
            "license": "Calendar Tribute License 1.0",
        }
        return state

    def placement_candidates(self, event_id: str) -> list[dict[str, Any]]:
        event = self.space.events.get(event_id)
        if event is None:
            raise CalendarRobotError(f"unknown event: {event_id}")
        start = _cmp_dt(event.start)
        duration = event.duration
        out: list[dict[str, Any]] = []
        for offset in (-120, -60, 0, 60, 120):
            candidate_start = start + timedelta(minutes=offset)
            out.append(
                {
                    "candidate_id": f"shift-{offset:+d}",
                    "start": candidate_start.isoformat(timespec="minutes"),
                    "end": (candidate_start + duration).isoformat(timespec="minutes"),
                }
            )
        return out

    def infer_placement(
        self,
        event_id: str,
        candidates: Sequence[Mapping[str, Any]] | None = None,
    ) -> dict[str, Any]:
        candidate_values = list(candidates or self.placement_candidates(event_id))
        frame, worlds = self.space.build_placement_frame(event_id, candidate_values)
        execution = self.system.run_frame(
            frame,
            universe_id="family-calendar",
            space_id=f"calendar-space:{event_id}",
            syntract_id=f"syntract:calendar:{event_id}",
        )
        baseline = execution.inference.baseline_queries.get("placement", ())
        stabilized = execution.inference.stabilized_queries.get("placement", ())
        leaders = execution.inference.leading_candidates("placement")
        return {
            "event_id": event_id,
            "logical_width": execution.logical_width,
            "raw_state_count": 2 ** execution.logical_width,
            "candidate_worlds": worlds,
            "baseline": [
                {"value": str(item.value), "probability": float(item.probability)} for item in baseline
            ],
            "stabilized": [
                {"value": str(item.value), "probability": float(item.probability)} for item in stabilized
            ],
            "leaders": list(leaders),
            "syntract_id": execution.syntract.syntract_id,
            "truth_distribution_bound": execution.syntract.bound_distribution is execution.truth_distribution,
            "provenance": {
                "system_boundary": "SyntractSystem",
                "calendar_space": True,
                "events_are_oracle_constructions": True,
                "single_qcds_architecture": True,
                "qcds_core_replaced": False,
            },
        }


__all__ = [
    "CalendarRobotError",
    "CalendarPerson",
    "CalendarEvent",
    "CalendarConflict",
    "CalendarSpace",
    "CalendarRobotService",
]
