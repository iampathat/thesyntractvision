/* Cally.One appearance projection — interface and calendar themes are independent represented preferences. No inference. */
(() => {
  'use strict';
  if (window.__callyThemeSystem) return;
  window.__callyThemeSystem = true;

  const PREF_KEY = 'cally.one.appearance.v1';
  const PRESETS = {
    'light-green': {label:'Light Green', bg:'#f4f3ee', surface:'#fbfaf6', ink:'#10221b', muted:'#617269', accent:'#087a59', line:'#d9ddd7', event:'#e8f1eb', today:'#eef7f1'},
    blue: {label:'Blue', bg:'#f1f5f9', surface:'#fbfdff', ink:'#102033', muted:'#617287', accent:'#2f6feb', line:'#d8e1ec', event:'#e8f0ff', today:'#edf4ff'},
    dark: {label:'Dark', bg:'#101512', surface:'#18201c', ink:'#f2f6f3', muted:'#a4b2aa', accent:'#45b98a', line:'#33443b', event:'#223a30', today:'#1c3028'},
    modern: {label:'Modern', bg:'#f4f4f6', surface:'#ffffff', ink:'#111216', muted:'#6b6d75', accent:'#6c4cff', line:'#dedee4', event:'#eeeaff', today:'#f2efff'},
    warm: {label:'Warm', bg:'#f5f0e8', surface:'#fffaf2', ink:'#2c241c', muted:'#766a5e', accent:'#b66b35', line:'#e1d4c5', event:'#f4e5d7', today:'#faeee2'}
  };
  const COLOR_KEYS = ['bg','surface','ink','muted','accent','line'];
  const CALENDAR_COLOR_KEYS = [...COLOR_KEYS, 'event', 'today'];
  const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const locale=()=>{try{return window.__callyLocale?.()||((navigator.language||'sv').toLowerCase().startsWith('sv')?'sv':'en');}catch(_){return'sv';}};
  const sv=()=>locale()==='sv';
  const stateKey=()=>{try{return window.__callySpaceStorageKey?.()||'cally.one.state.v1';}catch(_){return'cally.one.state.v1';}};
  const validHex=value=>/^#[0-9a-f]{6}$/i.test(String(value||''));

  function defaults(){return {interface:{theme:'light-green',custom:false,colors:{}},calendar:{theme:'light-green',custom:false,colors:{}}};}
  function read(){
    try {
      const raw=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');
      const base=defaults();
      for(const scope of ['interface','calendar']){
        const part=raw[scope]||{};
        base[scope].theme=PRESETS[part.theme]?part.theme:'light-green';
        base[scope].custom=!!part.custom;
        base[scope].colors={};
        for(const key of CALENDAR_COLOR_KEYS) if(validHex(part.colors?.[key])) base[scope].colors[key]=part.colors[key];
      }
      return base;
    } catch (_) { return defaults(); }
  }
  let prefs=read();

  function palette(scope){
    const part=prefs[scope];
    const preset=PRESETS[part.theme]||PRESETS['light-green'];
    return part.custom ? {...preset,...part.colors} : {...preset};
  }

  function setVar(name,value){document.documentElement.style.setProperty(name,value);}
  function apply(){
    const ui=palette('interface'), cal=palette('calendar');
    document.documentElement.dataset.callyUiTheme=prefs.interface.theme;
    document.documentElement.dataset.callyCalendarTheme=prefs.calendar.theme;
    setVar('--cally-ui-bg',ui.bg); setVar('--cally-ui-surface',ui.surface); setVar('--cally-ui-ink',ui.ink); setVar('--cally-ui-muted',ui.muted); setVar('--cally-ui-accent',ui.accent); setVar('--cally-ui-line',ui.line);
    setVar('--cally-cal-bg',cal.bg); setVar('--cally-cal-surface',cal.surface); setVar('--cally-cal-ink',cal.ink); setVar('--cally-cal-muted',cal.muted); setVar('--cally-cal-accent',cal.accent); setVar('--cally-cal-line',cal.line); setVar('--cally-cal-event',cal.event); setVar('--cally-cal-today',cal.today);
    window.dispatchEvent(new CustomEvent('cally-theme-change',{detail:{interface:{theme:prefs.interface.theme,palette:ui},calendar:{theme:prefs.calendar.theme,palette:cal}}}));
  }

  function writeState(){
    try {
      const state=JSON.parse(localStorage.getItem(stateKey())||'{}');
      if(!Array.isArray(state.dimension_states)) state.dimension_states=[];
      const defs=[
        {key:'interface_theme',label:'Gränssnittstema',labels:{sv:'Gränssnittstema',en:'Interface theme'},value_kind:'appearance-theme-state',system:true,origin:'system',status:'active',hidden:false,values:Object.entries(PRESETS).map(([code,p])=>({code,label:p.label}))},
        {key:'calendar_theme',label:'Kalendertema',labels:{sv:'Kalendertema',en:'Calendar theme'},value_kind:'appearance-theme-state',system:true,origin:'system',status:'active',hidden:false,values:Object.entries(PRESETS).map(([code,p])=>({code,label:p.label}))},
        {key:'interface_palette',label:'Gränssnittspalett',labels:{sv:'Gränssnittspalett',en:'Interface palette'},value_kind:'color-palette-state',system:true,origin:'system',status:'active',hidden:false},
        {key:'calendar_palette',label:'Kalenderpalett',labels:{sv:'Kalenderpalett',en:'Calendar palette'},value_kind:'color-palette-state',system:true,origin:'system',status:'active',hidden:false}
      ];
      for(const def of defs){const i=state.dimension_states.findIndex(x=>x&&x.key===def.key);if(i>=0)state.dimension_states[i]={...def,...state.dimension_states[i],values:state.dimension_states[i].values||def.values};else state.dimension_states.push(def);}
      state.appearance_projection={
        interface_theme:prefs.interface.theme, calendar_theme:prefs.calendar.theme,
        interface_palette:palette('interface'), calendar_palette:palette('calendar'),
        interface_custom_colors:prefs.interface.custom, calendar_custom_colors:prefs.calendar.custom,
        interface_and_calendar_are_independent:true, appearance_is_projection:true
      };
      state.state_model={...(state.state_model||{}),appearance_is_projection:true,interface_theme_is_independent:true,calendar_theme_is_independent:true,custom_brand_colors_are_state:true};
      localStorage.setItem(stateKey(),JSON.stringify(state));
    } catch (_) {}
  }

  function save(){try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs));}catch(_){} apply(); writeState();}

  function ensureButton(){
    const label=sv()?'Utseende':'Appearance';
    document.querySelectorAll('.callyWideNav,.callyMobileMenu').forEach(nav=>{
      if(nav.querySelector('[data-cally-theme-settings]'))return;
      const b=document.createElement('button');b.type='button';b.dataset.callyThemeSettings='1';b.textContent=label;nav.appendChild(b);
    });
  }

  function presetButtons(scope){
    return Object.entries(PRESETS).map(([code,p])=>`<button type="button" class="callyThemePreset ${prefs[scope].theme===code?'active':''}" data-theme-scope="${scope}" data-theme-preset="${code}"><span class="callyThemeSwatches"><i style="background:${p.bg}"></i><i style="background:${p.surface}"></i><i style="background:${p.accent}"></i><i style="background:${p.ink}"></i></span><b>${p.label}</b></button>`).join('');
  }

  const COLOR_LABELS={bg:{sv:'Bakgrund',en:'Background'},surface:{sv:'Yta',en:'Surface'},ink:{sv:'Text',en:'Text'},muted:{sv:'Sekundär text',en:'Muted text'},accent:{sv:'Accent',en:'Accent'},line:{sv:'Linjer',en:'Lines'},event:{sv:'Händelser',en:'Events'},today:{sv:'Idag',en:'Today'}};
  function customGrid(scope){
    const keys=scope==='calendar'?CALENDAR_COLOR_KEYS:COLOR_KEYS, p=palette(scope);
    return `<div class="callyThemeCustom ${prefs[scope].custom?'open':''}" data-theme-custom-panel="${scope}">${keys.map(key=>`<label><span>${COLOR_LABELS[key][locale()]||COLOR_LABELS[key].en}</span><input type="color" value="${p[key]}" data-theme-color-scope="${scope}" data-theme-color-key="${key}"><code>${p[key]}</code></label>`).join('')}</div>`;
  }

  function section(scope,title,sub){
    return `<section class="callyThemeSection" data-theme-section="${scope}"><div class="callyThemeSectionHead"><div><h3>${title}</h3><p>${sub}</p></div><label class="callyThemeCustomToggle"><input type="checkbox" data-theme-custom-toggle="${scope}" ${prefs[scope].custom?'checked':''}><span>${sv()?'Egna färger':'Custom colors'}</span></label></div><div class="callyThemePresets">${presetButtons(scope)}</div>${customGrid(scope)}</section>`;
  }

  function ensureOverlay(){
    let overlay=qs('#callyThemeSettings'); if(overlay)return overlay;
    overlay=document.createElement('div'); overlay.id='callyThemeSettings'; overlay.className='callyThemeSettings';
    document.body.appendChild(overlay); return overlay;
  }

  function renderOverlay(){
    const overlay=ensureOverlay();
    overlay.innerHTML=`<div class="callyThemeSheet" role="dialog" aria-modal="true" aria-labelledby="callyThemeTitle"><header><div><div class="callyThemeEyebrow">${sv()?'UTSEENDE · PROJEKTION':'APPEARANCE · PROJECTION'}</div><h2 id="callyThemeTitle">${sv()?'Tema & färger':'Theme & colors'}</h2><p>${sv()?'Gränssnitt och kalender kan ha olika utseende. Egna färger kan användas för exempelvis företagsprofil.':'Interface and calendar can use different appearances. Custom colors can match a company brand.'}</p></div><button type="button" data-theme-close aria-label="Close">×</button></header><div class="callyThemeBody">${section('interface',sv()?'Gränssnitt':'Interface',sv()?'Menyer, paneler, ChatGPT-yta och kontroller.':'Menus, panels, ChatGPT surface and controls.')}${section('calendar',sv()?'Kalender':'Calendar',sv()?'Kalenderyta, dagar, linjer och händelser.':'Calendar canvas, days, grid and events.')}</div><footer><button type="button" data-theme-reset>${sv()?'Återställ standard':'Reset defaults'}</button><button type="button" data-theme-cancel>${sv()?'Avbryt':'Cancel'}</button><button type="button" class="primary" data-theme-save>${sv()?'Spara utseende':'Save appearance'}</button></footer></div>`;
    return overlay;
  }

  let snapshot=null;
  function open(){snapshot=JSON.parse(JSON.stringify(prefs));const overlay=renderOverlay();overlay.classList.add('open');}
  function close(restore=false){const overlay=qs('#callyThemeSettings');if(restore&&snapshot){prefs=snapshot;apply();}snapshot=null;overlay?.classList.remove('open');}

  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-cally-theme-settings]')){event.preventDefault();open();return;}
    if(!event.target.closest?.('#callyThemeSettings'))return;
    if(event.target===qs('#callyThemeSettings')||event.target.closest?.('[data-theme-close]')||event.target.closest?.('[data-theme-cancel]')){close(true);return;}
    const preset=event.target.closest?.('[data-theme-preset]');
    if(preset){const scope=preset.dataset.themeScope, code=preset.dataset.themePreset;if(PRESETS[code]){prefs[scope].theme=code;if(!prefs[scope].custom)prefs[scope].colors={};apply();renderOverlay().classList.add('open');}return;}
    const reset=event.target.closest?.('[data-theme-reset]');if(reset){prefs=defaults();apply();renderOverlay().classList.add('open');return;}
    const saveButton=event.target.closest?.('[data-theme-save]');if(saveButton){save();close(false);return;}
  });

  document.addEventListener('change',event=>{
    const toggle=event.target.closest?.('[data-theme-custom-toggle]');
    if(toggle){const scope=toggle.dataset.themeCustomToggle;prefs[scope].custom=toggle.checked;if(toggle.checked){const p=palette(scope);prefs[scope].colors={};for(const key of (scope==='calendar'?CALENDAR_COLOR_KEYS:COLOR_KEYS))prefs[scope].colors[key]=p[key];}apply();renderOverlay().classList.add('open');}
  });
  document.addEventListener('input',event=>{
    const input=event.target.closest?.('[data-theme-color-scope]');if(!input)return;
    const scope=input.dataset.themeColorScope,key=input.dataset.themeColorKey;if(!validHex(input.value))return;
    prefs[scope].custom=true;prefs[scope].colors[key]=input.value;input.parentElement?.querySelector('code')?.replaceChildren(input.value);apply();
  });

  window.__callyTheme={open,read:()=>JSON.parse(JSON.stringify(prefs)),applyTheme:(scope,theme)=>{if(!['interface','calendar'].includes(scope)||!PRESETS[theme])return false;prefs[scope].theme=theme;save();return true;},presets:()=>Object.keys(PRESETS)};

  const boot=()=>{prefs=read();apply();writeState();ensureButton();};
  window.addEventListener('cally-one-ui-refresh',()=>{ensureButton();writeState();});
  window.addEventListener('cally-locale-change',ensureButton);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
