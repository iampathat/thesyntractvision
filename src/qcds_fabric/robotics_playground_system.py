from __future__ import annotations

import json
from typing import Mapping

from .robotics_route_qcds import run_robotics_route_qcds
from .syntract_system import SyntractSystem


def run_robotics_playground_system_json(payload_json: str) -> str:
    """Browser ingress for the robot body through the unified QCDS/Syntract system.

    The playground owns no independent inference engine. It borrows the exact
    FabricLayer from SyntractSystem, so substrate choice and QCDS execution stay
    on the same system boundary as the rest of the architecture.
    """

    payload = json.loads(payload_json)
    if not isinstance(payload, Mapping):
        raise ValueError("robotics playground payload must be an object")

    system = SyntractSystem()
    result = run_robotics_route_qcds(payload, fabric_layer=system.fabric_layer)
    result["system_boundary"] = "SyntractSystem"
    result["single_qcds_architecture"] = True
    result["execution"] = "SyntractSystem.fabric_layer -> QCDS inference substrate -> TruthDistribution re-entry -> Syntract"
    return json.dumps(result, ensure_ascii=False, sort_keys=True)


# Keep the worker bridge name stable while routing it through SyntractSystem.
run_robotics_playground_json = run_robotics_playground_system_json


__all__ = ["run_robotics_playground_system_json", "run_robotics_playground_json"]