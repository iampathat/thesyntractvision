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


# Fold/tablet editor override.
#
# The visual regression we kept seeing was not the desktop 760 px rule itself.
# On a foldable with a CSS viewport around 700 px, the old 560–980 px media
# query expanded the editor back to almost the full viewport (720 px max), which
# made the new editor look essentially identical to the old full-screen sheet.
# Keep this final and deliberately small: presentation only, no Calendar Space
# or QCDS semantics.
_FOLD_EDITOR_OVERRIDE = r"""
/* CALLY CHATGPT FOLD EDITOR V3 — final cascade */
@media (min-width:560px) and (max-width:980px){
  #modalBack{
    padding:24px!important;
    align-items:center!important;
    justify-content:center!important;
  }
  #modalBack>.modal,
  #modalBack>.dialog,
  #modalBack>.card{
    width:min(540px,calc(100vw - 64px))!important;
    max-width:540px!important;
    max-height:min(82dvh,760px)!important;
    padding:18px 18px 0!important;
    border-radius:20px!important;
  }
  #modalBack .callyEventHead{
    margin-bottom:12px!important;
    padding-bottom:11px!important;
  }
  #modalBack .callyEventHead h2,
  #modalBack>.modal>#modalTitle{
    font-size:21px!important;
  }
  #modalBack .formGrid{
    gap:8px 10px!important;
  }
  #modalBack input:not([type="checkbox"]):not([type="radio"]),
  #modalBack select,
  #modalBack textarea{
    min-height:38px!important;
    padding:7px 9px!important;
    border-radius:9px!important;
    font-size:11px!important;
  }
  #modalBack .callyEventTitleInput,
  #modalBack #fTitle{
    min-height:44px!important;
    padding:9px 11px!important;
    border-radius:11px!important;
    font-size:15px!important;
  }
  #modalBack .callyWhenSection input{
    min-height:40px!important;
    font-size:11px!important;
  }
  #modalBack .peopleChecks{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:6px!important;
    max-height:132px!important;
  }
  #modalBack .peopleChecks label{
    min-height:34px!important;
    padding:6px 8px!important;
    gap:6px!important;
    border-radius:9px!important;
    font-size:8.5px!important;
  }
  #modalBack .peopleChecks input[type="checkbox"]{
    width:14px!important;
    height:14px!important;
    min-width:14px!important;
  }
  #modalBack .modalActions,
  #modalBack .callyEventActions{
    margin:12px -18px 0!important;
    padding:9px 18px 10px!important;
  }
  #modalBack .modalActions button,
  #modalBack .callyEventActions button{
    min-width:84px!important;
    min-height:36px!important;
    padding:0 11px!important;
    border-radius:9px!important;
    font-size:9px!important;
  }
  .stateOverlay{
    padding:24px!important;
  }
  .stateOverlay .stateSheet{
    width:min(540px,calc(100vw - 64px))!important;
    max-width:540px!important;
    max-height:min(82dvh,760px)!important;
    padding:18px!important;
    border-radius:20px!important;
  }
}
"""


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
            _FOLD_EDITOR_OVERRIDE,
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
