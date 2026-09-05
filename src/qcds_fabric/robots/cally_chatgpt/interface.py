"""Canonical thin interface between ChatGPT and the Cally Calendar Space.

The public contract deliberately has only five verbs:

    read -> write -> query -> project -> resolve

The first four are representation/projection operations and contain no
inference. ``resolve`` is the only verb allowed to cross the QCDS/Syntract
inference boundary.

Cally.One Tribute License 1.0 — see LICENSE.md in this package.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from ...calendar_robot import CalendarRobotError
from .chatgpt_bridge import ChatGPTLogicalRobot


INTERFACE_VERBS: tuple[str, ...] = ("read", "write", "query", "project", "resolve")

WRITE_OPERATIONS: dict[str, str] = {
    "hydrate": "hydrate_calendar_space",
    "upsert_person": "upsert_person",
    "archive_person": "archive_person",
    "upsert_event": "upsert_event",
    "move_event": "move_event",
    "delete_event": "delete_event",
    "upsert_entity": "upsert_entity",
    "upsert_relation": "upsert_relation",
    "upsert_dimension": "upsert_dimension",
    "retire_dimension": "retire_dimension",
}

QUERY_SECTIONS: tuple[str, ...] = (
    "people",
    "events",
    "entities",
    "relations",
    "dimension_states",
    "state_conflicts",
    "planning_states",
)


@dataclass(frozen=True)
class InterfaceVerb:
    name: str
    meaning: str
    mutating: bool
    qcds_inference: bool

    def as_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "meaning": self.meaning,
            "mutating": self.mutating,
            "qcds_inference": self.qcds_inference,
        }


VERBS: tuple[InterfaceVerb, ...] = (
    InterfaceVerb("read", "Read represented canonical Calendar Space state.", False, False),
    InterfaceVerb("write", "Represent an authorized state change without deciding its truth.", True, False),
    InterfaceVerb("query", "Deterministically select represented state; never infer an answer.", False, False),
    InterfaceVerb("project", "Project the same canonical state into a human or machine view.", False, False),
    InterfaceVerb("resolve", "Cross the sole inference boundary into QCDS and return its Syntract result.", True, True),
)


def _path_value(item: Mapping[str, Any], path: str) -> Any:
    value: Any = item
    for part in str(path).split("."):
        if not isinstance(value, Mapping) or part not in value:
            return None
        value = value[part]
    return value


def _matches(item: Mapping[str, Any], where: Mapping[str, Any]) -> bool:
    return all(_path_value(item, key) == expected for key, expected in where.items())


class CallyChatGPTInterface:
    """Five-port facade over one workspace-bound logical robot."""

    def __init__(self, robot: ChatGPTLogicalRobot) -> None:
        self.robot = robot

    @staticmethod
    def descriptor() -> dict[str, Any]:
        return {
            "contract": "logical-robot-interface/v1",
            "verbs": [verb.as_dict() for verb in VERBS],
            "canonical_state": "Calendar Space",
            "projection": "calendar",
            "inference_boundary": "resolve -> QCDS -> Syntract",
            "parallel_inference_engine": False,
        }

    def read(self, selector: Mapping[str, Any] | None = None) -> dict[str, Any]:
        result = self.robot.call_tool("get_calendar_space")
        selector = dict(selector or {})
        sections = selector.get("sections")
        if sections is None:
            return {**result, "interface": self.descriptor(), "verb": "read"}
        if not isinstance(sections, (list, tuple)):
            raise CalendarRobotError("read selector.sections must be an array")
        state = result["calendar_space"]
        selected: dict[str, Any] = {}
        for section in sections:
            key = str(section)
            if key in state:
                selected[key] = state[key]
        return {
            "robot": result["robot"],
            "calendar_space": selected,
            "interface": self.descriptor(),
            "verb": "read",
        }

    def write(self, operation: str, payload: Mapping[str, Any] | None = None) -> dict[str, Any]:
        operation = str(operation or "").strip()
        tool = WRITE_OPERATIONS.get(operation)
        if tool is None:
            raise CalendarRobotError(
                "unknown write operation; allowed: " + ", ".join(sorted(WRITE_OPERATIONS))
            )
        body = dict(payload or {})
        if operation == "hydrate":
            body = {"state": body.get("state", body)}
        result = self.robot.call_tool(tool, body)
        result["interface"] = self.descriptor()
        result["verb"] = "write"
        result["operation"] = operation
        return result

    def query(self, spec: Mapping[str, Any] | None = None) -> dict[str, Any]:
        """Deterministic state selection only; no scoring, ranking or inference."""
        spec = dict(spec or {})
        section = str(spec.get("section") or "events")
        if section not in QUERY_SECTIONS:
            raise CalendarRobotError("query section is not exposed by the canonical interface")
        where = spec.get("where") or {}
        if not isinstance(where, Mapping):
            raise CalendarRobotError("query where must be an object")
        limit = int(spec.get("limit") or 100)
        if limit < 1 or limit > 1000:
            raise CalendarRobotError("query limit must be between 1 and 1000")

        state_result = self.robot.call_tool("get_calendar_space")
        items = state_result["calendar_space"].get(section) or []
        if not isinstance(items, list):
            items = []
        matches = [item for item in items if isinstance(item, Mapping) and _matches(item, where)][:limit]
        return {
            "robot": state_result["robot"],
            "interface": self.descriptor(),
            "verb": "query",
            "query": {"section": section, "where": dict(where), "limit": limit},
            "matches": matches,
            "count": len(matches),
            "calendar_space_revision": state_result["calendar_space"].get("revision"),
        }

    def project(self, projection: str = "calendar", options: Mapping[str, Any] | None = None) -> dict[str, Any]:
        projection = str(projection or "calendar").strip().lower()
        if projection != "calendar":
            raise CalendarRobotError("this logical robot currently exposes the calendar projection")
        state_result = self.robot.call_tool("get_calendar_space")
        return {
            "robot": state_result["robot"],
            "interface": self.descriptor(),
            "verb": "project",
            "projection": {
                "name": "calendar",
                "canonical_source": "Calendar Space",
                "options": dict(options or {}),
                "state": state_result["calendar_space"],
                "changes_canonical_state": False,
                "runs_inference": False,
            },
        }

    def resolve(self, problem: Mapping[str, Any]) -> dict[str, Any]:
        """The only public verb allowed to invoke the QCDS/Syntract resolver."""
        body = dict(problem or {})
        event_id = str(body.get("event_id") or "").strip()
        if not event_id:
            raise CalendarRobotError("resolve requires event_id")
        candidates = body.get("candidates")
        if candidates is not None and not isinstance(candidates, list):
            raise CalendarRobotError("resolve candidates must be an array")
        result = self.robot.call_tool(
            "resolve_with_qcds",
            {"event_id": event_id, "candidates": candidates},
        )
        result["interface"] = self.descriptor()
        result["verb"] = "resolve"
        result["inference_engine"] = "QCDS"
        result["parallel_inference_engine"] = False
        return result

    def call(self, verb: str, payload: Mapping[str, Any] | None = None) -> dict[str, Any]:
        verb = str(verb or "").strip().lower()
        body = dict(payload or {})
        if verb == "read":
            return self.read(body)
        if verb == "write":
            return self.write(str(body.get("operation") or ""), body.get("payload") or {})
        if verb == "query":
            return self.query(body)
        if verb == "project":
            return self.project(str(body.get("projection") or "calendar"), body.get("options") or {})
        if verb == "resolve":
            return self.resolve(body)
        raise CalendarRobotError("unknown interface verb; expected read/write/query/project/resolve")


__all__ = [
    "CallyChatGPTInterface",
    "INTERFACE_VERBS",
    "QUERY_SECTIONS",
    "VERBS",
    "WRITE_OPERATIONS",
]
