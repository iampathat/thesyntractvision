"""Robotics Logical Robot adapter for the shared Hosted QCDS Runtime.

This is deliberately a body/adapter, not another inference engine.  Route
state is handed to the existing robotics QCDS implementation using the exact
``FabricLayer`` owned by the host's single ``SyntractSystem``.
"""

from __future__ import annotations

from typing import Any, Mapping

from .hosted_runtime import HostedRobotAdapter
from .robotics_route_family_view import add_route_family_preview
from .robotics_route_qcds import run_robotics_route_qcds
from .syntract_system import SyntractSystem


ROBOTICS_HOSTED_ROBOT_ID = "robotics-route"


def _resolve_robotics(system: SyntractSystem, problem: Mapping[str, Any]) -> Mapping[str, Any]:
    result = run_robotics_route_qcds(dict(problem), fabric_layer=system.fabric_layer)
    result = add_route_family_preview(result, limit=8)
    provenance = dict(result.get("provenance") or {})
    provenance.update(
        {
            "logical_robot": "robotics-route",
            "system_boundary": "SyntractSystem",
            "uses_hosted_system_fabric": True,
            "separate_pathfinder": False,
            "parallel_inference_engine": False,
        }
    )
    result["provenance"] = provenance
    return result


def hosted_robotics_adapter() -> HostedRobotAdapter:
    return HostedRobotAdapter(
        robot_id=ROBOTICS_HOSTED_ROBOT_ID,
        label="Robotics Logical Robot",
        projection="robotics",
        description="Robot route/world state resolved through the shared QCDS/SyntractSystem runtime.",
        resolver=_resolve_robotics,
    )


__all__ = ["ROBOTICS_HOSTED_ROBOT_ID", "hosted_robotics_adapter"]
