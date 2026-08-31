from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Sequence

from .living_robot_public_robotics80 import living_robot_public_robotics80_html as _base_html


PUBLIC_BUILD = "80"

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

_ROUTER_CSS = r'''
/* BUILD 78: one top menu, one visible work surface. */
body.publicCompact #public-syntract-teaser,
body.publicCompact .publicCapabilityStrip{display:none!important}
body.publicCompact #try-logical-robot,
body.publicCompact #public-legal-question,
body.publicCompact #swedish-legal-robot,
body.publicCompact #public-robotics,
body.publicCompact #public-syntracts,
body.publicCompact>.hero,
body.publicCompact>.layout,
body.publicCompact>.learningMoment,
body.publicCompact>.understandBuild,
body.publicCompact>.domainLab,
body.publicCompact>.spaceBuilderWrap,
body.publicCompact>.sessionSandbox{display:none!important}
body.publicCompact.publicViewQcds #try-logical-robot{display:block!important}
body.publicCompact.publicViewLegal #public-legal-question,
body.publicCompact.publicViewLegal #swedish-legal-robot{display:block!important}
body.publicCompact.publicViewRobotics #public-robotics{display:block!important}
body.publicCompact.publicViewSyntract #public-syntracts{display:block!important}
body.publicCompact.publicViewAdvanced>.hero{display:block!important}
body.publicCompact.publicViewAdvanced>.layout{display:grid!important}
body.publicCompact.publicViewAdvanced>.learningMoment,
body.publicCompact.publicViewAdvanced>.understandBuild,
body.publicCompact.publicViewAdvanced>.domainLab,
body.publicCompact.publicViewAdvanced>.spaceBuilderWrap,
body.publicCompact.publicViewAdvanced>.sessionSandbox{display:block!important}
.publicCompactBar{position:sticky;top:0;z-index:80;background:#06131dcc;padding-top:7px;padding-bottom:7px;backdrop-filter:blur(10px)}
'''

_ROUTER_SCRIPT = r'''
<script>
/* BUILD 78: final router. Older feature wrappers may add surfaces, but they do not own navigation. */
(function(){
  const VIEW_CLASS={
    qcds:'publicViewQcds',
    legal:'publicViewLegal',
    robotics:'publicViewRobotics',
    syntract:'publicViewSyntract',
    advanced:'publicViewAdvanced'
  };
  const ALL=Object.values(VIEW_CLASS);
  window.publicSelectView=function(requested){
    const view=Object.prototype.hasOwnProperty.call(VIEW_CLASS,requested)?requested:'qcds';
    ALL.forEach(name=>document.body.classList.remove(name));
    document.body.classList.add(VIEW_CLASS[view]);
    document.body.dataset.publicView=view;
    document.querySelectorAll('[data-public-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.publicView===view));
    if(view==='legal' && typeof window.publicSelectLegalMode==='function'){
      const hasLegalMode=document.body.classList.contains('publicLegalAsk')||document.body.classList.contains('publicLegalExamples')||document.body.classList.contains('publicLegalDetails');
      if(!hasLegalMode)window.publicSelectLegalMode('ask',false);
    }
    if(view==='robotics' && typeof window.q75Activate==='function')window.setTimeout(window.q75Activate,0);
  };
  const active=document.querySelector('[data-public-view].active');
  window.publicSelectView(active?.dataset.publicView||'qcds');
})();
</script>
'''


def living_robot_public_html(*, static_mode: bool = False) -> str:
    """Single stable public exporter used by both Pages and regression tests.

    Presentation/routing only. The QCDS four phases, oracle semantics, Logical
    Space inference, parallel Syntract composition, Robotics Playground and
    Syntract binding remain defined by their existing Python modules and are
    deliberately not reimplemented in this stable exporter.
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
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("public shell missing; stable router cannot attach")
    html = html.replace("</style>", _FACTS_CSS + "\n" + _ROUTER_CSS + "\n</style>", 1)
    html = html.replace("</body>", _ROUTER_SCRIPT + "\n</body>", 1)
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
