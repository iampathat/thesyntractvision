from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_learning import living_robot_learning_html


_CSS = r'''
/* BUILD 32: clarity-only header overlay. Existing status elements remain for runtime JS but are hidden from users. */
header .statusbar{display:none!important}header>#connectBox{display:none!important}
.clarityStatus{display:flex;align-items:center;gap:14px;flex:1;justify-content:flex-end;min-width:0}.clarityPrimary{display:flex;align-items:flex-start;gap:9px;min-width:280px;max-width:620px}.clarityDot{width:9px;height:9px;border-radius:50%;background:#7b91a0;margin-top:5px;flex:0 0 auto}.clarityDot.live{background:#79e5a7;box-shadow:0 0 16px #79e5a755}.clarityDot.recorded{background:#c7a9ff}.clarityDot.warn{background:#f2bd72}.clarityWords b{display:block;font-size:10px;letter-spacing:.055em;color:#eaf6ff}.clarityWords span{display:block;font-size:9px;line-height:1.4;color:#8fa9bb;margin-top:2px}.clarityDetails{position:relative}.clarityDetails>summary{list-style:none;cursor:pointer;font-size:9px;color:#9ab1c1;border:1px solid #29495e;background:#0a1b28;border-radius:9px;padding:7px 9px;white-space:nowrap}.clarityDetails>summary::-webkit-details-marker{display:none}.clarityDetails[open]>summary{border-color:#42657c;color:#d9edf8}.clarityPanel{position:absolute;right:0;top:calc(100% + 8px);width:min(520px,86vw);padding:12px;border:1px solid #2d5067;border-radius:12px;background:#07131ff7;box-shadow:0 18px 55px #0009;z-index:70}.clarityRows{display:grid;grid-template-columns:1fr 1fr;gap:7px}.clarityRow{border:1px solid #203d50;border-radius:9px;background:#0a1c29;padding:8px}.clarityRow span{display:block;font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#7895a8}.clarityRow code{display:block;margin-top:4px;font-size:9px;color:#d7eaf4;overflow-wrap:anywhere}.clarityAdvanced{margin-top:9px;border-top:1px solid #1c3547;padding-top:9px}.clarityAdvanced b{font-size:9px}.clarityAdvanced p{font-size:8px;line-height:1.45;color:#829dad;margin:4px 0 8px}.clarityAdvanced #connectBox{display:flex!important;min-width:0;width:100%}.clarityAdvanced #connectBox input{min-width:0}.clarityStaticNote{font-size:8px;color:#9baeb9;margin-top:8px;line-height:1.45}@media(max-width:900px){header{position:relative}.clarityStatus{width:100%;justify-content:space-between}.clarityPrimary{min-width:0;flex:1}.clarityDetails{flex:0 0 auto}}@media(max-width:560px){.clarityStatus{align-items:flex-start}.clarityWords b{font-size:9px}.clarityWords span{font-size:8px}.clarityRows{grid-template-columns:1fr}.clarityPanel{position:fixed;left:8px;right:8px;top:auto;width:auto}}
'''

_STATUS = r'''
<div class="clarityStatus" id="clarityStatus">
  <div class="clarityPrimary">
    <span id="clarityDot" class="clarityDot"></span>
    <div class="clarityWords"><b id="clarityTitle">LOADING VIEW</b><span id="clarityText">Preparing the Logical Robot view.</span></div>
  </div>
  <details class="clarityDetails" id="clarityDetails">
    <summary>Technical details</summary>
    <div class="clarityPanel">
      <div class="clarityRows">
        <div class="clarityRow"><span>Logical space</span><code id="claritySpace">—</code></div>
        <div class="clarityRow"><span>Architecture</span><code>QCDS / Syntract</code></div>
      </div>
      <div class="clarityAdvanced">
        <b>Connect another live runtime</b>
        <p>Optional advanced control. Use this only when this page should display a different running Logical Robot runtime.</p>
        <div id="clarityConnectMount"></div>
      </div>
      <div id="clarityStaticNote" class="clarityStaticNote"></div>
    </div>
  </details>
</div>
'''

_SCRIPT_TEMPLATE = r'''
<script>
const BUILD32_STATIC_MODE=__STATIC_MODE__;
function claritySet(kind,title,text){
  const dot=document.getElementById('clarityDot'),t=document.getElementById('clarityTitle'),d=document.getElementById('clarityText');
  if(dot)dot.className='clarityDot '+kind;if(t)t.textContent=title;if(d)d.textContent=text;
}
function syncClarity(){
  const version=document.getElementById('versionPill'),space=document.getElementById('claritySpace');
  if(space&&version)space.textContent=(version.textContent||'space —').replace(/^space\s+/i,'')||'—';
  if(BUILD32_STATIC_MODE){
    claritySet('recorded','RECORDED VERIFIED PROOF','You are viewing a saved verified run. This public page is not trying to connect anywhere.');
    return;
  }
  const mode=(document.getElementById('modePill')?.textContent||'').toUpperCase();
  if(mode.includes('PARTIAL')){claritySet('live','LIVE · LOGICAL ROBOT CONNECTED','The live runtime is connected. One secondary view is temporarily unavailable.');return}
  if(mode.includes('LIVE')){claritySet('live','LIVE · LOGICAL ROBOT CONNECTED','Showing the Reality store running in this environment.');return}
  if(mode.includes('RECORDED')){claritySet('recorded','RECORDED VERIFIED PROOF','Showing a saved verified run rather than a live Reality store.');return}
  if(mode.includes('UNREACHABLE')||mode.includes('ERROR')||mode.includes('OFFLINE')){claritySet('warn','LOGICAL ROBOT RUNTIME OFFLINE','The page loaded, but the live Logical Robot process is not responding.');return}
  claritySet('','STARTING LIVE LOGICAL ROBOT','Waiting for the Logical Robot runtime in this environment to become ready.');
}
function mountAdvancedRuntime(){
  const box=document.getElementById('connectBox'),mount=document.getElementById('clarityConnectMount');if(box&&mount&&!mount.contains(box))mount.appendChild(box);
  const note=document.getElementById('clarityStaticNote');if(note&&BUILD32_STATIC_MODE)note.textContent='The public proof works without a runtime. Connecting one is optional and intended for advanced/live use.';
}
function watchClarity(){
  mountAdvancedRuntime();syncClarity();
  const mode=document.getElementById('modePill'),version=document.getElementById('versionPill');
  const observer=new MutationObserver(syncClarity);if(mode)observer.observe(mode,{childList:true,subtree:true,attributes:true});if(version)observer.observe(version,{childList:true,subtree:true,attributes:true});
  setInterval(syncClarity,1800);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchClarity);else watchClarity();
</script>
'''


def living_robot_clarity_html(*, static_mode: bool = False) -> str:
    """BUILD 32: remove developer-status ambiguity without changing robot behavior."""
    html = living_robot_learning_html(static_mode=static_mode)
    if "</style>" not in html or "</header>" not in html or "</body>" not in html:
        raise RuntimeError("Living Logical Robot markup changed; BUILD 32 clarity overlay cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace("</header>", _STATUS + "\n</header>", 1)
    script = _SCRIPT_TEMPLATE.replace("__STATIC_MODE__", "true" if static_mode else "false")
    html = html.replace("</body>", script + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_clarity_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export the BUILD 32 human-readable Logical Robot manifestation.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
