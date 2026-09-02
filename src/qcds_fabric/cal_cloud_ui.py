from __future__ import annotations

# Backward-compatibility alias. Public product identity is Cally.One.

from .cally_one_ui import cally_one_html


def cal_cloud_html() -> str:
    return cally_one_html()


__all__ = ["cal_cloud_html"]
