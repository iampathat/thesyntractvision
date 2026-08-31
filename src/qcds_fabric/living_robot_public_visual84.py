from __future__ import annotations

from .living_robot_public_visual83 import living_robot_public_visual83_html as _base_html


_RAIL = r'''
<div class="visualLogicRail" id="visualLogicRail" aria-label="What the Visual Logical Robot is doing">
  <div class="visualLogicStep" data-visual-step="reality"><b>1 · REALITY</b><strong>You draw the world</strong><span>A wall, gap or opening changes what is physically possible.</span></div>
  <div class="visualLogicArrow">→</div>
  <div class="visualLogicStep" data-visual-step="oracle"><b>2 · ORACLES</b><strong>Reality becomes logic</strong><span>Each blocked cell becomes an explicit constraint in the represented space.</span></div>
  <div class="visualLogicArrow">→</div>
  <div class="visualLogicStep" data-visual-step="qcds"><b>3 · QCDS</b><strong>Alternatives are inferred together</strong><span>The bounded route space is recursively re-entered under the active oracle logic.</span></div>
  <div class="visualLogicArrow">→</div>
  <div class="visualLogicStep" data-visual-step="syntract"><b>4 · SYNTRACT</b><strong>A coherent structure binds</strong><span>The minimum-depth surviving route family is retained as the resulting structure.</span></div>
  <div class="visualLogicArrow">→</div>
  <div class="visualLogicStep" data-visual-step="body"><b>5 · BODY</b><strong>The robot manifests one route</strong><span>The body follows one member; the intelligence is the QCDS/Syntract system behind it.</span></div>
</div>
'''

_CSS = r'''
/* BUILD 84: explain the architecture by following one visible robot cycle. */
.visualLogicRail{display:grid;grid-template-columns:minmax(0,1fr) 22px minmax(0,1fr) 22px minmax(0,1fr) 22px minmax(0,1fr) 22px minmax(0,1fr);gap:4px;align-items:stretch;margin:10px 0 12px}.visualLogicStep{border:1px solid #274c5c;background:linear-gradient(160deg,#071a24,#081b1a);border-radius:11px;padding:10px;min-height:94px;transition:.18s ease}.visualLogicStep b{display:block;font-size:6.4px;letter-spacing:.12em;color:#7ea3b2}.visualLogicStep strong{display:block;margin-top:5px;font-size:9px;color:#e1f3ed}.visualLogicStep span{display:block;margin-top:4px;font-size:6.8px;line-height:1.48;color:#819ca5}.visualLogicArrow{display:grid;place-items:center;color:#527381;font-size:14px}.visualLogicStep[data-visual-step="oracle"]{border-color:#4b496e}.visualLogicStep[data-visual-step="qcds"]{border-color:#496d80}.visualLogicStep[data-visual-step="syntract"]{border-color:#3d6b50}.visualLogicStep[data-visual-step="body"]{border-color:#42617a}.visualLogicStep.active{transform:translateY(-2px);border-color:#8fe6b0;box-shadow:0 0 0 1px #8fe6b020,0 8px 28px #0004;background:linear-gradient(160deg,#0b2a25,#091e24)}.visualLogicStep.active b{color:#94efb7}.visualLogicStep.active strong{color:#f1fff6}@media(max-width:1000px){.visualLogicRail{grid-template-columns:1fr 1fr;gap:6px}.visualLogicArrow{display:none}.visualLogicStep:last-child{grid-column:1/-1}}@media(max-width:600px){.visualLogicRail{grid-template-columns:1fr}.visualLogicStep:last-child{grid-column:auto}.visualLogicStep{min-height:0}}
'''


def living_robot_public_visual84_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    anchor = '<div class="publicRoboticsStage">'
    if html.count(anchor) != 1:
        raise RuntimeError("Robotics stage changed; BUILD 84 explanation rail cannot attach")
    html = html.replace(anchor, _RAIL + "\n" + anchor, 1)
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    return html


__all__ = ["living_robot_public_visual84_html"]
