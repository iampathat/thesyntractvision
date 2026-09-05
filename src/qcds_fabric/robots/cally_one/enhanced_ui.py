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


def _replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise RuntimeError(f"Cally.One {label} marker not found")
    return source.replace(old, new, 1)


def _make_today_view_aware(html: str) -> str:
    old_label = "$('#todayBtn').textContent=state.view==='year'?'Month':state.view==='month'?'Today':'Today';"
    html = _replace_once(html, old_label, "$('#todayBtn').textContent='Today';", "Today label")
    old_jump = "function jumpToday(){const n=startOfDay(new Date());state.anchor=n;state.activeSavedView=null;if(state.view==='year')state.view='month';else if(state.view==='month')state.view='day';render()}"
    return _replace_once(html, old_jump, "function jumpToday(){state.anchor=startOfDay(new Date());state.activeSavedView=null;render()}", "Today navigation")


def _stable_interaction_js() -> str:
    event_js = _asset("enhancements.js")
    event_js = event_js.replace("infer.textContent = 'QCDS Resolve';", "infer.dataset.callyCustomerLabel = '1'; infer.textContent = 'Kolla tider';")
    event_js = event_js.replace('<div class="stateCard"><div class="stateKind">', '<div class="stateCard" data-state-entity="${esc(entity.entity_id)}"><div class="stateKind">')
    old_boot = """    const observer = new MutationObserver(() => {
      decorate(stage);
      setupStateUX();
      refreshState();
    });
    observer.observe(stage, {childList:true, subtree:true});
    refreshState().then(() => { decorate(stage); setupStateUX(); });
    setupStateUX();"""
    new_boot = """    const refreshUI = () => {
      decorate(stage);
      setupStateUX();
      window.dispatchEvent(new CustomEvent('cally-one-ui-refresh'));
    };
    if (typeof window.render === 'function' && !window.render.__callyExplicitWrapped) {
      const originalRender = window.render;
      const wrappedRender = function(...args) {
        const output = originalRender.apply(this, args);
        queueMicrotask(refreshUI);
        return output;
      };
      wrappedRender.__callyExplicitWrapped = true;
      window.render = wrappedRender;
    }
    refreshState().then(refreshUI);
    setupStateUX();"""
    if old_boot not in event_js:
        raise RuntimeError("Cally.One observer boot marker not found")
    event_js = event_js.replace(old_boot, new_boot, 1)

    management_js = _asset("state_management.js").replace("button.textContent = 'Resolve with QCDS';", "button.dataset.callyCustomerLabel = '1';")
    management_js = _replace_once(
        management_js,
        """    const observer = new MutationObserver(() => {
      injectDirectoryManagers();
      enhanceResolveExplanation();
      installDimensionSemantics();
    });
    observer.observe(document.body, {childList:true, subtree:true});""",
        """    window.addEventListener('cally-one-ui-refresh', () => {
      injectDirectoryManagers();
      enhanceResolveExplanation();
      installDimensionSemantics();
    });""",
        "management observer boot",
    )

    result_js = _asset("qcds_result_ui.js")

    scale_js = _asset("scale_conflict_ui.js")
    scale_js = _replace_once(
        scale_js,
        """    const observer = new MutationObserver(() => { enhanceLargeSelectors(); paintStates(); });
    observer.observe(document.body, {childList:true, subtree:true});""",
        """    window.addEventListener('cally-one-ui-refresh', () => { enhanceLargeSelectors(); paintStates(); });""",
        "scale observer boot",
    )

    manual_js = _asset("manual_resolution_ui.js")
    manual_js = _replace_once(
        manual_js,
        """    const observer = new MutationObserver(enhancePlanningCards);
    observer.observe(document.body, {childList:true, subtree:true});""",
        """    window.addEventListener('cally-one-ui-refresh', enhancePlanningCards);""",
        "manual-resolution observer boot",
    )

    dimension_filter_js = _asset("dimension_filter_ui.js")
    dimension_filter_js = _replace_once(
        dimension_filter_js,
        """    const observer = new MutationObserver(enhance);
    observer.observe(document.body, {childList:true, subtree:true});""",
        """    window.addEventListener('cally-one-ui-refresh', enhance);""",
        "dimension-filter observer boot",
    )

    return "\n".join(
        [
            event_js,
            management_js,
            result_js,
            scale_js,
            manual_js,
            dimension_filter_js,
            _asset("interaction_controller.js"),
            _asset("calendar_layout_hotfix.js"),
            _asset("person_module_polish.js"),
            _asset("calendar_display.js"),
            _asset("demo_space.js"),
            _asset("brand_home_polish.js"),
            _asset("overlap_workbench.js"),
            _asset("locale_access_ui.js"),
            _asset("qcds_state_control_center.js"),
        ]
    )


def _make_static_start_lazy(html: str) -> str:
    html = html.replace("const worker = new Worker('../session_core_worker.js');", "let worker = null;", 1)
    html = html.replace(
        "let readyResolve, readyReject;\n  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });",
        "let ready = null, readyResolve = null, readyReject = null;",
        1,
    )
    html = html.replace("localStorage.getItem('cally.one.state.v1')", "localStorage.getItem(window.__callySpaceStorageKey())", 1)
    html = html.replace("localStorage.setItem('cally.one.state.v1', JSON.stringify(state))", "localStorage.setItem(window.__callySpaceStorageKey(), JSON.stringify(state))", 1)

    old_worker = """  worker.onmessage = (event) => {
    const msg = event.data || {};
    if (msg.type === 'ready') { readyResolve(); return; }
    if (!msg.id || !pending.has(msg.id)) return;
    const item = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) item.reject(new Error(msg.error));
    else item.resolve(msg.result);
  };
  worker.onerror = (event) => readyReject(new Error(event.message || 'Cally.One QCDS worker failed'));
  worker.postMessage({type: 'init', packageUrl});"""
    new_worker = """  function ensureWorkerStarted() {
    if (worker) return;
    window.__callyWorkerStarted = true;
    worker = new Worker('../session_core_worker.js');
    ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
    worker.onmessage = (event) => {
      const msg = event.data || {};
      if (msg.type === 'ready') { readyResolve(); return; }
      if (!msg.id || !pending.has(msg.id)) return;
      const item = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) item.reject(new Error(msg.error));
      else item.resolve(msg.result);
    };
    worker.onerror = (event) => readyReject(new Error(event.message || 'Cally.One QCDS worker failed'));
    worker.postMessage({type: 'init', packageUrl});
  }"""
    if old_worker not in html:
        raise RuntimeError("Cally.One static worker marker not found")
    html = html.replace(old_worker, new_worker, 1)
    html = html.replace("  async function callCore(payload) {\n    await ready;", "  async function callCore(payload) {\n    ensureWorkerStarted();\n    await ready;", 1)
    html = html.replace(
        "let hydratePromise = null;",
        """let hydratePromise = null;
  const ACTIVE_SPACE_KEY = 'cally.one.active-space.v1';
  const DEMO_SPACE_ID = 'demo-family-company';
  const LIVE_STATE_KEY = 'cally.one.state.v1';
  const DEMO_STATE_KEY = 'cally.one.state.demo.family-company.v1';
  window.__callyActiveSpace = () => localStorage.getItem(ACTIVE_SPACE_KEY) === DEMO_SPACE_ID ? DEMO_SPACE_ID : 'personal';
  window.__callySpaceStorageKey = () => window.__callyActiveSpace() === DEMO_SPACE_ID ? DEMO_STATE_KEY : LIVE_STATE_KEY;
  window.__callySpaceRecoveryKey = () => window.__callyActiveSpace() === DEMO_SPACE_ID ? 'cally.one.state.recovery.demo.family-company.v1' : 'cally.one.state.recovery.v1';
  window.__callyIsDemoSpace = () => window.__callyActiveSpace() === DEMO_SPACE_ID;
  let coreStateReady = false;
  window.__callyCoreStateReady = false;
  window.__callyWorkerStarted = false;

  function normalizedBrowserState(value) {
    const state = value && typeof value === 'object' ? {...value} : {};
    for (const key of ['people','events','conflicts','entities','relations','dimension_states','state_conflicts','planning_states']) {
      if (!Array.isArray(state[key])) state[key] = [];
    }
    if (!state.dimensions || typeof state.dimensions !== 'object' || Array.isArray(state.dimensions)) state.dimensions = {};
    if (!state.provenance || typeof state.provenance !== 'object') state.provenance = {};
    state.product = state.product || 'Cally.One';
    state.space_id = state.space_id || (window.__callyIsDemoSpace() ? DEMO_SPACE_ID : 'cally-one');
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
        coreStateReady = true;
        window.__callyCoreStateReady = true;
      } catch (error) {
        try { localStorage.setItem(window.__callySpaceRecoveryKey(), JSON.stringify(stored)); } catch (_) {}
        throw error;
      }
    })();"""
    if old_hydrate not in html:
        raise RuntimeError("Cally.One hydration marker not found")
    html = html.replace(old_hydrate, new_hydrate, 1)

    old_api = """  async function apiResponse(path, options) {
    await ensureHydrated();
    let payload = {};"""
    new_api = """  async function apiResponse(path, options) {
    if (path === '/api/state' && !window.__callyWorkerStarted) {
      return jsonResponse(normalizedBrowserState(loadSavedState()));
    }
    await ensureHydrated();
    let payload = {};"""
    if old_api not in html:
        raise RuntimeError("Cally.One API startup marker not found")
    html = html.replace(old_api, new_api, 1)
    return html


def cally_one_html(*, static_mode: bool = False) -> str:
    html = _base_cally_one_html(static_mode=static_mode)
    html = _make_today_view_aware(html)
    if static_mode:
        html = _replace_once(
            html,
            "const SAVED_VIEW_KEY='cally.one.saved.perspectives.v1';",
            "const SAVED_VIEW_KEY=localStorage.getItem('cally.one.active-space.v1')==='demo-family-company'?'cally.one.saved.perspectives.demo.family-company.v1':'cally.one.saved.perspectives.v1';",
            "space-aware saved perspectives",
        )
        html = _make_static_start_lazy(html)
        old = "else if (path === '/api/infer') action = 'infer';\n    else if (path === '/api/entity') action = 'entity';\n    else if (path === '/api/relation') action = 'relation';\n    else if (path !== '/api/state')"
        new = "else if (path === '/api/infer') action = 'infer';\n    else if (path === '/api/entity') action = 'entity';\n    else if (path === '/api/relation') action = 'relation';\n    else if (path === '/api/dimension') action = 'dimension';\n    else if (path === '/api/dimension/retire') action = 'dimension_retire';\n    else if (path === '/api/person/archive') action = 'person_archive';\n    else if (path !== '/api/state')"
        if old not in html:
            old = "else if (path === '/api/infer') action = 'infer';\n    else if (path !== '/api/state')"
            new = "else if (path === '/api/infer') action = 'infer';\n    else if (path === '/api/entity') action = 'entity';\n    else if (path === '/api/relation') action = 'relation';\n    else if (path === '/api/dimension') action = 'dimension';\n    else if (path === '/api/dimension/retire') action = 'dimension_retire';\n    else if (path === '/api/person/archive') action = 'person_archive';\n    else if (path !== '/api/state')"
        if old not in html:
            raise RuntimeError("Cally.One static API bridge marker not found")
        html = html.replace(old, new, 1)

    css = "\n".join(
        [
            _asset("enhancements.css"),
            _asset("state_management.css"),
            _asset("qcds_result_ui.css"),
            _asset("scale_conflict_ui.css"),
            _asset("interaction_controller.css"),
            _asset("calendar_layout_hotfix.css"),
            _asset("calendar_display.css"),
            _asset("scandinavian_polish.css"),
            _asset("top_event_control_polish.css"),
            _asset("editor_strict_v2.css"),
            _asset("person_module_polish.css"),
            _asset("demo_space.css"),
            _asset("brand_home_polish.css"),
            _asset("overlap_workbench.css"),
            _asset("overlap_workbench_finish.css"),
            _asset("locale_access_ui.css"),
            _asset("qcds_state_control_center.css"),
        ]
    )
    js = _stable_interaction_js()
    html = html.replace("</head>", f"<style data-cally-enhancements>\n{css}\n</style>\n</head>", 1)
    html = html.replace("</body>", f"<script data-cally-enhancements>\n{js}\n</script>\n</body>", 1)
    return html


__all__ = ["cally_one_html"]
