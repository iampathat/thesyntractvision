"""Cally adapter for the shared host-neutral QCDS runtime.

The adapter receives a serialized Calendar Space snapshot plus a resolve
problem.  It reconstructs the product state in an ephemeral service, injects
the *host-owned* ``SyntractSystem``, and calls the existing Cally QCDS resolve
path.  No Cally state is persisted by the hosted runtime itself.

That separation is intentional: a future OpenAI-hosted QCDS runtime can remain
stateless while ChatGPT/Cally owns the user's represented Calendar Space.
"""

from __future__ import annotations

from tempfile import TemporaryDirectory
from typing import Any, Mapping

from ...hosted_runtime import HostedRobotAdapter
from ...syntract_system import SyntractSystem
from ...calendar_robot import CalendarRobotError
from .runtime_v3 import CallyOneService


CALLY_HOSTED_ROBOT_ID = "cally"


def _resolve_cally(system: SyntractSystem, problem: Mapping[str, Any]) -> Mapping[str, Any]:
    state = problem.get("calendar_space") or {}
    if not isinstance(state, Mapping):
        raise CalendarRobotError("hosted Cally resolve requires calendar_space object")
    event_id = str(problem.get("event_id") or "").strip()
    if not event_id:
        raise CalendarRobotError("hosted Cally resolve requires event_id")
    candidates = problem.get("candidates")
    if candidates is not None and not isinstance(candidates, list):
        raise CalendarRobotError("hosted Cally candidates must be an array")

    # The hosted runtime owns inference; this service only reconstructs product
    # state/oracles around the exact host-owned SyntractSystem instance.
    with TemporaryDirectory(prefix="qcds-hosted-cally-") as root:
        service = CallyOneService(root)
        service.system = system
        service.hydrate(state)
        result = service.infer_placement(event_id, candidates)

    provenance = dict(result.get("provenance") or {})
    provenance.update(
        {
            "logical_robot": "cally",
            "calendar_space_transported_as_state": True,
            "hosted_runtime_stateful": False,
            "uses_hosted_syntract_system": True,
            "system_boundary": "SyntractSystem",
            "parallel_inference_engine": False,
        }
    )
    result["provenance"] = provenance
    return result


def hosted_cally_adapter() -> HostedRobotAdapter:
    return HostedRobotAdapter(
        robot_id=CALLY_HOSTED_ROBOT_ID,
        label="Cally Logical Robot",
        projection="calendar",
        description="Calendar Space state formed by Cally and resolved by the shared hosted QCDS/SyntractSystem runtime.",
        resolver=_resolve_cally,
    )


__all__ = ["CALLY_HOSTED_ROBOT_ID", "hosted_cally_adapter"]
