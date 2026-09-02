"""Enhanced Cally.One product surface.

Cally.One Tribute License 1.0 — see LICENSE.md in this package.
This wrapper only augments the product manifestation. QCDS inference remains in
SyntractSystem and the shared QCDS core.
"""

from __future__ import annotations

from pathlib import Path

from .ui import cally_one_html as _base_cally_one_html


def _asset(name: str) -> str:
    return Path(__file__).with_name(name).read_text(encoding="utf-8")


def cally_one_html(*, static_mode: bool = False) -> str:
    html = _base_cally_one_html(static_mode=static_mode)
    if static_mode:
        old = "else if (path === '/api/infer') action = 'infer';\n    else if (path !== '/api/state')"
        new = "else if (path === '/api/infer') action = 'infer';\n    else if (path === '/api/entity') action = 'entity';\n    else if (path === '/api/relation') action = 'relation';\n    else if (path !== '/api/state')"
        if old not in html:
            raise RuntimeError("Cally.One static API bridge marker not found")
        html = html.replace(old, new, 1)
    css = _asset("enhancements.css")
    js = _asset("enhancements.js")
    html = html.replace("</head>", f"<style data-cally-enhancements>\n{css}\n</style>\n</head>", 1)
    html = html.replace("</body>", f"<script data-cally-enhancements>\n{js}\n</script>\n</body>", 1)
    return html


__all__ = ["cally_one_html"]
