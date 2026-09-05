"""ChatGPT / MCP bridge for the Cally calendar projection of QCDS.

This module is deliberately an adapter boundary, not an inference layer.
ChatGPT supplies conversation, tool invocation and UI hosting. Calendar Space
remains canonical state. Any logical resolution delegates to the copied
Cally/QCDS robot through ``CallyOneService.infer_placement``.

The bridge is transport-neutral so the same contract can be exposed through
OpenAI Apps SDK / MCP without making the domain model dependent on ChatGPT.

Cally.One Tribute License 1.0 — see LICENSE.md in this package.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Mapping

from ...calendar_robot import CalendarRobotError
from .runtime_v3 import CallyOneService


CHATGPT_ROBOT_ID = "cally-chatgpt"
CHATGPT_ROBOT_LABEL = "Cally.One · ChatGPT Logical Robot"
CHATGPT_PROJECTION = "calendar"


@dataclass(frozen=True)
class ChatGPTTool:
    name: str
    title: str
    description: str
    mutating: bool
    qcds_inference: bool = False

    def as_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "title": self.title,
            "description": self.description,
            "mutating": self.mutating,
            "qcds_inference": self.qcds_inference,
        }


TOOLS: tuple[ChatGPTTool, ...] = (
    ChatGPTTool(
        "get_calendar_space",
        "Read Calendar Space",
        "Return the canonical represented Calendar Space state for this workspace.",
        False,
    ),
    ChatGPTTool(
        "hydrate_calendar_space",
        "Hydrate Calendar Space",
        "Restore represented canonical state supplied by an authorized workspace.",
        True,
    ),
    ChatGPTTool(
        "upsert_person",
        "Create or update person state",
        "Represent a person and its dimensions in Calendar Space.",
        True,
    ),
    ChatGPTTool(
        "archive_person",
        "Archive person state",
        "Archive or restore a person without erasing historical state.",
        True,
    ),
    ChatGPTTool(
        "upsert_event",
        "Create or update event state",
        "Represent an event, participants, time and dimensions in Calendar Space.",
        True,
    ),
    ChatGPTTool(
        "move_event",
        "Move event state",
        "Change represented event time while preserving Calendar Space semantics.",
        True,
    ),
    ChatGPTTool(
        "delete_event",
        "Delete event",
        "Delete the active event representation using the robot's canonical action.",
        True,
    ),
    ChatGPTTool(
        "upsert_entity",
        "Create or update state entity",
        "Represent an organization, resource, thing or arbitrary state entity.",
        True,
    ),
    ChatGPTTool(
        "upsert_relation",
        "Create or update state relation",
        "Represent a relation between Calendar Space states, including its dimensions.",
        True,
    ),
    ChatGPTTool(
        "upsert_dimension",
        "Create or update dimension state",
        "Represent or evolve a canonical dimension definition.",
        True,
    ),
    ChatGPTTool(
        "retire_dimension",
        "Retire dimension state",
        "Retire or restore a dimension while preserving historical meaning.",
        True,
    ),
    ChatGPTTool(
        "resolve_with_qcds",
        "Resolve with QCDS",
        "Evaluate represented alternatives through the canonical QCDS/Syntract inference boundary.",
        True,
        qcds_inference=True,
    ),
)

_TOOL_BY_NAME = {tool.name: tool for tool in TOOLS}
_WORKSPACE_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def canonical_workspace_id(value: Any) -> str:
    """Return a filesystem-safe workspace identity without changing its semantics."""
    text = str(value or "").strip()
    if not text:
        raise CalendarRobotError("workspace_id must be non-empty")
    text = _WORKSPACE_RE.sub("_", text).strip("._-")
    if not text:
        raise CalendarRobotError("workspace_id must contain a usable identity")
    return text[:160]


class ChatGPTLogicalRobot:
    """One ChatGPT-facing logical robot bound to exactly one Calendar Space."""

    def __init__(self, store_root: str | Path, *, workspace_id: str) -> None:
        self.workspace_id = canonical_workspace_id(workspace_id)
        self.store_root = Path(store_root) / self.workspace_id
        self.service = CallyOneService(self.store_root)

    @staticmethod
    def tool_catalog() -> list[dict[str, Any]]:
        return [tool.as_dict() for tool in TOOLS]

    def descriptor(self) -> dict[str, Any]:
        return {
            "robot_id": CHATGPT_ROBOT_ID,
            "label": CHATGPT_ROBOT_LABEL,
            "projection": CHATGPT_PROJECTION,
            "workspace_id": self.workspace_id,
            "architecture": {
                "chatgpt_is_adapter": True,
                "calendar_space_is_canonical": True,
                "calendar_is_projection": True,
                "qcds_is_sole_inference_engine": True,
                "syntract_is_resolution_binding": True,
                "parallel_inference_engine": False,
            },
            "tools": self.tool_catalog(),
        }

    def _state_result(self, result: Mapping[str, Any] | None = None) -> dict[str, Any]:
        state = self.service.state()
        provenance = dict(state.get("provenance") or {})
        provenance.update(
            {
                "chatgpt_adapter": True,
                "chatgpt_robot_id": CHATGPT_ROBOT_ID,
                "chatgpt_workspace_id": self.workspace_id,
                "calendar_is_projection": True,
                "parallel_inference_engine": False,
                "system_boundary": "SyntractSystem",
            }
        )
        state["provenance"] = provenance
        return {
            "robot": self.descriptor(),
            "result": dict(result or {}),
            "calendar_space": state,
        }

    def call_tool(self, name: str, arguments: Mapping[str, Any] | None = None) -> dict[str, Any]:
        """Execute one ChatGPT/MCP tool against canonical Calendar Space state."""
        tool = _TOOL_BY_NAME.get(str(name or ""))
        if tool is None:
            raise CalendarRobotError(f"unknown ChatGPT tool: {name}")
        body = dict(arguments or {})

        if name == "get_calendar_space":
            return self._state_result()
        if name == "hydrate_calendar_space":
            incoming = body.get("state") or {}
            if not isinstance(incoming, Mapping):
                raise CalendarRobotError("state must be an object")
            self.service.hydrate(incoming)
            return self._state_result({"hydrated": True})
        if name == "upsert_person":
            item = self.service.upsert_person(body)
            return self._state_result({"person": item.as_dict()})
        if name == "archive_person":
            item = self.service.archive_person(
                str(body.get("person_id") or ""),
                archived=bool(body.get("archived", True)),
            )
            return self._state_result({"person": item.as_dict()})
        if name == "upsert_event":
            item = self.service.upsert_event(body)
            return self._state_result(
                {
                    "event": item.as_dict(),
                    "conflicts": self.service.conflicts_for_event(item.event_id),
                    "planning_states": self.service.planning_for_event(item.event_id),
                }
            )
        if name == "move_event":
            people = body.get("people")
            if people is not None and not isinstance(people, (list, tuple)):
                raise CalendarRobotError("people must be an array")
            item = self.service.move_event(
                str(body.get("event_id") or ""),
                start=str(body.get("start") or ""),
                end=None if body.get("end") is None else str(body.get("end")),
                people=None if people is None else tuple(str(value) for value in people),
            )
            return self._state_result(
                {
                    "event": item.as_dict(),
                    "conflicts": self.service.conflicts_for_event(item.event_id),
                    "planning_states": self.service.planning_for_event(item.event_id),
                }
            )
        if name == "delete_event":
            event_id = str(body.get("event_id") or "")
            self.service.delete_event(event_id)
            return self._state_result({"deleted": event_id})
        if name == "upsert_entity":
            item = self.service.upsert_entity(body)
            return self._state_result({"entity": item.as_dict()})
        if name == "upsert_relation":
            item = self.service.upsert_relation(body)
            return self._state_result({"relation": item.as_dict()})
        if name == "upsert_dimension":
            item = self.service.upsert_dimension(body)
            return self._state_result({"dimension": item.as_dict()})
        if name == "retire_dimension":
            item = self.service.retire_dimension(
                str(body.get("key") or ""),
                retired=bool(body.get("retired", True)),
            )
            return self._state_result({"dimension": item.as_dict()})
        if name == "resolve_with_qcds":
            candidates = body.get("candidates")
            if candidates is not None and not isinstance(candidates, list):
                raise CalendarRobotError("candidates must be an array")
            # Moral/architectural boundary: no ChatGPT-side inference lives here.
            # The only resolver is the copied robot's canonical QCDS/Syntract path.
            result = self.service.infer_placement(str(body.get("event_id") or ""), candidates)
            return self._state_result({"qcds_resolution": result})

        raise CalendarRobotError(f"unimplemented ChatGPT tool: {name}")


class ChatGPTWorkspaceRouter:
    """Isolate customer/workspace Calendar Spaces behind one ChatGPT app backend."""

    def __init__(self, root: str | Path) -> None:
        self.root = Path(root)
        self._robots: dict[str, ChatGPTLogicalRobot] = {}

    def robot(self, workspace_id: str) -> ChatGPTLogicalRobot:
        key = canonical_workspace_id(workspace_id)
        if key not in self._robots:
            self._robots[key] = ChatGPTLogicalRobot(self.root, workspace_id=key)
        return self._robots[key]

    def call_tool(self, workspace_id: str, name: str, arguments: Mapping[str, Any] | None = None) -> dict[str, Any]:
        return self.robot(workspace_id).call_tool(name, arguments)


__all__ = [
    "CHATGPT_PROJECTION",
    "CHATGPT_ROBOT_ID",
    "CHATGPT_ROBOT_LABEL",
    "TOOLS",
    "ChatGPTLogicalRobot",
    "ChatGPTTool",
    "ChatGPTWorkspaceRouter",
    "canonical_workspace_id",
]
