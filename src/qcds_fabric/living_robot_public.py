from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Sequence

from .living_robot_public_trace72 import living_robot_public_trace72_html as _base_html


PUBLIC_BUILD = "72"

_FACTS_CSS = r'''
/* BUILD 65: playground facts are metadata, not action cards. */
.invitePromise{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;min-width:500px;align-self:stretch;border-top:1px solid #31584d;border-bottom:1px solid #31584d;background:transparent}
.invitePromise div{position:relative;border:0!important;border-left:1px solid #31584d!important;background:transparent!important;border-radius:0!important;padding:10px 13px 10px 25px!important;box-shadow:none!important;cursor:default!important}
.invitePromise div:first-child{border-left:0!important}
.invitePromise div:before{content:"";position:absolute;left:11px;top:15px;width:6px;height:6px;border-radius:50%;background:#82e5ac;box-shadow:0 0 0 3px #82e5ac16}
.invitePromise b{display:block;color:#bff2d1!important;font-size:7px!important;line-height:1.2;letter-spacing:.12em;text-transform:uppercase}
.invitePromise span{display:block;color:#89a99a!important;font-size:7.5px!important;line-height:1.45;margin-top:4px!important}
@media(max-width:1050px){.invitePromise{min-width:0;margin-top:14px}}
@media(max-width:620px){.invitePromise{display:flex;flex-direction:column;border-bottom:0}.invitePromise div,.invitePromise div:first-child{border-left:0!important;border-top:1px solid #31584d!important;padding:10px 6px 10px 22px!important}.invitePromise div:first-child{border-top:0!important}.invitePromise div:before{left:7px;top:15px}.invitePromise b{font-size:7px!important}.invitePromise span{font-size:7.5px!important}}
'''


def living_robot_public_html(*, static_mode: bool = False) -> str:
    """Single stable public exporter used by both Pages and regression tests.

    Presentation/routing only. The QCDS four phases, oracle semantics, Logical
    Space inference, parallel Syntract composition and Syntract binding remain
    defined by their existing Python modules and are deliberately not
    reimplemented here.
    """

    html = _base_html(static_mode=static_mode)
    html, count = re.subn(
        r'<span class="publicBuildMark">BUILD\s+\d+</span>',
        f'<span class="publicBuildMark">BUILD {PUBLIC_BUILD}</span>',
        html,
        count=1,
    )
    if count != 1:
        raise RuntimeError("public build marker changed; stable exporter cannot identify it safely")
    html = re.sub(
        r'<div class="publicAdvancedKicker">BUILD\s+\d+\s*·\s*ADVANCED</div>',
        '<div class="publicAdvancedKicker">ADVANCED</div>',
        html,
        count=1,
    )
    facts = {
        '<b>REAL CORE</b><span>Same qcds_fabric inference path.</span>': '<b>QCDS CORE</b><span>Real qcds_fabric inference path.</span>',
        '<b>SESSION ONLY</b><span>Close the tab and the room disappears.</span>': '<b>TEMPORARY SESSION</b><span>Nothing is stored after you leave.</span>',
        '<b>ADVANCED LAB BELOW</b><span>Every field and control is still there.</span>': '<b>FULL LAB AVAILABLE</b><span>The advanced controls remain below.</span>',
    }
    for old, new in facts.items():
        if old not in html:
            raise RuntimeError(f"playground fact changed; BUILD {PUBLIC_BUILD} cannot restyle it safely")
        html = html.replace(old, new, 1)
    if "</style>" not in html:
        raise RuntimeError("public style block missing; playground facts cannot be restyled")
    html = html.replace("</style>", _FACTS_CSS + "\n</style>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_public_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export the stable public QCDS surface.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
