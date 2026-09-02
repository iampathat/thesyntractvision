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


def _stable_interaction_js() -> str:
    """Return product JS with mutation-sensitive UI updates made idempotent.

    Cally.One uses MutationObservers to decorate dynamically rendered calendar
    surfaces. A callback must never perform an unconditional child-text rewrite,
    because that rewrite is itself a DOM mutation and can create a browser loop.
    Both product layers therefore converge on one Resolve label and only write
    it when the visible value actually differs.
    """

    event_js = _asset("enhancements.js").replace(
        "infer.textContent = 'QCDS Resolve';",
        "if (infer.textContent !== 'Resolve with QCDS') infer.textContent = 'Resolve with QCDS';",
    )
    management_js = _asset("state_management.js").replace(
        "button.textContent = 'Resolve with QCDS';",
        "if (button.textContent !== 'Resolve with QCDS') button.textContent = 'Resolve with QCDS';",
    )
    return event_js + "\n" + management_js


def cally_one_html(*, static_mode: bool = False) -> str:
    html = _base_cally_one_html(static_mode=static_mode)
    if static_mode:
        old = "else if (path === '/api/infer') action = 'infer';\n    else if (path === '/api/entity') action = 'entity';\n    else if (path === '/api/relation') action = 'relation';\n    else if (path !== '/api/state')"
        new = "else if (path === '/api/infer') action = 'infer';\n    else if (path === '/api/entity') action = 'entity';\n    else if (path === '/api/relation') action = 'relation';\n    else if (path === '/api/dimension') action = 'dimension';\n    else if (path === '/api/dimension/retire') action = 'dimension_retire';\n    else if (path === '/api/person/archive') action = 'person_archive';\n    else if (path !== '/api/state')"
        if old not in html:
            # Compatibility with the older bridge before entity/relation were
            # surfaced by the product enhancement wrapper.
            old = "else if (path === '/api/infer') action = 'infer';\n    else if (path !== '/api/state')"
            new = "else if (path === '/api/infer') action = 'infer';\n    else if (path === '/api/entity') action = 'entity';\n    else if (path === '/api/relation') action = 'relation';\n    else if (path === '/api/dimension') action = 'dimension';\n    else if (path === '/api/dimension/retire') action = 'dimension_retire';\n    else if (path === '/api/person/archive') action = 'person_archive';\n    else if (path !== '/api/state')"
        if old not in html:
            raise RuntimeError("Cally.One static API bridge marker not found")
        html = html.replace(old, new, 1)

    css = _asset("enhancements.css") + "\n" + _asset("state_management.css")
    js = _stable_interaction_js()
    html = html.replace("</head>", f"<style data-cally-enhancements>\n{css}\n</style>\n</head>", 1)
    html = html.replace("</body>", f"<script data-cally-enhancements>\n{js}\n</script>\n</body>", 1)
    return html


__all__ = ["cally_one_html"]
