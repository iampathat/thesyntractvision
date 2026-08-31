from __future__ import annotations

import re

from .living_robot_public_robotics81 import living_robot_public_robotics81_html as _base_html


_NAV = r'''<div class="publicCompactActions">
      <button type="button" data-public-view="robotics" class="active" onclick="publicSelectView('robotics')">VISUAL LOGICAL ROBOT</button>
      <button type="button" data-public-view="qcds" onclick="publicSelectView('qcds')">TRY QCDS</button>
      <button type="button" data-public-view="syntract" onclick="publicSelectView('syntract')">SYNTRACTS</button>
      <button type="button" data-public-view="legal" onclick="publicSelectView('legal')">LEGAL ROBOT</button>
      <button type="button" data-public-view="advanced" onclick="publicSelectView('advanced')">ADVANCED</button>
    </div>'''

_CSS = r'''
/* BUILD 83: the Visual Logical Robot is the public starting point. */
.publicRoboticsKicker{color:#9cf0bd!important}.publicRoboticsKicker:before{content:"START HERE · ";color:#6fd39a}.publicRoboticsHead h2{max-width:980px}.publicRoboticsHead p{max-width:1120px}
'''


def living_robot_public_visual83_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)

    html, count = re.subn(
        r'<div class="publicCompactActions">.*?</div>',
        _NAV,
        html,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise RuntimeError("public navigation changed; BUILD 83 cannot make the Visual Logical Robot the starting point")

    replacements = {
        '<div class="publicCompactLead"><b>ONE QCDS · QUESTION → LOGICAL SPACE → ORACLE FILTERS</b><span>Choose a work surface. The canonical QCDS four-phase core stays unchanged underneath.</span></div>':
            '<div class="publicCompactLead"><b>THE SYNTRACT VISION · ONE QCDS · MANY BODIES</b><span>Start with the Visual Logical Robot: draw reality, change the oracle space, and watch QCDS re-infer the shortest coherent route.</span></div>',
        '<div class="publicRoboticsKicker">ROBOTICS PLAYGROUND · QCDS ROUTE SPACE</div>':
            '<div class="publicRoboticsKicker">VISUAL LOGICAL ROBOT · QCDS / SYNTRACT</div>',
        '<h2>Draw reality. Watch the robot re-infer the route.</h2>':
            '<h2>Draw reality. Watch QCDS find the shortest coherent route.</h2>',
        '<p>The robot moves from A to B. Draw walls with a finger or mouse. Every drawn cell becomes an explicit obstacle oracle in the represented route space, and the route distribution is recomputed from the robot\'s current position.</p>':
            '<p>A is here. B is there. Draw a wall with your finger or mouse. Your stroke becomes explicit oracle logic, the represented route space changes, and the same QCDS/Syntract system binds a new minimum-depth route family from the robot\'s current position.</p>',
        '<div class="publicRoboticsExplain"><strong>The quantum idea:</strong> do not test one route, fail, then try another. Represent route alternatives together, let oracle logic remove incoherent states, and bind the minimum-depth surviving route family.</div>':
            '<div class="publicRoboticsExplain"><strong>The quantum idea, made visible:</strong> represent alternatives together, let oracle logic reshape the possible space, then bind the coherent minimum-depth route family. This browser is the classical QCDS reference emulation of that logic.</div>',
    }
    for old, new in replacements.items():
        if old not in html:
            raise RuntimeError("Robotics public copy changed; BUILD 83 cannot attach safely")
        html = html.replace(old, new, 1)

    if "</style>" not in html:
        raise RuntimeError("public style shell missing")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    return html


__all__ = ["living_robot_public_visual83_html"]
