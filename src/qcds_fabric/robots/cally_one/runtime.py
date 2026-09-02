"""Cally.One product runtime: capacity, conflict states and browser actions.

Cally.One Tribute License 1.0 — see LICENSE.md.

This module forms Calendar Space states/constraints above the shared
SyntractSystem/QCDS core.  It does not implement a second inference engine.
"""

from __future__ import annotations

import json
from dataclasses import replace
from typing import Any, Mapping, Sequence

from ...calendar_robot import CalendarEvent, CalendarRobotError, _cmp_dt
from .robot import CallyOneService as _BaseCallyOneService


def _number(value: Any, default: float | None = None) -> float | None:
    if value is None or value == "":
        return default
    try:
        out = float(value)
    except (TypeError, ValueError):
        return default
    return out if out >= 0 else default


class CallyOneService(_BaseCallyOneService):
    """Canonical product runtime over the existing Cally.One Logical Robot.

    Capacity is generic state semantics, not vehicle/resource special casing:
    an entity may state ``capacity`` and ``capacity_dimension``.  Event→entity
    relations contribute ``load`` during their represented time interval.
    ``capacity=1`` is the general form of an exclusive state.
    """

    def _entity_capacity(self, entity_id: str) -> tuple[float | None, str]:
        entity = self.graph.entities.get(entity_id)
        if entity is None:
            return None, "unit"
        dimensions = entity.dimensions
        capacity = _number(dimensions.get("capacity"))
        if capacity is None and bool(dimensions.get("exclusive", False)):
            capacity = 1.0
        dimension = str(dimensions.get("capacity_dimension") or "unit").strip().lower() or "unit"
        return capacity, dimension

    def _relation_load(
        self,
        relation: Any,
        event: CalendarEvent,
        *,
        entity_id: str | None = None,
    ) -> float:
        dimensions = dict(getattr(relation, "dimensions", {}) or {})
        explicit = _number(dimensions.get("load"))
        if explicit is None:
            explicit = _number(dimensions.get("quantity"))
        if explicit is not None:
            return explicit

        _, capacity_dimension = self._entity_capacity(entity_id or str(getattr(relation, "object_id", "")))
        if capacity_dimension in {"person", "people", "passenger", "passengers"}:
            return float(max(1, len(event.people)))
        value = event.dimensions.get(capacity_dimension)
        derived = _number(value)
        return derived if derived is not None else 1.0

    @staticmethod
    def _overlap(left: CalendarEvent, right: CalendarEvent) -> bool:
        return max(_cmp_dt(left.start), _cmp_dt(right.start)) < min(_cmp_dt(left.end), _cmp_dt(right.end))

    def _active_links_for_state(self, entity_id: str, *, exclude_event_id: str | None = None) -> list[tuple[Any, CalendarEvent]]:
        out: list[tuple[Any, CalendarEvent]] = []
        for relation in self.graph.relations.values():
            if relation.object_id != entity_id or relation.predicate.startswith("not_"):
                continue
            if exclude_event_id and relation.subject_id == exclude_event_id:
                continue
            event = self.space.events.get(relation.subject_id)
            if event is not None:
                out.append((relation, event))
        return out

    def _max_load_with_candidate(self, event_id: str, candidate: CalendarEvent, link: Any) -> tuple[float, list[str]]:
        capacity, _ = self._entity_capacity(link.object_id)
        if capacity is None:
            return 0.0, []
        candidate_load = self._relation_load(link, candidate, entity_id=link.object_id)
        others = [
            (relation, event)
            for relation, event in self._active_links_for_state(link.object_id, exclude_event_id=event_id)
            if self._overlap(candidate, event)
        ]
        boundaries = {_cmp_dt(candidate.start), _cmp_dt(candidate.end)}
        for _, event in others:
            boundaries.add(max(_cmp_dt(candidate.start), _cmp_dt(event.start)))
            boundaries.add(min(_cmp_dt(candidate.end), _cmp_dt(event.end)))
        ordered = sorted(boundaries)
        maximum = candidate_load
        affected: set[str] = set()
        for start, end in zip(ordered, ordered[1:]):
            if start >= end:
                continue
            load = candidate_load
            active_ids: list[str] = []
            for relation, event in others:
                if _cmp_dt(event.start) < end and _cmp_dt(event.end) > start:
                    load += self._relation_load(relation, event, entity_id=link.object_id)
                    active_ids.append(event.event_id)
            if load > maximum:
                maximum = load
            if load > capacity:
                affected.update(active_ids)
        return maximum, sorted(affected)

    def _candidate_state_reasons(self, event_id: str, candidate: CalendarEvent) -> list[str]:
        reasons: list[str] = []

        not_before = candidate.constraints.get("not_before")
        if not_before and _cmp_dt(candidate.start) < _cmp_dt(str(not_before)):
            reasons.append("constraint:not_before")
        not_after = candidate.constraints.get("not_after")
        if not_after and _cmp_dt(candidate.end) > _cmp_dt(str(not_after)):
            reasons.append("constraint:not_after")

        # Person is a rich state whose default simultaneous capacity is one.
        for person_id in candidate.people:
            overlaps = [
                other.event_id
                for other in self.space.events.values()
                if other.event_id != event_id and person_id in other.people and self._overlap(candidate, other)
            ]
            if overlaps:
                reasons.append(f"state:{person_id}:capacity:2/1:time_overlap:{','.join(sorted(overlaps))}")

        # All other linked states use the same capacity/time rule.
        links = [
            relation
            for relation in self.graph.relations.values()
            if relation.subject_id == event_id and not relation.predicate.startswith("not_")
        ]
        for link in links:
            capacity, _ = self._entity_capacity(link.object_id)
            if capacity is None:
                continue
            maximum, affected = self._max_load_with_candidate(event_id, candidate, link)
            if maximum > capacity:
                reasons.append(
                    f"state:{link.object_id}:capacity:{maximum:g}/{capacity:g}:time_overlap:{','.join(affected)}"
                )
        return list(dict.fromkeys(reasons))

    def state_conflicts(self) -> list[dict[str, Any]]:
        """Return unresolved conflicts as first-class product states.

        Conflicts are derived state observations.  They are deliberately kept
        separate from QCDS inference output: QCDS later evaluates represented
        alternatives for resolving them through the same shared core.
        """
        conflicts: list[dict[str, Any]] = []

        # Person-state collisions.
        for person_id in self.space.people:
            events = [event for event in self.space.events.values() if person_id in event.people]
            boundaries = sorted({_cmp_dt(v) for event in events for v in (event.start, event.end)})
            for start, end in zip(boundaries, boundaries[1:]):
                active = [event for event in events if _cmp_dt(event.start) < end and _cmp_dt(event.end) > start]
                if len(active) <= 1:
                    continue
                ids = tuple(sorted(event.event_id for event in active))
                conflict_id = f"conflict:person:{person_id}:{start.isoformat()}:{end.isoformat()}"
                conflicts.append(
                    {
                        "conflict_id": conflict_id,
                        "status": "unresolved",
                        "state_id": person_id,
                        "capacity": 1,
                        "load": len(active),
                        "capacity_dimension": "person",
                        "start": start.isoformat(timespec="minutes"),
                        "end": end.isoformat(timespec="minutes"),
                        "event_ids": list(ids),
                        "policy": "warn",
                        "reason": "same person is needed in overlapping events",
                    }
                )

        # Generic entity capacity collisions.
        for entity in self.graph.entities.values():
            capacity, capacity_dimension = self._entity_capacity(entity.entity_id)
            if capacity is None:
                continue
            links = self._active_links_for_state(entity.entity_id)
            boundaries = sorted({_cmp_dt(v) for _, event in links for v in (event.start, event.end)})
            for start, end in zip(boundaries, boundaries[1:]):
                active = [
                    (relation, event)
                    for relation, event in links
                    if _cmp_dt(event.start) < end and _cmp_dt(event.end) > start
                ]
                if not active:
                    continue
                load = sum(self._relation_load(relation, event, entity_id=entity.entity_id) for relation, event in active)
                if load <= capacity:
                    continue
                event_ids = sorted({event.event_id for _, event in active})
                policy = str(entity.dimensions.get("conflict_policy") or "warn").strip().lower() or "warn"
                conflicts.append(
                    {
                        "conflict_id": f"conflict:state:{entity.entity_id}:{start.isoformat()}:{end.isoformat()}",
                        "status": "unresolved",
                        "state_id": entity.entity_id,
                        "state_label": entity.label,
                        "capacity": capacity,
                        "load": load,
                        "capacity_dimension": capacity_dimension,
                        "start": start.isoformat(timespec="minutes"),
                        "end": end.isoformat(timespec="minutes"),
                        "event_ids": event_ids,
                        "policy": policy,
                        "reason": "capacity exceeded during overlapping time",
                    }
                )

        # Merge identical state/event observations across adjacent sweep segments.
        merged: dict[tuple[str, tuple[str, ...]], dict[str, Any]] = {}
        for conflict in conflicts:
            key = (str(conflict["state_id"]), tuple(conflict["event_ids"]))
            existing = merged.get(key)
            if existing is None:
                merged[key] = dict(conflict)
                continue
            if _cmp_dt(existing["end"]) == _cmp_dt(conflict["start"]):
                existing["end"] = conflict["end"]
                existing["load"] = max(float(existing["load"]), float(conflict["load"]))
            else:
                merged[(f"{key[0]}:{conflict['start']}", key[1])] = dict(conflict)
        return sorted(merged.values(), key=lambda item: (item["start"], item["state_id"]))

    def conflicts_for_event(self, event_id: str) -> list[dict[str, Any]]:
        return [conflict for conflict in self.state_conflicts() if event_id in conflict.get("event_ids", [])]

    def state(self) -> dict[str, Any]:
        state = super().state()
        conflicts = self.state_conflicts()
        state["state_conflicts"] = conflicts
        state["unresolved_conflict_count"] = len(conflicts)
        state["state_model"] = dict(state.get("state_model") or {})
        state["state_model"].update(
            {
                "capacity_is_state": True,
                "capacity_load_is_state": True,
                "conflicts_are_state": True,
                "capacity_formula": "sum(load on same state during overlapping time) <= capacity",
                "scales_by_search_and_dimensions_not_checkbox_lists": True,
            }
        )
        provenance = dict(state.get("provenance") or {})
        provenance.update(
            {
                "capacity_constraints_are_product_state_formation": True,
                "conflict_states_feed_shared_qcds_core": True,
                "qcds_core_modified": False,
                "system_boundary": "SyntractSystem",
            }
        )
        state["provenance"] = provenance
        return state

    def infer_placement(self, event_id: str, candidates: Sequence[Mapping[str, Any]] | None = None) -> dict[str, Any]:
        result = super().infer_placement(event_id, candidates)
        result["conflicts"] = self.conflicts_for_event(event_id)
        result["provenance"] = dict(result.get("provenance") or {})
        result["provenance"].update(
            {
                "generic_capacity_state_constraints": True,
                "conflicts_are_state": True,
                "system_boundary": "SyntractSystem",
                "qcds_core_replaced": False,
            }
        )
        return result


_BROWSER_SERVICE: CallyOneService | None = None


def _browser_service() -> CallyOneService:
    global _BROWSER_SERVICE
    if _BROWSER_SERVICE is None:
        _BROWSER_SERVICE = CallyOneService("/tmp/cally_one_browser")
    return _BROWSER_SERVICE


def _body(payload: Mapping[str, Any], name: str) -> Mapping[str, Any]:
    body = payload.get("payload") or {}
    if not isinstance(body, Mapping):
        raise CalendarRobotError(f"{name} payload must be an object")
    return body


def run_cally_one(payload: Mapping[str, Any]) -> dict[str, Any]:
    service = _browser_service()
    action = str(payload.get("action") or "state")
    result: Any = None

    if action == "state":
        pass
    elif action == "hydrate":
        incoming = payload.get("state") or {}
        if not isinstance(incoming, Mapping):
            raise CalendarRobotError("hydrate state must be an object")
        service.hydrate(incoming)
    elif action == "person":
        result = {"person": service.upsert_person(_body(payload, "person")).as_dict()}
    elif action == "person_archive":
        body = _body(payload, "person archive")
        result = {"person": service.archive_person(str(body.get("person_id") or ""), archived=bool(body.get("archived", True))).as_dict()}
    elif action == "entity":
        result = {"entity": service.upsert_entity(_body(payload, "entity")).as_dict()}
    elif action == "relation":
        result = {"relation": service.upsert_relation(_body(payload, "relation")).as_dict()}
    elif action == "dimension":
        result = {"dimension": service.upsert_dimension(_body(payload, "dimension")).as_dict()}
    elif action == "dimension_retire":
        body = _body(payload, "dimension retire")
        result = {"dimension": service.retire_dimension(str(body.get("key") or ""), retired=bool(body.get("retired", True))).as_dict()}
    elif action == "event":
        event = service.upsert_event(_body(payload, "event"))
        result = {"event": event.as_dict(), "conflicts": service.conflicts_for_event(event.event_id)}
    elif action == "move":
        body = _body(payload, "move")
        people = body.get("people")
        if people is not None and not isinstance(people, (list, tuple)):
            raise CalendarRobotError("people must be an array")
        event = service.move_event(
            str(body.get("event_id") or ""),
            start=str(body.get("start") or ""),
            end=None if body.get("end") is None else str(body.get("end")),
            people=None if people is None else tuple(str(item) for item in people),
        )
        result = {"event": event.as_dict(), "conflicts": service.conflicts_for_event(event.event_id)}
    elif action == "delete":
        body = _body(payload, "delete")
        event_id = str(body.get("event_id") or "")
        service.delete_event(event_id)
        result = {"deleted": event_id}
    elif action == "infer":
        body = _body(payload, "infer")
        candidates = body.get("candidates")
        if candidates is not None and not isinstance(candidates, list):
            raise CalendarRobotError("candidates must be an array")
        result = service.infer_placement(str(body.get("event_id") or ""), candidates)
    else:
        raise CalendarRobotError(f"unknown Cally.One action: {action}")

    return {
        "product": "Cally.One",
        "logical_robot": True,
        "action": action,
        "result": result,
        "state": service.state(),
    }


def run_cally_one_json(payload_json: str) -> str:
    try:
        payload = json.loads(payload_json)
    except json.JSONDecodeError as exc:
        raise CalendarRobotError("invalid Cally.One JSON payload") from exc
    if not isinstance(payload, Mapping):
        raise CalendarRobotError("Cally.One payload must be an object")
    return json.dumps(run_cally_one(payload), ensure_ascii=False, sort_keys=True)


__all__ = ["CallyOneService", "run_cally_one", "run_cally_one_json"]
