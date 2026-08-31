from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_learning import living_robot_learning_html


_CSS = r'''
/* BUILD 32 base clarity + BUILD 91 focused Technical details modal. */
header .statusbar{display:none!important}header>#connectBox{display:none!important}
.clarityStatus{display:flex;align-items:center;gap:14px;flex:1;justify-content:flex-end;min-width:0}.clarityPrimary{display:flex;align-items:flex-start;gap:9px;min-width:280px;max-width:620px}.clarityDot{width:9px;height:9px;border-radius:50%;background:#7b91a0;margin-top:5px;flex:0 0 auto}.clarityDot.live{background:#79e5a7;box-shadow:0 0 16px #79e5a755}.clarityDot.recorded{background:#c7a9ff}.clarityDot.warn{background:#f2bd72}.clarityWords b{display:block;font-size:10px;letter-spacing:.055em;color:#eaf6ff}.clarityWords span{display:block;font-size:9px;line-height:1.4;color:#8fa9bb;margin-top:2px}
.clarityDetails{position:relative}.clarityDetails>summary{list-style:none;cursor:pointer;font-size:9px;color:#9ab1c1;border:1px solid #29495e;background:#0a1b28;border-radius:9px;padding:7px 9px;white-space:nowrap;transition:border-color .16s ease,background .16s ease,color .16s ease}.clarityDetails>summary::-webkit-details-marker{display:none}.clarityDetails[open]>summary{border-color:#76c89a;color:#e8fff0;background:#0d2b22}
/* BUILD 91: visually isolate the detail surface from the page behind it. */
.clarityBackdrop{display:none;position:fixed;inset:0;z-index:175;background:rgba(1,7,11,.74);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}.clarityDetails[open]>.clarityBackdrop{display:block}
.clarityPanel{position:fixed!important;right:24px!important;top:76px!important;width:min(640px,calc(100vw - 48px))!important;max-height:calc(100dvh - 100px);overflow:auto;padding:0!important;border:1px solid #4d786d!important;border-radius:18px!important;background:linear-gradient(155deg,#0b2025 0,#07151d 42%,#061219 100%)!important;box-shadow:0 28px 90px #000d,0 0 0 1px #8ce3b214!important;z-index:180!important;color:#dcecf1}
.clarityPanelHead{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:17px 17px 14px;border-bottom:1px solid #294c50;background:linear-gradient(180deg,#0e2927fa,#0a1d22f4);backdrop-filter:blur(8px)}.clarityPanelIntro{min-width:0}.clarityEyebrow{display:block;font-size:6.5px;letter-spacing:.16em;text-transform:uppercase;color:#8ce3b2}.clarityPanelHead b{display:block;margin-top:5px;font-size:15px;letter-spacing:.01em;color:#effbf4}.clarityPanelHead p{max-width:470px;margin:5px 0 0;font-size:8px;line-height:1.5;color:#91aaa5}.clarityClose{flex:0 0 auto;border:1px solid #41665f!important;background:#0a1b20!important;color:#b7cec8!important;border-radius:999px!important;padding:7px 9px!important;font-size:6.6px!important;letter-spacing:.1em!important;white-space:nowrap}.clarityClose:hover{border-color:#83d9a6!important;color:#effff4!important;background:#103024!important}
.clarityPanelBody{padding:15px 17px 17px}.claritySectionLabel{margin:0 0 7px;font-size:6.3px;letter-spacing:.15em;text-transform:uppercase;color:#79b992}.clarityRows{display:grid;grid-template-columns:1fr 1fr;gap:9px}.clarityRow{border:1px solid #294a50;border-radius:12px;background:linear-gradient(145deg,#0b2228,#09191f);padding:11px}.clarityRow span{display:block;font-size:6.5px;letter-spacing:.11em;text-transform:uppercase;color:#7e9da4}.clarityRow code{display:block;margin-top:6px;font-size:10px;line-height:1.4;color:#e3f3f5;overflow-wrap:anywhere}.clarityRow:first-child{border-color:#3f665a;background:linear-gradient(145deg,#0c2823,#091b20)}
.clarityAdvanced{margin-top:15px;border:1px solid #293f53;border-radius:13px;background:#08151f;padding:12px}.clarityAdvanced .claritySectionLabel{color:#9c9fcf}.clarityAdvanced b{display:block;font-size:9.5px;color:#e1e4f4}.clarityAdvanced p{font-size:8px;line-height:1.55;color:#8799a8;margin:5px 0 10px}.clarityAdvanced #connectBox{display:flex!important;min-width:0;width:100%;padding:8px!important;border-radius:9px!important;background:#061019!important;border:1px solid #243b4e!important}.clarityAdvanced #connectBox input{min-width:0}.clarityStaticNote{font-size:7.5px;color:#a3b5af;margin-top:11px;line-height:1.5;border-left:2px solid #497861;background:#0a2019;padding:8px 10px;border-radius:0 8px 8px 0}.clarityStaticNote:empty{display:none}
@media(max-width:900px){header{position:relative}.clarityStatus{width:100%;justify-content:space-between}.clarityPrimary{min-width:0;flex:1}.clarityDetails{flex:0 0 auto}.clarityPanel{right:14px!important;top:70px!important;width:min(620px,calc(100vw - 28px))!important}}
@media(max-width:560px){.clarityStatus{align-items:flex-start}.clarityWords b{font-size:9px}.clarityWords span{font-size:8px}.clarityPanel{left:10px!important;right:10px!important;top:62px!important;width:auto!important;max-height:calc(100dvh - 76px)!important;border-radius:15px!important}.clarityPanelHead{padding:14px 13px 12px}.clarityPanelHead b{font-size:13px}.clarityPanelHead p{font-size:7.5px}.clarityPanelBody{padding:12px 13px 14px}.clarityRows{grid-template-columns:1fr}.clarityClose{padding:6px 8px!important}}
'''

_STATUS = r'''
<div class="clarityStatus" id="clarityStatus">
  <div class="clarityPrimary">
    <span id="clarityDot" class="clarityDot"></span>
    <div class="clarityWords"><b id="clarityTitle">LOADING VIEW</b><span id="clarityText">Preparing the Logical Robot view.</span></div>
  </div>
  <details class="clarityDetails" id="clarityDetails">
    <summary>Technical details</summary>
    <div class="clarityBackdrop" id="clarityBackdrop" aria-hidden="true"></div>
    <div class="clarityPanel" role="dialog" aria-modal="true" aria-labelledby="clarityPanelTitle">
      <div class="clarityPanelHead">
        <div class="clarityPanelIntro">
          <span class="clarityEyebrow">Technical details</span>
          <b id="clarityPanelTitle">QCDS / Syntract runtime</b>
          <p>A focused view of the represented Logical Space and the optional live-runtime connection.</p>
        </div>
        <button type="button" class="clarityClose" id="clarityClose">CLOSE ×</button>
      </div>
      <div class="clarityPanelBody">
        <div class="claritySectionLabel">Current logical space</div>
        <div class="clarityRows">
          <div class="clarityRow"><span>Logical space</span><code id="claritySpace">—</code></div>
          <div class="clarityRow"><span>Architecture</span><code>QCDS / Syntract</code></div>
        </div>
        <div class="clarityAdvanced">
          <div class="claritySectionLabel">Advanced connection</div>
          <b>Connect another live runtime</b>
          <p>Optional advanced control. Use this only when this page should display a different running Logical Robot runtime.</p>
          <div id="clarityConnectMount"></div>
        </div>
        <div id="clarityStaticNote" class="clarityStaticNote"></div>
      </div>
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
  const details=document.getElementById('clarityDetails'),close=document.getElementById('clarityClose'),backdrop=document.getElementById('clarityBackdrop');
  const closeDetails=()=>{if(details)details.open=false};
  close?.addEventListener('click',closeDetails);backdrop?.addEventListener('click',closeDetails);
  details?.addEventListener('toggle',()=>{if(details.open)setTimeout(()=>close?.focus(),0)});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&details?.open){event.preventDefault();closeDetails()}});
  setInterval(syncClarity,1800);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchClarity);else watchClarity();
</script>
'''


def living_robot_clarity_html(*, static_mode: bool = False) -> str:
    """Human-readable Logical Robot status with a focused Technical details surface."""
    html = living_robot_learning_html(static_mode=static_mode)
    if "</style>" not in html or "</header>" not in html or "</body>" not in html:
        raise RuntimeError("Living Logical Robot markup changed; clarity overlay cannot attach safely")
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
    parser = argparse.ArgumentParser(description="Export the human-readable Logical Robot manifestation.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
