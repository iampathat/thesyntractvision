from __future__ import annotations

# Cally.One Tribute License 1.0 — see LICENSE_CALENDAR_TRIBUTE.md

from pathlib import Path
from typing import Any

from .calendar_robot import CalendarRobotService


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


__all__ = ["CallyOneService"]
