// QCDS by Patrik Sundblom. File delivery stays under the user's control.
const native = () => globalThis.Capacitor?.isNativePlatform?.() === true;
export async function saveDeviceFile(content, filename, type='application/octet-stream') {
  const blob=content instanceof Blob?content:new Blob([content],{type});
  if(native()) {
    const {shareNativeFile}=await import('./native-bridge.js');
    return shareNativeFile(blob,filename);
  }
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  return {delivered:'download'};
}
export async function initNativeApp() {
  if(!native())return;
  const {initNativeNavigation}=await import('./native-bridge.js');
  await initNativeNavigation();
}
