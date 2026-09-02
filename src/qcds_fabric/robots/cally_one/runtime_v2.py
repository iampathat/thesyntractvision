"""Cally.One product runtime v2: state conflicts, route planning and QCDS boundary.

Cally.One Tribute License 1.0 — see LICENSE.md.

Everything here is product-layer state formation above the shared
SyntractSystem/QCDS core.  Mobile-resource planning is intentionally not
reduced to calendar-event overlap: a vehicle can drop someone off and continue,
share a route, or make multiple trips while destination events overlap.
"""

from __future__ import annotations

import json
from typing import Any, Mapping, Sequence

from ...calendar_robot import CalendarEvent, CalendarRobotError, _cmp_dt
from .runtime import CallyOneService as _CapacityRuntime


_MOBILE_TYPES = {
    "car", "vehicle", "automobile", "van", "minivan", "bus", "taxi",
    "bike", "bicycle", "motorcycle", "scooter", "boat", "train",
}


class CallyOneService(_CapacityRuntime):
    """Cally.One runtime with separate stationary and mobile state semantics."""

    def _allocation_mode(self, entity_id: str) -> str:
        entity = self.graph.entities.get(entity_id)
        if entity is None:
            return "shared"
        dimensions = entity.dimensions
        explicit = str(dimensions.get("allocation_mode") or "").strip().lower()
        if explicit in {"route", "mobile_route", "capacity", "stationary_capacity", "exclusive", "shared"}:
            return {
                "mobile_route": "route",
                "stationary_capacity": "capacity",
            }.get(explicit, explicit)
        mobility = str(dimensions.get("mobility") or "").strip().lower()
        subtype = str(dimensions.get("type") or "").strip().lower()
        if mobility == "mobile" or subtype in _MOBILE_TYPES:
            return "route"
        capacity, _ = self._entity_capacity(entity_id)
        if capacity is not None:
            return "capacity"
        if bool(dimensions.get("exclusive", False)):
            return "exclusive"
        return "shared"

    @staticmethod
    def _events_overlap(left: CalendarEvent, right: CalendarEvent) -> bool:
        return max(_cmp_dt(left.start), _cmp_dt(right.start)) < min(_cmp_dt(left.end), _cmp_dt(right.end))

    def _candidate_state_reasons(self, event_id: str, candidate: CalendarEvent) -> list[str]:
        """Return only states that are actually incompatible.

        Mobile-route links are not marked blocked merely because destination
        events overlap.  Route feasibility is a separate planning state for
        QCDS to resolve from pickup/dropoff/position/travel/capacity states.
        """
        reasons: list[str] = []

        not_before = candidate.constraints.get("not_before")
        if not_before and _cmp_dt(candidate.start) < _cmp_dt(str(not_before)):
            reasons.append("constraint:not_before")
        not_after = candidate.constraints.get("not_after")
        if not_after and _cmp_dt(candidate.end) > _cmp_dt(str(not_after)):
            reasons.append("constraint:not_after")

        # A person participating in two destination events at once remains an
        # actual represented conflict until participation intervals say otherwise.
        for person_id in candidate.people:
            overlaps = [
                other.event_id
                for other in self.space.events.values()
                if other.event_id != event_id
                and person_id in other.people
                and self._events_overlap(candidate, other)
            ]
            if overlaps:
                reasons.append(f"state:{person_id}:time_overlap:{','.join(sorted(overlaps))}")

        # Capacity overlap is valid for stationary capacity/exclusive states.
        # A mobile route is deliberately excluded from this shortcut.
        for link in self.graph.relations.values():
            if link.subject_id != event_id or link.predicate.startswith("not_"):
                continue
            mode = self._allocation_mode(link.object_id)
            if mode not in {"capacity", "exclusive"}:
                continue
            capacity, _ = self._entity_capacity(link.object_id)
            if capacity is None:
                continue
            maximum, affected = self._max_load_with_candidate(event_id, candidate, link)
            if maximum > capacity:
                reasons.append(
                    f"state:{link.object_id}:capacity:{maximum:g}/{capacity:g}:time_overlap:{','.join(affected)}"
                )
        return list(dict.fromkeys(reasons))

    def _stationary_conflicts(self) -> list[dict[str, Any]]:
        conflicts: list[dict[str, Any]] = []

        # Rich person state: default simultaneous participation capacity is 1.
        for person_id in self.space.people:
            events = [event for event in self.space.events.values() if person_id in event.people]
            boundaries = sorted({_cmp_dt(v) for event in events for v in (event.start, event.end)})
            for start, end in zip(boundaries, boundaries[1:]):
                active = [event for event in events if _cmp_dt(event.start) < end and _cmp_dt(event.end) > start]
                if len(active) <= 1:
                    continue
                conflicts.append(
                    {
                        "conflict_id": f"conflict:person:{person_id}:{start.isoformat()}:{end.isoformat()}",
                        "status": "unresolved",
                        "severity": "conflict",
                        "state_id": person_id,
                        "capacity": 1,
                        "load": len(active),
                        "capacity_dimension": "person",
                        "start": start.isoformat(timespec="minutes"),
                        "end": end.isoformat(timespec="minutes"),
                        "event_ids": sorted(event.event_id for event in active),
                        "policy": "warn",
                        "reason": "same person is represented in overlapping participation states",
                    }
                )

        # Only stationary resources may use simple simultaneous-capacity sweep.
        for entity in self.graph.entities.values():
            if self._allocation_mode(entity.entity_id) not in {"capacity", "exclusive"}:
                continue
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
                conflicts.append(
                    {
                        "conflict_id": f"conflict:state:{entity.entity_id}:{start.isoformat()}:{end.isoformat()}",
                        "status": "unresolved",
                        "severity": "conflict",
                        "state_id": entity.entity_id,
                        "state_label": entity.label,
                        "capacity": capacity,
                        "load": load,
                        "capacity_dimension": capacity_dimension,
                        "start": start.isoformat(timespec="minutes"),
                        "end": end.isoformat(timespec="minutes"),
                        "event_ids": sorted({event.event_id for _, event in active}),
                        "policy": str(entity.dimensions.get("conflict_policy") or "warn").strip().lower() or "warn",
                        "reason": "stationary capacity exceeded during simultaneous represented use",
                    }
                )
        return conflicts

    def state_conflicts(self) -> list[dict[str, Any]]:
        """Hard/actual conflicts only; mobile route uncertainty is not red."""
        raw = self._stationary_conflicts()
        merged: dict[tuple[str, tuple[str, ...]], dict[str, Any]] = {}
        for conflict in raw:
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

    def route_planning_states(self) -> list[dict[str, Any]]:
        """Represent mobile-resource questions that QCDS still needs to resolve.

        Event overlap is deliberately only a signal that a route/assignment
        question exists.  Feasibility depends on route segments, position,
        pickup/dropoff, travel time, occupancy, driver and priorities.
        """
        out: list[dict[str, Any]] = []
        for entity in self.graph.entities.values():
            if self._allocation_mode(entity.entity_id) != "route":
                continue
            links = self._active_links_for_state(entity.entity_id)
            if not links:
                continue

            # Group by calendar day as a practical projection. The underlying
            # state remains open-ended and may span days.
            groups: dict[str, list[tuple[Any, CalendarEvent]]] = {}
            for relation, event in links:
                day = _cmp_dt(event.start).date().isoformat()
                groups.setdefault(day, []).append((relation, event))

            for day, day_links in groups.items():
                if not day_links:
                    continue
                explicitly_resolved = all(
                    str(relation.dimensions.get("route_status") or "").lower() == "resolved"
                    for relation, _ in day_links
                )
                if explicitly_resolved:
                    continue
                event_ids = sorted({event.event_id for _, event in day_links})
                people_ids = sorted({person for _, event in day_links for person in event.people})
                capacity, capacity_dimension = self._entity_capacity(entity.entity_id)
                out.append(
                    {
                        "planning_id": f"planning:route:{entity.entity_id}:{day}",
                        "status": "needs_resolution",
                        "severity": "planning",
                        "kind": "mobile_route",
                        "state_id": entity.entity_id,
                        "state_label": entity.label,
                        "event_ids": event_ids,
                        "people_ids": people_ids,
                        "capacity": capacity,
                        "capacity_dimension": capacity_dimension,
                        "day": day,
                        "resolution_dimensions": [
                            "vehicle_assignment",
                            "route_segment",
                            "position",
                            "pickup",
                            "dropoff",
                            "travel_time",
                            "occupancy",
                            "driver",
                            "priority",
                        ],
                        "reason": "mobile resource has transport states whose route has not yet been resolved",
                    }
                )
        return sorted(out, key=lambda item: (item["day"], item["state_label"]))

    def conflicts_for_event(self, event_id: str) -> list[dict[str, Any]]:
        return [item for item in self.state_conflicts() if event_id in item.get("event_ids", [])]

    def planning_for_event(self, event_id: str) -> list[dict[str, Any]]:
        return [item for item in self.route_planning_states() if event_id in item.get("event_ids", [])]

    def state(self) -> dict[str, Any]:
        state = super().state()
        conflicts = self.state_conflicts()
        planning = self.route_planning_states()
        state["state_conflicts"] = conflicts
        state["planning_states"] = planning
        state["unresolved_conflict_count"] = len(conflicts)
        state["needs_resolution_count"] = len(planning)
        state["state_model"] = dict(state.get("state_model") or {})
        state["state_model"].update(
            {
                "mobile_event_overlap_is_not_vehicle_conflict": True,
                "mobile_resources_use_route_states": True,
                "stationary_capacity_rule": "simultaneous represented load <= capacity",
                "mobile_route_rule": "QCDS resolves route segments, positions, pickup/dropoff, travel time and occupancy",
                "red_means_actual_conflict": True,
                "planning_means_needs_qcds_resolution": True,
            }
        )
        provenance = dict(state.get("provenance") or {})
        provenance.update(
            {
                "route_planning_is_product_state_formation": True,
                "route_resolution_engine": "SyntractSystem/QCDS core",
                "qcds_core_modified": False,
                "system_boundary": "SyntractSystem",
            }
        )
        state["provenance"] = provenance
        return state

    def infer_placement(self, event_id: str, candidates: Sequence[Mapping[str, Any]] | None = None) -> dict[str, Any]:
        result = super().infer_placement(event_id, candidates)
        result["conflicts"] = self.conflicts_for_event(event_id)
        result["planning_states"] = self.planning_for_event(event_id)
        result["provenance"] = dict(result.get("provenance") or {})
        result["provenance"].update(
            {
                "mobile_overlap_not_auto_blocked": True,
                "mobile_route_requires_qcds_resolution": True,
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
        result = {
            "event": event.as_dict(),
            "conflicts": service.conflicts_for_event(event.event_id),
            "planning_states": service.planning_for_event(event.event_id),
        }
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
        result = {
            "event": event.as_dict(),
            "conflicts": service.conflicts_for_event(event.event_id),
            "planning_states": service.planning_for_event(event.event_id),
        }
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
