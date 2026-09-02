from __future__ import annotations

# Cal.Cloud Tribute License 1.0 — see LICENSE_CALENDAR_TRIBUTE.md

from pathlib import Path
from typing import Any

from .calendar_robot import CalendarRobotService


class CalCloudService(CalendarRobotService):
    """Public Cal.Cloud manifestation over the shared Calendar Space + QCDS core."""

    def __init__(self, store_root: str | Path = "./calendar_store") -> None:
        super().__init__(store_root)

    def state(self) -> dict[str, Any]:
        state = super().state()
        state["product"] = "Cal.Cloud"
        state["space_id"] = "cal-cloud"
        provenance = dict(state.get("provenance") or {})
        provenance.update(
            {
                "product": "Cal.Cloud",
                "public_identity": "Cal.Cloud",
                "technical_space": "Calendar Space",
                "license": "Cal.Cloud Tribute License 1.0",
            }
        )
        state["provenance"] = provenance
        return state


__all__ = ["CalCloudService"]
