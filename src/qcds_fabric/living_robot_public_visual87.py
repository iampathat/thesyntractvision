from __future__ import annotations

from .living_robot_public_visual86 import living_robot_public_visual86_html as _base_html


_BRIDGE = r'''
<div class="visualBodyBridge" id="visualBodyBridge">
  <div class="visualBodyBridgeHead"><b>WHAT YOU JUST SAW</b><strong>The body can change. The intelligence architecture does not.</strong><span>The playground is a Visual Logical Robot: a body manifested on a canvas. Replace the finger with sensors and the canvas movement with motors, and the QCDS/Syntract relationship remains the same.</span></div>
  <div class="visualBodyCompare">
    <div class="visualBodyCard"><b>VISUAL BODY</b><strong>Finger / mouse → canvas</strong><span>You provide the changing world. Drawn geometry becomes oracle logic. The on-screen robot manifests one bound route.</span></div>
    <div class="visualBodyCore"><b>SAME INTELLIGENCE</b><strong>Logical Space → Oracles → QCDS → TruthDistribution → Syntract</strong><span>Sense → infer → bind → act → sense again ↺</span></div>
    <div class="visualBodyCard"><b>PHYSICAL BODY</b><strong>Camera / lidar → motors</strong><span>Sensors provide the changing world. Observations become oracle logic. Wheels, arms or other actuators manifest action.</span></div>
  </div>
  <div class="visualNextSteps"><span>Now that you have seen it:</span><button type="button" onclick="publicSelectView('qcds')">UNDERSTAND QCDS →</button><button type="button" onclick="publicSelectView('syntract')">SEE SYNTRACTS →</button></div>
</div>
'''

_CSS = r'''
/* BUILD 87: connect the visual body to the full Syntract Vision. */
.visualBodyBridge{margin-top:12px;border:1px solid #355c62;background:linear-gradient(145deg,#071a20,#0b201a);border-radius:15px;padding:13px}.visualBodyBridgeHead b{display:block;font-size:6.5px;letter-spacing:.14em;color:#8de8af}.visualBodyBridgeHead strong{display:block;margin-top:4px;font-size:13px;color:#edf9f2}.visualBodyBridgeHead span{display:block;margin-top:5px;max-width:1100px;font-size:7.5px;line-height:1.55;color:#89a49d}.visualBodyCompare{display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:7px;margin-top:10px}.visualBodyCard,.visualBodyCore{border:1px solid #294c55;background:#06161b;border-radius:11px;padding:10px}.visualBodyCard b,.visualBodyCore b{display:block;font-size:6px;letter-spacing:.12em;color:#7899a1}.visualBodyCard strong,.visualBodyCore strong{display:block;margin-top:4px;font-size:8.5px;color:#e0f1ea}.visualBodyCard span,.visualBodyCore span{display:block;margin-top:4px;font-size:6.7px;line-height:1.5;color:#79958d}.visualBodyCore{border-color:#427255;background:linear-gradient(145deg,#0a251c,#07191c);text-align:center}.visualBodyCore b{color:#8ee9b0}.visualBodyCore strong{color:#d9f8e4}.visualNextSteps{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px;border-top:1px solid #24443f;padding-top:9px}.visualNextSteps span{font-size:7px;color:#78948c;margin-right:4px}.visualNextSteps button{border-radius:999px;padding:7px 9px;font-size:6.8px}@media(max-width:850px){.visualBodyCompare{grid-template-columns:1fr}.visualBodyCore{order:-1;text-align:left}}@media(max-width:560px){.visualNextSteps button{flex:1}}
'''


def living_robot_public_visual87_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    anchor = '<div class="publicRobotQuantum"><strong>What is quantum here?</strong>'
    start = html.find(anchor)
    if start < 0:
        raise RuntimeError("Robotics quantum explanation changed; BUILD 87 body bridge cannot attach")
    end = html.find('</div>', start)
    if end < 0:
        raise RuntimeError("Robotics quantum explanation is malformed")
    end += len('</div>')
    html = html[:end] + "\n" + _BRIDGE + html[end:]
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    return html


__all__ = ["living_robot_public_visual87_html"]
