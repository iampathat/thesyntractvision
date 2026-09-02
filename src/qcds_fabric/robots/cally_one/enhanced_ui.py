"""Enhanced Cally.One product surface.

Cally.One Tribute License 1.0 — see LICENSE.md in this package.
This wrapper only augments the product manifestation. QCDS inference remains in
SyntractSystem and the shared QCDS core.
"""

from __future__ import annotations

from pathlib import Path

from .ui import cally_one_html as _base_cally_one_html


def _asset(name: str) -> str:
    return Path(__file__).with_name(name).read_text(encoding="utf-8")


def _stable_interaction_js() -> str:
    """Return product JS with mutation-sensitive UI updates made idempotent."""

    event_js = _asset("enhancements.js").replace(
        "infer.textContent = 'QCDS Resolve';",
        "infer.dataset.callyCustomerLabel = '1';",
    )
    management_js = _asset("state_management.js").replace(
        "button.textContent = 'Resolve with QCDS';",
        "button.dataset.callyCustomerLabel = '1';",
    )
    result_js = _asset("qcds_result_ui.js")
    scale_js = _asset("scale_conflict_ui.js")
    return event_js + "\n" + management_js + "\n" + result_js + "\n" + scale_js


def _make_static_start_nonblocking(html: str) -> str:
    """Render Calendar Space immediately while Pyodide/QCDS starts in parallel."""

    html = html.replace(
        "let hydratePromise = null;",
        """let hydratePromise = null;
  let coreStateReady = false;
  window.__callyCoreStateReady = false;

  function normalizedBrowserState(value) {
    const state = value && typeof value === 'object' ? {...value} : {};
    if (!Array.isArray(state.people)) state.people = [];
    if (!Array.isArray(state.events)) state.events = [];
    if (!Array.isArray(state.conflicts)) state.conflicts = [];
    if (!Array.isArray(state.entities)) state.entities = [];
    if (!Array.isArray(state.relations)) state.relations = [];
    if (!Array.isArray(state.dimension_states)) state.dimension_states = [];
    if (!Array.isArray(state.state_conflicts)) state.state_conflicts = [];
    if (!Array.isArray(state.planning_states)) state.planning_states = [];
    if (!state.dimensions || typeof state.dimensions !== 'object' || Array.isArray(state.dimensions)) state.dimensions = {};
    if (!state.provenance || typeof state.provenance !== 'object') state.provenance = {};
    state.product = state.product || 'Cally.One';
    state.space_id = state.space_id || 'cally-one';
    state.browser_bootstrap = !coreStateReady;
    return state;
  }""",
        1,
    )

    old_hydrate = "if (!hydratePromise) hydratePromise = (async () => { const stored = loadSavedState(); if (stored) await callCore({action:'hydrate', state:stored}); })();"
    new_hydrate = """if (!hydratePromise) hydratePromise = (async () => {
      const stored = loadSavedState();
      if (!stored) return;
      try {
        await callCore({action:'hydrate', state:stored});
      } catch (error) {
        try {
          localStorage.setItem('cally.one.state.recovery.v1', JSON.stringify(stored));
          localStorage.removeItem('cally.one.state.v1');
        } catch (_) { /* recovery storage is best-effort */ }
        console.warn('Cally.One recovered from incompatible saved browser state', error);
      }
    })();"""
    if old_hydrate not in html:
        raise RuntimeError("Cally.One hydration marker not found")
    html = html.replace(old_hydrate, new_hydrate, 1)

    old_api = """  async function apiResponse(path, options) {
    await ensureHydrated();
    let payload = {};"""
    new_api = """  async function apiResponse(path, options) {
    if (path === '/api/state' && !coreStateReady) {
      return jsonResponse(normalizedBrowserState(loadSavedState()));
    }
    await ensureHydrated();
    let payload = {};"""
    if old_api not in html:
        raise RuntimeError("Cally.One API startup marker not found")
    html = html.replace(old_api, new_api, 1)

    old_tail = """  window.fetch = (input, options={}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
    if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) return apiResponse(url.pathname, options);
    return nativeFetch(input, options);
  };
})();"""
    new_tail = """  window.fetch = (input, options={}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
    if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) return apiResponse(url.pathname, options);
    return nativeFetch(input, options);
  };

  async function synchronizeCoreInBackground() {
    try {
      await ensureHydrated();
      const output = await callCore({action:'state', payload:{}});
      if (output && output.state) saveState(output.state);
      coreStateReady = true;
      window.__callyCoreStateReady = true;
      window.dispatchEvent(new CustomEvent('cally-one-core-state-ready'));
    } catch (error) {
      console.warn('Cally.One core is still unavailable; browser Calendar Space remains usable', error);
      window.dispatchEvent(new CustomEvent('cally-one-core-state-error', {detail:String(error && error.message ? error.message : error)}));
    }
  }
  synchronizeCoreInBackground();
})();"""
    if old_tail not in html:
        raise RuntimeError("Cally.One static bridge tail marker not found")
    return html.replace(old_tail, new_tail, 1)


def _static_refresh_js() -> str:
    return r"""
(() => {
  let refreshPending = false;
  async function refreshFromCore() {
    if (refreshPending || typeof window.load !== 'function') return;
    refreshPending = true;
    try { await window.load(); }
    catch (error) { console.warn('Cally.One core refresh failed', error); }
    finally { refreshPending = false; }
  }
  window.addEventListener('cally-one-core-state-ready', refreshFromCore);
  if (window.__callyCoreStateReady) queueMicrotask(refreshFromCore);
})();
"""


def cally_one_html(*, static_mode: bool = False) -> str:
    html = _base_cally_one_html(static_mode=static_mode)
    if static_mode:
        html = _make_static_start_nonblocking(html)
        old = "else if (path === '/api/infer') action = 'infer';\n    else if (path === '/api/entity') action = 'entity';\n    else if (path === '/api/relation') action = 'relation';\n    else if (path !== '/api/state')"
        new = "else if (path === '/api/infer') action = 'infer';\n    else if (path === '/api/entity') action = 'entity';\n    else if (path === '/api/relation') action = 'relation';\n    else if (path === '/api/dimension') action = 'dimension';\n    else if (path === '/api/dimension/retire') action = 'dimension_retire';\n    else if (path === '/api/person/archive') action = 'person_archive';\n    else if (path !== '/api/state')"
        if old not in html:
            old = "else if (path === '/api/infer') action = 'infer';\n    else if (path !== '/api/state')"
            new = "else if (path === '/api/infer') action = 'infer';\n    else if (path === '/api/entity') action = 'entity';\n    else if (path === '/api/relation') action = 'relation';\n    else if (path === '/api/dimension') action = 'dimension';\n    else if (path === '/api/dimension/retire') action = 'dimension_retire';\n    else if (path === '/api/person/archive') action = 'person_archive';\n    else if (path !== '/api/state')"
        if old not in html:
            raise RuntimeError("Cally.One static API bridge marker not found")
        html = html.replace(old, new, 1)

    css = (
        _asset("enhancements.css")
        + "\n"
        + _asset("state_management.css")
        + "\n"
        + _asset("qcds_result_ui.css")
        + "\n"
        + _asset("scale_conflict_ui.css")
    )
    js = _stable_interaction_js()
    if static_mode:
        js += "\n" + _static_refresh_js()
    html = html.replace("</head>", f"<style data-cally-enhancements>\n{css}\n</style>\n</head>", 1)
    html = html.replace("</body>", f"<script data-cally-enhancements>\n{js}\n</script>\n</body>", 1)
    return html


__all__ = ["cally_one_html"]
