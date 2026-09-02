from __future__ import annotations

# Cally.One Tribute License 1.0 — see LICENSE_CALENDAR_TRIBUTE.md

import json
from pathlib import Path
from typing import Any, Mapping

from .calendar_robot import CalendarRobotError, CalendarRobotService


class CallyOneService(CalendarRobotService):
    """Public Cally.One manifestation over the shared Calendar Space + QCDS core."""

    def __init__(self, store_root: str | Path = "./calendar_store") -> None:
        super().__init__(store_root)

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
                "license": "Cally.One Tribute License 1.0",
            }
        )
        state["provenance"] = provenance
        return state

    def hydrate(self, state: Mapping[str, Any]) -> dict[str, Any]:
        """Replace the browser-session manifestation from a serialized Calendar Space snapshot."""
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


_BROWSER_SERVICE: CallyOneService | None = None


def _browser_service() -> CallyOneService:
    global _BROWSER_SERVICE
    if _BROWSER_SERVICE is None:
        _BROWSER_SERVICE = CallyOneService("/tmp/cally_one_browser")
    return _BROWSER_SERVICE


def run_cally_one(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Stateless-looking browser API over one persistent Pyodide Cally.One session."""
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
