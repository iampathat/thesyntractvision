/* BUILD 35 transport only. QCDS inference remains in the packaged Python core. */
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
    pyodide.runPython("import sys\nif '/' not in sys.path: sys.path.insert(0, '/')\nfrom qcds_fabric.session_sandbox_core import run_session_json");
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
    if (msg.type !== 'run') return;
    const pyodide = await coreReady;
    if (!pyodide) throw new Error('QCDS core has not been initialized.');
    pyodide.globals.set('__session_payload_json', JSON.stringify(msg.payload || {}));
    const output = pyodide.runPython("run_session_json(__session_payload_json)");
    pyodide.globals.delete('__session_payload_json');
    self.postMessage({id: msg.id, result: JSON.parse(String(output))});
  } catch (error) {
    self.postMessage({id: msg.id, error: String(error && error.message ? error.message : error)});
  }
};
