/* Transport only. QCDS, Syntract composition, Pick a World, Robotics Playground, Cally.One and legal inference remain in the packaged Python core. */
let coreReady = null;

async function initializeCore(packageUrl) {
  if (coreReady) return coreReady;
  coreReady = (async () => {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
    const pyodide = await loadPyodide();
    const response = await fetch(packageUrl, {cache: 'no-store'});
    if (!response.ok) throw new Error('Could not load qcds_fabric core package: HTTP ' + response.status);
    const archive = new Uint8Array(await response.arrayBuffer());
    pyodide.unpackArchive(archive, 'zip');
    pyodide.runPython("import sys\nif '/' not in sys.path: sys.path.insert(0, '/')\nfrom qcds_fabric.session_sandbox_core import run_session_json\nfrom qcds_fabric.pick_a_world_core import run_pick_world_case_json\nfrom qcds_fabric.robotics_playground_system import run_robotics_playground_json\nfrom qcds_fabric.robots.cally_one.runtime_v3 import run_cally_one_json\nfrom qcds_fabric.robots.legal.sweden_housing.robot import run_case_json as run_swedish_housing_case_json\nfrom qcds_fabric.robots.legal.sweden_housing.quick_question import run_public_question_json as run_swedish_housing_question_json\nfrom qcds_fabric.syntract_parallel_demos import run_syntract_demo_json");
    self.__qcds_pyodide = pyodide;
    self.postMessage({type: 'ready'});
    return pyodide;
  })();
  return coreReady;
}

self.onmessage = async (event) => {
  const msg = event.data || {};
  try {
    if (msg.type === 'init') {
      await initializeCore(msg.packageUrl);
      return;
    }
    if (msg.type !== 'run' && msg.type !== 'pick_world_run' && msg.type !== 'robotics_playground_run' && msg.type !== 'cally_one_run' && msg.type !== 'legal_run' && msg.type !== 'legal_question_run' && msg.type !== 'syntract_demo_run') return;
    const pyodide = await coreReady;
    if (!pyodide) throw new Error('QCDS core has not been initialized.');
    pyodide.globals.set('__payload_json', JSON.stringify(msg.payload || {}));
    let expression;
    if (msg.type === 'pick_world_run') expression = "run_pick_world_case_json(__payload_json)";
    else if (msg.type === 'robotics_playground_run') expression = "run_robotics_playground_json(__payload_json)";
    else if (msg.type === 'cally_one_run') expression = "run_cally_one_json(__payload_json)";
    else if (msg.type === 'legal_run') expression = "run_swedish_housing_case_json(__payload_json)";
    else if (msg.type === 'legal_question_run') expression = "run_swedish_housing_question_json(__payload_json)";
    else if (msg.type === 'syntract_demo_run') expression = "run_syntract_demo_json(__payload_json)";
    else expression = "run_session_json(__payload_json)";
    const output = pyodide.runPython(expression);
    pyodide.globals.delete('__payload_json');
    self.postMessage({id: msg.id, result: JSON.parse(String(output))});
  } catch (error) {
    self.postMessage({id: msg.id, error: String(error && error.message ? error.message : error)});
  }
};