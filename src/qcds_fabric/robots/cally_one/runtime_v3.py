"""Cally.One product runtime v3: rider states and dual resolution paths.

Cally.One Tribute License 1.0 — see LICENSE.md.

Everything is state. A person may participate in an event without riding in a
particular vehicle. Mobile-resource planning may be resolved either by a human
editing represented states or by QCDS evaluating represented alternatives.
An actual conflict may also be explicitly accepted as represented state; that
keeps the conflict auditable without treating the accepted arrangement as an
unresolved blocker.
"""

from __future__ import annotations

import json
from typing import Any, Mapping, Sequence

from ...calendar_robot import CalendarRobotError
from .runtime_v2 import CallyOneService as _RouteRuntime


class CallyOneService(_RouteRuntime):
    def _rider_ids(self, relation: Any, event: Any) -> list[str]:
        dimensions = dict(getattr(relation, "dimensions", {}) or {})
        raw = dimensions.get("rider_ids")
        if isinstance(raw, list):
            return [str(item) for item in raw if str(item).strip()]
        # Legacy mobile links mean all represented event participants ride until
        # the user explicitly refines the transport state.
        return [str(item) for item in event.people]

    def _conflict_acceptances(self) -> dict[str, Any]:
        """Return active human acceptance states keyed by generated conflict id.

        Acceptance is represented as an ordinary relation, never as deletion of
        the conflict. This means the system can distinguish "no conflict" from
        "conflict exists and the represented arrangement is intentionally OK".
        """
        accepted: dict[str, Any] = {}
        for relation in self.graph.relations.values():
            if str(relation.predicate) != "accepts_conflict":
                continue
            dimensions = dict(getattr(relation, "dimensions", {}) or {})
            if dimensions.get("accepted") is not True:
                continue
            conflict_id = str(dimensions.get("conflict_id") or "").strip()
            if conflict_id:
                accepted[conflict_id] = relation
        return accepted

    def state_conflicts(self) -> list[dict[str, Any]]:
        conflicts = super().state_conflicts()
        acceptances = self._conflict_acceptances()
        for conflict in conflicts:
            relation = acceptances.get(str(conflict.get("conflict_id") or ""))
            if relation is None:
                continue
            dimensions = dict(getattr(relation, "dimensions", {}) or {})
            conflict["status"] = "accepted"
            conflict["severity"] = "accepted_conflict"
            conflict["accepted"] = True
            conflict["accepted_by"] = str(dimensions.get("accepted_by") or "human")
            conflict["accepted_at"] = dimensions.get("accepted_at")
            conflict["acceptance_relation_id"] = relation.relation_id
            conflict["reason"] = f"{conflict.get('reason') or 'represented conflict'}; explicitly accepted"
        return conflicts

    def _candidate_state_reasons(self, event_id: str, candidate: Any) -> list[str]:
        reasons = super()._candidate_state_reasons(event_id, candidate)
        current = self.space.events.get(event_id)
        # Acceptance applies to the exact represented arrangement that a human
        # approved. Moving the event creates a new state that must be checked on
        # its own merits.
        if current is None or candidate.start != current.start or candidate.end != current.end:
            return reasons
        accepted = [
            conflict
            for conflict in self.state_conflicts()
            if conflict.get("status") == "accepted" and event_id in conflict.get("event_ids", [])
        ]
        if not accepted:
            return reasons

        filtered: list[str] = []
        marker = ":time_overlap:"
        for reason in reasons:
            allowed = False
            if reason.startswith("state:") and marker in reason:
                raw_events = reason.rsplit(marker, 1)[1]
                reason_events = {item for item in raw_events.split(",") if item}
                reason_events.add(event_id)
                for conflict in accepted:
                    state_id = str(conflict.get("state_id") or "")
                    conflict_events = {str(item) for item in conflict.get("event_ids", [])}
                    if reason.startswith(f"state:{state_id}:") and reason_events.issubset(conflict_events):
                        allowed = True
                        break
            if not allowed:
                filtered.append(reason)
        return filtered

    def route_planning_states(self) -> list[dict[str, Any]]:
        """Return only mobile state groups that still require a decision.

        A single assigned vehicle/event does not become orange merely because a
        route exists. Multiple uses of the same mobile state on one day, or an
        explicitly unresolved route relation, create a planning state. A human
        can resolve it by editing represented state; QCDS can resolve represented
        alternatives through the shared SyntractSystem/QCDS core.
        """
        out: list[dict[str, Any]] = []
        for entity in self.graph.entities.values():
            if self._allocation_mode(entity.entity_id) != "route":
                continue
            links = self._active_links_for_state(entity.entity_id)
            if not links:
                continue

            groups: dict[str, list[tuple[Any, Any]]] = {}
            for relation, event in links:
                day = self._cmp_day(event.start)
                groups.setdefault(day, []).append((relation, event))

            for day, day_links in groups.items():
                statuses = [
                    str(relation.dimensions.get("route_status") or "assigned").strip().lower()
                    for relation, _ in day_links
                ]
                if statuses and all(status == "resolved" for status in statuses):
                    continue

                event_ids = sorted({event.event_id for _, event in day_links})
                explicitly_unresolved = any(status in {"needs_resolution", "unresolved"} for status in statuses)
                shared_mobile_sequence = len(event_ids) > 1
                if not explicitly_unresolved and not shared_mobile_sequence:
                    continue

                riders_by_event = {
                    event.event_id: self._rider_ids(relation, event)
                    for relation, event in day_links
                }
                rider_ids = sorted({person for values in riders_by_event.values() for person in values})
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
                        "rider_ids": rider_ids,
                        "riders_by_event": riders_by_event,
                        "capacity": capacity,
                        "capacity_dimension": capacity_dimension,
                        "day": day,
                        "resolution_modes": ["human", "qcds"],
                        "human_actions": [
                            "change_riders",
                            "change_vehicle",
                            "change_event_time",
                            "change_participation",
                        ],
                        "qcds_dimensions": [
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
                        "reason": "transport plan still needs to be decided",
                    }
                )
        return sorted(out, key=lambda item: (item["day"], item["state_label"]))

    @staticmethod
    def _cmp_day(value: str) -> str:
        return str(value)[:10]

    def state(self) -> dict[str, Any]:
        state = super().state()
        state["planning_states"] = self.route_planning_states()
        state["needs_resolution_count"] = len(state["planning_states"])
        conflicts = list(state.get("state_conflicts") or [])
        state["unresolved_conflict_count"] = sum(item.get("status") == "unresolved" for item in conflicts)
        state["accepted_conflict_count"] = sum(item.get("status") == "accepted" for item in conflicts)
        model = dict(state.get("state_model") or {})
        model.pop("capacity_formula", None)
        model.pop("planning_means_needs_qcds_resolution", None)
        model.update(
            {
                "rider_membership_is_state": True,
                "event_participation_is_not_transport_participation": True,
                "planning_can_be_resolved_by_human_or_qcds": True,
                "single_mobile_assignment_is_not_automatically_a_warning": True,
                "orange_means_needs_resolution": True,
                "red_means_actual_conflict": True,
                "accepted_conflict_is_represented_state": True,
                "accepted_conflict_is_not_unresolved": True,
                "accepted_conflict_remains_auditable": True,
            }
        )
        state["state_model"] = model
        provenance = dict(state.get("provenance") or {})
        provenance.update(
            {
                "planning_resolution_modes": ["human", "qcds"],
                "conflict_acceptance_mode": "represented relation state",
                "qcds_core_modified": False,
                "system_boundary": "SyntractSystem",
            }
        )
        state["provenance"] = provenance
        return state

    def infer_placement(self, event_id: str, candidates: Sequence[Mapping[str, Any]] | None = None) -> dict[str, Any]:
        result = super().infer_placement(event_id, candidates)
        result["planning_states"] = self.planning_for_event(event_id)
        provenance = dict(result.get("provenance") or {})
        provenance.pop("mobile_route_requires_qcds_resolution", None)
        provenance.update(
            {
                "mobile_route_can_be_resolved_by_human_or_qcds": True,
                "accepted_conflicts_are_represented_conditions": True,
                "system_boundary": "SyntractSystem",
                "qcds_core_replaced": False,
            }
        )
        result["provenance"] = provenance
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
