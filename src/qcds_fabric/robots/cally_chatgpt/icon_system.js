/* Cally.One unified icon language — presentation only, no state or inference. */
(() => {
  'use strict';
  if (window.__callyIconSystem) return;
  window.__callyIconSystem = true;

  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const sv=()=>{try{return (window.__callyLocale?.()||'sv')==='sv';}catch(_){return true;}};

  const paths={
    layers:'<path d="m12 3-9 5 9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
    layout:'<rect x="3" y="4" width="7" height="16" rx="2"/><rect x="12" y="4" width="9" height="7" rx="2"/><rect x="12" y="13" width="9" height="7" rx="2"/>',
    userPlus:'<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.7-4 3-6 6.5-6 2 0 3.6.6 4.7 1.8"/><path d="M18 11v6M15 14h6"/>',
    calendarPlus:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M7 3v4M17 3v4M3 10h18M12 13v5M9.5 15.5h5"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="M8 14h3M8 17h5"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21M12 3C9.6 5.5 8.4 8.5 8.4 12S9.6 18.5 12 21"/>',
    language:'<path d="M4 5h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9l-4 3v-3H4a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z"/><path d="M6 9h6M6 12h4"/><path d="m17 14 2 5 2-5M18 17h2"/>',
    palette:'<path d="M12 3a9 9 0 1 0 0 18h1.3a2.2 2.2 0 0 0 1.4-3.9 1.6 1.6 0 0 1 1-2.9H18A3 3 0 0 0 21 11a8 8 0 0 0-9-8Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="10" cy="6.8" r=".8"/><circle cx="14.3" cy="6.8" r=".8"/><circle cx="17" cy="10" r=".8"/>',
    network:'<rect x="9" y="9" width="6" height="6" rx="1.5"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="m6.5 6.5 3 3M17.5 6.5l-3 3M6.5 17.5l3-3M17.5 17.5l-3-3"/>',
    shield:'<path d="M12 3 5 6v5c0 4.6 2.7 8 7 10 4.3-2 7-5.4 7-10V6l-7-3Z"/><path d="M9.5 12h5M12 9.5v5"/>'
  };

  function icon(name){
    return `<svg class="callyIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name]||paths.layers}</svg>`;
  }

  function setIcon(host,name){
    if(!host)return;
    host.innerHTML=icon(name);
    host.dataset.callyIcon=name;
  }

  function decorateTop(){
    const home=qs('#callyHomeTile');
    if(home){home.innerHTML=icon('layers');home.dataset.callyIcon='layers';home.title='Calendar Space';home.setAttribute('aria-label','Calendar Space');}
    setIcon(qs('#perspectiveBtn .actionIcon'),'layout');
    setIcon(qs('#personBtn .actionIcon'),'userPlus');
    setIcon(qs('#eventBtn .actionIcon'),'calendarPlus');
    const menu=qs('#callyMenuButton');
    if(menu){menu.innerHTML=icon('menu');menu.dataset.callyIcon='menu';}
  }

  function decorateThemeButton(theme){
    if(!theme)return;
    const label=sv()?'Utseende':'Appearance';
    const sub=sv()?'Gränssnitt, kalender och egna färger':'Interface, calendar and custom colors';
    theme.innerHTML=`<span class="callySystemIcon">${icon('palette')}</span><span class="callySystemCopy"><b>${label}</b><small>${sub}</small></span>`;
    theme.dataset.callyIconified='1';
    theme.setAttribute('aria-label',label);
  }

  function decorateSystemMenu(){
    const map={display:'calendar',language:'globe',dimensions:'network',admin:'shield'};
    Object.entries(map).forEach(([action,name])=>qsa(`[data-system-action="${action}"] .callySystemIcon`).forEach(host=>setIcon(host,name)));
    qsa('[data-terminology-settings] .callySystemIcon').forEach(host=>setIcon(host,'language'));
    qsa('[data-cally-theme-settings]').forEach(decorateThemeButton);
  }

  function decorate(){decorateTop();decorateSystemMenu();}
  const soon=()=>{decorate();setTimeout(decorate,0);setTimeout(decorate,80);};

  document.addEventListener('click',event=>{
    if(event.target.closest?.('#callyMenuButton,[data-terminology-settings]'))setTimeout(decorate,0);
  });
  window.addEventListener('cally-one-ui-refresh',soon);
  window.addEventListener('cally-locale-change',soon);
  window.addEventListener('cally-terminology-change',soon);
  window.addEventListener('cally-theme-change',soon);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',soon,{once:true});else soon();

  window.__callyIcons={icon,decorate};
})();