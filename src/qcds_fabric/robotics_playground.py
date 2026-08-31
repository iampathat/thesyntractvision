from __future__ import annotations

import json
from typing import Any, Mapping

from .fabric import FabricLayer
from .robotics_route_qcds import run_robotics_route_qcds


DEFAULT_WIDTH = 20
DEFAULT_HEIGHT = 12
DEFAULT_START = (1, 6)
DEFAULT_GOAL = (18, 6)


def run_robotics_playground(
    payload: Mapping[str, Any] | None = None,
    *,
    fabric_layer: FabricLayer | None = None,
) -> dict[str, Any]:
    """Compatibility entrypoint for the one QCDS-backed Robotics capability.

    There is deliberately no local route algorithm here. All route inference is
    delegated to ``robotics_route_qcds`` using a QCDS FabricLayer.
    """

    resolved = dict(payload or {})
    resolved.setdefault("width", DEFAULT_WIDTH)
    resolved.setdefault("height", DEFAULT_HEIGHT)
    resolved.setdefault("start", DEFAULT_START)
    resolved.setdefault("goal", DEFAULT_GOAL)
    return run_robotics_route_qcds(
        resolved,
        fabric_layer=fabric_layer or FabricLayer(),
    )


def run_robotics_playground_json(payload_json: str) -> str:
    """Stable JSON ingress through the unified SyntractSystem boundary."""

    payload = json.loads(payload_json)
    if not isinstance(payload, Mapping):
        raise ValueError("robotics playground payload must be an object")

    from .syntract_system import SyntractSystem

    system = SyntractSystem()
    result = run_robotics_route_qcds(payload, fabric_layer=system.fabric_layer)
    result["system_boundary"] = "SyntractSystem"
    result["single_qcds_architecture"] = True
    result["execution"] = "SyntractSystem.fabric_layer -> QCDS inference substrate -> TruthDistribution re-entry -> Syntract"
    return json.dumps(result, ensure_ascii=False, sort_keys=True)


__all__ = ["run_robotics_playground", "run_robotics_playground_json"]