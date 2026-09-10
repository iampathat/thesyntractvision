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
    css = "\n".join(
        [
            _asset("visual_polish_v2.css"),
            _asset("quick_event_create.css"),
            _asset("date_navigation_polish.css"),
            _asset("week_scroll_containment.css"),
            _asset("chatgpt_interface.css"),
            _asset("theme_system.css"),
            _asset("theme_menu_polish.css"),
            _asset("icon_system.css"),
            _asset("surface_language.css"),
            _asset("surface_editor_v2.css"),
            _asset("surface_unification_v4.css"),
            # Canonical visual authority. This is deliberately last: every
            # visible Cally surface follows the same top-control, drawer,
            # typography and Fold/phone contract.
            _asset("surface_contract_v5.css"),
            # Narrow menu-only guard. Do not let the hamburger panel collapse
            # into a short floating box on Fold/tablet.
            _asset("hamburger_bridge.css"),
        ]
    )
    js = "\n".join(
        [
            _asset("quick_event_create.js"),
            _asset("time_reference_context_polish.js"),
            _asset("theme_system.js"),
            _asset("chatgpt_interface.js"),
            _asset("icon_system.js"),
            _asset("surface_language.js"),
            _asset("surface_copy_v4.js"),
            # Final presentation normalizer: one top strip, one drawer family,
            # one interface language. No state/inference semantics live here.
            _asset("surface_contract_v5.js"),
            # Narrow compatibility bridge only. Keeps the pre-existing menu
            # layout and synchronizes its legacy hidden state with v5 .open.
            _asset("hamburger_bridge.js"),
        ]
    )
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
