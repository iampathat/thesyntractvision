"""Hosted version of the five-port Cally / ChatGPT interface.

READ, WRITE, QUERY and PROJECT remain local representation/projection actions.
RESOLVE serializes the current Calendar Space state into the shared
``HostedQCDSRuntime``.  This makes the hosting boundary concrete without
changing the public five-port contract.
"""

from __future__ import annotations

from typing import Any, Mapping

from ...calendar_robot import CalendarRobotError
from ...hosted_runtime import HostedQCDSRuntime
from .chatgpt_bridge import ChatGPTLogicalRobot
from .hosted_adapter import CALLY_HOSTED_ROBOT_ID, hosted_cally_adapter
from .interface import CallyChatGPTInterface


class HostedCallyChatGPTInterface(CallyChatGPTInterface):
    """Five-port facade whose RESOLVE port is owned by Hosted QCDS Runtime."""

    def __init__(self, robot: ChatGPTLogicalRobot, hosted_runtime: HostedQCDSRuntime) -> None:
        super().__init__(robot)
        self.hosted_runtime = hosted_runtime
        if not hosted_runtime.registered(CALLY_HOSTED_ROBOT_ID):
            hosted_runtime.register(hosted_cally_adapter())

    def descriptor(self) -> dict[str, Any]:  # type: ignore[override]
        base = super().descriptor()
        base.update(
            {
                "resolve_transport": "HostedQCDSRuntime",
                "hosted_runtime_contract": self.hosted_runtime.descriptor()["contract"],
                "host_neutral": True,
            }
        )
        return base

    def resolve(self, problem: Mapping[str, Any]) -> dict[str, Any]:
        body = dict(problem or {})
        event_id = str(body.get("event_id") or "").strip()
        if not event_id:
            raise CalendarRobotError("resolve requires event_id")
        candidates = body.get("candidates")
        if candidates is not None and not isinstance(candidates, list):
            raise CalendarRobotError("resolve candidates must be an array")

        hosted = self.hosted_runtime.resolve(
            CALLY_HOSTED_ROBOT_ID,
            {
                "calendar_space": self.robot.service.state(),
                "event_id": event_id,
                "candidates": candidates,
            },
        )
        return {
            "robot": self.robot.descriptor(),
            "interface": self.descriptor(),
            "verb": "resolve",
            "inference_engine": "QCDS",
            "parallel_inference_engine": False,
            "hosted_qcds": hosted,
            "result": {"qcds_resolution": hosted["result"]},
            "calendar_space": self.robot.service.state(),
        }


__all__ = ["HostedCallyChatGPTInterface"]
