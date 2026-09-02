from __future__ import annotations

# Cally.One Tribute License 1.0 — see LICENSE_CALENDAR_TRIBUTE.md

from .calendar_robot_ui import calendar_robot_html


def cally_one_html() -> str:
    """Public Cally.One manifestation over the shared Calendar Space UI."""
    return (
        calendar_robot_html()
        .replace("Family Calendar · Logical Robot", "Cally.One · Logical Robot")
        .replace(">Family Calendar<", ">Cally.One<")
        .replace("Calendar Tribute License 1.0", "Cally.One Tribute License 1.0")
        .replace("Family Calendar", "Cally.One")
    )


__all__ = ["cally_one_html"]
