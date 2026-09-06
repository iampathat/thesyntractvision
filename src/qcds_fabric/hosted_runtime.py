"""Host-neutral production boundary for QCDS / SyntractSystem.

This module is intentionally *not* another intelligence layer.  It owns one
``SyntractSystem`` instance and lets logical-robot adapters enter that same
system through a small, auditable contract.

The target deployment may be OpenAI-hosted, self-hosted, or another managed
runtime.  Hosting must not change QCDS semantics or move inference into the
adapter layer.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Mapping

from .syntract_system import SyntractSystem


HOSTED_RUNTIME_CONTRACT = "qcds-hosted-runtime/v1"
QCDS_ATTRIBUTION = "QCDS by Patrik Sundblom / The Syntract Vision"


class HostedRuntimeError(ValueError):
    """Raised when a hosted logical-robot request violates the runtime contract."""


HostedResolver = Callable[[SyntractSystem, Mapping[str, Any]], Mapping[str, Any]]


@dataclass(frozen=True)
class HostedRobotAdapter:
    """One logical-robot ingress into the shared hosted QCDS runtime."""

    robot_id: str
    label: str
    resolver: HostedResolver
    projection: str | None = None
    description: str = ""

    def descriptor(self) -> dict[str, Any]:
        return {
            "robot_id": self.robot_id,
            "label": self.label,
            "projection": self.projection,
            "description": self.description,
        }


class HostedQCDSRuntime:
    """One host-owned ``SyntractSystem`` shared by multiple logical robots.

    Robot adapters form/translate state and problems.  They do not own a second
    resolver.  The runtime passes its single ``SyntractSystem`` instance into
    the registered adapter for each resolve request.
    """

    def __init__(self, *, system: SyntractSystem | None = None) -> None:
        self.system = system or SyntractSystem()
        self._adapters: dict[str, HostedRobotAdapter] = {}

    def register(self, adapter: HostedRobotAdapter, *, replace: bool = False) -> None:
        robot_id = str(adapter.robot_id or "").strip()
        if not robot_id:
            raise HostedRuntimeError("hosted robot adapter requires robot_id")
        if robot_id in self._adapters and not replace:
            existing = self._adapters[robot_id]
            if existing is adapter:
                return
            raise HostedRuntimeError(f"hosted robot already registered: {robot_id}")
        self._adapters[robot_id] = adapter

    def registered(self, robot_id: str) -> bool:
        return str(robot_id or "").strip() in self._adapters

    def descriptor(self) -> dict[str, Any]:
        return {
            "contract": HOSTED_RUNTIME_CONTRACT,
            "host_neutral": True,
            "target_host": "OpenAI / ChatGPT under separate written agreement",
            "current_host_assumption": "external managed HTTPS/MCP until native hosted runtime exists",
            "system_boundary": "SyntractSystem",
            "single_qcds_architecture": True,
            "parallel_inference_engine": False,
            "qcds_core_replaced": False,
            "attribution": QCDS_ATTRIBUTION,
            "robots": [self._adapters[key].descriptor() for key in sorted(self._adapters)],
        }

    def resolve(self, robot_id: str, problem: Mapping[str, Any]) -> dict[str, Any]:
        """Resolve one robot problem through the shared ``SyntractSystem`` instance."""
        key = str(robot_id or "").strip()
        adapter = self._adapters.get(key)
        if adapter is None:
            raise HostedRuntimeError(f"unknown hosted logical robot: {key}")
        if not isinstance(problem, Mapping):
            raise HostedRuntimeError("hosted runtime problem must be an object")

        raw = adapter.resolver(self.system, dict(problem))
        if not isinstance(raw, Mapping):
            raise HostedRuntimeError("hosted robot resolver must return an object")
        result = dict(raw)
        provenance = dict(result.get("provenance") or {})
        provenance.update(
            {
                "hosted_runtime_contract": HOSTED_RUNTIME_CONTRACT,
                "hosted_runtime_robot_id": key,
                "system_boundary": "SyntractSystem",
                "single_qcds_architecture": True,
                "parallel_inference_engine": False,
                "qcds_core_replaced": False,
                "qcds_attribution": QCDS_ATTRIBUTION,
            }
        )
        result["provenance"] = provenance
        return {
            "runtime": self.descriptor(),
            "robot": adapter.descriptor(),
            "result": result,
        }


__all__ = [
    "HOSTED_RUNTIME_CONTRACT",
    "QCDS_ATTRIBUTION",
    "HostedQCDSRuntime",
    "HostedRobotAdapter",
    "HostedRuntimeError",
]
