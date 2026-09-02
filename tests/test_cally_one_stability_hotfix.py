from __future__ import annotations

import json
import subprocess
from pathlib import Path

from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html


ROOT = Path(__file__).resolve().parents[1]
WORKER = ROOT / "web" / "session_core_worker.js"


def test_static_ui_has_no_mutation_observer_reentry_loop() -> None:
    html = cally_one_html(static_mode=True)
    assert "new MutationObserver" not in html
    assert "__callyExplicitWrapped" in html
    assert "queueMicrotask(refreshUI)" in html
    assert "window.dispatchEvent(new CustomEvent('cally-one-ui-refresh'))" in html


def test_open_close_navigation_and_inline_edit_contract_do_not_request_inference() -> None:
    html = cally_one_html(static_mode=True)
    assert "path === '/api/state' && !window.__callyWorkerStarted" in html
    assert "prepareEventEditor" in html
    assert "openPersonEditor" in html
    assert "callyEventClose" in html
    assert "callyTitleAutosave" in html
    assert "handleNav" in html
    assert "fetch('/api/infer'" not in html.split("function prepareEventEditor", 1)[1].split("function wrapOpenEvent", 1)[0]


def test_worker_repeated_non_inference_actions_never_start_pyodide() -> None:
    worker_path = json.dumps(str(WORKER))
    script = f"""
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync({worker_path}, 'utf8');
const posted = [];
let pyodideStarts = 0;
const self = {{
  postMessage: value => posted.push(value),
  crypto: {{ randomUUID: () => 'stable-id' }}
}};
const context = {{
  self,
  console,
  Response,
  Uint8Array,
  Date,
  Math,
  JSON,
  importScripts: () => {{ pyodideStarts += 1; throw new Error('Pyodide must stay cold'); }},
  loadPyodide: async () => {{ throw new Error('Pyodide must stay cold'); }},
  fetch: async () => {{ throw new Error('network/core fetch must stay cold'); }}
}};
vm.createContext(context);
vm.runInContext(source, context, {{filename:'session_core_worker.js'}});
async function send(type, id, payload) {{
  await self.onmessage({{data:{{type,id,payload,packageUrl:'qcds_fabric.zip'}}}});
}}
(async () => {{
  await send('init', 0, null);
  await send('cally_one_run', 1, {{action:'hydrate', state:{{people:[],events:[],entities:[],relations:[]}}}});
  for (let i = 0; i < 12; i++) {{
    await send('cally_one_run', 10 + i * 5, {{action:'state'}});
    await send('cally_one_run', 11 + i * 5, {{action:'person', payload:{{person_id:'p1',name:'Anna'}}}});
    await send('cally_one_run', 12 + i * 5, {{action:'event', payload:{{event_id:'e1',title:'Träning',start:'2026-09-03T18:00',end:'2026-09-03T19:00',people:['p1']}}}});
    await send('cally_one_run', 13 + i * 5, {{action:'move', payload:{{event_id:'e1',start:'2026-09-03T18:15',end:'2026-09-03T19:15'}}}});
    await send('cally_one_run', 14 + i * 5, {{action:'state'}});
  }}
  if (pyodideStarts !== 0) throw new Error('ordinary Cally.One actions started Pyodide');
  if (self.__qcds_core_started !== false) throw new Error('QCDS core marked started during ordinary UI work');
  const errors = posted.filter(item => item && item.error);
  if (errors.length) throw new Error(JSON.stringify(errors));
}})().catch(error => {{ console.error(error); process.exit(1); }});
"""
    subprocess.run(["node", "-e", script], check=True, cwd=ROOT)


def test_only_cally_infer_crosses_qcds_boundary() -> None:
    worker = WORKER.read_text(encoding="utf-8")
    assert "const output = action === 'infer' ? await inferCally" in worker
    assert "async function inferCally(payload)" in worker
    assert "await initializeCore()" in worker
    assert "run_cally_one_json(__payload_json)" in worker
    assert "importScripts('https://cdn.jsdelivr.net/pyodide" in worker
    init_block = worker.split("if (msg.type === 'init')", 1)[1].split("if (msg.type !==", 1)[0]
    assert "initializeCore" not in init_block
