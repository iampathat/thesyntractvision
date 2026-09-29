// QCDS by Patrik Sundblom. App installation and offline lifecycle.
let installPrompt, registration, sendNotice = () => {}, offlineReady = false;
const native = () => globalThis.Capacitor?.isNativePlatform?.() === true;
const installed = () => native() || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export function refreshAppStatus() {
  document.querySelectorAll('[data-app-install]').forEach(button => {button.hidden=installed();button.textContent=installPrompt?'Install Q Security':'Install app ↗';});
  document.querySelectorAll('[data-offline-status]').forEach(el => {el.textContent=native()?'Available offline':!navigator.onLine?'Offline':offlineReady?'Ready for offline use':'';});
  if(registration?.waiting && !document.querySelector('[data-app-update]')) {
    const target=document.querySelector('.consumer-trust');
    if(target)target.insertAdjacentHTML('afterend','<div class="app-update-notice">A new version is ready. Your saved investigations will stay in place. <button class="button small" data-app-update>Update app</button></div>');
  }
}
export function initAppInstall({notify}) {
  sendNotice=notify;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;refreshAppStatus();});
  window.addEventListener('appinstalled',()=>{installPrompt=null;refreshAppStatus();sendNotice('Q Security installed. Open it from your home screen.');});
  window.addEventListener('online',refreshAppStatus);window.addEventListener('offline',refreshAppStatus);
  document.addEventListener('click',async event=>{
    if(event.target.closest('[data-app-update]')) {registration?.waiting?.postMessage({type:'ACTIVATE_UPDATE'});return;}
    if(!event.target.closest('[data-app-install]'))return;
    if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;refreshAppStatus();}
    else sendNotice(/iPad|iPhone|iPod/.test(navigator.userAgent)?'In Safari, open Share, then Add to Home Screen.':'Open your browser menu, then Install app or Add to Home screen.','warning');
  });
  if(!('serviceWorker' in navigator)||native()||!/^https?:$/.test(location.protocol))return;
  let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(registration?.active && navigator.serviceWorker.controller && !offlineReady){offlineReady=true;refreshAppStatus();return;}
    if(reloading)return;reloading=true;location.reload();
  });
  navigator.serviceWorker.register(new URL('./sw.js',import.meta.url),{scope:'./',updateViaCache:'none'}).then(async reg=>{
    registration=reg;
    const ready=await navigator.serviceWorker.ready;
    offlineReady=!!ready.active;refreshAppStatus();
    reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',()=>{if(reg.waiting)refreshAppStatus();}));
    reg.update().catch(()=>{});
  }).catch(()=>{offlineReady=false;refreshAppStatus();});
}
