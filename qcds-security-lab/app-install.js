// QCDS Security Lab · Project Glasswing v1.26 — one app and one settings dialog.
// Theory and creation by Patrik Sundblom. OpenAI / ChatGPT R&D support.
// Refresh preserves all local investigations and evidence. No hidden cache reset.
let installPrompt, registration, sendNotice = () => {}, offlineReady = false;
const native = () => globalThis.Capacitor?.isNativePlatform?.() === true;
const installed = () => native() || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ROOT = new URL('./',import.meta.url);

function settingsDialog() {
  let dialog=document.getElementById('gw-settings-dialog');
  if(dialog) return dialog;
  dialog=document.createElement('dialog');
  dialog.id='gw-settings-dialog';
  dialog.className='gw-settings-dialog';
  dialog.setAttribute('aria-labelledby','gw-settings-title');
  dialog.innerHTML=`<div class="gw-settings-head">
    <div><span class="gw-settings-eyebrow">QCDS · SECURITY LAB</span>
      <h2 id="gw-settings-title">Settings & updates</h2>
      <p>Keep your investigations and evidence on this device.</p></div>
    <button type="button" class="gw-settings-close" data-settings-close aria-label="Close settings">×</button>
  </div>
  <section class="gw-settings-section">
    <h3>Update Security Lab</h3>
    <p>Fetch the latest app, replace only its offline program files, and reopen the workspace. Your locally saved investigations, settings, and reports are not deleted.</p>
    <button type="button" class="gw-settings-refresh" data-app-refresh>↻ Refresh app · keep my data</button>
    <p id="gw-settings-result" role="status" aria-live="polite">Ready to update.</p>
  </section>
  <section class="gw-settings-section">
    <h3>Project Glasswing intro</h3>
    <p>The eagle film is an optional welcome, not part of updating or returning to your work.</p>
    <button type="button" class="gw-settings-install" data-replay-intro>Watch intro</button>
  </section>
  <section class="gw-settings-section">
    <h3>Installation</h3>
    <button type="button" class="gw-settings-install" data-app-install>Install app</button>
    <p data-offline-status>Local storage remains on your device.</p>
  </section>
  <div class="gw-settings-foot">Theory and creation by Patrik Sundblom<br>with OpenAI / ChatGPT as research & development support</div>`;
  document.body.append(dialog);
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  return dialog;
}
function status(message,failed=false) {
  const out=document.querySelector('#gw-settings-result');
  if(out){out.textContent=message;out.dataset.state=failed?'error':'ready';}
}
export function refreshAppStatus() {
  document.querySelectorAll('[data-app-install]').forEach(button=>{
    button.hidden=installed();
    button.textContent=installPrompt?'Install Q Security':'Install app ↗';
  });
  document.querySelectorAll('[data-offline-status]').forEach(el=>{
    el.textContent=native()?'Available offline':!navigator.onLine?'Offline':
      offlineReady?'Ready for offline use':'Available when online';
  });
  const available=registration?.waiting;
  if(available) status('An update is ready. Use Refresh app to apply it.');
}

const bounded=async(promise,label,timeoutMs=3800)=>{
  let timer;
  try{
    return await Promise.race([
      Promise.resolve(promise),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timed out')),timeoutMs)})
    ]);
  }finally{clearTimeout(timer)}
};
async function refreshWithoutDeletingWork() {
  if(!navigator.onLine){status('Connect to the internet before refreshing. No data changed.',true);return;}
  const button=document.querySelector('[data-app-refresh]');
  if(button)button.disabled=true;
  status('Refreshing app files only. Your investigations and evidence will be preserved.');
  try {
    if('serviceWorker' in navigator && !native()){
      const reg=await bounded(navigator.serviceWorker.getRegistration(ROOT.href),'Service worker');
      if(reg?.scope===ROOT.href)await bounded(reg.unregister(),'App update');
    }
    if('caches' in globalThis){
      const names=await bounded(caches.keys(),'Cache list');
      for(const key of names){
        if(key.startsWith('qcds-security-app-'))
          await bounded(caches.delete(key),'App cache');
      }
    }
    // Do not touch localStorage, sessionStorage, indexedDB or user files.
    status('Program files refreshed. Opening the same workspace without the intro.');
    const url=new URL('./index.html',ROOT);
    url.searchParams.set('skip_intro','1');
    url.searchParams.set('refreshed',String(Date.now()));
    url.hash=location.hash || '#home';
    location.replace(url.href);
  }catch(err){
    const message='Refresh could not finish: '+(err?.message||String(err))+
      '. Your saved cases are unchanged. Open the repair link if needed.';
    status(message,true);
    const out=document.querySelector('#gw-settings-result');
    if(out&&!out.querySelector('a')){
      const link=document.createElement('a');
      link.href=new URL('../glasswing-refresh.html',ROOT).href;
      link.textContent='Open the independent recovery page';
      link.style.display='block';
      link.style.marginTop='12px';
      out.append(link);
    }
    if(button)button.disabled=false;
  }
}
export function initAppInstall({notify}) {
  sendNotice=notify;
  settingsDialog();
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;refreshAppStatus();});
  window.addEventListener('appinstalled',()=>{installPrompt=null;refreshAppStatus();sendNotice('Q Security installed. Open it from your home screen.');});
  window.addEventListener('online',refreshAppStatus);
  window.addEventListener('offline',refreshAppStatus);
  document.addEventListener('click',async event=>{
    const trigger=event.target.closest('[data-app-settings]');
    if(trigger){
      event.preventDefault();
      // Close the navigation drawer first so no old menu overlays the dialog.
      document.querySelector('.menu-close')?.click();
      const dialog=settingsDialog();
      if(!dialog.open)dialog.showModal();
      refreshAppStatus();
      return;
    }
    if(event.target.closest('[data-replay-intro]')) {
      settingsDialog().close();
      // The Glasswing intro controller handles the same click separately.
      return;
    }
    if(event.target.closest('[data-settings-close]')){
      event.preventDefault();settingsDialog().close();return;
    }
    if(event.target.closest('[data-app-refresh]')){
      event.preventDefault();await refreshWithoutDeletingWork();return;
    }
    if(event.target.closest('[data-app-update]')) {
      event.preventDefault();registration?.waiting?.postMessage({type:'ACTIVATE_UPDATE'});return;
    }
    if(!event.target.closest('[data-app-install]'))return;
    event.preventDefault();
    if(installPrompt){
      await installPrompt.prompt();await installPrompt.userChoice;
      installPrompt=null;refreshAppStatus();
    }else{
      sendNotice(/iPad|iPhone|iPod/.test(navigator.userAgent)?
        'In Safari, open Share, then Add to Home Screen.':
        'Open your browser menu, then Install app or Add to Home screen.','warning');
    }
  });
  // Direct links from the old update page land inside the current app.
  if(new URLSearchParams(location.search).has('settings')){
    window.addEventListener('load',()=>{
      const dialog=settingsDialog();
      if(!dialog.open)dialog.showModal();
    },{once:true});
  }
  if(!('serviceWorker' in navigator)||native()||!/^https?:$/.test(location.protocol))return;
  let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(registration?.active && navigator.serviceWorker.controller && !offlineReady){
      offlineReady=true;refreshAppStatus();return;
    }
    if(reloading)return;reloading=true;location.reload();
  });
  navigator.serviceWorker.register(new URL('./sw.js',import.meta.url),{
    scope:'./',updateViaCache:'none'
  }).then(async reg=>{
    registration=reg;
    const ready=await navigator.serviceWorker.ready;
    offlineReady=!!ready.active;refreshAppStatus();
    reg.addEventListener('updatefound',()=>
      reg.installing?.addEventListener('statechange',()=>{
        if(reg.waiting)refreshAppStatus();
      })
    );
    reg.update().catch(()=>{});
  }).catch(()=>{offlineReady=false;refreshAppStatus();});
}
