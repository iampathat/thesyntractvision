// QCDS by Patrik Sundblom. Compiled only into the bundled mobile app.
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
export async function shareNativeFile(blob,name) {
  const path=name.replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,160);
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  const file=await Filesystem.writeFile({path:'q-security-exports/'+path,data,directory:Directory.Cache,recursive:true});
  await Share.share({title:'Q Security · '+name,files:[file.uri],dialogTitle:'Save or share your report'});return {delivered:'share-sheet'};
  // Retain the cache file while the receiving app reads it. The OS manages cache eviction.
}
export async function initNativeNavigation() {
  await App.addListener('backButton',({canGoBack})=>{
    const modal=[...document.querySelectorAll('dialog[open]')].at(-1);
    if(modal){modal.close();return;}
    const close=document.querySelector('.menu-close');
    if(document.body.classList.contains('menu-open')&&close){close.click();return;}
    if(canGoBack){history.back();return;}
    if(location.hash!=='#home'){location.hash='#home';return;}
    App.minimizeApp();
  });
}
