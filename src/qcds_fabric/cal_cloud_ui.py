from __future__ import annotations

# Cal.Cloud Tribute License 1.0 — see LICENSE_CALENDAR_TRIBUTE.md

from .calendar_robot_ui import calendar_robot_html


def cal_cloud_html() -> str:
    """Public Cal.Cloud manifestation over the shared Calendar Space UI."""
    return (
        calendar_robot_html()
        .replace("Family Calendar · Logical Robot", "Cal.Cloud · Logical Robot")
        .replace(">Family Calendar<", ">Cal.Cloud<")
        .replace("Calendar Tribute License 1.0", "Cal.Cloud Tribute License 1.0")
        .replace("Family Calendar", "Cal.Cloud")
    )


__all__ = ["cal_cloud_html"]
