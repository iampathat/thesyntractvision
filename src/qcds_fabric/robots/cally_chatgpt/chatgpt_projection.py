"""HTML projection for the Cally ChatGPT Logical Robot.

This reuses the copied Cally calendar GUI inside this package and adds only the
ChatGPT logical-robot interface surface. The underlying Calendar Space/QCDS
runtime remains the copied robot implementation in ``cally_chatgpt``.
"""

from __future__ import annotations

from pathlib import Path

from .enhanced_ui import cally_one_html


def _asset(name: str) -> str:
    return Path(__file__).with_name(name).read_text(encoding="utf-8")


def cally_chatgpt_html(*, static_mode: bool = False) -> str:
    html = cally_one_html(static_mode=static_mode)
    css = _asset("chatgpt_interface.css")
    js = _asset("chatgpt_interface.js")
    html = html.replace(
        "</head>",
        "<meta name=\"cally-logical-robot\" content=\"cally-chatgpt\">\n"
        "<style data-cally-chatgpt-interface>\n" + css + "\n</style>\n</head>",
        1,
    )
    html = html.replace(
        "</body>",
        "<script data-cally-chatgpt-interface>\n" + js + "\n</script>\n</body>",
        1,
    )
    return html


__all__ = ["cally_chatgpt_html"]
