"""Canonical Cally.One Logical Robot implementation.

Cally.One is a product/body above the shared QCDS / Syntract core. Calendar
state, event-oracle construction and presentation belong to the robot layer;
the inference engine remains the shared SyntractSystem/QCDS core.

License: Cally.One Tribute License 1.0 — see LICENSE.md in this package.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping, Sequence

from ...calendar_robot import CalendarRobotError, CalendarRobotService
from ...syntract_system import SyntractSystem


class CallyOneService(CalendarRobotService):
    """Cally.One manifestation over one shared QCDS / Syntract core."""

    def __init__(self, store_root: str | Path = "./calendar_store") -> None:
        super().__init__(store_root)
        self.system = SyntractSystem(default_universe_id="cally-one")

    def state(self) -> dict[str, Any]:
        state = super().state()
        state["product"] = "Cally.One"
        state["space_id"] = "cally-one"
        provenance = dict(state.get("provenance") or {})
        provenance.update(
            {
                "product": "Cally.One",
                "public_identity": "Cally.One",
                "technical_space": "Calendar Space",
                "logical_robot": True,
                "robot_package": "qcds_fabric.robots.cally_one",
                "system_boundary": "SyntractSystem",
                "shared_qcds_core": True,
                "single_qcds_architecture": True,
                "qcds_core_modified": False,
                "license": "Cally.One Tribute License 1.0",
            }
        )
        state["provenance"] = provenance
        return state

    def hydrate(self, state: Mapping[str, Any]) -> dict[str, Any]:
        people = state.get("people") or []
        events = state.get("events") or []
        if not isinstance(people, list) or not isinstance(events, list):
            raise CalendarRobotError("Cally.One state requires people and events arrays")
        with self.space._lock:
            self.space.people.clear()
            self.space.events.clear()
            self.space._save()
        for person in people:
            if not isinstance(person, Mapping):
                raise CalendarRobotError("person state must be an object")
            self.space.upsert_person(person)
        for event in events:
            if not isinstance(event, Mapping):
                raise CalendarRobotError("event state must be an object")
            self.space.upsert_event(event)
        return self.state()

    def infer_placement(
        self,
        event_id: str,
        candidates: Sequence[Mapping[str, Any]] | None = None,
    ) -> dict[str, Any]:
        candidate_values = list(candidates or self.placement_candidates(event_id))
        frame, worlds = self.space.build_placement_frame(event_id, candidate_values)
        execution = self.system.run_frame(
            frame,
            universe_id="cally-one",
            space_id=f"calendar-space:{event_id}",
            syntract_id=f"syntract:cally-one:{event_id}",
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
                "product": "Cally.One",
                "logical_robot": True,
                "system_boundary": "SyntractSystem",
                "shared_qcds_core": True,
                "calendar_space": True,
                "events_are_oracle_constructions": True,
                "single_qcds_architecture": True,
                "qcds_core_replaced": False,
            },
        }


_BROWSER_SERVICE: CallyOneService | None = None


def _browser_service() -> CallyOneService:
    global _BROWSER_SERVICE
    if _BROWSER_SERVICE is None:
        _BROWSER_SERVICE = CallyOneService("/tmp/cally_one_browser")
    return _BROWSER_SERVICE


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
        body = payload.get("payload") or {}
        if not isinstance(body, Mapping):
            raise CalendarRobotError("person payload must be an object")
        result = {"person": service.space.upsert_person(body).as_dict()}
    elif action == "event":
        body = payload.get("payload") or {}
        if not isinstance(body, Mapping):
            raise CalendarRobotError("event payload must be an object")
        event = service.space.upsert_event(body)
        result = {
            "event": event.as_dict(),
            "conflicts": [item.as_dict() for item in service.space.conflicts()],
        }
    elif action == "move":
        body = payload.get("payload") or {}
        if not isinstance(body, Mapping):
            raise CalendarRobotError("move payload must be an object")
        people = body.get("people")
        if people is not None and not isinstance(people, (list, tuple)):
            raise CalendarRobotError("people must be an array")
        event = service.space.move_event(
            str(body.get("event_id") or ""),
            start=str(body.get("start") or ""),
            end=None if body.get("end") is None else str(body.get("end")),
            people=None if people is None else tuple(str(item) for item in people),
        )
        result = {
            "event": event.as_dict(),
            "conflicts": [item.as_dict() for item in service.space.conflicts()],
        }
    elif action == "delete":
        body = payload.get("payload") or {}
        if not isinstance(body, Mapping):
            raise CalendarRobotError("delete payload must be an object")
        event_id = str(body.get("event_id") or "")
        service.space.delete_event(event_id)
        result = {"deleted": event_id}
    elif action == "infer":
        body = payload.get("payload") or {}
        if not isinstance(body, Mapping):
            raise CalendarRobotError("infer payload must be an object")
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