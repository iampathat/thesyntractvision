from __future__ import annotations

# Cally.One Tribute License 1.0 — see LICENSE_CALENDAR_TRIBUTE.md

from .calendar_robot_ui import calendar_robot_html


_STATIC_BRIDGE = r'''<script>
/* Cally.One GitHub Pages bridge. Transport/state shell only; QCDS inference stays in packaged Python via Pyodide. */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const worker = new Worker('../session_core_worker.js');
  const packageUrl = new URL('../qcds_fabric.zip', window.location.href).href;
  const pending = new Map();
  let nextId = 1;
  let readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  let hydratePromise = null;

  worker.onmessage = (event) => {
    const msg = event.data || {};
    if (msg.type === 'ready') {
      readyResolve();
      return;
    }
    if (!msg.id || !pending.has(msg.id)) return;
    const item = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) item.reject(new Error(msg.error));
    else item.resolve(msg.result);
  };
  worker.onerror = (event) => readyReject(new Error(event.message || 'Cally.One QCDS worker failed'));
  worker.postMessage({type: 'init', packageUrl});

  async function callCore(payload) {
    await ready;
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, {resolve, reject});
      worker.postMessage({type: 'cally_one_run', id, payload});
    });
  }

  function loadSavedState() {
    try {
      const raw = localStorage.getItem('cally.one.state.v1');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem('cally.one.state.v1', JSON.stringify(state));
    } catch (_) {
      // Storage is optional. The active Pyodide session still remains usable.
    }
  }

  async function ensureHydrated() {
    if (!hydratePromise) {
      hydratePromise = (async () => {
        const stored = loadSavedState();
        if (stored) await callCore({action: 'hydrate', state: stored});
      })();
    }
    await hydratePromise;
  }

  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: {'Content-Type': 'application/json; charset=utf-8'}
    });
  }

  async function apiResponse(path, options) {
    await ensureHydrated();
    let payload = {};
    if (options && options.body) payload = JSON.parse(String(options.body));
    let action = 'state';
    if (path === '/api/person') action = 'person';
    else if (path === '/api/event') action = 'event';
    else if (path === '/api/event/move') action = 'move';
    else if (path === '/api/event/delete') action = 'delete';
    else if (path === '/api/infer') action = 'infer';
    else if (path !== '/api/state') return jsonResponse({error: 'not found'}, 404);

    try {
      const output = await callCore({action, payload});
      if (output && output.state) saveState(output.state);
      if (action === 'state') return jsonResponse(output.state || {});
      return jsonResponse(output.result || {}, action === 'person' || action === 'event' ? 201 : 202);
    } catch (error) {
      return jsonResponse({error: String(error && error.message ? error.message : error)}, 400);
    }
  }

  window.fetch = (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
    if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
      return apiResponse(url.pathname, options);
    }
    return nativeFetch(input, options);
  };
})();
</script>'''


def cally_one_html(*, static_mode: bool = False) -> str:
    """Public Cally.One manifestation over the shared Calendar Space UI."""
    html = (
        calendar_robot_html()
        .replace("Family Calendar · Logical Robot", "Cally.One · Logical Robot")
        .replace(">Family Calendar<", ">Cally.One<")
        .replace("Calendar Tribute License 1.0", "Cally.One Tribute License 1.0")
        .replace("Family Calendar", "Cally.One")
    )
    if static_mode:
        marker = "<script>\nconst state="
        if marker not in html:
            raise RuntimeError("Cally.One UI script marker not found")
        html = html.replace(marker, _STATIC_BRIDGE + "\n" + marker, 1)
    return html


__all__ = ["cally_one_html"]
