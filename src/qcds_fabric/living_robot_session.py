from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_builder import living_robot_builder_html


_CSS = r'''
/* BUILD 35: session-only Logical Robot -> QCDS Core sandbox. */
.sessionSandbox{max-width:1800px;margin:12px auto 0;padding:0 14px}.sessionSandboxInner{border:1px solid #31536b;background:linear-gradient(160deg,#08151f,#0a1c28 72%);border-radius:18px;padding:18px;box-shadow:0 18px 55px #0004}.sessionHead{display:flex;gap:14px;align-items:flex-start}.sessionHead>div{flex:1}.sessionKicker{font-size:7px;letter-spacing:.16em;color:#75d49a}.sessionHead h3{font-size:22px;margin:4px 0}.sessionHead p{font-size:9px;line-height:1.55;color:#91a9b7;max-width:1100px;margin:0}.sessionBadge{border:1px solid #28513e;background:#0a2119;color:#a9edc0;border-radius:999px;padding:7px 10px;font-size:7px;white-space:nowrap}.sessionFlow{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:14px 0}.sessionFlow div{border:1px solid #29485a;background:#07131d;border-radius:9px;padding:8px}.sessionFlow b{display:block;font-size:8px;color:#d9f8e4}.sessionFlow span{display:block;font-size:7px;color:#7491a1;margin-top:3px;line-height:1.4}.sessionGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sessionField{display:flex;flex-direction:column;gap:5px}.sessionField.full{grid-column:1/-1}.sessionField label{font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#83aabd}.sessionField input,.sessionField textarea{width:100%;box-sizing:border-box;border:1px solid #31536b;background:#07131d;color:#e8f5fb;border-radius:9px;padding:9px 10px;font:inherit;font-size:9px;outline:none}.sessionField textarea{min-height:95px;resize:vertical;line-height:1.45}.sessionHint{font-size:7px;line-height:1.45;color:#6f8d9f}.sessionActions{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-top:12px}.sessionActions button{border:1px solid #31536b;background:#102638;color:#eef8ff;border-radius:9px;padding:9px 11px;font-size:8px;font-weight:750;cursor:pointer}.sessionActions button.primary{background:#d9f8e4;color:#082117;border-color:#d9f8e4}.sessionActions button:disabled{opacity:.45;cursor:not-allowed}.sessionStatus{font-size:8px;line-height:1.5;color:#86a0b0;min-height:21px;margin-top:9px}.sessionStatus.good{color:#a9edc0}.sessionStatus.warn{color:#efc986}.sessionResult{margin-top:10px;border:1px solid #27485b;background:#06111a;border-radius:10px;padding:10px;max-height:360px;overflow:auto;font-size:8px;line-height:1.5;color:#a9bfcc;white-space:pre-wrap}.sessionPrivacy{margin-top:10px;font-size:7px;color:#688596;line-height:1.5}@media(max-width:800px){.sessionSandbox{padding:0 8px}.sessionFlow{grid-template-columns:1fr 1fr}.sessionGrid{grid-template-columns:1fr}.sessionField.full{grid-column:auto}.sessionHead{display:block}.sessionBadge{display:inline-block;margin-top:10px}}@media(max-width:520px){.sessionFlow{grid-template-columns:1fr}}
'''

_SECTION = r'''
<section class="sessionSandbox" id="session-sandbox">
  <div class="sessionSandboxInner">
    <div class="sessionHead">
      <div>
        <div class="sessionKicker">BUILD 35 · EPHEMERAL LOGICAL SPACE SANDBOX</div>
        <h3>Let the Logical Robot ask the real QCDS core.</h3>
        <p>The browser owns only this tab's temporary room. The Logical Robot sends an explicit probe to the unchanged qcds_fabric core. On GitHub Pages that same Python core runs inside WebAssembly; locally the same request goes to the Python runtime.</p>
      </div>
      <span class="sessionBadge" id="sessionModeBadge">SESSION ONLY</span>
    </div>
    <div class="sessionFlow">
      <div><b>1 · SESSION SPACE</b><span>Temporary browser state only.</span></div>
      <div><b>2 · LOGICAL ROBOT</b><span>Builds a bounded explicit core request.</span></div>
      <div><b>3 · QCDS CORE</b><span>Existing problem → Fabric → Syntract path.</span></div>
      <div><b>4 · RESULT</b><span>Returned to this tab. Reality effect = 0.</span></div>
    </div>
    <div class="sessionGrid">
      <div class="sessionField"><label for="session-subject">Core probe · subject</label><input id="session-subject" placeholder="cell-001"></div>
      <div class="sessionField"><label for="session-predicate">Core probe · predicate / dimension</label><input id="session-predicate" placeholder="capacity"></div>
      <div class="sessionField full"><label for="session-candidates">Explicit candidate values</label><input id="session-candidates" placeholder="low | medium | high"><div class="sessionHint">At least two candidates, separated with |. The core opens the represented possibility space; the browser does not choose the answer.</div></div>
      <div class="sessionField full"><label for="session-evidence">Explicit semantic evidence (optional)</label><textarea id="session-evidence" placeholder="cell-001 | capacity | low | 0.95&#10;cell-002 | capacity | high | 0.80"></textarea><div class="sessionHint">subject | predicate | value | confidence. These are explicit assertions only. Generic Logical Space bindings above are never silently converted into semantic evidence.</div></div>
    </div>
    <div class="sessionActions">
      <button type="button" class="primary" id="session-run" onclick="runSessionCore()">RUN QCDS CORE</button>
      <button type="button" onclick="saveSessionNow()">KEEP IN THIS SESSION</button>
      <button type="button" onclick="resetLogicalSession()">RESET SESSION</button>
    </div>
    <div class="sessionStatus" id="sessionStatus">Fill the Logical Space builder above, add a core probe here, then run it.</div>
    <pre class="sessionResult" id="sessionResult" hidden></pre>
    <div class="sessionPrivacy">Session storage only · no account · no database · no cookie · no persistent browser or server state. Closing this browser tab ends the sandbox session. WebAssembly is an execution substrate only; QCDS inference logic remains in the qcds_fabric core package.</div>
  </div>
</section>
'''

_SCRIPT = r'''
<script>
const BUILD35_STATIC_MODE=__STATIC_MODE__;
const BUILD35_SESSION_KEY='syntract.logical-space.session.v1';
let BUILD35_WORKER=null,BUILD35_REQUEST=0;const BUILD35_PENDING=new Map();
const BUILD35_FIELD_IDS=['builder-id','builder-title','builder-audience','builder-mode','builder-authority','builder-tagline','builder-description','builder-challenge','builder-learning','builder-prompt','builder-observations','session-subject','session-predicate','session-candidates','session-evidence'];
function sValue(id){const el=document.getElementById(id);return el?String(el.value||'').trim():''}
function sessionStatus(text,kind=''){const el=document.getElementById('sessionStatus');if(el){el.className='sessionStatus '+kind;el.textContent=text}}
function sessionEvidence(){const text=sValue('session-evidence');if(!text)return[];return text.split(/\r?\n/).map(v=>v.trim()).filter(Boolean).map((line,index)=>{const parts=line.split('|').map(v=>v.trim());if(parts.length<3||!parts[0]||!parts[1]||!parts[2])throw new Error('Evidence line '+(index+1)+' needs subject | predicate | value | confidence.');const confidence=parts[3]?Number(parts[3]):1;if(!Number.isFinite(confidence)||confidence<0.5||confidence>1)throw new Error('Evidence line '+(index+1)+' confidence must be 0.5–1.0.');return {subject:parts[0],predicate:parts[1],value:parts[2],confidence:confidence,polarity:true,source_id:'session:explicit:'+String(index+1).padStart(3,'0')};});}
function sessionRequest(){const space=buildCustomPack();const subject=sValue('session-subject'),predicate=sValue('session-predicate'),candidateValues=sValue('session-candidates').split('|').map(v=>v.trim()).filter(Boolean);if(!subject)throw new Error('Core probe subject is required.');if(!predicate)throw new Error('Core probe predicate is required.');if(candidateValues.length<2)throw new Error('Add at least two explicit candidate values.');return {space:space,probe:{subject:subject,predicate:predicate,candidate_values:candidateValues},evidence:sessionEvidence(),max_width:20};}
function saveSessionNow(){try{const fields={};BUILD35_FIELD_IDS.forEach(id=>{const el=document.getElementById(id);if(el)fields[id]=el.value});sessionStorage.setItem(BUILD35_SESSION_KEY,JSON.stringify({fields:fields,saved_at:new Date().toISOString()}));sessionStatus('Kept in this tab session. Nothing was written to a database.','good')}catch(e){sessionStatus('Session storage unavailable: '+e.message,'warn')}}
function restoreLogicalSession(){try{const raw=sessionStorage.getItem(BUILD35_SESSION_KEY);if(!raw)return;const value=JSON.parse(raw),fields=value&&value.fields?value.fields:{};Object.keys(fields).forEach(id=>{const el=document.getElementById(id);if(el)el.value=fields[id]});sessionStatus('Restored this tab\'s temporary Logical Space session.','good')}catch(e){sessionStatus('Could not restore session: '+e.message,'warn')}}
function resetLogicalSession(){try{sessionStorage.removeItem(BUILD35_SESSION_KEY)}catch(e){}BUILD35_FIELD_IDS.forEach(id=>{const el=document.getElementById(id);if(el){if(el.tagName==='SELECT')el.selectedIndex=0;else el.value=''}});const pre=document.getElementById('sessionResult');if(pre){pre.hidden=true;pre.textContent=''}sessionStatus('Session cleared. No persistent copy exists.','good')}
function build35Worker(){if(BUILD35_WORKER)return BUILD35_WORKER;const workerUrl=new URL('./session_core_worker.js',window.location.href);BUILD35_WORKER=new Worker(workerUrl);BUILD35_WORKER.onmessage=event=>{const msg=event.data||{};if(msg.type==='ready'){sessionStatus('QCDS core loaded in WebAssembly for this session.','good');return}const pending=BUILD35_PENDING.get(msg.id);if(!pending)return;BUILD35_PENDING.delete(msg.id);if(msg.error)pending.reject(new Error(msg.error));else pending.resolve(msg.result)};BUILD35_WORKER.onerror=event=>sessionStatus('WebAssembly core worker failed: '+(event.message||'unknown error'),'warn');BUILD35_WORKER.postMessage({type:'init',packageUrl:new URL('./qcds_fabric.zip',window.location.href).href});return BUILD35_WORKER}
function runWasmCore(payload){return new Promise((resolve,reject)=>{const worker=build35Worker(),id=++BUILD35_REQUEST;BUILD35_PENDING.set(id,{resolve:resolve,reject:reject});worker.postMessage({type:'run',id:id,payload:payload})})}
function renderSessionResult(result){const pre=document.getElementById('sessionResult');if(!pre)return;pre.hidden=false;const leading=(result.leading_candidates||[]).join(', ')||'unresolved';const lines=['QCDS CORE RESULT','',result.probe.subject+' · '+result.probe.predicate,'leading: '+leading,'logical width: '+result.logical_width+' · candidate space: '+result.candidate_binary_space,'entropy: '+Number(result.entropy||0).toFixed(6),'explicit evidence: '+result.explicit_evidence_count,'generic bindings used as semantic evidence: '+result.generic_bindings_promoted_to_semantic_evidence,'Reality effect: '+result.truth_effect_on_reality,'','STABILIZED DISTRIBUTION'];(result.stabilized||[]).forEach(row=>lines.push('  '+row.value.padEnd(22,' ')+' '+(row.probability*100).toFixed(3)+'%'));if((result.conflict_markers||[]).length){lines.push('','CONFLICT MARKERS',...result.conflict_markers.map(v=>'  '+v))}lines.push('','provenance: '+result.core_execution,'session only: '+result.session_only+' · persistent state: '+result.persistent_state);pre.textContent=lines.join('\n')}
async function runSessionCore(){let payload;try{payload=sessionRequest();saveSessionNow()}catch(e){sessionStatus(e.message,'warn');return}const button=document.getElementById('session-run');if(button)button.disabled=true;sessionStatus(BUILD35_STATIC_MODE?'Loading the unchanged QCDS core into WebAssembly…':'Sending this session probe through the Logical Robot to the local QCDS core…');try{const result=BUILD35_STATIC_MODE?await runWasmCore(payload):await postJson('/api/session/run',payload);renderSessionResult(result);sessionStatus('Core run complete · '+((result.leading_candidates||[]).join(', ')||'unresolved')+' · Reality effect 0.','good')}catch(e){sessionStatus(e.message,'warn')}finally{if(button)button.disabled=false}}
window.addEventListener('DOMContentLoaded',()=>{const badge=document.getElementById('sessionModeBadge');if(badge)badge.textContent=BUILD35_STATIC_MODE?'SESSION · WASM CORE':'SESSION · PYTHON CORE';restoreLogicalSession();BUILD35_FIELD_IDS.forEach(id=>{const el=document.getElementById(id);if(el){el.addEventListener('change',saveSessionNow);el.addEventListener('input',()=>{try{const fields={};BUILD35_FIELD_IDS.forEach(fid=>{const f=document.getElementById(fid);if(f)fields[fid]=f.value});sessionStorage.setItem(BUILD35_SESSION_KEY,JSON.stringify({fields:fields}))}catch(e){}})}})});
</script>
'''


def living_robot_session_html(*, static_mode: bool = False) -> str:
    html = living_robot_builder_html(static_mode=static_mode)
    if "</style>" not in html or '<section class="understandBuild"' not in html or "</body>" not in html:
        raise RuntimeError("Living Logical Robot markup changed; BUILD 35 session sandbox cannot attach safely")
    # BUILD 35 is session-only end-to-end. Older UI code remembered an optional
    # remote-runtime URL in localStorage; on this manifestation even that value
    # is intentionally scoped to the current tab session.
    html = html.replace("localStorage", "sessionStorage")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace('<section class="understandBuild"', _SECTION + '\n<section class="understandBuild"', 1)
    html = html.replace("</body>", _SCRIPT.replace("__STATIC_MODE__", "true" if static_mode else "false") + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_session_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export BUILD 35: ephemeral Logical Space session sandbox.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
