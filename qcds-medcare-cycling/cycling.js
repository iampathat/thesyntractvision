/* © 2026 Patrik Sundblom. All Rights Reserved. Proprietary executable distribution. */
/* module: oracles.js */

const MODES={road:'Landsväg',gravel:'Gravel',mtb:'MTB / trail',downhill:'Downhill'};
function distanceKm(points){let km=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];const dlat=(b.lat-a.lat)*Math.PI/180,dlon=(b.lon-a.lon)*Math.PI/180;const q=Math.sin(dlat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dlon/2)**2;km+=6371*2*Math.atan2(Math.sqrt(q),Math.sqrt(Math.max(0,1-q)));}return km;}
function altitude(points){
 // Sum ascent/descent over short distance windows. Comparing every dense GPS/DEM
 // vertex against a >2 m threshold discarded entire gradual climbs in v0.4.x.
 let climb=0,drop=0,ok=0,windowKm=0,anchor=null,prev=null;
 for(let i=0;i<points.length;i++){
  const p=points[i];if(i>0&&Number.isFinite(p.ele)&&Number.isFinite(points[i-1].ele))ok++;
  if(!Number.isFinite(p.ele)){prev=null;anchor=null;windowKm=0;continue;}
  if(anchor===null){anchor=p.ele;prev=p;continue;}
  if(prev)windowKm+=distanceKm([prev,p]);
  const final=i===points.length-1;
  if(windowKm>=.18||final){const delta=p.ele-anchor;
   // Sub-metre variation is often DEM noise; do not report fake hill metres.
   if(delta>.7)climb+=delta;else if(delta<-.7)drop-=delta;
   anchor=p.ele;windowKm=0;
  }
  prev=p;
 }
 return {valid:ok>0&&ok>=.7*Math.max(1,points.length-1),climb:Math.round(climb),drop:Math.round(drop),coverage:ok/Math.max(1,points.length-1)};
}
function courseIndex(route,mode){if(!route||!route.points.length)return null;const d=distanceKm(route.points),a=altitude(route.points);const k=mode==='downhill'?0.8:mode==='mtb'?1.35:mode==='gravel'?1.15:1;const score=(d*0.65 + (a.valid?(mode==='downhill'?a.drop:a.climb)/20:0))*k;return Math.max(1,Math.min(100,Math.round(score)));}
function handicap(ftp,weight,mode){const ratio=ftp/weight;const modeAdjustment=mode==='downhill'?0:mode==='mtb'?3:mode==='gravel'?1:0;return Math.round(Math.min(54,Math.max(0,54-(ratio-0.6)*12+modeAdjustment))*10)/10;}
function evaluate(state){const {route,mode,telemetry,ftp,weight}=state;const al=route?altitude(route.points):null;const checks=[
{id:'O1',name:'Ruttgeometri finns',desc:'Verkliga koordinater från OpenStreetMap eller importerad GPX.',result:route?.points.length>1?'ok':'unknown'},
{id:'O2',name:'Höjdmodell finns',desc:'Reella höjdvärden på minst 70 % av spårets segment. Annars okänt.',result:al?.valid?'ok':'unknown'},
{id:'O3',name:'Disciplin uttryckligen vald',desc:`Aktiv villkorsdomän: ${MODES[mode]}.`,result:MODES[mode]?'ok':'no'},
{id:'O4',name:'Effektkälla verifierad',desc:'Bluetooth FTMS från riktig cykel. Demowatt räknas inte.',result:telemetry.source==='ftms'&&telemetry.power!==null?'ok':'unknown'},
{id:'O5',name:'Puls mätt',desc:'Puls används bara om sensorn levererar data – aldrig som antagande.',result:Number.isFinite(telemetry.hr)?'ok':'unknown'},
{id:'O6',name:'FTP och kroppsvikt angivna',desc:'Preliminär cykelklassning, inte medicinsk bedömning.',result:ftp>=40&&ftp<=700&&weight>=35&&weight<=250?'ok':'no'},
{id:'O7',name:'Underlag / stigtyp',desc:'OSM highway/tracktype/surface eller GPX-metadata.',result:route?.surface?'ok':'unknown'},
{id:'O8',name:'Datakällans proveniens',desc:'Källnamn och ruttursprung finns sparade för spårbarhet.',result:route?.source?'ok':'unknown'},
{id:'O9',name:'Terrängens tekniska risk',desc:'MTB/downhill kräver lutning, underlag, hinder och kurvighet. Watt räcker inte.',result:(mode==='mtb'||mode==='downhill')?'unknown':'ok'},
{id:'O10',name:'Tävlingsvalidering',desc:'Verifierade användare, godkänd effektmätare, server och officiella resultat saknas.',result:'unknown'},
];return checks;}

/* module: resistance-engine.js */

const RESISTANCE_LIMITS=Object.freeze({min:1,max:24,offsetMin:-5,offsetMax:5,initial:9});
const clampLoad=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
function interpolateHeight(points,distanceKm,km){
 if(!Array.isArray(points)||points.length<2||!Number.isFinite(km))return null;
 let sum=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],d=distanceKm([a,b]);
  if(d<=0)continue;
  if(sum+d>=km){if(!Number.isFinite(a.ele)||!Number.isFinite(b.ele))return null;return a.ele+(b.ele-a.ele)*clampLoad((km-sum)/d,0,1);}
  sum+=d;
 }
 const end=points.at(-1);return Number.isFinite(end?.ele)?end.ele:null;
}
function gradientOnRoute(route,km,distanceKm){
 const points=route?.points;if(!points||points.length<2)return null;
 const total=distanceKm(points);if(total<.02)return null;
 const half=Math.min(.065,total/3),p=clampLoad(km,0,total);
 let from=clampLoad(p-half,0,total),to=clampLoad(p+half,0,total);
 if(to-from<.025){from=clampLoad(p-.025,0,total);to=clampLoad(p+.025,0,total);}
 if(to-from<.015)return null;
 const h1=interpolateHeight(points,distanceKm,from),h2=interpolateHeight(points,distanceKm,to);
 if(!Number.isFinite(h1)||!Number.isFinite(h2))return null;
 return Math.round(clampLoad((h2-h1)/((to-from)*1000)*100,-16,22)*10)/10;
}
function resistanceTarget({grade=0,offset=0,mode='road',baseline=9}={}){
 if(!Number.isFinite(grade))return null;
 const bias=clampLoad(Math.round(Number(offset)||0),-5,5);
 // An intentionally conservative training *approximation*, not a physical grade/torque calibration.
 // Every mode uses the same 1–24 step scale; actual physical response requires calibration.
 const gain=mode==='mtb'?0.9:mode==='gravel'?1.05:mode==='downhill'?0.9:1.2;
 return clampLoad(Math.round(baseline+clampLoad(grade,-12,18)*gain+bias),1,24);
}
function rampResistance(last,target,maxStep=1){
 if(!Number.isFinite(target))return null;
 if(!Number.isFinite(last))return clampLoad(Math.round(Math.min(target,RESISTANCE_LIMITS.initial)),1,24);
 return clampLoad(Math.round(last)+clampLoad(Math.round(target)-Math.round(last),-maxStep,maxStep),1,24);
}
const RESISTANCE_PROTOCOL=Object.freeze({
 service:0x1826,indoorBikeData:0x2AD2,feature:0x2ACC,controlPoint:0x2AD9,
 requestControl:0x00,setTargetResistance:0x04,response:0x80,
});
function encodeResistance(level){
 if(!Number.isInteger(level)||level<1||level>24)throw RangeError('Endast nivåerna 1–24 är tillåtna.');
 const tenths=level*10;return Uint8Array.of(0x04,tenths&255,(tenths>>8)&255);
}
function parseControlResponse(value){
 const v=value instanceof DataView?value:new DataView(value.buffer||value,value.byteOffset||0,value.byteLength);
 if(v.byteLength<3||v.getUint8(0)!==0x80)return null;
 return {opcode:v.getUint8(1),code:v.getUint8(2),ok:v.getUint8(2)===1};
}
const CONTROL_ERROR=Object.freeze({2:'Kommandot stöds inte av cykeln',3:'Ogiltig motståndsnivå',4:'Cykeln kunde inte utföra kommandot',5:'Cykeln vägrade fjärrstyrning'});

/* module: ftms.js */


const FM=RESISTANCE_PROTOCOL.service, BIKE=RESISTANCE_PROTOCOL.indoorBikeData;
function parseIndoorBike(value){let p=0;const flags=value.getUint16(p,true);p+=2;const output={power:null,cadence:null,speed:null,hr:null};function has(bytes){return p+bytes<=value.byteLength;}function u8(){if(!has(1))throw Error('Short packet');return value.getUint8(p++);}function u16(){if(!has(2))throw Error('Short packet');let x=value.getUint16(p,true);p+=2;return x;}function i16(){if(!has(2))throw Error('Short packet');let x=value.getInt16(p,true);p+=2;return x;}function u24(){if(!has(3))throw Error('Short packet');let x=value.getUint8(p)+(value.getUint8(p+1)<<8)+(value.getUint8(p+2)<<16);p+=3;return x;}
try{if(!(flags&1))output.speed=u16()/100;if(flags&2)u16();if(flags&4)output.cadence=u16()/2;if(flags&8)u16();if(flags&16)u24();if(flags&32)i16();if(flags&64)output.power=i16();if(flags&128)i16();if(flags&256)u16();if(flags&512)u16();if(flags&1024)u8();if(flags&2048)output.hr=u8();}catch(e){throw Error('Ogiltigt/trunkerat FTMS-paket');}return output;}
class BikeFTMS{
 constructor(onData,onStatus){this.onData=onData;this.onStatus=onStatus;this.device=null;this.characteristic=null;this.controlPoint=null;this.controlled=false;this.pending=null;this.inFlight=false;this.deviceName='';this._generation=0;
 this._handler=e=>{try{this.onData(parseIndoorBike(e.target.value));}catch(err){this.onStatus(err.message);}};
 this._controlHandler=e=>{const response=parseControlResponse(e.target.value);if(!response||!this.pending||this.pending.opcode!==response.opcode)return;const p=this.pending;this.pending=null;clearTimeout(p.timer);if(response.ok)p.resolve(response);else p.reject(Error(CONTROL_ERROR[response.code]||'FTMS-styrning nekad (kod '+response.code+')'));};
 this._disconnect=()=>{this._invalidate('Bluetooth frånkopplad. Automatiken avstängd.');};
 }
 get connected(){return !!this.device?.gatt?.connected&&!!this.characteristic;}
 get canControl(){return this.connected&&!!this.controlPoint;}
 _invalidate(message){this._generation++;this.controlled=false;this.inFlight=false;if(this.pending){const p=this.pending;this.pending=null;clearTimeout(p.timer);p.reject(Error(message));}this.onStatus(message);}
 async connect(){
  if(!navigator.bluetooth)throw Error('Web Bluetooth saknas. Använd Chrome på Mac via HTTPS.');
  this.disconnect();this.onStatus('Söker efter cykel …');
  try{
   const device=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:[FM]});this.device=device;this.deviceName=device.name||'FTMS-cykel';
   device.addEventListener('gattserverdisconnected',this._disconnect);
   this.onStatus('Ansluter till '+this.deviceName+' …');const server=await device.gatt.connect();const service=await server.getPrimaryService(FM);
   this.characteristic=await service.getCharacteristic(BIKE);await this.characteristic.startNotifications();this.characteristic.addEventListener('characteristicvaluechanged',this._handler);
   try{const cp=await service.getCharacteristic(RESISTANCE_PROTOCOL.controlPoint);await cp.startNotifications();cp.addEventListener('characteristicvaluechanged',this._controlHandler);this.controlPoint=cp;}
   catch(e){this.controlPoint=null;this.onStatus('FTMS-data fungerar. Cykeln exponerar inte skrivbar motståndsstyrning: '+(e.message||'okänt fel'));}
   this.onStatus('FTMS ansluten: '+this.deviceName+(this.controlPoint?' · motståndskanal hittad':' · endast mätdata'));
   return this.deviceName;
  }catch(e){this.disconnect();throw e;}
 }
 async _request(opcode,buffer,timeout=3000){
  if(!this.canControl)throw Error('Ingen skrivbar FTMS-motståndskanal.');
  if(this.inFlight)throw Error('FTMS är upptagen med ett annat kommando.');
  this.inFlight=true;
  try{
   const answer=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending=null;reject(Error('Inget svar från cykeln (FTMS timeout)'));},timeout);this.pending={opcode,resolve,reject,timer};});
   // Attach catch immediately to avoid an unhandled rejection when the indication arrives before write resolves.
   const observed=answer.then(v=>v,e=>{throw e;});observed.catch(()=>{});
   try{await (this.controlPoint.writeValueWithResponse?this.controlPoint.writeValueWithResponse(buffer):this.controlPoint.writeValue(buffer));}
   catch(e){if(this.pending){clearTimeout(this.pending.timer);this.pending=null;}answer.catch(()=>{});throw e;}
   return await observed;
  }finally{this.inFlight=false;}
 }
 async activateControl(){
  if(!this.canControl)throw Error('Cykeln erbjuder ingen FTMS-styrkanal.');
  const generation=this._generation;
  await this._request(RESISTANCE_PROTOCOL.requestControl,Uint8Array.of(0x00));
  if(generation!==this._generation)throw Error('Automatiken hann stängas av.');
  this.controlled=true;return true;
 }
 async setResistance(level){
  if(!this.controlled)throw Error('Begär först kontroll över cykeln.');
  const generation=this._generation;
  const ack=await this._request(RESISTANCE_PROTOCOL.setTargetResistance,encodeResistance(level));
  if(generation!==this._generation)throw Error('Automatiken har stängts av.');
  return ack;
 }
 disableControl(){this._generation++;this.controlled=false;}
 disconnect(){
  this.disableControl();if(this.pending){const p=this.pending;this.pending=null;clearTimeout(p.timer);p.reject(Error('FTMS frånkopplad'));}
  if(this.characteristic)try{this.characteristic.removeEventListener('characteristicvaluechanged',this._handler);}catch{}
  if(this.controlPoint)try{this.controlPoint.removeEventListener('characteristicvaluechanged',this._controlHandler);}catch{}
  if(this.device){try{this.device.removeEventListener('gattserverdisconnected',this._disconnect);}catch{}if(this.device.gatt?.connected)try{this.device.gatt.disconnect();}catch{}}
  this.characteristic=null;this.controlPoint=null;this.device=null;this.deviceName='';this.onStatus('Frånkopplad');
 }
}

/* module: renderer-capabilities.js */


const RENDERERS=Object.freeze({
 webgl2:{label:'WebGL2 Syntract Graphics 3D',status:'available',platforms:['modern WebGL2 browser'],implementation:'src/syntract-graphics.js'},
 canvas:{label:'Canvas 2D',status:'available',platforms:['all modern browsers'],implementation:'src/app.js'},
 webgpu:{label:'WebGPU 3D',status:'planned',platforms:['supported browsers and GPUs'],implementation:null},
 nvidia_dlss5:{label:'NVIDIA DLSS 5',status:'integration-blocked',platforms:['supported GeForce RTX 50 / native runtime'],implementation:null,requires:['NVIDIA partner SDK / access','RTX-compatible native renderer','color/depth/motion vectors','SDK/license compliance']}
});
function graphicsStatus(){return {
 active:typeof document!=='undefined'&&!!document.createElement('canvas').getContext('webgl2')?'webgl2':'canvas',
 wasm:typeof WebAssembly!=='undefined',
 webgpu:typeof navigator!=='undefined'&&!!navigator.gpu,
 dlss5Active:false,
 message:'DLSS 5 kan inte köras direkt från en vanlig webbapp eller på Apple Silicon. Kräver separat RTX-renderare och auktoriserad SDK-integration.'
};}

/* module: core-wasm.js */
const jsHandicap=handicap, jsCourseIndex=courseIndex;


const CODE={road:0,gravel:1,mtb:2,downhill:3};
let api=null;
let status='JS-fallback';
function engineStatus(){return status;}
async function initEngine(){
 try {
  if(!('WebAssembly' in globalThis))throw Error('WebAssembly saknas');
  const response=await fetch(new URL('./core.wasm',location.href));
  if(!response.ok)throw Error('WASM HTTP '+response.status);
  const bytes=await response.arrayBuffer();
  const instance=await WebAssembly.instantiate(bytes,{});
  const x=instance.instance?.exports||instance.exports;
  for(const fn of ['qcds_chp','qcds_course_index','qcds_grade_percent','qcds_power_filter'])if(typeof x[fn]!=='function')throw Error('Export saknas: '+fn);
  if(Math.abs(x.qcds_chp(150,80,0)-jsHandicap(150,80,'road'))>0.0001)throw Error('WASM-kärnans CHP avviker');
  api=x; status='WebAssembly · aktiv';
 }catch(err){api=null;status='JS-fallback ('+String(err?.message||err)+')';}
 return status;
}
function chp(ftp,kg,mode){return api?api.qcds_chp(ftp,kg,CODE[mode]??0):jsHandicap(ftp,kg,mode);}
function index(route,mode){
 if(!route?.points?.length)return null;
 if(!api)return jsCourseIndex(route,mode);
 const a=altitude(route.points);
 const n=api.qcds_course_index(distanceKm(route.points),a.climb,a.drop,CODE[mode]??0,a.valid?1:0);
 return n<0?null:n;
}
function grade(deltaM,meters){
 if(!api)return meters>=5?Math.max(-20,Math.min(20,deltaM/meters*100)):null;
 const n=api.qcds_grade_percent(deltaM,meters);return n===-1000?null:n;
}
function smoothPower(previous,current,alpha=.35){return api?api.qcds_power_filter(previous,current,alpha):previous*(1-alpha)+Math.max(0,current)*alpha;}

/* module: local-db.js */

class QCDSLocalDB {
  constructor() { this.db = null; this.status = 'Initierar lokalt bibliotek …'; }
  async open() {
    if (!globalThis.indexedDB) throw Error('IndexedDB stöds inte i denna webbläsare.');
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open('QCDS_MedCare_Cycling_v1', 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('routes')) db.createObjectStore('routes', {keyPath:'id'});
        if (!db.objectStoreNames.contains('rides')) db.createObjectStore('rides', {keyPath:'id'});
        if (!db.objectStoreNames.contains('osmCache')) db.createObjectStore('osmCache', {keyPath:'key'});
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error || Error('Databasen kunde inte öppnas'));
      r.onblocked = () => reject(Error('Databasen används av en annan flik som behöver stängas.'));
    });
    db.onversionchange = () => {db.close(); this.db=null;};
    this.db = db;
    this.status = 'Lokalt bibliotek aktivt · IndexedDB';
    return this;
  }
  operation(storeName, method, payload) {
    if (!this.db) return Promise.reject(Error('Lokal databas ej tillgänglig.'));
    return new Promise((resolve, reject) => {
      let finished=false, result;
      const tx=this.db.transaction(storeName, method==='getAll'||method==='get' ? 'readonly':'readwrite');
      const store=tx.objectStore(storeName);
      let r;
      try {r=payload===undefined ? store[method]() : store[method](payload);}catch(e){reject(e);return;}
      r.onsuccess=()=>{result=r.result;};
      r.onerror=()=>{if(!finished){finished=true;reject(r.error||Error('Lagringsfel'));}};
      tx.oncomplete=()=>{if(!finished){finished=true;resolve(result);}};
      tx.onabort=tx.onerror=()=>{if(!finished){finished=true;reject(tx.error||Error('Databasen avbröts'));}};
    });
  }
  listRoutes(){return this.operation('routes','getAll');}
  listRides(){return this.operation('rides','getAll');}
  putRoute(r){return this.operation('routes','put',r);}
  deleteRoute(id){return this.operation('routes','delete',id);}
  putRide(r){return this.operation('rides','put',r);}
  deleteRide(id){return this.operation('rides','delete',id);}
  getCache(key){return this.operation('osmCache','get',key);}
  putCache(row){return this.operation('osmCache','put',row);}
  clearCache(){return this.operation('osmCache','clear');}
  async exportJSON(){
    return JSON.stringify({schema:'qcds-cycling-local-v1',exportedAt:new Date().toISOString(),routes:await this.listRoutes(),rides:await this.listRides()},null,2);
  }
  async importJSON(json){
    const obj=JSON.parse(json);
    if(obj.schema!=='qcds-cycling-local-v1'||!Array.isArray(obj.routes)||!Array.isArray(obj.rides)) throw Error('Ogiltig QCDS-säkerhetskopia.');
    if(obj.routes.length>1000||obj.rides.length>20000)throw Error('För stor säkerhetskopia.');
    for(const route of obj.routes){
      if(typeof route.id!=='string'||route.id.length>150||!Array.isArray(route.points)||route.points.length<2||route.points.length>25000)throw Error('Ogiltiga banor i säkerhetskopian.');
      const points=route.points.map(p=>({lat:Number(p.lat),lon:Number(p.lon),ele:p.ele===null||p.ele===undefined?null:Number(p.ele)}));
      if(points.some(p=>!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||Math.abs(p.lat)>90||Math.abs(p.lon)>180||p.ele!==null&&!Number.isFinite(p.ele)))throw Error('Ogiltiga koordinater.');
      await this.putRoute({...route,name:String(route.name||'Bana').slice(0,160),points});
    }
    for(const ride of obj.rides){
      if(typeof ride.id!=='string'||ride.id.length>150||!Number.isFinite(Number(ride.elapsedSeconds))||!Number.isFinite(Number(ride.km)))continue;
      await this.putRide({...ride,elapsedSeconds:Math.min(172800,Number(ride.elapsedSeconds)),km:Math.min(2000,Number(ride.km)),name:String(ride.name||'Körning').slice(0,160)});
    }
    return {routes:obj.routes.length,rides:obj.rides.length};
  }
}
const localDB=new QCDSLocalDB();
function newCyclingId(){return typeof globalThis.crypto?.randomUUID==='function'?globalThis.crypto.randomUUID():'qcds-'+Date.now()+'-'+Math.random().toString(36).slice(2);}

/* module: osm-client.js */

const OSM_PROVIDERS=Object.freeze([
 {id:'private',name:'Private.coffee (global)',url:'https://overpass.private.coffee/api/interpreter',region:'global',timeoutMs:10500},
 {id:'europe',name:'Dresel Europe',url:'https://ovp.dresel.systems/api/interpreter',region:'europe',timeoutMs:10500},
 {id:'america',name:'Dresel North America',url:'https://ovp.dresel.systems/api-na/interpreter',region:'america',timeoutMs:10500},
 {id:'fossgis',name:'FOSSGIS (global)',url:'https://overpass-api.de/api/interpreter',region:'global',timeoutMs:10500}
]);
const OVERPASS_ENDPOINTS=OSM_PROVIDERS.map(p=>p.url);
const cooldowns=new Map();
function categoryRegex(mode){
 if(mode==='road')return '^(cycleway|residential|living_street|tertiary|secondary|unclassified|service|path|track)$';
 if(mode==='gravel')return '^(track|path|cycleway|unclassified|residential)$';
 return '^(path|track|cycleway)$';
}
function buildOverpassQuery(bounds,mode){
 const n=[bounds.getSouth(),bounds.getWest(),bounds.getNorth(),bounds.getEast()];
 if(n.some(v=>!Number.isFinite(v))||n[2]<=n[0]||n[3]<=n[1])throw Error('Ogiltigt kartområde.');
 // Callers partition large viewports before making requests; no user-facing zoom cap.
 if(n[2]-n[0]>.115||n[3]-n[1]>.17)throw Error('Internt sökfel: stort område måste delas i mindre kartdelar.');
 const rect=n.map(v=>v.toFixed(5)).join(',');
 return `[out:json][timeout:14];way["highway"~"${categoryRegex(mode)}"]["bicycle"!="no"]["access"!="private"]["access"!="no"](${rect});out body geom 900;`;
}
function providerPlan(bounds,preferred='auto'){
 const lat=(bounds.getSouth()+bounds.getNorth())/2,lon=(bounds.getWest()+bounds.getEast())/2;
 const europe=lat>=34&&lat<=72&&lon>=-12&&lon<=45;
 const america=lat>=5&&lat<=85&&lon>=-169&&lon<=-50;
 const pool=OSM_PROVIDERS.filter(p=>p.region==='global'||(p.region==='europe'&&europe)||(p.region==='america'&&america));
 const preferredOrder=europe?['europe','private','fossgis']:america?['america','private','fossgis']:['private','fossgis'];
 const order=preferred!=='auto'&&preferred!=='osm-api'?[preferred,...preferredOrder]:preferredOrder;
 return [...new Set(order)].map(id=>pool.find(p=>p.id===id)).filter(Boolean);
}
function smallBbox(bounds){
 const a=[bounds.getSouth(),bounds.getWest(),bounds.getNorth(),bounds.getEast()];
 return a.every(Number.isFinite)&&a[2]>a[0]&&a[3]>a[1]&&a[2]-a[0]<=.014&&a[3]-a[1]<=.020;
}
function parseOSMXml(xml,mode){
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 if(doc.querySelector('parsererror'))throw Error('Ogiltigt XML-svar från OSM.');
 const nodes=new Map();
 for(const node of doc.getElementsByTagName('node')){
  const lat=Number(node.getAttribute('lat')),lon=Number(node.getAttribute('lon'));
  if(Number.isFinite(lat)&&Number.isFinite(lon))nodes.set(node.getAttribute('id'),{lat,lon});
 }
 const filter=new RegExp(categoryRegex(mode));
 const elements=[];
 for(const way of doc.getElementsByTagName('way')){
  const tags=Object.fromEntries([...way.getElementsByTagName('tag')].map(t=>[t.getAttribute('k'),t.getAttribute('v')]));
  if(!filter.test(tags.highway||'')||tags.bicycle==='no'||['private','no'].includes(tags.access))continue;
  const geometry=[...way.getElementsByTagName('nd')].map(n=>nodes.get(n.getAttribute('ref'))).filter(Boolean);
  if(geometry.length>=2)elements.push({type:'way',id:Number(way.getAttribute('id')),geometry,tags});
  if(elements.length>=180)break;
 }
 return {elements};
}
function requestAbort(parent,ctl){if(parent?.aborted)ctl.abort();const onAbort=()=>ctl.abort();parent?.addEventListener('abort',onAbort,{once:true});return ()=>parent?.removeEventListener('abort',onAbort);}
async function boundedFetch(url,opts,timeoutMs,signal,fetcher){
 const ctl=new AbortController(),off=requestAbort(signal,ctl),timer=setTimeout(()=>ctl.abort(),timeoutMs);
 try{
  const res=await fetcher(url,{...opts,signal:ctl.signal});
  if(!res.ok)throw Error('HTTP '+res.status);
  const contentLength=Number(res.headers?.get?.('content-length')||0);
  if(contentLength>7500000)throw Error('Svar för stort; zooma in.');
  const raw=await res.text();
  if(raw.length>7500000)throw Error('Svar för stort; zooma in.');
  return raw;
 }catch(e){if(signal?.aborted)throw Error('Sökningen avbröts.');if(ctl.signal.aborted)throw Error('Tidsgräns ('+Math.round(timeoutMs/1000)+' sek)');throw e;}
 finally{clearTimeout(timer);off();}
}
async function requestOSMDirect(bounds,mode,{signal,fetcher=fetch,onProgress=()=>{}}={}){
 if(!smallBbox(bounds))throw Error('OSM direkt kräver ett mycket litet område. Zooma in till cirka 1 km.');
 const rect=[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()].map(n=>n.toFixed(6)).join(',');
 onProgress('Hämtar ett litet kartutdrag direkt från OpenStreetMap …');
 const xml=await boundedFetch('https://www.openstreetmap.org/api/0.6/map?bbox='+rect,{method:'GET',headers:{'Accept':'application/xml'}},12500,signal,fetcher);
 return {data:parseOSMXml(xml,mode),host:'openstreetmap.org (kartutdrag)',provider:'osm-api'};
}
async function requestOverpass(query,{bounds,mode='road',provider='auto',onProgress=()=>{},signal,fetcher=fetch}={}){
 if(signal?.aborted)throw Error('Sökningen avbröts.');
 if(provider==='osm-api')return requestOSMDirect(bounds,mode,{signal,onProgress,fetcher});
 const plan=providerPlan(bounds,provider);
 const errors=[];
 for(let i=0;i<plan.length;i++){
  if(signal?.aborted)throw Error('Sökningen avbröts.');
  const item=plan[i],host=new URL(item.url).hostname;
  if((cooldowns.get(item.id)||0)>Date.now()) {errors.push(item.name+': tillfälligt pausad');continue;}
  onProgress(`Söker via ${item.name} (${i+1}/${plan.length}) …`);
  try{
   const raw=await boundedFetch(item.url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(query)},item.timeoutMs,signal,fetcher);
   let data;try{data=JSON.parse(raw);}catch{throw Error('Svaret är inte JSON');}
   if(data.remark||!Array.isArray(data.elements))throw Error(String(data.remark||'Ogiltigt svar').slice(0,140));
   return {data,host,provider:item.id};
  }catch(e){
   if(signal?.aborted)throw Error('Sökningen avbröts.');
   const msg=String(e?.message||e).slice(0,140);
   errors.push(item.name+': '+msg);
   if(/HTTP (429|403|406)/.test(msg))cooldowns.set(item.id,Date.now()+180000);
   else if(/HTTP (502|503|504)|Tidsgräns/.test(msg))cooldowns.set(item.id,Date.now()+25000);
   onProgress(`${item.name} misslyckades (${msg}). Prövar nästa källa …`);
  }
 }
 // OSM's main editing API is intentionally opt-in only: no unattended high-volume fallback.
 throw Error('Ingen OSM-källa svarade. '+errors.join(' · ').slice(0,350)+' · Prova en annan källa, använd egenritad bana eller importera GPX.');
}
function osmRows(data,mode){
 const rows=[];
 for(const way of data.elements||[]){
  if(!Array.isArray(way.geometry)||way.geometry.length<2)continue;
  const t=way.tags||{};
  if(t.bicycle==='no'||t.access==='private'||t.access==='no'||t.motor_vehicle==='yes'&&t.highway==='path')continue;
  if(['footway','pedestrian','steps','motorway','motorway_link'].includes(t.highway))continue;
  const pts=way.geometry.map(p=>({lat:Number(p.lat),lon:Number(p.lon),ele:null})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).slice(0,2000);
  if(pts.length<2)continue;
  const label=t.name||t.ref||t['mtb:scale']&&'MTB-stig nivå '+t['mtb:scale']||'Led '+way.id;
  rows.push({name:String(label).slice(0,120),source:`OpenStreetMap way/${way.id}`,osmId:way.id,surface:t.surface||t.tracktype||null,roadClass:t.highway||'path',mode,nodeIds:Array.isArray(way.nodes)?way.nodes.slice(0,pts.length):null,points:pts});
 }
 return rows.slice(0,900);
}

/* module: route-network.js */


const keyOf = (lat, lon, nodeId) => nodeId != null ? `n${nodeId}` : `p${lat.toFixed(6)}:${lon.toFixed(6)}`;
const disallowed = new Set(['motorway','motorway_link','trunk','trunk_link','steps','pedestrian','footway','construction','proposed']);
const kmBetween = (a, b) => distanceKm([a,b]);
class Heap{
 constructor(){this.v=[];}
 push(n){const a=this.v;let i=a.length;a.push(n);while(i){const p=(i-1)>>1;if(a[p].d<=n.d)break;a[i]=a[p];i=p;}a[i]=n;}
 pop(){const a=this.v;if(!a.length)return null;const ret=a[0],last=a.pop();if(a.length){let i=0;while(true){let c=2*i+1;if(c>=a.length)break;if(c+1<a.length&&a[c+1].d<a[c].d)c++;if(a[c].d>=last.d)break;a[i]=a[c];i=c;}a[i]=last;}return ret;}
 get size(){return this.v.length;}
}
function allowedWay(t,mode){
 if(!t||disallowed.has(t.highway))return false;
 if(t.access==='no'||t.access==='private'||t.bicycle==='no'||t['bicycle:conditional']==='no')return false;
 if(mode==='mtb'||mode==='downhill')return ['path','track','cycleway','bridleway'].includes(t.highway)||t.bicycle==='designated';
 if(mode==='gravel')return ['track','path','cycleway','residential','living_street','unclassified','tertiary'].includes(t.highway);
 return ['residential','living_street','tertiary','secondary','primary','unclassified','cycleway','service','track','path'].includes(t.highway);
}
function buildRouteNetwork(ways,mode='road'){
 const nodes=new Map(),adj=new Map(),seenEdges=new Set();let edges=0;
 const ensure=(k,p)=>{if(!nodes.has(k)){nodes.set(k,{id:k,lat:p.lat,lon:p.lon});adj.set(k,[]);}};
 for(const w of ways||[]){if(edges>=60000)break;const t=w.tags||{},geom=w.geometry||[],ids=w.nodes||[];if(!allowedWay(t,mode)||geom.length<2)continue;
  const pts=geom.map((p,i)=>({lat:Number(p.lat),lon:Number(p.lon),id:ids[i]}));
  for(let i=1;i<pts.length;i++){
   if(edges>=60000)break;
   const a=pts[i-1],b=pts[i];if(!Number.isFinite(a.lat)||!Number.isFinite(a.lon)||!Number.isFinite(b.lat)||!Number.isFinite(b.lon))continue;
   const d=kmBetween(a,b);if(d<=0.0001||d>1.5)continue;
   const ka=keyOf(a.lat,a.lon,a.id),kb=keyOf(b.lat,b.lon,b.id);if(ka===kb)continue;
   const edge=[ka,kb].sort().join('|');if(seenEdges.has(edge))continue;seenEdges.add(edge);
   ensure(ka,a);ensure(kb,b);
   // Respect explicit oneway except where bicycle contraflow is indicated.
   const contra=/^(?:no|opposite|opposite_lane|opposite_track)$/.test(t['oneway:bicycle']||'')||String(t.cycleway||'').includes('opposite');
   const one=contra?false:(t['oneway:bicycle']==='yes'||t.oneway==='yes'||t.junction==='roundabout');
   const reverse=String(t.oneway)==='-1';
   if(!one&&!reverse||reverse)adj.get(kb).push({to:ka,km:d,wayId:w.id});
   if(!reverse)adj.get(ka).push({to:kb,km:d,wayId:w.id});
   edges++;
  }
 }
 return {nodes,adj,edges};
}
function dijkstra(net,start,maxDistance){
 const dist=new Map([[start,0]]),parents=new Map(),pq=new Heap();pq.push({id:start,d:0});
 while(pq.size){const u=pq.pop();if(u.d!==dist.get(u.id))continue;if(u.d>maxDistance)continue;
  for(const e of net.adj.get(u.id)||[]){const d=u.d+e.km;if(d>maxDistance||d>=(dist.get(e.to)??Infinity))continue;dist.set(e.to,d);parents.set(e.to,{from:u.id,wayId:e.wayId});pq.push({id:e.to,d});}
 }
 return {dist,parents};
}

// Directed shortest alternate return; paths with heavy overlap are rejected by caller.
function alternateReturn(net,from,to,outwardEdges,maxKm){
 const queue=new Heap(),scores=new Map([[from,0]]),traveled=new Map([[from,0]]),parents=new Map();
 queue.push({id:from,d:0});let visited=0;
 while(queue.size&&visited++<90000){
  const u=queue.pop();if(u.d!==scores.get(u.id))continue;
  if(u.id===to){const path=[to];let p=to;while(parents.has(p)&&path.length<20000){p=parents.get(p);path.push(p);}path.reverse();return path;}
  for(const e of net.adj.get(u.id)||[]){
   const physical=traveled.get(u.id)+e.km;if(physical>maxKm)continue;
   const shared=outwardEdges.has([u.id,e.to].sort().join('|'));
   const score=u.d+e.km*(shared?10:1);
   if(score>maxKm*9||score>=(scores.get(e.to)??Infinity))continue;
   scores.set(e.to,score);traveled.set(e.to,physical);parents.set(e.to,u.id);queue.push({id:e.to,d:score});
  }
 }
 return null;
}

function reconstruct(net,parents,end){const keys=[end];let k=end;while(parents.has(k)&&keys.length<25000){k=parents.get(k).from;keys.push(k);}keys.reverse();return keys.map(id=>({lat:net.nodes.get(id).lat,lon:net.nodes.get(id).lon,ele:null}));}
const approximateCenter = b=>({lat:(b.getSouth()+b.getNorth())/2,lon:(b.getWest()+b.getEast())/2});
function generateConnectedRoutes(ways,{mode='road',bounds,targetKm=8,count=4,routeType='any',startCoord=null}={}){
 const net=buildRouteNetwork(ways,mode);
 if(!net.edges||net.nodes.size<3)return {routes:[],nodeCount:net.nodes.size,edgeCount:net.edges,largestKm:0};
 const center=startCoord&&Number.isFinite(startCoord.lat)&&Number.isFinite(startCoord.lon)?startCoord:(bounds?approximateCenter(bounds):[...net.nodes.values()][0]);
 const nearest=[...net.nodes.values()].sort((a,b)=>Math.abs(a.lat-center.lat)+Math.abs(a.lon-center.lon)-Math.abs(b.lat-center.lat)-Math.abs(b.lon-center.lon)).slice(0,16);
 const origin=nearest.reduce((best,p)=>{
  const score=(net.adj.get(p.id)?.length||0) - kmBetween(p,center)*4;
  return score>best.score?{p,score}:best;
 },{p:nearest[0],score:-Infinity}).p;
 const startGapKm=startCoord?kmBetween(startCoord,origin):0;
 if(startCoord&&startGapKm>2.5)return {routes:[],nodeCount:net.nodes.size,edgeCount:net.edges,largestKm:0,startGapKm,startIssue:`Startpunkten är ${startGapKm.toFixed(1)} km från närmaste tillgängliga väg i den hämtade kartdatan. Flytta kartan till startpunkten och hämta vägar igen.`};
 const {dist,parents}=dijkstra(net,origin.id,Math.max(10,targetKm*1.6));
 const ranked=[...dist].filter(([k,d])=>d>=Math.max(1.3,targetKm*.57)&&d<=targetKm*1.35).map(([id,km])=>({id,km,p:net.nodes.get(id)}));
 ranked.sort((a,b)=>Math.abs(a.km-targetKm)-Math.abs(b.km-targetKm));
 const routes=[],ends=[];
 if(routeType==='any'||routeType==='oneway')for(const entry of ranked){
  // Prevent several nearly identical variations ending on the same block.
  if(ends.some(p=>kmBetween(p,entry.p)<Math.max(.3,targetKm*.12)))continue;
  const points=reconstruct(net,parents,entry.id);if(points.length<3)continue;
  const actual=distanceKm(points);
  if(actual<1.3||actual<targetKm*.57)continue;
  routes.push({name:`Sammanhängande tur · ${actual.toFixed(1)} km`,source:'OSM · sammanfogade verkliga vägsegment',surface:null,roadClass:'connected',mode,points,generated:true,targetKm,graphEdges:net.edges,networkNodeCount:net.nodes.size,verifiedAccess:false});
  ends.push(entry.p);if(routes.length>=count)break;
 }
 // A genuine out-and-back is a useful 10–40 km fallback when the downloaded
 // area is too small for a one-way route of that length. Every leg stays on
 // actual connected OSM edges, with the return track reversed explicitly.
 const backEnds=[];
 if(routeType==='any'||routeType==='outback')for(const [id,oneWayKm] of [...dist].sort((a,b)=>Math.abs(a[1]*2-targetKm)-Math.abs(b[1]*2-targetKm))){
  if(oneWayKm*2<Math.max(2.5,targetKm*.72)||oneWayKm*2>targetKm*1.3)continue;
  const endpoint=net.nodes.get(id);
  if(backEnds.some(p=>kmBetween(p,endpoint)<Math.max(.3,targetKm*.07)))continue;
  // Out-and-back is only a valid route if the return edges are actually legal
  // in the source graph (e.g. not against a marked one-way street).
  let reverseValid=true,walk=id;
  while(parents.has(walk)){
   const back=parents.get(walk).from;
   if(!(net.adj.get(walk)||[]).some(e=>e.to===back)){reverseValid=false;break;}
   walk=back;
  }
  if(!reverseValid)continue;
  const outward=reconstruct(net,parents,id);if(outward.length<4)continue;
  const points=outward.concat(outward.slice(0,-1).reverse().map(p=>({...p})));
  const actual=distanceKm(points);if(actual<2.5)continue;
  routes.push({name:`Tur & retur · ${actual.toFixed(1)} km`,source:'OSM · sammanhängande väg tur och retur',surface:null,roadClass:'connected',mode,points,generated:true,generatedType:'out-and-back',targetKm,graphEdges:net.edges,networkNodeCount:net.nodes.size,verifiedAccess:false});
  backEnds.push(endpoint);if(backEnds.length>=3)break;
 }
 // A REAL loop requires a different lawful return path on the directed graph.
 // Penalise edges used on the outward leg so a backtrack is never mislabeled as a loop.
 if(routeType==='any'||routeType==='loop'){
  const loopEnds=[...dist].filter(([id,d])=>d>targetKm*.22&&d<targetKm*.64)
   .sort((a,b)=>Math.abs(a[1]-targetKm*.5)-Math.abs(b[1]-targetKm*.5)).slice(0,55);
  const foundEnds=[];
  for(const [id] of loopEnds){
   if(foundEnds.length>=2)break;
   const end=net.nodes.get(id);
   if(foundEnds.some(p=>kmBetween(p,end)<Math.max(.35,targetKm*.08)))continue;
   const outwardIds=[];let walk=id;outwardIds.push(walk);
   while(parents.has(walk)&&outwardIds.length<25000){walk=parents.get(walk).from;outwardIds.push(walk);}
   if(walk!==origin.id||outwardIds.length<5)continue;
   outwardIds.reverse();
   const used=new Set();for(let k=1;k<outwardIds.length;k++)used.add([outwardIds[k-1],outwardIds[k]].sort().join('|'));
   const back=alternateReturn(net,id,origin.id,used,targetKm*1.9);
   if(!back||back.length<4)continue;
   let overlap=0;for(let k=1;k<back.length;k++)if(used.has([back[k-1],back[k]].sort().join('|')))overlap++;
   if(overlap/Math.max(1,back.length-1)>.42)continue;
   const ids=outwardIds.concat(back.slice(1));
   const points=ids.map(key=>({lat:net.nodes.get(key).lat,lon:net.nodes.get(key).lon,ele:null}));
   const km=distanceKm(points);
   if(km<targetKm*.68||km>targetKm*1.35)continue;
   routes.push({name:`Rundslinga · ${km.toFixed(1)} km`,source:'OSM · separat ut- och återväg',surface:null,roadClass:'connected',mode,points,generated:true,generatedType:'loop',targetKm,graphEdges:net.edges,networkNodeCount:net.nodes.size,verifiedAccess:false});
   foundEnds.push(end);
  }
 }
 routes.sort((a,b)=>Math.abs(distanceKm(a.points)-targetKm)-Math.abs(distanceKm(b.points)-targetKm));
 routes.length=Math.min(count,routes.length);
 const longest=Math.max(0,...dist.values());
 return {routes,nodeCount:net.nodes.size,edgeCount:net.edges,largestKm:longest,startGapKm};
}

/* module: elevation.js */


function distanceSample(points,maxCount=75){
 if(!Array.isArray(points)||points.length<2)return [];
 const cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+distanceKm([points[i-1],points[i]]));
 const total=cumulative.at(-1);if(total<=0)return [];
 // At least ~100 m spacing, up to 85 measurements, respecting public API limits.
 const count=Math.max(2,Math.min(maxCount,Math.floor(total/.14)+1));
 let segment=1;const result=[];
 for(let i=0;i<count;i++){
  const at=total*i/(count-1);while(segment<cumulative.length-1&&cumulative[segment]<at)segment++;
  const a=points[segment-1],b=points[segment],spread=cumulative[segment]-cumulative[segment-1]||1,t=Math.max(0,Math.min(1,(at-cumulative[segment-1])/spread));
  result.push({lat:a.lat+(b.lat-a.lat)*t,lon:a.lon+(b.lon-a.lon)*t,distance:at});
 }
 return result;
}
const regionEurope=p=>p.lat>=34&&p.lat<=72&&p.lon>=-12&&p.lon<=45;
function interpolateHeights(points,samples,heights){
 const valid=samples.map((p,i)=>({...p,ele:heights[i]})).filter(p=>Number.isFinite(p.ele));
 if(valid.length<2)throw Error('Höjdtjänsten levererade för få giltiga värden.');
 const cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+distanceKm([points[i-1],points[i]]));
 let k=0;
 return points.map((p,i)=>{const d=cumulative[i];while(k<valid.length-2&&valid[k+1].distance<d)k++;
  const a=valid[k],b=valid[k+1],t=Math.max(0,Math.min(1,(d-a.distance)/(b.distance-a.distance||1)));
  return {...p,ele:Number((a.ele+(b.ele-a.ele)*t).toFixed(1))};
 });
}
async function responseJson(url,fetcher,signal,timeout=11000){
 const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),timeout);const stop=()=>ctl.abort();signal?.addEventListener('abort',stop,{once:true});
 try{const r=await fetcher(url,{signal:ctl.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.json();}
 catch(err){if(signal?.aborted)throw Error('Höjdhämtningen avbröts.');if(ctl.signal.aborted)throw Error('Timeout från höjdtjänsten.');throw err;}
 finally{clearTimeout(t);signal?.removeEventListener('abort',stop);}
}
let lastPublicDemoCall=0;
async function enrichRouteElevation(route,{fetcher=fetch,signal,onProgress=()=>{}}={}){
 if(!route||route.points?.length<2)throw Error('Välj en bana först.');
 if(route.points.every(p=>Number.isFinite(p.ele)))return {...route,elevationSource:route.elevationSource||'GPX / befintliga höjddata'};
 const sample=distanceSample(route.points,65);if(sample.length<2)throw Error('Banan är för kort för höjdprofil.');
 const locations=sample.map(p=>`${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join('|');
 const eu=sample.every(regionEurope);const failed=[];
 const datasets=eu?['eudem25m','mapzen']:['mapzen'];
 for(const dataset of datasets){
  if(signal?.aborted)throw Error('Höjdhämtningen avbröts.');
  const label=dataset==='eudem25m'?'EU-DEM 25 m':'Mapzen DEM';
  onProgress(`Försöker ${label} (${sample.length} höjdpunkter) …`);
  try{
   const until=lastPublicDemoCall+1100-Date.now();
   if(until>0)await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,until);signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(Error('Höjdhämtningen avbröts.'));},{once:true});});
   lastPublicDemoCall=Date.now();
   const url=`https://api.opentopodata.org/v1/${dataset}?locations=${encodeURIComponent(locations)}`;
   const raw=await responseJson(url,fetcher,signal,6500);
   if(raw.status!=='OK'||!Array.isArray(raw.results)||raw.results.length!==sample.length)throw Error(raw.error||'Felaktigt höjdsvar');
   const values=raw.results.map(r=>typeof r.elevation==='number'&&Number.isFinite(r.elevation)?r.elevation:null);
   if(values.filter(Number.isFinite).length<sample.length*.85)throw Error('Otillräcklig geografisk täckning');
   return {...route,points:interpolateHeights(route.points,sample,values),elevationSource:`OpenTopoData · ${label}`,elevationResolution:dataset==='eudem25m'?'cirka 25 m':'ungefär 30 m',elevationSamples:sample.length,elevationLicense:'OpenTopoData dataset, källa och licens enligt dataleverantör'};
  }catch(err){if(signal?.aborted)throw err;failed.push(`${label}: ${err.message||String(err)}`);}
 }
 // An independent service with worldwide Copernicus GLO-90 coverage.
 // IMPORTANT: its free endpoint is non-commercial ONLY and must not be used
 // as a commercial product data source without a separate licence/plan.
 onProgress('Försöker reservkälla Open-Meteo / Copernicus GLO-90 (90 m) …');
 try{
  const lat=sample.map(p=>p.lat.toFixed(5)).join(','),lon=sample.map(p=>p.lon.toFixed(5)).join(',');
  const url=`https://api.open-meteo.com/v1/elevation?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`;
  const raw=await responseJson(url,fetcher,signal,9000);
  if(!Array.isArray(raw.elevation)||raw.elevation.length!==sample.length)throw Error(raw.reason||'Ogiltigt svar från Open-Meteo');
  const values=raw.elevation.map(v=>Number.isFinite(v)?v:null);
  if(values.filter(Number.isFinite).length<sample.length*.85)throw Error('Otillräcklig täckning i Copernicus DEM');
  return {...route,points:interpolateHeights(route.points,sample,values),elevationSource:'Open-Meteo / Copernicus DEM GLO-90',elevationResolution:'90 m',elevationSamples:sample.length,elevationLicense:'Open-Meteo CC BY 4.0 / Copernicus · gratis API endast icke-kommersiellt'};
 }catch(err){if(signal?.aborted)throw err;failed.push(`Open-Meteo: ${err.message||String(err)}`);}
 throw Error('Höjddata saknas eftersom ingen höjdkälla svarade. '+failed.join(' · '));
}

/* module: route-discovery.js */


function bounded(x,a,b){return Math.min(b,Math.max(a,x));}
const earthKm=(a,b)=>distanceKm([a,b]);
function viewportOf(bounds){
 const south=Number(bounds.getSouth()),north=Number(bounds.getNorth()),west=Number(bounds.getWest()),east=Number(bounds.getEast());
 if(![south,north,west,east].every(Number.isFinite)||north<=south||east<=west)throw Error('Ogiltigt kartområde.');
 return {south,north,west,east,center:{lat:(south+north)/2,lon:(west+east)/2}};
}
function pointInView(p,box){return p.lat>=box.south&&p.lat<=box.north&&p.lon>=box.west&&p.lon<=box.east;}
function intersectsSegment(a,b,r){
 // Line segment vs rectangular lat/lon viewport using Liang–Barsky.
 let min=0,max=1;const dx=b.lon-a.lon,dy=b.lat-a.lat;
 const tests=[[-dx,a.lon-r.west],[dx,r.east-a.lon],[-dy,a.lat-r.south],[dy,r.north-a.lat]];
 for(const [p,q] of tests){if(p===0){if(q<0)return false;continue;}const t=q/p;
  if(p<0){if(t>max)return false;if(t>min)min=t;}
  else{if(t<min)return false;if(t<max)max=t;}
 }
 return min<=max;
}
function pointToSegmentKm(p,a,b){
 const cos=Math.max(.15,Math.cos(p.lat*Math.PI/180));
 const scaleX=111.32*cos,scaleY=111.32;
 const ax=(a.lon-p.lon)*scaleX,ay=(a.lat-p.lat)*scaleY;
 const bx=(b.lon-p.lon)*scaleX,by=(b.lat-p.lat)*scaleY;
 const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy;
 const t=den>0?bounded(-(ax*dx+ay*dy)/den,0,1):0;
 return Math.hypot(ax+dx*t,ay+dy*t);
}
function segmentViewportDistanceKm(a,b,box){
 if(intersectsSegment(a,b,box))return 0;
 const closestA={lat:bounded(a.lat,box.south,box.north),lon:bounded(a.lon,box.west,box.east)};
 const closestB={lat:bounded(b.lat,box.south,box.north),lon:bounded(b.lon,box.west,box.east)};
 let d=Math.min(earthKm(a,closestA),earthKm(b,closestB));
 const corners=[{lat:box.south,lon:box.west},{lat:box.south,lon:box.east},{lat:box.north,lon:box.west},{lat:box.north,lon:box.east}];
 for(const c of corners)d=Math.min(d,pointToSegmentKm(c,a,b));
 return d;
}
function routeViewportMetrics(route,bounds){
 if(!route?.points?.length)return {crosses:false,nearKm:Infinity,km:0};
 const box=viewportOf(bounds),pts=route.points;
 let crosses=false,nearKm=Infinity;
 const stride=Math.max(1,Math.floor(pts.length/1200));
 const sampled=[];for(let i=0;i<pts.length;i+=stride)sampled.push(pts[i]);if(sampled.at(-1)!==pts.at(-1))sampled.push(pts.at(-1));
 for(let i=0;i<sampled.length;i++){
  const p=sampled[i];if(!Number.isFinite(p?.lat)||!Number.isFinite(p?.lon))continue;
  if(pointInView(p,box)){crosses=true;nearKm=0;break;}
  const nearest={lat:bounded(p.lat,box.south,box.north),lon:bounded(p.lon,box.west,box.east)};
  nearKm=Math.min(nearKm,earthKm(p,nearest));
  if(i>0){const sd=segmentViewportDistanceKm(sampled[i-1],p,box);nearKm=Math.min(nearKm,sd);if(sd===0){crosses=true;nearKm=0;break;}}
 }
 return {crosses,nearKm,km:Number(route.distanceKm)||distanceKm(pts)};
}
function nearbyRoutes(routes,bounds,{limit=12,radiusKm=3}={}){
 return (routes||[]).map(route=>({route,geo:routeViewportMetrics(route,bounds)}))
 .filter(x=>x.geo.crosses||x.geo.nearKm<=radiusKm)
 .sort((a,b)=>Number(b.geo.crosses)-Number(a.geo.crosses)||a.geo.nearKm-b.geo.nearKm||Math.abs(a.geo.km-15)-Math.abs(b.geo.km-15))
 .slice(0,limit);
}
function rankedRoutes(routes,bounds,{targetKm=10,mode='road',limit=12}={}){
 const seen=new Set();return (routes||[]).filter(r=>r?.points?.length>1).map(route=>{
  const geo=routeViewportMetrics(route,bounds);
  const distancePenalty=Math.abs(geo.km-targetKm)/Math.max(5,targetKm);
  // An editorial relevance score; NOT user ratings or verified course quality.
  const modeBonus=route.mode===mode?18:0;
  const proximityPenalty=Math.min(60,geo.nearKm*6);
  const score=100+modeBonus-Math.min(80,distancePenalty*18)-proximityPenalty+(geo.crosses?12:0);
  return {route,geo,score};
 }).sort((a,b)=>b.score-a.score).filter(x=>{
  const pts=x.route.points,first=pts[0],last=pts.at(-1);
  const key=[x.route.mode||'road',Math.round(x.geo.km*2),first.lat.toFixed(3),first.lon.toFixed(3),last.lat.toFixed(3),last.lon.toFixed(3)].join(':');
  if(seen.has(key))return false;seen.add(key);return true;
 }).slice(0,limit);
}
const mockBounds=(south,west,north,east)=>({getSouth:()=>south,getWest:()=>west,getNorth:()=>north,getEast:()=>east});
function planViewportCoverage(bounds,{maxPatches=3}={}){
 const b=viewportOf(bounds);
 const latSpan=b.north-b.south,lonSpan=b.east-b.west;
 // Individual queries are ALWAYS budgeted to protect public Overpass instances.
 // There is NO maximum user viewport size. A large map is sampled in multiple
 // patches and the UI explicitly says the whole area was not exhaustively searched.
 const tileLat=.085,tileLon=.115;
 if(latSpan<=tileLat&&lonSpan<=tileLon)return {patches:[mockBounds(b.south,b.west,b.north,b.east)],partial:false};
 const n=Math.max(1,Math.min(5,Math.floor(maxPatches)));
 const positions=[ [.5,.5],[.28,.28],[.72,.72],[.28,.72],[.72,.28] ];
 const patches=[],seen=new Set();
 for(const [u,v] of positions.slice(0,n)){
  const cy=b.south+latSpan*u,cx=b.west+lonSpan*v;
  const hh=Math.min(tileLat,latSpan)/2,hw=Math.min(tileLon,lonSpan)/2;
  const s=Math.max(b.south,cy-hh),nn=Math.min(b.north,cy+hh),w=Math.max(b.west,cx-hw),e=Math.min(b.east,cx+hw);
  const k=[s,w,nn,e].map(x=>x.toFixed(3)).join('/');
  if(!seen.has(k)){seen.add(k);patches.push(mockBounds(s,w,nn,e));}
 }
 return {patches,partial:true};
}
function mergeOSMWays(responses,{maxWays=2600}={}){
 const map=new Map();for(const list of responses||[])for(const w of list||[]){
  if(!w?.geometry?.length)continue;
  const key=String(w.id??'geo:'+w.geometry[0]?.lat+':'+w.geometry[0]?.lon);
  if(!map.has(key))map.set(key,w);if(map.size>=maxWays)break;
 }
 return [...map.values()];
}

/* module: experience-engine.js */

const DEMO_RIDERS = Object.freeze([
  {id:'aurora',name:'AURORA',color:'#ffb874',baseKmh:20.7,lane:-0.56,offsetM:54},
  {id:'ridge',name:'RIDGE',color:'#7dd2fa',baseKmh:19.0,lane:0.48,offsetM:22},
  {id:'nova',name:'NOVA',color:'#eab6ff',baseKmh:21.4,lane:-0.08,offsetM:12},
  {id:'vista',name:'VISTA',color:'#f3e7b8',baseKmh:19.4,lane:0.73,offsetM:-18},
  {id:'solar',name:'SOLAR',color:'#77e6c9',baseKmh:20.1,lane:-0.71,offsetM:-46},
  {id:'ember',name:'EMBER',color:'#ff8e95',baseKmh:21.0,lane:0.10,offsetM:76},
]);
class SyntractRaceState {
  constructor(){this.reset();}
  reset(){
    this.elapsed=0;this.playerKm=0;this.watts=0;this.speedKmh=0;this.grade=null;this.running=false;
    this.bots=DEMO_RIDERS.map((b,i)=>({...b,km:Math.max(0,.07+b.offsetM/1000),drift:0}));
    this.playerStartKm=0.07; // all riders start together with small staggered positions
    this.events=[];this.lastPosition=4;this.lastGradeBucket=null;this.seq=0;
    this.lastSnapshot=this.snapshot();this.lastPosition=this.lastSnapshot.position;
  }
  step({elapsed,km,watts=0,speedKmh=0,grade=null,running=true}){
    const dt=Math.max(0,Math.min(3,Number(elapsed)-this.elapsed));
    this.elapsed=Math.max(0,Number(elapsed)||0);
    this.playerKm=Math.max(0,Number(km)||0);
    this.watts=Math.max(0,Number(watts)||0);
    this.speedKmh=Math.max(0,Number(speedKmh)||0);
    this.grade=Number.isFinite(grade)?Number(grade):null;
    this.running=!!running;
    for(let i=0;i<this.bots.length;i++){
      const b=this.bots[i];
      const oscillation=1.5*Math.sin(this.elapsed/17+i*0.94)+0.7*Math.sin(this.elapsed/5+i*2.1);
      const hillAdjustment=this.grade===null?0:Math.max(-5,Math.min(5,this.grade))*-0.28;
      b.speedKmh=Math.max(8,b.baseKmh+oscillation+hillAdjustment);
      if(running)b.km+=(b.speedKmh*dt)/3600;
      b.laneAnimated=b.lane+0.11*Math.sin(this.elapsed/8+i*1.41);
    }
    const snap=this.snapshot();
    if(running&&this.elapsed>1){
      if(snap.position!==this.lastPosition){
        const improving=snap.position<this.lastPosition;
        this.events.push({seq:++this.seq,kind:improving?'overtake':'passed',text:improving?'Du avancerar till plats '+snap.position+'.':'Du är nu på plats '+snap.position+'.',elapsed:this.elapsed});
      }
      const bucket=this.grade===null?null:this.grade>3?1:this.grade< -3?-1:0;
      if(bucket!==null&&bucket!==this.lastGradeBucket&&this.lastGradeBucket!==null){
        const t=bucket>0?'En stigning närmar sig.':bucket<0?'Nu blir det utför.':'Lutningen planar ut.';
        this.events.push({seq:++this.seq,kind:'grade',text:t,elapsed:this.elapsed});
      }
      this.lastGradeBucket=bucket;
    }
    this.lastPosition=snap.position;
    if(this.events.length>30)this.events.splice(0,this.events.length-30);
    this.lastSnapshot=snap;
    return snap;
  }
  snapshot(){
    const player={id:'player',name:'PATRIK · DU',color:'#65f6d8',me:true,km:this.playerKm+0.07,speedKmh:this.speedKmh,lane:0};
    const others=this.bots.map(b=>({...b,me:false,lane:b.laneAnimated??b.lane}));
    const all=[player,...others].sort((a,b)=>b.km-a.km);
    const position=all.findIndex(x=>x.me)+1;
    const inRange=others.filter(b=>Math.abs((b.km-player.km)*1000)<=55);
    const front=others.filter(b=>b.km>player.km).sort((a,b)=>a.km-b.km)[0]??null;
    const behind=others.filter(b=>b.km<player.km).sort((a,b)=>b.km-a.km)[0]??null;
    return {elapsed:this.elapsed,player,all,others,position,total:all.length,nearby:inRange.length,frontGapM:front?Math.round((front.km-player.km)*1000):null,backGapM:behind?Math.round((player.km-behind.km)*1000):null,grade:this.grade,watts:this.watts,speedKmh:this.speedKmh,running:this.running,events:this.events.slice(),simulated:true};
  }
}
function experienceText(state,detail='tactical'){
  const base=`Plats ${state.position} av ${state.total}. ${Math.round(state.speedKmh)} kilometer i timmen.`;
  if(detail==='essential')return base;
  const gap=state.frontGapM===null?'Ingen framför dig.':`${state.frontGapM} meter till nästa cyklist.`;
  const grade=state.grade===null?'Lutning saknas.':`Lutning ${state.grade.toFixed(1).replace('.',',')} procent.`;
  if(detail==='tactical')return `${base} ${gap} ${state.nearby} cyklister inom femtiofem meter. ${grade}`;
  return `${base} ${gap} ${state.nearby} cyklister nära. ${grade} Effekt ${Math.round(state.watts)} watt. ${state.backGapM===null?'Ingen bakom dig.':state.backGapM+' meter till cyklisten bakom.'}`;
}

/* module: race-renderer.js */

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
function polygon(ctx,points,fill){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
function cloud(ctx,x,y,s,color){ctx.fillStyle=color;for(const [dx,dy,rad] of [[-30,4,23],[0,0,31],[28,5,20],[6,-15,22]]){ctx.beginPath();ctx.ellipse(x+dx*s,y+dy*s,rad*s,rad*s*.57,0,0,Math.PI*2);ctx.fill();}}
function bike(ctx,x,y,scale,color,player=false,lean=0){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(lean);
 ctx.fillStyle='#0c1720aa';ctx.beginPath();ctx.ellipse(0,4,30,7,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#111f29';ctx.lineWidth=4;for(const dx of [-21,20]){ctx.beginPath();ctx.ellipse(dx,-3,11,14,0,0,Math.PI*2);ctx.stroke();}
 ctx.lineWidth=3;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(-21,-3);ctx.lineTo(-5,-24);ctx.lineTo(20,-3);ctx.lineTo(-21,-3);ctx.moveTo(-5,-24);ctx.lineTo(7,-5);ctx.stroke();
 ctx.strokeStyle='#d9e6ef';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-4,-28);ctx.lineTo(-10,-45);ctx.lineTo(8,-50);ctx.stroke();
 ctx.strokeStyle='#2b3442';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-9,-36);ctx.lineTo(-15,-16);ctx.moveTo(2,-35);ctx.lineTo(10,-16);ctx.stroke();
 ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-12,-62);ctx.lineTo(11,-62);ctx.lineTo(7,-39);ctx.lineTo(-9,-41);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#f3bfa0';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-8,-60);ctx.lineTo(-20,-47);ctx.lineTo(-15,-41);ctx.moveTo(9,-60);ctx.lineTo(19,-49);ctx.lineTo(14,-41);ctx.stroke();
 ctx.fillStyle='#14212a';ctx.beginPath();ctx.ellipse(0,-77,10,12,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=player?'#a8ffed':color;ctx.beginPath();ctx.moveTo(-12,-77);ctx.quadraticCurveTo(-6,-94,5,-89);ctx.quadraticCurveTo(15,-85,12,-78);ctx.closePath();ctx.fill();
 if(player){ctx.fillStyle='#0b2026';ctx.font='bold 7px system-ui';ctx.textAlign='center';ctx.fillText('PATR',0,-49);}
 ctx.restore();
}
function tree(ctx,x,y,size,pine=true){ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.fillStyle='#243c39';ctx.fillRect(-2,-30,4,32);if(pine){for(const z of [0,1,2]){const yy=-27-z*14;polygon(ctx,[[-15+z*2,yy],[0,yy-28],[15-z*2,yy]],['#1f5450','#28645a','#316b5b'][z]);}}else{ctx.fillStyle='#39745d';ctx.beginPath();ctx.ellipse(0,-49,17,23,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
function paintSyntractRace(ctx,w,h,snapshot,clock,discipline='road',visual='tactical'){
  if(!snapshot||!w||!h)return;
  const t=Number.isFinite(clock)?clock:0,progress=snapshot.player.km*1000;
  const alpine=discipline==='road',forest=discipline==='mtb'||discipline==='downhill',gold=discipline==='gravel';
  const horizon=h*.365;
  const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,forest?'#123450':gold?'#253e57':'#17395b');bg.addColorStop(.50,forest?'#6c9190':gold?'#cea17b':'#9bc4cc');bg.addColorStop(1,forest?'#356b5c':gold?'#a57b57':'#4a8d73');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  const lightX=w*.75,lightY=h*.18;
  const sun=ctx.createRadialGradient(lightX,lightY,5,lightX,lightY,w*.45);sun.addColorStop(0,'#ffe5ac99');sun.addColorStop(.4,'#f2d7ad22');sun.addColorStop(1,'#ffffff00');ctx.fillStyle=sun;ctx.fillRect(0,0,w,h);
  cloud(ctx,w*.22+Math.sin(t*.016)*14,h*.17,w/1350,'#dbf4e93b');cloud(ctx,w*.76-Math.sin(t*.009)*18,h*.12,w/1700,'#f1f8ec33');
  // Multiple parallax ranges create depth, without claiming geographic reconstruction.
  for(let layer=0;layer<3;layer++){
    const y=horizon-h*(.17-layer*.055),amp=h*(.10-layer*.025);
    ctx.beginPath();ctx.moveTo(0,horizon+35);
    for(let j=0;j<=72;j++){
      const xx=j/72*w;
      const shift=progress*.0007*(1+layer*.3);
      const yy=y-Math.abs(Math.sin(j*.27+shift+layer*3.2))*(amp*.62)-Math.abs(Math.sin(j*.11+layer*2.1+shift))*(amp*.48);
      ctx.lineTo(xx,yy);
    }
    ctx.lineTo(w,horizon+35);ctx.closePath();ctx.fillStyle=["#446b79","#396777","#315c64"][layer];ctx.fill();
  }
  ctx.fillStyle=forest?'#34694e':gold?'#867a51':'#3d8063';ctx.fillRect(0,horizon,w,h-horizon);
  // Small landscape fields / shoulder shadows follow the road.
  const road = z => {
    const perspective=1/(1+z/57),v=1-perspective;
    const curvature=(Math.sin((progress+z)/225)*.065+Math.sin((progress+z)/75)*.022)*(w*.72)*(1-v*.55);
    const x=w*.5+curvature;
    const y=horizon+(h-horizon)*perspective;
    const half=(w*.37*perspective)+w*.016;
    return {x,y,half,perspective};
  };
  const Z=460,seg=24;
  for(let z=Z;z>=0;z-=seg){
    const a=road(z),b=road(Math.max(0,z-seg));
    const mud=forest?'#4d5c46':gold?'#be9065':'#b8c6a0';
    polygon(ctx,[[a.x-a.half*1.19,a.y],[a.x+a.half*1.19,a.y],[b.x+b.half*1.19,b.y],[b.x-b.half*1.19,b.y]],mud);
    polygon(ctx,[[a.x-a.half,a.y],[a.x+a.half,a.y],[b.x+b.half,b.y],[b.x-b.half,b.y]],forest?'#475b56':gold?'#a0815d':'#465b64');
    ctx.strokeStyle='#a4b5ab';ctx.lineWidth=Math.max(1.2,b.perspective*4.5);
    for(const edge of [-.90,.90]){ctx.beginPath();ctx.moveTo(a.x+a.half*edge,a.y);ctx.lineTo(b.x+b.half*edge,b.y);ctx.stroke();}
    if(Math.floor((z+progress)/16)%3===0){ctx.strokeStyle='#eeddb5';ctx.lineWidth=Math.max(1,b.perspective*3);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  }
  // Roadside 3D-scale vegetation: distant first.
  for(let z=430;z>=10;z-=24){
    const r=road(z),seed=Math.floor((progress+z)/24);
    for(const side of [-1,1]){
      if((seed+Math.floor((side+1)*17))%4===0)continue;
      const s=clamp(r.perspective*w/950,.12,2.4);
      const xx=r.x+side*r.half*(1.24+.18*Math.abs(Math.sin(seed*1.7)));
      tree(ctx,xx,r.y+4*s,s,forest||seed%4!==0);
    }
  }
  // Subtle sunlight and live motion marks.
  const high=road(360);ctx.fillStyle='#d1f6eb11';ctx.beginPath();ctx.moveTo(high.x,high.y);ctx.lineTo(w*.75,0);ctx.lineTo(w*.96,0);ctx.closePath();ctx.fill();
  const others=snapshot.others.map(b=>({b,d:(b.km-snapshot.player.km)*1000})).filter(x=>x.d>=0&&x.d<380).sort((a,b)=>b.d-a.d);
  for(const {b,d} of others){
    const p=road(clamp(d+62,62,440));const x=p.x+(b.lane||0)*p.half*.72;
    const size=clamp(p.perspective*w/690,.15,1.28);
    bike(ctx,x,p.y-3*size,size,b.color,false,Math.sin(t/3+Number(b.offsetM))*.025);
    if((visual==='detailed'||visual==='tactical')&&d>=0&&d<130){ctx.textAlign='center';ctx.fillStyle='#f2fbf9';ctx.shadowBlur=5;ctx.shadowColor='#081b27';ctx.font=`800 ${clamp(size*10,9,16)}px system-ui`;ctx.fillText(b.name,x,p.y-91*size);ctx.shadowBlur=0;}
  }
  const me=road(30);bike(ctx,me.x,me.y,clamp(w/850,.8,1.55),'#75f5d7',true,Math.sin(t*.02)*.022);
  // Subtle bezel / cinematic vignette.
  const grad=ctx.createRadialGradient(w*.5,h*.45,w*.18,w*.5,h*.5,w*.85);grad.addColorStop(0,'#00000000');grad.addColorStop(1,'#06151d7c');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  if(visual!=='minimal'){
    ctx.fillStyle='#091e2cbf';ctx.beginPath();ctx.roundRect(w*.5-64,13,128,32,14);ctx.fill();
    ctx.fillStyle='#e4f8f1';ctx.font='800 11px system-ui';ctx.textAlign='center';ctx.fillText(`${snapshot.nearby} CYKLISTER NÄRA`,w*.5,33);
  }
  if(visual==='detailed'){
    ctx.fillStyle='#06202abb';ctx.beginPath();ctx.roundRect(17,h*.55,147,53,10);ctx.fill();ctx.fillStyle='#b4f9e9';ctx.font='700 13px system-ui';ctx.textAlign='left';ctx.fillText('SIMULERAD TERRÄNG',28,h*.55+22);ctx.fillStyle='#d0e3e1';ctx.font='11px system-ui';ctx.fillText(snapshot.grade===null?'Lutning okänd':`${snapshot.grade.toFixed(1)}% lutning`,28,h*.55+41);
  }
}

/* module: syntract-scene-oracles.js */

const SCENE_LABELS=Object.freeze({countryside:'Landsväg & fält',forest:'Skog & trail',alpine:'Alpin terräng',arid:'Torrt landskap',urban:'Stadsnära'});
const PALETTES=Object.freeze({
 countryside:{ground:[.29,.46,.24],grass:[.19,.38,.18],pine:[.08,.25,.18],leaf:[.21,.42,.19],road:[.19,.24,.27],shoulder:[.45,.39,.29],fog:[.64,.79,.82],sun:[1,.89,.71],terrainAmp:1.7},
 forest:{ground:[.14,.31,.22],grass:[.11,.29,.18],pine:[.07,.20,.16],leaf:[.17,.35,.19],road:[.17,.23,.21],shoulder:[.37,.34,.24],fog:[.51,.72,.73],sun:[.96,.88,.69],terrainAmp:2.8},
 alpine:{ground:[.30,.42,.29],grass:[.25,.40,.24],pine:[.08,.22,.19],leaf:[.26,.43,.22],road:[.20,.24,.29],shoulder:[.49,.49,.42],fog:[.68,.81,.92],sun:[1,.92,.77],terrainAmp:5.6},
 arid:{ground:[.57,.37,.21],grass:[.45,.35,.23],pine:[.26,.32,.19],leaf:[.39,.37,.24],road:[.27,.23,.22],shoulder:[.70,.52,.30],fog:[.87,.70,.57],sun:[1,.85,.62],terrainAmp:3.5},
 urban:{ground:[.28,.42,.31],grass:[.23,.35,.22],pine:[.13,.26,.19],leaf:[.28,.45,.27],road:[.20,.24,.28],shoulder:[.42,.46,.42],fog:[.67,.80,.87],sun:[1,.90,.75],terrainAmp:1.0},
});
function finite(n){return typeof n==='number'&&Number.isFinite(n);}
const BIOMES=Object.keys(SCENE_LABELS),SURFACES=['asphalt','gravel','trail'],VEGETATION=['sparse','medium','dense'],ATMOSPHERE=['clear','hazy'],LIGHT=['day','late'],SEASONS=['summer','autumn','winter'],ROADSIDE=['open','barrier'];
const QCDS_SCENE_DOMAIN=Object.freeze({biome:BIOMES,surface:SURFACES,vegetation:VEGETATION,atmosphere:ATMOSPHERE,lighting:LIGHT,season:SEASONS,roadside:ROADSIDE});

function inferSyntractScene({route=null,mode='road',override='auto',seasonOverride='auto',roadsideOverride='auto',lightingOverride='auto',atmosphereOverride='auto'}={}){
 const raw=`${route?.surface||route?.tags?.surface||''} ${route?.highway||route?.tags?.highway||''}`.toLowerCase();
 const name=String(route?.name||'').toLowerCase();
 const hasDemo=route?.demo===true;
 const heights=(route?.points||[]).map(p=>p.ele).filter(finite);
 const high=heights.length?Math.max(...heights)>=950:null;
 const grounded=Array.isArray(route?.points)&&route.points.length>1;
 let sourceSurface=null;
 if(/asphalt|paved|concrete|tarmac/.test(raw))sourceSurface='asphalt';
 if(/gravel|unpaved|fine_gravel|compacted/.test(raw))sourceSurface='gravel';
 if(/path|singletrack|trail|footway/.test(raw))sourceSurface='trail';
 const forestTag=/forest|skog|woodland|trail/.test(name),desertTag=/desert|öken|moab/.test(name),urbanTag=/urban|city|stad|innerstad|residential/.test(name);
 const qcs=[
  {id:'QC01',name:'Verifierat underlag',source:sourceSurface,weight:8,hard:true,accept:s=>s.surface===sourceSurface},
  {id:'QC02',name:'Disciplinens vägtyp',source:mode,weight:3,accept:s=>s.surface===(mode==='gravel'?'gravel':mode==='road'?'asphalt':'trail')},
  {id:'QC03',name:'Inläst alpin höjd',source:high===true?'hög höjd':null,weight:7,accept:s=>s.biome==='alpine'},
  {id:'QC04',name:'Namn anger skog/trail',source:forestTag?'namn':null,weight:5,accept:s=>s.biome==='forest'},
  {id:'QC05',name:'Namn anger torrt landskap',source:desertTag?'namn':null,weight:5,accept:s=>s.biome==='arid'},
  {id:'QC06',name:'Namn anger stadsnära',source:urbanTag?'namn':null,weight:5,accept:s=>s.biome==='urban'},
  {id:'QC07',name:'Skogsdiciplin',source:mode==='mtb'||mode==='downhill'?'MTB':null,weight:3,accept:s=>s.biome==='forest'},
  {id:'QC08',name:'Landsvägsgrundläge',source:mode==='road'?'väg':null,weight:3,accept:s=>s.biome==='countryside'},
  {id:'QC09',name:'Grusmiljögrundläge',source:mode==='gravel'?'gravel':null,weight:3,accept:s=>s.biome==='arid'||s.biome==='countryside'},
  {id:'QC10',name:'Omgivning och vägsynlighet',source:'visuell läsbarhet',weight:1,accept:s=>s.vegetation!=='dense'||s.biome==='forest'},
  {id:'QC11',name:'Tydligt dagsljus',source:'standard (ej mätning)',weight:1,accept:s=>s.lighting==='day'},
  {id:'QC12',name:'Okänt väder – neutralt',source:'standard (ej väderdata)',weight:1,accept:s=>s.atmosphere==='clear'},
  {id:'QC13',name:'Syntetisk sommargrund',source:'illustration (ej årstidsmätning)',weight:1,accept:s=>s.season==='summer'},
  {id:'QC14',name:'Siktrensad vägkant',source:'illustration',weight:1,accept:s=>s.roadside==='open'},
  {id:'QC15',name:'Barriär i alpin/urban miljö',source:mode==='road'?'grafikheuristik':null,weight:1.5,accept:s=>s.roadside==='barrier'&&(s.biome==='alpine'||s.biome==='urban')},
 ];
 const candidates=[];
 for(const biome of BIOMES)for(const surface of SURFACES)for(const vegetation of VEGETATION)
  for(const atmosphere of ATMOSPHERE)for(const lighting of LIGHT)for(const season of SEASONS)for(const roadside of ROADSIDE){
    const state={biome,surface,vegetation,atmosphere,lighting,season,roadside};let score=0,excluded=false;
    for(const qc of qcs){if(qc.source===null)continue;const pass=qc.accept(state);if(!pass&&qc.hard){excluded=true;break;}
      if(pass)score+=qc.weight;
    }
    if(override!=='auto'&&Object.hasOwn(SCENE_LABELS,override)&&biome!==override)excluded=true;
    if(seasonOverride!=='auto'&&season!==seasonOverride)excluded=true;
    if(roadsideOverride!=='auto'&&roadside!==roadsideOverride)excluded=true;
    if(lightingOverride!=='auto'&&lighting!==lightingOverride)excluded=true;
    if(atmosphereOverride!=='auto'&&atmosphere!==atmosphereOverride)excluded=true;
    if(!excluded){
      // When evidence is absent, use clear, neutral defaults; these are illustrated, not asserted facts.
      score+=biome==='countryside'?1.1:0;
      score+=surface==='asphalt'?.2:0;
      score+=vegetation==='medium'?.4:0;
      candidates.push({...state,score});
    }
  }
 candidates.sort((a,b)=>b.score-a.score||a.biome.localeCompare(b.biome));
 const winner=candidates[0];if(!winner)throw Error('Inga scenkandidater uppfyller oraklen');
 const checks=qcs.map(qc=>({id:qc.id,evidence:qc.name,known:qc.source!==null,met:qc.source!==null&&qc.accept(winner),hard:!!qc.hard,source:qc.source}));
 const palette={...PALETTES[winner.biome]};
 if(winner.atmosphere==='hazy')palette.fog=palette.fog.map(v=>v*.82);
 if(winner.season==='autumn'){palette.leaf=[.73,.40,.14];palette.grass=[.38,.36,.17];palette.ground=palette.ground.map((v,i)=>i===0?Math.min(1,v*1.18):v*.85);}
 if(winner.season==='winter'){palette.leaf=[.39,.49,.48];palette.pine=[.12,.24,.24];palette.ground=[.52,.57,.56];palette.grass=[.38,.43,.40];palette.fog=[.73,.82,.89];}
 // We retain the complete candidate ranking for auditing, never claim this is quantum amplification.
 const mass=candidates.slice(0,5).map(c=>Math.exp((c.score-winner.score)/3)),total=mass.reduce((a,b)=>a+b,0);
 const entropy=-mass.reduce((a,m)=>{const p=m/total;return a+p*Math.log2(p);},0);
 return {biome:winner.biome,label:SCENE_LABELS[winner.biome],palette,state:winner,checks,matched:checks.filter(q=>q.met),
  candidateCount:candidates.length,topK:candidates.slice(0,5),entropy,score:winner.score,
  evidence:hasDemo?'Helt syntetisk demovärld':grounded?'Ruttgeometri inläst':'Illustrerad demoskiss',realElevation:heights.length>0&&!hasDemo,syntheticElevation:hasDemo,
  georeferenced:false,scope:'CYCLING ONLY',inference:'Klassisk orakelbaserad kandidatvärdering; ej full QCDS kvantinferens'};
}

/* module: syntract-graphics.js */

const vert=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNorm;
layout(location=2) in vec3 aCol;
layout(location=3) in float aMat;
uniform float uAspect;
uniform float uPitch;
uniform float uCamY;
out vec3 vNorm;
out vec3 vCol;
out vec3 vWorld;
out float vDepth;
out float vMat;
void main(){
 float z=max(0.16,aPos.z+7.0);
 float f=1.64;
 gl_Position=vec4(aPos.x*f/uAspect,(aPos.y-uCamY+uPitch*z)*f,(1000.2/999.8)*z-(400.0/999.8),z);
 vNorm=aNorm;vCol=aCol;vWorld=aPos;vDepth=z;vMat=aMat;
}`;
const frag=`#version 300 es
precision highp float;
in vec3 vNorm;in vec3 vCol;in vec3 vWorld;in float vDepth;in float vMat;
uniform vec3 uFog;
uniform float uTime;
uniform float uLate;
out vec4 oColor;
float noise2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
void main(){
 vec3 n=normalize(vNorm);
 vec3 light=normalize(vec3(-.35,.86,-.43));
 float dif=max(dot(n,light),0.0);
 float ambient=.46+max(n.y,0.0)*.09;
 vec3 c=vCol*(ambient+.77*dif);
 c=mix(c,c*vec3(1.15,.82,.70)*.92,uLate*.55);
 if(vMat<2.5){
   float a=noise2(floor(vWorld.xz*17.0));
   float b=noise2(floor(vWorld.xz*3.2));
   c*=1.0+(a-.5)*.18+(b-.5)*.11;
 }
 if(vMat>2.3&&vMat<3.2){
  float micro=noise2(floor(vWorld.xz*34.0));c*=.92+.10*micro;
 }
 float fog=1.0-exp(-pow(max(vDepth-28.0,0.0)/390.0,1.55));
 oColor=vec4(mix(c,uFog,clamp(fog,0.0,.82)),1.0);
}`;
const skyVert=`#version 300 es
precision mediump float;
layout(location=0) in vec2 p;out vec2 uv;
void main(){uv=(p+1.0)*.5;gl_Position=vec4(p,0.0,1.0);}`;
const skyFrag=`#version 300 es
precision highp float;
in vec2 uv;
uniform vec3 uFog;
uniform float uTime;
uniform float uAlpine;
uniform float uLate;
out vec4 oColor;
float hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noiz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x),mix(hsh(i+vec2(0,1)),hsh(i+vec2(1,1)),f.x),f.y);}
void main(){
 float y=uv.y;
 vec3 sky=mix(uFog*.92,vec3(.13,.30,.53),smoothstep(.28,1.0,y));
 sky=mix(sky,vec3(.43,.62,.73),(1.0-smoothstep(.34,.58,y))*.13);
 float x=uv.x;
 float sun=exp(-pow(distance(uv,vec2(.79,.78))/.065,2.0)*2.0);
 float halo=exp(-pow(distance(uv,vec2(.79,.78))/.24,2.0)*3.0);
 sky+=vec3(1.0,.76,.46)*(sun*.68+halo*.15);
 sky=mix(sky,vec3(.76,.40,.31)*(.55+.30*uv.y),uLate*.45);
 vec2 cloudp=uv*vec2(4.7,10.0)+vec2(uTime*.0006,0);
 float clouds=noiz(cloudp)*.55+noiz(cloudp*2.4)*.29+noiz(cloudp*5.7)*.16;
 float ca=smoothstep(.52,.72,clouds)*smoothstep(.59,.85,y)*.64;
 sky=mix(sky,vec3(.97,.96,.89),ca);
 float mount=.60 +(.055+.08*uAlpine)*sin(x*9.7+1.2)+(.033+.06*uAlpine)*sin(x*21.1+.7)+.022*sin(x*43.1+4.);
 float mount2=.53 +(.045+.045*uAlpine)*sin(x*12.7+2.6)+.021*sin(x*39.0+2.7);
 float peaks=smoothstep(mount-.007,mount+.007,y);
 vec3 distant=mix(uFog*.57,vec3(.21,.37,.43),uAlpine*.6);
 vec3 col=mix(distant,sky,peaks);
 col=mix(uFog*.58,col,smoothstep(mount2-.006,mount2+.009,y));
 oColor=vec4(col,1.);
}`;
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp3d=(a,b,t)=>a+(b-a)*t;
const dist=(a,b)=>Math.hypot(a.lat-b.lat,(a.lon-b.lon)*Math.cos(a.lat*Math.PI/180))*111194.9;
const hash=n=>{const q=Math.sin(n*127.1)*43758.5453;return q-Math.floor(q);};
class Mesh{
 constructor(){this.v=[];}
 tri(a,b,c,color,mat=1){const u=a.map((v,i)=>b[i]-v),v=a.map((v,i)=>c[i]-v);let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(...n)||1;n=n.map(x=>x/l);for(const p of [a,b,c])this.v.push(...p,...n,...color,mat);}
 quad(a,b,c,d,color,mat=1){this.tri(a,b,c,color,mat);this.tri(a,c,d,color,mat);}
 bar(a,b,r,color){const axis=b.map((v,i)=>v-a[i]),l=Math.hypot(...axis);if(l<.0001)return;const n=axis.map(x=>x/l),base=Math.abs(n[1])<.8?[0,1,0]:[1,0,0];const x=[n[1]*base[2]-n[2]*base[1],n[2]*base[0]-n[0]*base[2],n[0]*base[1]-n[1]*base[0]];const q=Math.hypot(...x);for(let i=0;i<3;i++)x[i]/=q;const y=[n[1]*x[2]-n[2]*x[1],n[2]*x[0]-n[0]*x[2],n[0]*x[1]-n[1]*x[0]];let old=[];for(let i=0;i<5;i++){const t=i*Math.PI/2;const o=x.map((val,j)=>r*(Math.cos(t)*val+Math.sin(t)*y[j]));const p=a.map((val,j)=>val+o[j]),q=b.map((val,j)=>val+o[j]);if(i>0)this.quad(old[0],old[1],q,p,color,4);old=[p,q];}}
 prism(x,y,z,w,h,d,color){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],up=p=>[p[0],p[1]+h,p[2]];this.quad(a,b,up(b),up(a),color,4);this.quad(b,c,up(c),up(b),color,4);this.quad(c,e,up(e),up(c),color,4);this.quad(e,a,up(a),up(e),color,4);this.quad(up(a),up(b),up(c),up(e),color,4);}
 cone(x,y,z,r,h,color,sides=7){const p=[x,y+h,z];for(let i=0;i<sides;i++){const a=i*2*Math.PI/sides,b=(i+1)*2*Math.PI/sides;this.tri([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],p,color,4);}}
 ball(x,y,z,r,color,rows=5,cols=9){for(let a=0;a<rows;a++){const lo=-Math.PI/2+a*Math.PI/rows,hi=-Math.PI/2+(a+1)*Math.PI/rows;for(let k=0;k<cols;k++){const t=k*Math.PI*2/cols,u=(k+1)*Math.PI*2/cols;const p=(alt,ang)=>[x+Math.cos(alt)*Math.cos(ang)*r,y+Math.sin(alt)*r,z+Math.cos(alt)*Math.sin(ang)*r];this.quad(p(lo,t),p(lo,u),p(hi,u),p(hi,t),color,4);}}}
}
const P=Object.freeze({v:3});
function shader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function program(gl,vs,fs){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
function makeRouteVisual(route,meters=0){
 const pts=route?.points;if(!Array.isArray(pts)||pts.length<2)return null;
 const sums=[0];for(let i=1;i<pts.length;i++)sums.push(sums.at(-1)+dist(pts[i-1],pts[i]));
 const total=sums.at(-1);if(total<40)return null;
 const sample=m=>{const v=clip(m,0,total);let low=0,hi=sums.length-1;while(hi-low>1){const mid=(hi+low)>>1;if(sums[mid]<=v)low=mid;else hi=mid;}const a=pts[low],b=pts[hi],t=(v-sums[low])/Math.max(.001,sums[hi]-sums[low]);return {lat:lerp3d(a.lat,b.lat,t),lon:lerp3d(a.lon,b.lon,t),ele:Number.isFinite(a.ele)&&Number.isFinite(b.ele)?lerp3d(a.ele,b.ele,t):null};};
 const zero=sample(meters),forward=sample(meters+20);
 const dx=(forward.lon-zero.lon)*111194*Math.cos(zero.lat*Math.PI/180),dy=(forward.lat-zero.lat)*111194;
 const norm=Math.hypot(dx,dy)||1;const e=dx/norm,n=dy/norm;
 const center=z=>{const p=sample(meters+z);const ex=(p.lon-zero.lon)*111194*Math.cos(zero.lat*Math.PI/180),ny=(p.lat-zero.lat)*111194;
 return clip((ex*n-ny*e)*.72,-28,28);};
 const height=z=>{const p=sample(meters+z);return zero.ele!==null&&p.ele!==null?clip((p.ele-zero.ele)*.6,-22,22):null;};
 return {total,center,height,hasElevation:zero.ele!==null,source:route.source||'GPX/OSM'};
}
function addBike(mesh,x,y,z,color,player=false,clock=0){
 const dk=[.09,.12,.16],steel=[.21,.29,.33],skin=[.69,.47,.33];
 const pos=(dx,dy,dz)=>[x+dx,y+dy,z+dz];
 // side elevation of racing bicycles, twin spoked wheels
 for(const wz of [-.72,.72]){
  for(let i=0;i<18;i++){const a=i*2*Math.PI/18,b=(i+1)*2*Math.PI/18;
   mesh.bar(pos(.02,.46+.40*Math.sin(a),wz+.40*Math.cos(a)),pos(.02,.46+.40*Math.sin(b),wz+.40*Math.cos(b)),.037,dk);
  }
  for(let i=0;i<8;i++){const a=i*Math.PI/4;mesh.bar(pos(0,.46,wz),pos(0,.46+.36*Math.sin(a),wz+.36*Math.cos(a)),.008,[.50,.56,.59]);}
 }
 const bottom=pos(.0,.68,.07),front=pos(.0,.70,.67),back=pos(0,.72,-.59),seat=pos(0,1.11,-.30),stem=pos(0,1.11,.53);
 for(const [a,b] of [[bottom,front],[bottom,seat],[seat,back],[back,bottom],[seat,stem],[stem,front]])mesh.bar(a,b,.042,color);
 mesh.bar(pos(-.22,1.1,.53),pos(.22,1.1,.53),.041,dk);
 mesh.bar(pos(-.18,1.17,-.36),pos(.18,1.17,-.36),.032,dk);
 // upper body in a realistic racing tuck; left/right shoulders, elbows and hands
 mesh.ball(x,1.68+y,z-.15,.23,color,5,10);
 mesh.bar(pos(0,1.36,-.27),pos(0,1.75,-.13),.18,color);
 for(const side of [-1,1]){
  const ped=clock*5+side*Math.PI;
  mesh.bar(pos(side*.12,1.35,-.31),pos(side*.15,.94+.14*Math.sin(ped),-.30+.14*Math.cos(ped)),.095,[.20,.26,.35]);
  mesh.bar(pos(side*.15,.94+.14*Math.sin(ped),-.30+.14*Math.cos(ped)),pos(side*.13,.75+.20*Math.sin(ped),-.17+.23*Math.cos(ped)),.065,skin);
  mesh.bar(pos(side*.17,1.71,-.06),pos(side*.25,1.36,.22),.083,skin);
  mesh.bar(pos(side*.25,1.36,.22),pos(side*.19,1.18,.49),.055,skin);
 }
 mesh.ball(x,1.96+y,z+.11,.16,[.16,.20,.21],6,10);
 mesh.cone(x,y+2.05,z+.11,.18,.11,player?[.19,.91,.81]:color,9);
}
function addTree(mesh,x,y,z,height,palette,seed){
 const bark=[.28,.21,.16],pine=seed<.77;
 mesh.prism(x,y,z,.22*height/5,height*.38,.22*height/5,bark);
 if(pine){for(let a=0;a<3;a++)mesh.cone(x,y+height*(.22+a*.18),z,height*(.26-a*.058),height*(.47-a*.04),palette.pine,8);}
 else {for(const [dx,dy,dz] of [[0,.69,0],[-.22,.62,.08],[.24,.62,-.08]])mesh.ball(x+dx*height*.21,y+height*dy,z+dz*height*.19,height*.25,palette.leaf,5,9);}
}
class SyntractGraphics3D {
 constructor(canvas){
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,powerPreference:'high-performance'});if(!gl)throw Error('WebGL2 är inte tillgängligt');
  this.gl=gl;this.canvas=canvas;this.p=program(gl,vert,frag);this.sky=program(gl,skyVert,skyFrag);
  this.buf=gl.createBuffer();this.skyBuffer=gl.createBuffer();this.lastKey='';this.lastBiome='';this.count=0;this.vertices=null;
  gl.bindBuffer(gl.ARRAY_BUFFER,this.skyBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  this.locs={aspect:gl.getUniformLocation(this.p,'uAspect'),pitch:gl.getUniformLocation(this.p,'uPitch'),camy:gl.getUniformLocation(this.p,'uCamY'),fog:gl.getUniformLocation(this.p,'uFog'),time:gl.getUniformLocation(this.p,'uTime'),late:gl.getUniformLocation(this.p,'uLate')};
  this.skyLoc={fog:gl.getUniformLocation(this.sky,'uFog'),time:gl.getUniformLocation(this.sky,'uTime'),alpine:gl.getUniformLocation(this.sky,'uAlpine'),late:gl.getUniformLocation(this.sky,'uLate')};
  gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 }
 dispose(){const gl=this.gl;gl.deleteBuffer(this.buf);gl.deleteBuffer(this.skyBuffer);gl.deleteProgram(this.p);gl.deleteProgram(this.sky);}
 resize(w,h,dpr){const ratio=Math.min(1.5,dpr||1);const width=Math.round(w*ratio),height=Math.round(h*ratio);if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}this.gl.viewport(0,0,width,height);}
 makeStatic(scene,progress,routeView,quality='high'){
  const m=new Mesh(),p=scene.palette,forest=scene.biome==='forest',urban=scene.biome==='urban',alpine=scene.biome==='alpine';
  const center=z=>routeView?routeView.center(z):Math.sin((progress+z)/85)*4+Math.sin((progress+z)/170)*8-(Math.sin(progress/85)*4+Math.sin(progress/170)*8);
  const hill=z=>{const routeHeight=routeView?.height(z);return routeHeight!==null&&routeHeight!==undefined?routeHeight:1.2*Math.sin((progress+z)/150)-1.2*Math.sin(progress/150);};
  const ground=(x,z)=>hill(z)+Math.max(0,(Math.abs(x-center(z))-6)/36)*p.terrainAmp*(.34*Math.sin(x*.11+z*.03)+.43*Math.sin(z*.018+x*.031)+.27*Math.sin(x*.04));
  for(let zi=0;zi<48;zi++){
   const za=-6+zi*13,zb=za+13;
   for(let xi=0;xi<38;xi++){
    const xa=-190+xi*10,xb=xa+10;
    const al=hash(xi*491+zi*331+31),color=p.ground.map(v=>clip(v*(.85+.26*al),0,1));
    m.quad([xa,ground(xa,za)-.1,za],[xb,ground(xb,za)-.1,za],[xb,ground(xb,zb)-.1,zb],[xa,ground(xa,zb)-.1,zb],color,1);
   }
  }
  const roadColor=scene.state?.surface==='gravel'?[.36,.31,.26]:scene.state?.surface==='trail'?[.21,.27,.23]:scene.biome==='arid'?[.38,.30,.23]:forest?[.26,.28,.27]:p.road;
  for(let z=-6;z<600;z+=7){const z2=z+7,ca=center(z),cb=center(z2),ha=hill(z),hb=hill(z2),pos=(x,y,z)=>[x,y,z];
   for(let side of [-1,1]){
    // verges follow outside the asphalt with shoulder material
    const x1=ca+side*4.3,x2=ca+side*6.7,y1=ha+.09,y2=hb+.09;
    m.quad(pos(ca+side*3.65,ha+.17,z),pos(x2,y1,z),pos(cb+side*6.7,y2,z2),pos(cb+side*3.65,hb+.17,z2),p.shoulder,1);
    m.quad(pos(ca+side*3.66,ha+.21,z),pos(ca+side*3.78,ha+.21,z),pos(cb+side*3.78,hb+.21,z2),pos(cb+side*3.66,hb+.21,z2),[.88,.86,.77],3.7);
   }
   m.quad(pos(ca-3.68,ha+.19,z),pos(ca+3.68,ha+.19,z),pos(cb+3.68,hb+.19,z2),pos(cb-3.68,hb+.19,z2),roadColor,2.7);
   if(Math.floor((z+progress)/13)%3!==0){m.quad(pos(ca-.065,ha+.225,z),pos(ca+.065,ha+.225,z),pos(cb+.065,hb+.225,z2),pos(cb-.065,hb+.225,z2),[.92,.87,.69],4);}
  }
  const density=(quality==='low'?1.8:1)*(scene.state?.vegetation==='dense'?.67:scene.state?.vegetation==='sparse'?1.7:1)*(scene.state?.season==='winter'?1.25:1);
  for(let z=14;z<=545;z+=11*density){
   const seed=Math.floor((progress+z)/11),base=center(z),groundY=hill(z);
   for(const side of [-1,1]){
    for(let j=0;j<(forest?3:2);j++){
     const k=seed*17+j*107+(side+2)*1134;
     if(hash(k)<(urban?.43:.16))continue;
     const spread=7+Math.pow(hash(k+3),.85)*(forest?30:58),x=base+side*spread;
     const zz=z+(hash(k+14)-.5)*8;if(zz<=1)continue;
     const ht=(forest?8.5:6.2)+hash(k+8)*(forest?13:9);
     addTree(m,x,ground(x,zz),zz,ht,p,hash(k+15));
    }
   }
  }
  if(urban){for(let z=60;z<550;z+=80){for(const side of [-1,1]){const x=center(z)+side*(20+hash(z*2)*9),g=ground(x,z);m.prism(x,g,z,13,5+hash(z)*9,17,[.58,.54,.46]);m.cone(x,g+9,z,10,2.2,[.39,.22,.21],4);}}}
  // Oracle-selected guardrails (synthetic placement: not assertions about actual safety barriers).
  if(scene.state?.roadside==='barrier')for(let z=6;z<420;z+=13){
   for(const side of [-1,1]){const x1=center(z)+side*5.6,x2=center(z+13)+side*5.6,y1=hill(z)+.95,y2=hill(z+13)+.95;
    m.bar([x1,y1,z],[x2,y2,z+13],.065,[.66,.75,.77]);
    m.bar([x1,hill(z)+.2,z],[x1,y1+.2,z],.07,[.44,.53,.59]);
   }
  }
  // Tactile roadside markers and occasional road signs.
  for(let z=40;z<480;z+=37){for(const side of [-1,1]){const x=center(z)+side*5,g=hill(z);m.prism(x,g,z,.12,1,.12,[.93,.95,.92]);m.prism(x,g+.65,z,.16,.13,.16,[.74,.16,.13]);}}
  return {vertices:new Float32Array(m.v),center,hill};
 }
 render({snapshot,scene,route=null,routeMeters=0,quality='high',time=0}){
  const gl=this.gl,progress=Number(snapshot?.player?.km||0)*1000||0;const routeView=makeRouteVisual(route,routeMeters);
  const key=`${scene.biome}/${scene.state?.season}/${scene.state?.vegetation}/${scene.state?.roadside}/${scene.state?.surface}/${Math.floor(progress/9)}/${route?.id||route?.name||'none'}/${route?.points?.length||0}/${route?.elevationSource||'none'}/${Math.floor(routeMeters/18)}/${quality}`;
  if(key!==this.lastKey){this.static=this.makeStatic(scene,progress,routeView,quality);this.lastKey=key;}
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.disable(gl.DEPTH_TEST);
  gl.useProgram(this.sky);gl.bindBuffer(gl.ARRAY_BUFFER,this.skyBuffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  gl.uniform3fv(this.skyLoc.fog,new Float32Array(scene.palette.fog));gl.uniform1f(this.skyLoc.time,time);gl.uniform1f(this.skyLoc.alpine,scene.biome==='alpine'?1:0);gl.uniform1f(this.skyLoc.late,scene.state?.lighting==='late'?1:0);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.enable(gl.DEPTH_TEST);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(this.p);
  gl.uniform1f(this.locs.aspect,this.canvas.width/Math.max(1,this.canvas.height));gl.uniform1f(this.locs.pitch,.13);gl.uniform1f(this.locs.camy,2.7);gl.uniform3fv(this.locs.fog,new Float32Array(scene.palette.fog));gl.uniform1f(this.locs.time,time);gl.uniform1f(this.locs.late,scene.state?.lighting==='late'?1:0);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);gl.bufferData(gl.ARRAY_BUFFER,this.static.vertices,gl.DYNAMIC_DRAW);
  for(const [loc,size,offset] of [[0,3,0],[1,3,12],[2,3,24],[3,1,36]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,40,offset);}
  gl.drawArrays(gl.TRIANGLES,0,this.static.vertices.length/10);
  const bikes=new Mesh();const player=snapshot?.player;
  if(player){const meZ=3.5;addBike(bikes,this.static.center(meZ),this.static.hill(meZ)+.2,meZ,[.10,.88,.72],true,time);}
  for(const rider of snapshot?.others||[]){const z=3.5+(Number(rider.km)-Number(player?.km||0))*1000;
   if(z>=-3&&z<270){let hex=(rider.color||'#53bee5').replace('#','');if(hex.length===3)hex=hex.split('').map(s=>s+s).join('');const color=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255||.4);const x=this.static.center(Math.max(0,z))+(rider.laneAnimated??rider.lane??0)*1.6;addBike(bikes,x,this.static.hill(Math.max(0,z))+.2,z,color,false,time+rider.offsetM);}
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(bikes.v),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,bikes.v.length/10);
  return {renderer:'WebGL2',scene:scene.label,checkCount:scene.matched.length,riderCount:1+(snapshot?.others||[]).length};
 }
}

/* module: demo-world.js */

const DC={lat:47.235,lon:10.125};
const DS=[
 {id:'alpine',name:'Syntract Alpine Circuit',mode:'road',biome:'alpine',surface:'asphalt',base:1150,rise:170,rx:3.7,ry:2.6,color:'#74ffe1',phase:.1,description:'Alpin klättring · kurvor · asfalt'},
 {id:'forest',name:'Syntract Forest Trail',mode:'mtb',biome:'forest',surface:'trail',base:490,rise:95,rx:2.9,ry:1.7,color:'#ffc47a',phase:2.3,description:'Skogsstig · tekniska backar · MTB'},
 {id:'lake',name:'Syntract Lakeside Gravel',mode:'gravel',biome:'countryside',surface:'gravel',base:330,rise:65,rx:5.0,ry:3.4,color:'#b6bbff',phase:4.1,description:'Sjökant · grusväg · varierad höjd'}
];
function buildRoute(s){
 const pts=[];for(let i=0;i<=240;i++){const a=2*Math.PI*i/240,w=1+.11*Math.sin(3*a+s.phase)+.04*Math.sin(7*a+s.phase);
 const x=s.rx*Math.cos(a+s.phase)*w,y=s.ry*Math.sin(a+s.phase)*w;
 const ele=s.base+s.rise*(.52+.24*Math.sin(a+s.phase)+.16*Math.sin(3*a+s.phase)+.08*Math.cos(7*a+.4));
 pts.push({lat:DC.lat+y/111.195,lon:DC.lon+x/(111.195*Math.cos(DC.lat*Math.PI/180)),ele:Math.round(ele*10)/10});}
 pts[240]={...pts[0]};return {id:'syntract-demo-'+s.id,name:s.name,source:'SYNTRACT DEMO · SYNTHETIC',demo:true,simulated:true,biomeHint:s.biome,mode:s.mode,surface:s.surface,elevationSource:'Syntetisk demohöjd · ej uppmätt',elevationLicense:'Genererat demoexempel',points:pts};}
const SYNTRACT_DEMO_ROUTES=Object.freeze(DS.map(s=>Object.freeze({...s,route:buildRoute(s)})));
function getSyntractDemoRoute(id='alpine'){const s=SYNTRACT_DEMO_ROUTES.find(s=>s.id===id)||SYNTRACT_DEMO_ROUTES[0];return {...s.route,points:s.route.points.map(p=>({...p}))};}
function syntractDemoRouteStats(route){let km=0,up=0,down=0;const pts=route.points;for(let i=1;i<pts.length;i++){
 const a=pts[i-1],b=pts[i],d=b.ele-a.ele;km+=Math.hypot((b.lat-a.lat)*111.195,(b.lon-a.lon)*111.195*Math.cos(a.lat*Math.PI/180));if(d>0)up+=d;else down-=d;}
 return {km,up,down,min:Math.min(...pts.map(p=>p.ele)),max:Math.max(...pts.map(p=>p.ele))};}
const xx=(p,W)=>W/2+(p.lon-DC.lon)*111.195*Math.cos(DC.lat*Math.PI/180)*W/13.5;
const yy=(p,H)=>H/2-(p.lat-DC.lat)*111.195*H/9.5;
function paintSyntractDemoMap(canvas,selected='alpine'){
 const r=canvas.getBoundingClientRect(),W=Math.max(320,r.width||850),H=Math.max(280,r.height||450),dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
 const grad=c.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#1b3942');grad.addColorStop(.6,'#244f4d');grad.addColorStop(1,'#36584a');c.fillStyle=grad;c.fillRect(0,0,W,H);
 for(let k=0;k<30;k++){c.beginPath();c.strokeStyle=k%4===0?'#aeceaa3c':'#d3d0ac1a';c.lineWidth=k%4===0?1.15:.65;
 for(let x=0;x<=W;x+=7){const y=H*k/30+17*Math.sin(x/63+k*.7)+9*Math.sin(x/29+k*.39);x?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}
 for(let n=0;n<190;n++){const rad=Math.sqrt((n+.3)/190),a=n*2.399963,x=W*(.5+.46*rad*Math.cos(a)),y=H*(.5+.46*rad*Math.sin(a));c.fillStyle=n%5?'#27604464':'#88a56e43';c.beginPath();c.arc(x,y,2+(n%5),0,6.283);c.fill();}
 c.fillStyle='#1d5260';c.strokeStyle='#67aaa5';c.lineWidth=1.6;c.beginPath();
 for(let k=0;k<=70;k++){const a=k*2*Math.PI/70,x=W*.79+W*.078*Math.cos(a)*(1+.18*Math.sin(5*a)),y=H*.77+H*.14*Math.sin(a);k?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();c.stroke();
 for(const f of [t=>[t*W,H*(.63+.11*Math.sin(9*t))],t=>[W*(.1+.8*t),H*(.9-.7*t+.04*Math.sin(15*t))]]){c.beginPath();for(let i=0;i<=120;i++){const [x,y]=f(i/120);i?c.lineTo(x,y):c.moveTo(x,y);}c.lineWidth=7;c.strokeStyle='#8b9d92';c.stroke();c.lineWidth=3;c.strokeStyle='#c9c6aa';c.stroke();}
 for(const s of SYNTRACT_DEMO_ROUTES){const active=s.id===selected;c.beginPath();s.route.points.forEach((p,i)=>i?c.lineTo(xx(p,W),yy(p,H)):c.moveTo(xx(p,W),yy(p,H)));
 c.lineWidth=active?11:7;c.strokeStyle='#071d2ac0';c.stroke();c.lineWidth=active?5:2.5;c.globalAlpha=active?1:.55;c.strokeStyle=s.color;c.stroke();c.globalAlpha=1;
 const p=s.route.points[0];c.beginPath();c.arc(xx(p,W),yy(p,H),active?7:5,0,6.283);c.fillStyle=s.color;c.fill();c.lineWidth=2;c.strokeStyle='#10252b';c.stroke();}
 c.fillStyle='#f0fffa';c.font='bold 14px system-ui';c.fillText('SYNTRACT / DEMO WORLD',20,30);c.font='11px system-ui';c.fillStyle='#bbdacf';c.fillText('Illustrerad karta · 3 banor · komplett höjdprofil',20,48);
 c.fillStyle='#0b2530da';c.fillRect(W-115,H-38,100,25);c.fillStyle='#b9efe5';c.fillText('DEMO · OFFLINE',W-109,H-21);
}
function nearestSyntractDemoRoute(canvas,x,y){const W=canvas.getBoundingClientRect().width||850,H=canvas.getBoundingClientRect().height||450;let closest=55,id=null;
 for(const s of SYNTRACT_DEMO_ROUTES){let last=null;for(const p of s.route.points){const q={x:xx(p,W),y:yy(p,H)};if(last){const dx=q.x-last.x,dy=q.y-last.y,k=Math.max(0,Math.min(1,((x-last.x)*dx+(y-last.y)*dy)/(dx*dx+dy*dy||1)));const d=Math.hypot(last.x+k*dx-x,last.y+k*dy-y);if(d<closest){closest=d;id=s.id;}}last=q;}}
 return id;}

/* module: app.js */
const wasmCourseIndex=index;
















const $=id=>document.getElementById(id);
const experience=new SyntractRaceState();
let latestExperience=experience.lastSnapshot,lastExperienceMs=performance.now(),lastAudioAt=0,spokenEvent=0;
let soundMode='off',visualMode='tactical';
const S={mode:'road',tab:'explore',route:null,map:null,mapLayer:null,osmLayer:null,osmWays:[],source:'none',telemetry:{source:'none',power:null,cadence:null,speed:null,hr:null},running:false,elapsed:0,km:0,liveWatts:0,tick:0,graphWays:[],generatedRoutes:[],mixRoutes:[],localRoutes:[],discoveryTab:'near',heightAbort:null,plannerStart:null,pickingStart:false,startMarker:null,demoWorld:false,demoRouteId:'alpine'};
// SYNTRACT: one authentic course grade, one independently adjustable physical trainer load.
// Not part of CHP, calculated race watts, route grade, or validated race rankings.
const resState={enabled:false,offset:0,lastSent:null,target:null,lastSentAt:0,busy:false,error:'',sendCount:0};
function updateResistanceUi(){
 const grade=gradeAtProgress(),available=Number.isFinite(grade),real=S.source==='ftms'&&radio.connected;
 const previewGrade=available?grade:(S.source==='demo'?2*Math.sin(S.elapsed/23):null);
 const goal=Number.isFinite(previewGrade)?resistanceTarget({grade:previewGrade,offset:resState.offset,mode:S.mode}):null;
 resState.target=goal;
 $('autoResistance').checked=resState.enabled;
 $('loadBias').value=String(resState.offset);
 $('loadBiasReadout').textContent=(resState.offset>0?'+':'')+resState.offset+' nivåer';
 $('loadBiasHint').textContent=resState.offset===0?'Originalkänsla':resState.offset<0?'Lättare än banans profil':'Tyngre än banans profil';
 $('resGrade').textContent=available?grade.toFixed(1)+' %':S.source==='demo'?'SIMULERAD': '—';
 $('resTarget').textContent=goal!==null?String(goal)+'/24':'—';
 $('resApplied').textContent=real&&resState.lastSent!==null?String(resState.lastSent)+'/24': '—';
 $('resistanceAvailability').textContent=real&&radio.canControl?'FTMS styrbar':real?'FTMS styrning saknas':S.source==='demo'?'Demo · simulering':'Ej ansluten';
 $('resistanceIndicator').dataset.state=resState.enabled?(real?'on':S.source==='demo'?'demo':'waiting'):'off';
 $('resistanceIndicator').textContent=resState.enabled?(real?'● AUTOMATISK':S.source==='demo'?'● DEMO':'◌ VÄNTAR'):'○ MANUELLT';
 let message='Av: appen skickar inga motståndskommandon. Ändra manuellt på cykeln.';
 if(resState.enabled){
  if(resState.error)message='Automatiken stoppad: '+resState.error;
  else if(S.source==='demo')message='Demoläge: nivån visas men inga Bluetooth-kommandon skickas.';
  else if(!real)message='Anslut en FTMS-cykel för att styra motståndet.';
  else if(!radio.canControl)message='Cykeln erbjuder ingen åtkomlig FTMS Control Point (0x2AD9).';
  else if(!available)message='Höjdprofil saknas: ingen fysisk lutningsstyrning skickas förrän riktiga höjdvärden finns.';
  else if(!S.running)message='Aktiverad. Starta racet för att skicka backanpassning till cykeln.';
  else message='Backanpassning aktiv · begärd nivå '+goal+'/24. Ändringar begränsas till högst 1 nivå var 4:e sekund.';
 }
 if(!resState.enabled&&resState.error)message=resState.error;
 $('resistanceStatus').textContent=message;
}
function disableAutoResistance(note=''){
 resState.enabled=false;radio.disableControl();resState.lastSent=null;resState.lastSentAt=0;resState.error=note;
 updateResistanceUi();
}
async function syncAutoResistance(force=false){
 if(!resState.enabled||resState.busy||S.source!=='ftms'||!S.running||S.route?.demo)return;
 if(!radio.connected||!radio.canControl){disableAutoResistance('Bluetooth FTMS-styrning saknas. Ingen last ändrades.');return;}
 const grade=gradeAtProgress();if(!Number.isFinite(grade)){updateResistanceUi();return;}
 const goal=resistanceTarget({grade,offset:resState.offset,mode:S.mode});
 const now=Date.now();if(!force&&now-resState.lastSentAt<4000)return;
 if(resState.lastSent===goal)return;
 resState.busy=true;
 try{
  if(!radio.controlled)await radio.activateControl();
  if(!resState.enabled)return;
  const level=rampResistance(resState.lastSent,goal,1);
  await radio.setResistance(level);
  if(!resState.enabled)return;
  resState.lastSent=level;resState.lastSentAt=Date.now();resState.error='';resState.sendCount++;
 }catch(e){disableAutoResistance('FTMS nekade styrningen: '+(e?.message||e)+'. Använd cykelns manuella reglage.');}
 finally{resState.busy=false;updateResistanceUi();}
}
$('autoResistance').addEventListener('change',e=>{
 if(!e.target.checked){disableAutoResistance();return;}
 resState.enabled=true;resState.error='';resState.lastSent=null;resState.lastSentAt=0;
 updateResistanceUi();void syncAutoResistance(true);
});
$('loadBias').addEventListener('input',e=>{resState.offset=Math.min(RESISTANCE_LIMITS.offsetMax,Math.max(RESISTANCE_LIMITS.offsetMin,Number(e.target.value)||0));updateResistanceUi();void syncAutoResistance();});
$('resLight').addEventListener('click',()=>{resState.offset=Math.max(-5,resState.offset-1);updateResistanceUi();void syncAutoResistance();});
$('resHeavy').addEventListener('click',()=>{resState.offset=Math.min(5,resState.offset+1);updateResistanceUi();void syncAutoResistance();});
$('resNeutral').addEventListener('click',()=>{resState.offset=0;updateResistanceUi();void syncAutoResistance();});
const modeWords={road:'ROAD RACE',gravel:'GRAVEL CHALLENGE',mtb:'MTB TRAIL',downhill:'DOWNHILL EXPERIENCE'};
const radio=new BikeFTMS(data=>{S.source='ftms';S.telemetry={...S.telemetry,...data,source:'ftms'};S.liveWatts=Number.isFinite(data.power)?Math.max(0,data.power):S.liveWatts; updateDevice('FTMS · livemätning');updateTelemetry();renderOracles();},status=>{if(status.startsWith('Bluetooth frånkopplad')){S.source='none';disableAutoResistance('Cykeln kopplades från: automatiken är av.');}updateDevice(status);updateResistanceUi();});
function updateDevice(msg){$('deviceText').textContent=msg;$('feedStatus').textContent=S.source==='ftms'?'CYKEL ANSLUTEN':S.source==='demo'?'SIMULERAD DATA':'EJ ANSLUTEN';$('dataStatus').textContent=S.source==='ftms'?'● FTMS LIVE':S.source==='demo'?'● DEMO · SIMULERAT':'● DEMO / LOKALT';$('btLight').classList.toggle('online',S.source==='ftms');document.querySelector('.led').classList.toggle('online',S.source==='ftms');}
function changeTab(tab){S.tab=tab;document.querySelectorAll('.tab').forEach(n=>n.classList.toggle('active',n.dataset.tab===tab));document.querySelectorAll('.view').forEach(n=>n.classList.toggle('visible',n.id===tab));if(tab==='explore'){if(S.map)setTimeout(()=>S.map.invalidateSize(),70);if(S.demoWorld&&!$('demoWorldPanel').hidden)setTimeout(drawCompleteDemoMap,90);}if(tab==='ride')resizeRace();if(tab==='oracles')renderOracles();if(tab==='league')updateLeague();}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>changeTab(b.dataset.tab)));
document.querySelectorAll('.discipline').forEach(b=>b.addEventListener('click',()=>{S.mode=b.dataset.mode;document.querySelectorAll('.discipline').forEach(x=>x.classList.toggle('active',x===b));$('modeLabel').textContent=modeWords[S.mode];$('hcpMode').textContent=MODES[S.mode];$('leagueMode').textContent=MODES[S.mode];updateHandicap();updateRoute();renderOracles();if(S.graphWays.length)renderRouteSuggestions();else renderDiscoveryCatalog();}));
const WORLD_DESTINATIONS=[
 ['Göteborg',57.7089,11.9746,12],['Åre',63.3995,13.0838,12],['Mallorca',39.7214,2.6202,12],
 ['Alpe d’Huez',45.0918,6.0698,12],['Dolomiterna',46.5405,11.7210,12],['Girona',41.9794,2.8214,12],
 ['Chamonix',45.9237,6.8694,12],['Moab',38.5733,-109.5498,12],['Whistler',50.1163,-122.9574,12],
 ['Kapstaden',-33.9249,18.4241,12],['Kyoto',35.0116,135.7681,12],['Queenstown',-45.0312,168.6626,12],
 ['Cusco',-13.5319,-71.9675,12],['Tasmanien',-42.8821,147.3272,12],['Nya Zeeland · Rotorua',-38.1368,176.2497,12],['Boulder',40.0150,-105.2705,12]
];
function flyToWorld(lat,lon,label,zoom=12){
 if(!S.map){$('worldStatus').textContent='Aktiverar livekartan …';void ensureLiveMap().then(()=>flyToWorld(lat,lon,label,zoom)).catch(e=>{$('worldStatus').textContent='Livekartan fungerar inte: '+e.message+'. Prova offline-demovärlden.';});return;}
 S.map.setView([lat,lon],zoom,{animate:true});$('worldStatus').textContent=label+' · kartan flyttad. Tryck ”Skapa rutter från OSM-vägar” för att hämta riktiga vägar.';
 S.graphWays=[];S.generatedRoutes=[];S.mixRoutes=[];$('routeSuggestions').replaceChildren();
 const p=document.createElement('p');p.className='empty-routes';p.textContent='Hämta vägar på den nya platsen för att bygga sammanhängande turer.';$('routeSuggestions').append(p);renderDiscoveryCatalog();
}
for(const [label,lat,lon,zoom] of WORLD_DESTINATIONS){const btn=document.createElement('button');btn.type='button';btn.className='world-place';btn.textContent=label;btn.addEventListener('click',()=>flyToWorld(lat,lon,label,zoom));$('worldPlaces').append(btn);}
$('goCoords').addEventListener('click',()=>{const m=$('gotoCoords').value.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/);if(!m){$('worldStatus').textContent='Skriv koordinater, exempel: 45.9237, 6.8694';return;}const lat=Number(m[1]),lon=Number(m[2]);if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>85||Math.abs(lon)>180){$('worldStatus').textContent='Koordinater utanför giltigt intervall.';return;}flyToWorld(lat,lon,`${lat.toFixed(4)}, ${lon.toFixed(4)}`);});
function setPlannerStart(point,label){
 S.plannerStart=point?{lat:Number(point.lat),lon:Number(point.lon)}:null;
 if(S.startMarker&&S.map){S.map.removeLayer(S.startMarker);S.startMarker=null;}
 if(S.plannerStart&&S.map&&window.L){S.startMarker=L.circleMarker([S.plannerStart.lat,S.plannerStart.lon],{radius:9,color:'#fff',weight:3,fillColor:'#51e3ca',fillOpacity:1}).addTo(S.map).bindTooltip('Startpunkt: '+label);}
 const length=Number($('routeLength').value)||10,mode=$('routeType').value;
 const distanceInfo=mode==='outback'?`${(length/2).toFixed(1)} km ut + ${(length/2).toFixed(1)} km tillbaka`:mode==='loop'?'Slutar ungefär där du startade, på andra vägar':mode==='oneway'?'Start och mål kan ligga på olika platser':'Turtyp väljs av banmotorn';
 $('plannerStatus').textContent=`Start: ${label}. ${distanceInfo}. Distansen beräknas på verkliga OSM-vägar.`;
 if(S.graphWays.length)renderRouteSuggestions();
}
$('routeType').addEventListener('change',()=>setPlannerStart(S.plannerStart,S.plannerStart?'Vald punkt':'kartans mitt'));
$('startMap').addEventListener('click',()=>{S.pickingStart=true;if(S.drawing){S.drawing=false;S.drawPoints=[];drawPreview();$('map').classList.remove('drawing-active');updateDrawStatus('Ritning avbruten: välj startpunkt.');} $('plannerStatus').textContent='Tryck på kartan för att sätta startpunkten.';});
$('startCenter').addEventListener('click',()=>{S.pickingStart=false;setPlannerStart(null,'kartans mitt');});
$('startGPS').addEventListener('click',()=>{
 if(!navigator.geolocation){$('plannerStatus').textContent='GPS är inte tillgänglig i denna webbläsare.';return;}
 $('plannerStatus').textContent='Frågar om GPS-tillstånd …';
 navigator.geolocation.getCurrentPosition(position=>{
  const point={lat:position.coords.latitude,lon:position.coords.longitude};
  if(!Number.isFinite(point.lat)||!Number.isFinite(point.lon)){ $('plannerStatus').textContent='GPS returnerade ogiltiga koordinater.';return;}
  S.pickingStart=false;
  // The user coordinates are kept only in this in-memory session, never uploaded as a special account field.
  S.map?.setView([point.lat,point.lon],14);
  setPlannerStart(point,'min GPS');
  $('plannerStatus').textContent+=' · Hämta OSM-vägar här om inget nät är inläst runt startpunkten.';
 },err=>{$('plannerStatus').textContent='GPS kunde inte användas: '+(err.code===1?'tillstånd saknas':err.message);},{enableHighAccuracy:false,timeout:12000,maximumAge:60000});
});
function getInputs(){const ftp=Number($('ftp').value),weight=Number($('weight').value);return {ftp,weight,valid:Number.isFinite(ftp)&&ftp>=40&&ftp<=700&&Number.isFinite(weight)&&weight>=35&&weight<=250};}
function updateHandicap(){const d=getInputs();const h=d.valid?chp(d.ftp,d.weight,S.mode):null;$('hcp').textContent=h===null?'—':h.toFixed(1);$('hcpLarge').textContent=h===null?'—':h.toFixed(1);$('hcpExplainer').textContent=d.valid?`${(d.ftp/d.weight).toFixed(2)} W/kg · uppskattad grundklass.`:'Ange FTP 40–700 W och vikt 35–250 kg.';renderOracles();}
$('ftp').addEventListener('input',updateHandicap);$('weight').addEventListener('input',updateHandicap);
$('connect').addEventListener('click',async()=>{try{await radio.connect();S.source='ftms';disableAutoResistance();$('disconnect').hidden=false;$('demoBtn').textContent='▶ Testa demokälla';updateDevice('Cykel ansluten. Väntar på watt…');}catch(err){updateDevice('Anslutning misslyckades: '+(err.message||String(err)));}});
$('demoBtn').addEventListener('click',()=>{radio.disconnect();disableAutoResistance();S.source='demo';S.telemetry={source:'demo',power:115,cadence:78,speed:null,hr:null};S.liveWatts=115;updateDevice('SIMULERAD DATA · inte cykelmätning');$('disconnect').hidden=false;renderOracles();updateTelemetry();});
$('disconnect').addEventListener('click',()=>{radio.disconnect();disableAutoResistance();S.source='none';S.liveWatts=0;S.telemetry={source:'none',power:null,cadence:null,speed:null,hr:null};$('disconnect').hidden=true;updateDevice('Frånkopplad');renderOracles();updateTelemetry();});
$('tvMode').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){alert('TV-läge kräver att webbläsaren tillåter helskärm.');}});
// ---- SYNTRACT DEMO WORLD: self-contained map + routes + elevation + single race. ----
function drawCompleteDemoMap(){
 const canvas=$('demoWorldMap');if(!canvas||$('demoWorldPanel').hidden)return;
 paintSyntractDemoMap(canvas,S.demoRouteId);
}
function demoCards(){
 const box=$('demoWorldRoutes');box.replaceChildren();
 for(const spec of SYNTRACT_DEMO_ROUTES){
  const stats=syntractDemoRouteStats(spec.route),card=document.createElement('button');card.type='button';
  card.className='demo-course'+(S.demoRouteId===spec.id?' active':'');
  card.innerHTML=`<span class="demo-course-head"><span class="demo-course-dot"></span><strong></strong></span><small></small><span class="demo-course-stats"></span>`;
  card.querySelector('strong').textContent=spec.name;card.querySelector('small').textContent=spec.description;
  card.querySelector('.demo-course-stats').textContent=`${stats.km.toFixed(1)} km · +${Math.round(stats.up)} m · ${spec.mode.toUpperCase()}`;
  card.style.setProperty('--course-color',spec.color);
  card.addEventListener('click',()=>chooseCompleteDemoRoute(spec.id));box.append(card);
 }
}
function chooseCompleteDemoRoute(id){
 const spec=SYNTRACT_DEMO_ROUTES.find(r=>r.id===id)||SYNTRACT_DEMO_ROUTES[0];
 // Entering any synthetic course is never allowed to control a physical trainer.
 radio.disconnect();disableAutoResistance();S.source='demo';S.telemetry={source:'demo',power:153,cadence:79,speed:null,hr:null};S.liveWatts=153;updateDevice('SYNTRACT DEMO WORLD · simulerade cykelvärden');
 S.demoRouteId=spec.id;S.demoWorld=true;S.mode=spec.mode;
 document.querySelectorAll('.discipline').forEach(b=>b.classList.toggle('active',b.dataset.mode===spec.mode));
 $('modeLabel').textContent=modeWords[spec.mode];$('hcpMode').textContent=MODES[spec.mode];$('leagueMode').textContent=MODES[spec.mode];
 const route=getSyntractDemoRoute(spec.id);selectRoute(route);
 $('demoWorldStatus').textContent=spec.name+' vald · '+syntractDemoRouteStats(route).km.toFixed(1)+' km · fullständig syntetisk höjdprofil. Klicka Kör vald banas race.';
 $('worldStatus').textContent='Offline-demovärld. All geografi, höjd och vägdata är genererad – inte OSM.';
 $('osmInfo').textContent='Demo world aktiv · inga OSM-servrar eller höjdservrar används.';
 demoCards();drawCompleteDemoMap();updateHandicap();
}
function openCompleteDemoMap(){
 S.demoWorld=true;$('demoWorldPanel').hidden=false;changeTab('explore');
 chooseCompleteDemoRoute(S.demoRouteId);
 requestAnimationFrame(drawCompleteDemoMap);
 $('demoWorldPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
function launchCompleteDemoRace(){
 if(!$('demoWorldPanel').hidden&&S.route?.demo&&S.route.id==='syntract-demo-'+S.demoRouteId){}
 else {S.demoWorld=true;$('demoWorldPanel').hidden=false;chooseCompleteDemoRoute(S.demoRouteId);}
 radio.disconnect();disableAutoResistance();S.source='demo';S.telemetry={source:'demo',power:153,cadence:79,speed:null,hr:null};S.liveWatts=153;
 updateDevice('SYNTRACT DEMO WORLD · endast simulerade cykelvärden');$('disconnect').hidden=false;
 $('graphicsMode').value='webgl';$('sceneBiome').value='auto';initializeRaceRenderer();
 changeTab('ride');if(!S.running)$('raceToggle').click();
 $('rideNotice').textContent='SYNTRACT DEMO WORLD: hela kartan, höjderna, banorna och motståndet är simulerade. Ingen fysisk cykel styrs.';
 updateResistanceUi();
}
$('startFullDemo').addEventListener('click',launchCompleteDemoRace);
$('openDemoWorld').addEventListener('click',openCompleteDemoMap);
$('demoStartRace').addEventListener('click',launchCompleteDemoRace);
$('raceDemoMap').addEventListener('click',openCompleteDemoMap);
$('demoCloseMap').addEventListener('click',()=>{$('demoWorldPanel').hidden=true;});
$('demoWorldMap').addEventListener('click',e=>{
 const b=e.currentTarget.getBoundingClientRect(),id=nearestSyntractDemoRoute(e.currentTarget,e.clientX-b.left,e.clientY-b.top);
 if(id)chooseCompleteDemoRoute(id);
});
$('demoWorldMap').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseCompleteDemoRoute(S.demoRouteId==='alpine'?'forest':S.demoRouteId==='forest'?'lake':'alpine');}});
window.addEventListener('resize',()=>{if(!$('demoWorldPanel').hidden)drawCompleteDemoMap();});
let liveMapLoading=null;
async function ensureLiveMap(){
 if(S.map)return S.map;
 if(liveMapLoading)return liveMapLoading;
 liveMapLoading=(async()=>{
  $('liveMapMessage').textContent='Laddar kartbibliotek från tillgänglig server …';
  if(!window.L){
   const sources=['https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
   let last=null;
   for(const url of sources){
    try{await new Promise((resolve,reject)=>{
     const script=document.createElement('script');script.src=url;script.async=true;const timer=setTimeout(()=>{script.remove();reject(Error('Tidsgräns för kartbiblioteket'));},8500);
     script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('Servern svarar inte'));};document.head.append(script);
    });if(window.L)break;}catch(e){last=e;}
   }
   if(!window.L)throw last||Error('Kartbiblioteket saknas');
  }
  initMap();if(!S.map)throw Error('Kartan kunde inte starta');
  $('enableLiveMap').textContent='✓ Livekartan är aktiverad';
  $('liveMapMessage').textContent='Livekarta online · väg- och terrängdata kan kräva separata servrar';
  return S.map;
 })().catch(e=>{liveMapLoading=null;$('liveMapMessage').textContent='Livekartan kunde inte laddas: '+e.message+'. Använd offline-demo ovan.';throw e;});
 return liveMapLoading;
}
$('enableLiveMap').addEventListener('click',()=>{void ensureLiveMap().catch(()=>{});});
function initMap(){
 const el=$('map');
 if(!window.L){$('osmInfo').textContent='Kartbiblioteket kunde inte laddas. GPX-import fungerar ändå.';el.replaceChildren();el.textContent='Kartbiblioteket saknas. Ladda om sidan eller importera GPX.';return;}
 el.querySelector('.map-wait')?.remove();
 try{
  S.map=L.map(el,{zoomControl:true,preferCanvas:true,trackResize:true}).setView([57.688,11.967],12);
  let failedTiles=0;
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19,updateWhenIdle:true,keepBuffer:2});
  tiles.on('tileerror',()=>{failedTiles++;if(failedTiles===4)$('osmInfo').textContent='Några kartbilder kunde inte hämtas. Kartan kan ändå flyttas och GPX-import fungerar.';});
  tiles.addTo(S.map);
  S.osmLayer=L.layerGroup().addTo(S.map);
  S.mapLayer=L.layerGroup().addTo(S.map);
  S.drawLayer=L.layerGroup().addTo(S.map);
  S.map.on('click',event=>{if(S.pickingStart){S.pickingStart=false;setPlannerStart({lat:event.latlng.lat,lon:event.latlng.lng},'Vald kartpunkt');return;}if(S.drawing)addDrawPoint(event.latlng);});
  // Merely panning/zooming the viewport updates local nearby suggestions, no server calls.
  S.map.on('moveend',()=>renderDiscoveryCatalog());
  if(window.ResizeObserver){const ob=new ResizeObserver(()=>{if(!S.map)return;const r=el.getBoundingClientRect();if(r.width>0&&r.height>0)S.map.invalidateSize({pan:false});});ob.observe(el);}
  S.map.whenReady(()=>setTimeout(()=>{S.map?.invalidateSize({pan:false});renderDiscoveryCatalog();},100));
 }catch(e){console.error('Map initialization failed',e);$('osmInfo').textContent='Kartan kunde inte startas: '+e.message;}
}
function cleanRoute(points){return points.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180).slice(0,25000);}
function selectRoute(route){if(route.demo)S.demoWorld=true;route.points=cleanRoute(route.points);if(route.points.length<2){$('osmInfo').textContent='Den valda rutten saknar tillräckligt med koordinater.';return;}S.heightAbort?.abort();S.heightAbort=null;
 S.route=route;
 $('loadElevation').disabled=route.demo||route.points.every(p=>Number.isFinite(p.ele));
 $('elevationStatus').textContent=route.points.every(p=>Number.isFinite(p.ele))?'Höjdvärden finns för rutten.': 'Höjdprofil saknas. Tryck Hämta verklig höjdprofil – DEM-data från extern tjänst.';
 $('routeKind').textContent=route.generated?`PRELIMINÄR OSM-TUR ${route.generatedType==='out-and-back'?'TUR & RETUR':route.generatedType==='loop'?'RUNDSLINGA':'EN VÄG'} · kontrollera tillträde`:route.source?.startsWith('Importerad GPX')?'IMPORTERAD GPX-RUTT':route.source?.includes('Egenritad')?'EGENRITAD · RAKA LINJER':route.demo?'HELT SYNTETISK DEMOBANA · EJ VERKLIG GEOGRAFI':'VERKLIG GPS-GEOMETRI';
 S.km=0;S.elapsed=0;S.lastSavedElapsed=-1;S.running=false;radio.disableControl();resState.lastSent=null;experience.reset();latestExperience=experience.snapshot();updateLeaderboard();updateExperienceUi();$('raceToggle').textContent='▶ Starta race';updateRoute();if(!route.demo&&S.map&&window.L){S.mapLayer.clearLayers();const line=L.polyline(route.points.map(p=>[p.lat,p.lon]),{color:'#00b88c',weight:7,opacity:.95}).addTo(S.mapLayer);S.map.fitBounds(line.getBounds(),{padding:[30,30],maxZoom:15});}renderOracles();
 // Auto-fetch only when a user selects a route, not on every map movement.
 if($('autoElevation').checked&&!route.points.every(p=>Number.isFinite(p.ele)))setTimeout(()=>{if(S.route===route&&!S.heightAbort)$('loadElevation').click();},120);
}
function updateRoute(){const r=S.route;const a=r?altitude(r.points):null;const dist=r?distanceKm(r.points):null;const idx=r?wasmCourseIndex(r,S.mode):null;$('routeName').textContent=r?.name||'Ingen bana vald';$('routeKm').textContent=dist===null?'—':dist.toFixed(2);$('routeClimb').textContent=a?.valid?a.climb:'—';$('routeIndex').textContent=idx===null?'—':idx;$('rideRouteName').textContent=r?.name||'Illustrerad testbana';$('rideLabel').textContent=r?.source||'ILLUSTRERAD TESTBANA';$('routeIndex').title= a?.valid?'Uppskattat experimentellt index':'Preliminärt index utan höjddata';$('routeClimb').title=a?.valid?(r?.elevationSource||'Källfilens höjddata, ej kvalitetsgranskade'):'Höjddata saknas';$('sourceLabel').textContent=r?`Källa: ${r.source} · ${r.points.length} koordinater · ${a?.valid?'höjdprofil: '+(r.elevationSource||'GPX'):'höjddata saknas'} · tillstånd ej validerat`:'Inga ruttdata inlästa.';$('rideRouteInfo').textContent=r?r.demo?'Syntetisk bana med genererad karta, höjdprofil och kurvor. INGEN del är verklig geografi.':`Verkligt koordinatspår från ${r.source}. Spelvyn är illustrerad; återgivningen av terräng är ännu inte georefererad 3D.`:'Ladda en OSM-led eller GPX för att cykla efter riktiga spår. Den animerade spelvyn är en illustration, inte en geografisk 3D-rendering.';$('realAltitude').textContent=a?.valid?`${a.climb} m upp / ${a.drop} m ned`:'Ej inläst';updateLeague();drawProfile();updateResistanceUi();}
function drawProfile(){
 const c=$('profile'),ctx=c.getContext('2d'),rect=c.getBoundingClientRect();
 const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(280,Math.round(rect.width||300)),h=124;
 c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const pts=S.route?.points||[];const complete=pts.length>1&&pts.every(p=>Number.isFinite(p.ele));
 if(!complete){$('profileHint').textContent='Ingen verifierad höjdprofil ännu. Välj bana och hämta verkliga höjddata.';return;}
 const cumulative=[0];for(let i=1;i<pts.length;i++)cumulative.push(cumulative.at(-1)+distanceKm([pts[i-1],pts[i]]));
 const vals=pts.map(p=>p.ele),min=Math.min(...vals),max=Math.max(...vals),span=Math.max(10,max-min),total=cumulative.at(-1)||1;
 const left=38,right=12,top=11,bottom=26,innerW=w-left-right,innerH=h-top-bottom;
 ctx.font='10px system-ui';ctx.textAlign='right';ctx.fillStyle='#92b8c7';ctx.strokeStyle='#265667';ctx.lineWidth=.8;
 for(let j=0;j<=2;j++){const y=top+j*innerH/2,v=max-(span*j/2);ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();ctx.fillText(Math.round(v)+'m',left-5,y+3);}
 ctx.beginPath();ctx.moveTo(left,top+innerH);for(let i=0;i<pts.length;i++)ctx.lineTo(left+cumulative[i]/total*innerW,top+innerH-((vals[i]-min)/span)*innerH);
 ctx.lineTo(w-right,top+innerH);ctx.closePath();ctx.fillStyle='#1b6763aa';ctx.fill();
 ctx.strokeStyle='#66ecd3';ctx.lineWidth=2;ctx.beginPath();pts.forEach((p,i)=>{const x=left+cumulative[i]/total*innerW,y=top+innerH-((p.ele-min)/span)*innerH;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
 ctx.textAlign='left';ctx.fillStyle='#a6c8d1';ctx.fillText('0 km',left,h-5);ctx.textAlign='right';ctx.fillText(total.toFixed(1)+' km',w-right,h-5);
 $('profileHint').textContent=`${S.route?.elevationSource||'GPX-höjddata'} · ${Math.round(min)}–${Math.round(max)} möh · ${total.toFixed(1)} km`;
}
$('loadElevation').addEventListener('click',async()=>{
 const route=S.route;if(!route)return;
 const ctl=new AbortController();S.heightAbort=ctl;
 $('loadElevation').disabled=true;
 try{
  const updated=await enrichRouteElevation(route,{signal:ctl.signal,onProgress:t=>$('elevationStatus').textContent=t});
  if(S.route!==route||ctl.signal.aborted)return;
  S.route=updated;updateRoute();renderOracles();
  $('elevationStatus').textContent=`Klart: ${updated.elevationSamples||'Flera'} terrängpunkter (${updated.elevationResolution||'modell'}). Källa: ${updated.elevationSource}. Spara banan lokalt för att behålla profilen. ${updated.elevationLicense||''}`;
 }catch(e){if(!ctl.signal.aborted)$('elevationStatus').textContent=e.message+' · Importera GPX med höjddata eller prova senare.';}
 finally{if(S.heightAbort===ctl){S.heightAbort=null;$('loadElevation').disabled=!!S.route?.points.every(p=>Number.isFinite(p.ele));}}
});
$('fileGPX').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>15e6){$('osmInfo').textContent='GPX-fil över 15 MB stöds inte i den här versionen.';return;}try{const xml=new DOMParser().parseFromString(await file.text(),'application/xml');if(xml.querySelector('parsererror'))throw Error('Felaktig XML');let nodes=[...xml.getElementsByTagName('trkpt')];if(nodes.length<2)nodes=[...xml.getElementsByTagName('rtept')];let pts=nodes.map(n=>{const ele=n.getElementsByTagName('ele')[0];return {lat:Number(n.getAttribute('lat')),lon:Number(n.getAttribute('lon')),ele:ele?Number(ele.textContent):null};});const title=xml.getElementsByTagName('name')[0]?.textContent?.trim()||file.name;selectRoute({name:title,source:'Importerad GPX',surface:null,points:pts});$('osmInfo').textContent=`Importerat ${file.name}. Använd den riktiga rutten i Live race.`;}catch(err){$('osmInfo').textContent=`GPX-fel: ${err.message}`;}e.target.value='';});
// OSM discovery is bounded and cancellable. IndexedDB caches the latest response for the chosen viewport.
let osmAbort=null,resultsForCurrentView=[];
function renderOsmRows(rows){
 const area=$('osmResults');area.replaceChildren();$('segmentsTitle').textContent=`Visa ${rows.length} råa vägsegment (inte banor)`;
 if(!rows.length){area.textContent='Inga enskilda OSM-vägar hittades.';return;}
 const out=document.createDocumentFragment();
 for(const obj of rows.slice(0,16)){
  const row=document.createElement('div');row.className='segment-row';
  const label=document.createElement('strong');label.textContent=obj.name;
  const sub=document.createElement('small');sub.textContent=`${obj.roadClass} · ${obj.surface||'okänt underlag'} · ${Math.round(distanceKm(obj.points)*1000)} m · ENDAST SEGMENT`;
  row.append(label,sub);out.append(row);
 }
 if(rows.length>16){const p=document.createElement('p');p.className='mini';p.textContent=`Ytterligare ${rows.length-16} råa segment används av ruttmotorn.`;out.append(p);}area.append(out);
}
function displayOsmOnMap(rows){
 if(!S.map||!window.L)return;S.osmLayer.clearLayers();
 for(const obj of rows.slice(0,450)){
  const poly=L.polyline(obj.points.map(p=>[p.lat,p.lon]),{color:'#d7b45d',weight:2,opacity:.5});
  poly.bindTooltip(obj.name+' · rå vägdel, INTE färdig bana');poly.addTo(S.osmLayer);
 }
}
function rowsToWays(rows){return rows.map(r=>({id:r.osmId,geometry:r.points,nodes:r.nodeIds,tags:{highway:r.roadClass,surface:r.surface}}));}
function displayDiscoveryMessage(message,buttonText='',onClick=null){
 const area=$('discoveryCards');area.replaceChildren();const card=document.createElement('article');card.className='discovery-card info-card';
 const msg=document.createElement('p');msg.textContent=message;card.append(msg);
 if(buttonText&&onClick){const b=document.createElement('button');b.textContent=buttonText;b.addEventListener('click',onClick);card.append(b);}
 area.append(card);
}
function discoveryRouteCard(entry,label){
 const {route,geo}=entry,card=document.createElement('article');card.className='discovery-card';
 const badge=document.createElement('span');badge.className='d-badge';badge.textContent=label;
 const title=document.createElement('strong');title.textContent=route.name;
 const km=Number.isFinite(geo.km)?geo.km:distanceKm(route.points);
 const detail=document.createElement('p');detail.textContent=`${km.toFixed(1)} km · ${MODES[route.mode||S.mode]||'Cykling'} · ${geo.crosses?'Passerar kartutsnittet':geo.nearKm.toFixed(1)+' km från kartan'}`;
 const meta=document.createElement('div');meta.className='d-meta';meta.textContent=route.generated?'Förslag från lokalt OSM-vägnät · ej verifierad officiell tävlingsbana':(route.source||'Lokalt sparad bana');
 const button=document.createElement('button');button.type='button';button.textContent='Visa och välj bana →';button.addEventListener('click',()=>selectRoute({...route,points:route.points.map(p=>({...p}))}));
 card.append(badge,title,detail,meta,button);return card;
}
function renderDiscoveryCatalog(){
 const area=$('discoveryCards');if(!area||!S.map)return;
 const bounds=S.map.getBounds(),target=Number($('routeLength').value)||10;
 const all=[...S.localRoutes,...S.generatedRoutes,...S.mixRoutes];
 const status=$('discoveryStatus');
 status.textContent='När du flyttar kartan uppdateras närliggande banor direkt. Sparade banor söks lokalt; nya OSM-vägar hämtas bara när du väljer det.';
 if(S.discoveryTab==='community'){
  displayDiscoveryMessage('Andras användares banor är en planerad kategori. Vi har ännu ingen verifierad community-datakälla. Importera en delad GPX-fil för att använda en verklig bana – inga påhittade användare eller betyg.', 'Importera en GPX',()=>{$('fileGPX').click();});return;
 }
 if(S.discoveryTab==='race'){
  displayDiscoveryMessage('Verkliga lopp får en separat verifierad bankatalog med officiell arrangör, distans, datum, GPX-spår och banversion. Ingen sådan datakälla är ansluten än – vi visar därför inte påhittade tävlingsbanor.', 'Importera officiell GPX',()=>{$('fileGPX').click();});return;
 }
 let results=[];
 if(S.discoveryTab==='mine'){
  results=rankedRoutes(S.localRoutes,bounds,{mode:S.mode,targetKm:target,limit:24});
  status.textContent=`${S.localRoutes.length} egna banor sparade på den här enheten. De som passerar kartan visas först.`;
 }else if(S.discoveryTab==='near'){
  results=nearbyRoutes(all,bounds,{radiusKm:3,limit:12});
  status.textContent=`${results.length} banor som korsar eller passerar inom 3 km från kartområdet. Även banor som börjar långt därifrån räknas.`;
 }else if(S.discoveryTab==='mix'){
  results=rankedRoutes([...S.mixRoutes,...S.localRoutes,...S.generatedRoutes],bounds,{mode:S.mode,targetKm:target,limit:12});
  status.textContent='Olika distanser och discipliner från tillgängliga verkliga OSM-segment och egna banor – preliminära förslag.';
 }else{
  results=rankedRoutes([...S.generatedRoutes,...S.localRoutes],bounds,{mode:S.mode,targetKm:target,limit:12});
  // Top is an editorial scoring model; no popularity/quality data exists yet.
  results=results.filter(x=>x.geo.crosses||x.geo.nearKm<20);
  status.textContent='Toppförslag sorteras efter närhet, distans och disciplin – inte efter påhittade betyg eller popularitet.';
 }
 area.replaceChildren();
 if(!results.length){
  displayDiscoveryMessage(S.discoveryTab==='mine'?'Du har ännu inga sparade banor. Välj en rutt eller rita en egen och tryck Spara bana.':S.discoveryTab==='near'?'Inga inlästa eller sparade banor passerar nära kartutsnittet ännu. Hämta OSM-vägar i området eller importera en GPX-bana.':'Inga passande turförslag här ännu. Bygg rutter från kartan eller välj en annan distans.', 'Hämta rutter här',()=>{$('loadOSM').click();});return;
 }
 for(const entry of results){
  let badge=S.discoveryTab==='mine'?'MIN BANA':S.discoveryTab==='near'?'NÄRA KARTAN':S.discoveryTab==='mix'?'MIXAD TUR':'RELEVANT FÖRSLAG';
  if(entry.route.source?.startsWith('Importerad'))badge='GPX · LOKAL';
  area.append(discoveryRouteCard(entry,badge));
 }
}
for(const b of document.querySelectorAll('[data-discovery]'))b.addEventListener('click',()=>{
 S.discoveryTab=b.dataset.discovery;
 document.querySelectorAll('[data-discovery]').forEach(x=>x.classList.toggle('active',x===b));
 renderDiscoveryCatalog();
});
function renderRouteSuggestions(){
 const area=$('routeSuggestions');area.replaceChildren();
 if(!S.graphWays.length){S.generatedRoutes=[];S.mixRoutes=[];const p=document.createElement('p');p.className='empty-routes';p.textContent='Ingen nätverksdata laddad. Hämta OSM-vägar eller importera GPX.';area.append(p);renderDiscoveryCatalog();return;}
 const target=Number($('routeLength').value)||10;
 const routeType=$('routeType').value;
 const generated=generateConnectedRoutes(S.graphWays,{mode:S.mode,bounds:S.map?.getBounds(),targetKm:target,count:4,routeType,startCoord:S.plannerStart});
 S.generatedRoutes=generated.routes;
 // Mix modes/distances only where a real connected OSM network exists.
 const otherModes=['road','gravel','mtb','downhill'].filter(m=>m!==S.mode);
 S.mixRoutes=[];for(const m of otherModes){const mix=generateConnectedRoutes(S.graphWays,{mode:m,bounds:S.map?.getBounds(),targetKm:m==='downhill'?5:Math.max(5,target*.7),count:2,startCoord:S.plannerStart});S.mixRoutes.push(...mix.routes);}
 renderDiscoveryCatalog();
 const heading=document.createElement('p');heading.className='route-summary';heading.textContent=`${generated.routes.length} sammanhängande turförslag · ${generated.edgeCount} vägkanter · ${generated.nodeCount} OSM-noder`;
 if(generated.startIssue){$('plannerStatus').textContent=generated.startIssue;}
 area.append(heading);
 if(!generated.routes.length){const p=document.createElement('p');p.className='empty-routes';p.textContent=generated.startIssue||`Ingen ${routeType==='loop'?'verklig rundslinga':routeType==='outback'?'tillåten tur och retur':routeType==='oneway'?'enkelriktad tur':'sammanhängande tur'} på cirka ${target} km hittades i de vägar som är inlästa. Pröva att hämta mer vägnät, välj annan startpunkt eller kortare distans. Vi hittar inte på vägförbindelser.`;area.append(p);return;}
 for(let i=0;i<generated.routes.length;i++){
  const r=generated.routes[i],div=document.createElement('article');div.className='route-suggestion';
  const num=document.createElement('span');num.className='route-number';num.textContent='TUR '+String(i+1).padStart(2,'0');
  const title=document.createElement('strong');title.textContent=`${distanceKm(r.points).toFixed(1)} km · ${r.generatedType==='out-and-back'?'tur & retur':r.generatedType==='loop'?'rundslinga':'enkel väg'}`;
  const info=document.createElement('small');info.textContent=`${r.points.length} vägkoordinater · OSM-noder länkade · höjddata kan hämtas`;
  const button=document.createElement('button');button.type='button';button.textContent='Välj tur →';button.addEventListener('click',()=>selectRoute({...r,points:r.points.map(p=>({...p}))}));
  div.append(num,title,info,button);area.append(div);
 }
}
$('routeLength').addEventListener('change',()=>setPlannerStart(S.plannerStart,S.plannerStart?'Vald punkt':'kartans mitt'));
function osmCacheKey(bounds,mode){return mode+':'+[bounds.getSouth(),bounds.getWest(),bounds.getNorth(),bounds.getEast()].map(x=>x.toFixed(2)).join(',');}
// Manual route drawing is independent of Overpass; geometry stays only in the local browser.
S.drawing=false;S.drawPoints=[];S.drawLayer=null;
function updateDrawStatus(message){
 $('drawStatus').textContent=message;
 $('drawRoute').disabled=S.drawing;
 $('undoDraw').disabled=!S.drawing||!S.drawPoints.length;
 $('finishDraw').disabled=!S.drawing||S.drawPoints.length<2;
 $('discardDraw').disabled=!S.drawing;
}
function drawPreview(){
 if(!S.drawLayer||!window.L)return;
 S.drawLayer.clearLayers();
 if(S.drawPoints.length>=2)L.polyline(S.drawPoints.map(p=>[p.lat,p.lon]),{color:'#40e5d5',weight:5,dashArray:'6 5',bubblingMouseEvents:false}).addTo(S.drawLayer);
 for(const p of S.drawPoints)if(typeof L.circleMarker==='function')L.circleMarker([p.lat,p.lon],{radius:5,color:'#f9d27f',fillOpacity:1,bubblingMouseEvents:false}).addTo(S.drawLayer);
}
function addDrawPoint(latlng){
 if(!S.drawing||S.drawPoints.length>=3000)return;
 if(!Number.isFinite(latlng.lat)||!Number.isFinite(latlng.lng))return;
 S.drawPoints.push({lat:latlng.lat,lon:latlng.lng,ele:null});drawPreview();
 updateDrawStatus(`${S.drawPoints.length} punkter. Klicka på kartan för fler, eller välj Använd banan.`);
}
$('drawRoute').addEventListener('click',()=>{
 if(!S.map){updateDrawStatus('Kartan saknas; GPX-import fungerar ändå.');return;}
 S.drawing=true;S.drawPoints=[];drawPreview();updateDrawStatus('Ritläge aktiverat. Klicka minst två punkter på kartan.');
 $('map').classList.add('drawing-active');
});
$('undoDraw').addEventListener('click',()=>{if(!S.drawing)return;S.drawPoints.pop();drawPreview();updateDrawStatus(`${S.drawPoints.length} punkter kvar.`);});
$('discardDraw').addEventListener('click',()=>{S.drawing=false;S.drawPoints=[];drawPreview();$('map').classList.remove('drawing-active');updateDrawStatus('Ritningen avbröts.');});
$('finishDraw').addEventListener('click',()=>{
 if(!S.drawing||S.drawPoints.length<2)return;
 const points=S.drawPoints.map(p=>({...p})),name=$('drawName').value.trim()||'Egen bana '+new Date().toLocaleDateString('sv-SE');
 S.drawing=false;S.drawPoints=[];drawPreview();$('map').classList.remove('drawing-active');
 selectRoute({name,source:'Egenritad i kartan (raka segment)',surface:null,points,mode:S.mode});
 updateDrawStatus('Banan vald. Tryck Spara bana lokalt för att behålla den i banbiblioteket.');
});

$('cancelOSM').addEventListener('click',()=>osmAbort?.abort());
$('loadOSM').addEventListener('click',async()=>{
 if(osmAbort)return;
 if(!S.map){$('osmInfo').textContent='Kartan kunde inte startas. Importera en GPX-fil eller använd sparad bana.';return;}
 const bounds=S.map.getBounds(),provider=$('osmProvider').value;
 if(provider==='osm-api'&&!smallBbox(bounds)){
  $('osmInfo').textContent='OSM:s huvud-API är en separat reserv för mycket små manuella uttag. Välj Automatisk för valfritt stort område.';return;
 }
 const {patches,partial}=provider==='osm-api'?{patches:[bounds],partial:false}:planViewportCoverage(bounds,{maxPatches:3});
 const controller=new AbortController();osmAbort=controller;
 $('loadOSM').disabled=true;$('cancelOSM').hidden=false;
 const fetched=[],hosts=[],warnings=[];
 let cachedCount=0,goodCount=0;
 const msg=$('osmInfo');
 try{
  for(let i=0;i<patches.length;i++){
   if(controller.signal.aborted)throw Error('Sökningen avbröts.');
   const box=patches[i],key=osmCacheKey(box,S.mode);
   msg.textContent=`Kartområde ${i+1}/${patches.length}: söker efter riktiga vägsegment …`;
   const cached=await localDB.getCache(key).catch(()=>null);
   if(provider==='auto'&&cached?.rows?.length&&Date.now()-cached.savedAt<7*864e5){
    fetched.push(rowsToWays(cached.rows));cachedCount++;goodCount++;
    continue;
   }
   try{
    const q=buildOverpassQuery(box,S.mode);
    const result=await requestOverpass(q,{bounds:box,mode:S.mode,provider,signal:controller.signal,onProgress:t=>msg.textContent=`Delområde ${i+1}/${patches.length}: ${t}`});
    const ways=result.data.elements||[];fetched.push(ways);hosts.push(result.host);goodCount++;
    const rows=osmRows(result.data,S.mode);
    if(rows.length&&localDB.db)await localDB.putCache({key,rows,savedAt:Date.now()}).catch(()=>{});
   }catch(e){
    if(controller.signal.aborted)throw Error('Sökningen avbröts.');
    warnings.push(`Delområde ${i+1}: ${String(e.message||e).slice(0,130)}`);
    if(cached?.rows?.length){fetched.push(rowsToWays(cached.rows));cachedCount++;goodCount++;}
   }
  }
  const allWays=mergeOSMWays(fetched,{maxWays:2600});
  if(!allWays.length){msg.textContent='Inga vägar hämtades. '+warnings.join(' · ').slice(0,260)+'. Du kan fortfarande rita en egen bana eller öppna sparade banor.';return;}
  const rows=osmRows({elements:allWays},S.mode);
  displayOsmOnMap(rows);renderOsmRows(rows);S.graphWays=allWays;renderRouteSuggestions();
  const note=partial?` Sökningen täckte ${goodCount}/${patches.length} utvalda delområden, inte varje väg i hela kartutsnittet.`:'';
  const issue=warnings.length?` ${warnings.length} delområde(n) svarade inte.`:'';
  msg.textContent=`${allWays.length} vägsegment hämtade (${[...new Set(hosts)].join(', ')||'lokal cache'}${cachedCount?' + cache':''}). ${S.generatedRoutes.length} anslutna turförslag.${note}${issue}`;
 }catch(e){msg.textContent=e.message||'Sökningen avbröts. Tidigare sparade banor påverkas inte.';}
 finally{osmAbort=null;$('loadOSM').disabled=false;$('cancelOSM').hidden=true;}
});

// QCDS Local Database – all stored records remain on this browser/device.
function libraryNotice(message){$('libraryMessage').textContent=message;}
async function refreshLibrary(){
 if(!localDB.db)return;
 const [routes,rides]=await Promise.all([localDB.listRoutes(),localDB.listRides()]);
 const saved=$('savedRoutes');saved.replaceChildren();
 S.localRoutes=routes;renderDiscoveryCatalog();
 routes.sort((a,b)=>String(b.savedAt||'').localeCompare(String(a.savedAt||'')));
 if(!routes.length)saved.textContent='Inga sparade banor ännu.';
 for(const route of routes){
  const div=document.createElement('article');div.className='library-row';div.setAttribute('role','listitem');
  const title=document.createElement('strong');title.textContent=route.name;
  const caption=document.createElement('small');caption.textContent=[MODES[route.mode]||route.mode||'Bana',distanceKm(route.points).toFixed(2)+' km',route.source].join(' · ');
  const controls=document.createElement('div');controls.className='library-row-actions';
  const load=document.createElement('button');load.textContent='Öppna';load.addEventListener('click',()=>{selectRoute({...route,points:route.points.map(p=>({...p}))});libraryNotice('Banan öppnad: '+route.name);});
  const del=document.createElement('button');del.textContent='Radera';del.className='remove';del.addEventListener('click',async()=>{if(!confirm('Radera den sparade banan '+route.name+'? Körhistoriken sparas.'))return;await localDB.deleteRoute(route.id);if(S.route?.id===route.id)delete S.route.id;await refreshLibrary();libraryNotice('Banan raderad.');});
  controls.append(load,del);div.append(title,caption,controls);saved.append(div);
 }
 const history=$('savedRides');history.replaceChildren();
 rides.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 if(!rides.length)history.textContent='Ingen körhistorik sparad.';
 for(const ride of rides.slice(0,70)){
  const div=document.createElement('article');div.className='library-row';div.setAttribute('role','listitem');
  const title=document.createElement('strong');title.textContent=ride.name;
  const meta=document.createElement('small');meta.textContent=`${new Date(ride.date).toLocaleString('sv-SE')} · ${(ride.km||0).toFixed(2)} km · ${Math.round((ride.elapsedSeconds||0)/60)} min · ${ride.source==='demo'?'DEMO / simulerat':'FTMS / sensor'} · ${ride.finished?'Målgång':'Delpass'}`;
  const buttons=document.createElement('div');buttons.className='library-row-actions';const del=document.createElement('button');del.textContent='Radera';del.className='remove';del.addEventListener('click',async()=>{if(!confirm('Radera detta körpass?'))return;await localDB.deleteRide(ride.id);await refreshLibrary();});buttons.append(del);
  div.append(title,meta,buttons);history.append(div);
 }
 $('dbStatus').textContent=`${routes.length} banor · ${rides.length} pass`;
}
$('saveRoute').addEventListener('click',async()=>{
 if(!S.route){libraryNotice('Välj en bana eller importera GPX först.');return;}
 if(!localDB.db){libraryNotice('Lokal databas saknas: '+localDB.status);return;}
 try{
  const existing=!!S.route.id;const id=S.route.id||newCyclingId();
  const name=prompt('Namn på sparad bana:',S.route.name||'Min bana');
  if(name===null)return;
  S.route.name=name.trim().slice(0,160)||'Min bana';S.route.id=id;
  await localDB.putRoute({...S.route,mode:S.mode,savedAt:new Date().toISOString(),points:cleanRoute(S.route.points)});
  updateRoute();await refreshLibrary();libraryNotice((existing?'Banan uppdaterad: ':'Banan sparad: ')+S.route.name);
 }catch(e){libraryNotice('Kunde inte spara: '+e.message);}
});
async function recordRide(finished=false){
 if(!localDB.db){$('rideNotice').textContent='Passet kunde inte sparas: lokal databas saknas.';return;}
 if(S.elapsed<3){$('rideNotice').textContent='Kör minst tre sekunder innan du sparar.';return;}
 if(S.lastSavedElapsed===S.elapsed){$('rideNotice').textContent='Passet är redan sparat.';return;}
 const row={id:newCyclingId(),date:new Date().toISOString(),name:S.route?.name||'Illustrerad testbana',routeId:S.route?.id||null,mode:S.mode,elapsedSeconds:S.elapsed,km:S.km,source:S.source,finished,ftp:Number($('ftp').value),weight:Number($('weight').value),resistanceAuto:resState.enabled,resistanceOffset:resState.offset,resistanceLastCommanded:resState.lastSent};
 try{await localDB.putRide(row);S.lastSavedElapsed=S.elapsed;await refreshLibrary();$('rideNotice').textContent=(S.source==='demo'?'DEMO: ':'')+'Passet sparat lokalt. Det syns under Ruttstudio → Mina körpass.';}
 catch(e){$('rideNotice').textContent='Kunde inte spara passet: '+e.message;}
}
$('saveRide').addEventListener('click',()=>recordRide(!S.running&&S.route&&S.km>=distanceKm(S.route.points)));
$('exportLocal').addEventListener('click',async()=>{try{
 const txt=await localDB.exportJSON();const url=URL.createObjectURL(new Blob([txt],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='QCDS_Cycling_backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);libraryNotice('Säkerhetskopian är nedladdad som JSON.');
 }catch(e){libraryNotice('Exportfel: '+e.message);}});
$('importLocal').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;
 try{if(f.size>15e6)throw Error('Filen är för stor.');const text=await f.text();const tally=await localDB.importJSON(text);await refreshLibrary();libraryNotice(`Återställde ${tally.routes} banor och ${tally.rides} pass.`);}
 catch(err){libraryNotice('Importfel: '+err.message);}finally{e.target.value='';}});
async function initLocalLibrary(){try{await localDB.open();await refreshLibrary();libraryNotice('Lokal lagring är aktiv. Banor och pass finns kvar i denna webbläsare även efter omstart.');}catch(e){localDB.status=e.message;$('dbStatus').textContent='Lagring saknas';libraryNotice('Kunde inte öppna IndexedDB: '+e.message);}}
initLocalLibrary();

$('startRoute').addEventListener('click',()=>{if(!S.route){$('osmInfo').textContent='Välj en sammanhängande tur, egen bana eller GPX först.';return;}changeTab('ride');});
$('clearRoute').addEventListener('click',()=>{S.route=null;if(S.mapLayer)S.mapLayer.clearLayers();S.km=0;S.elapsed=0;S.running=false;updateRoute();renderOracles();});
function updateLeague(){const idx=wasmCourseIndex(S.route,S.mode);$('leagueIndex').textContent=idx??'—';$('leagueRoute').textContent=S.route?.name||'Ingen vald';}
function renderOracles(){const v=getInputs();const checks=evaluate({route:S.route,mode:S.mode,telemetry:S.telemetry,ftp:v.ftp,weight:v.weight});const ok=checks.filter(c=>c.result==='ok').length;$('oracleCount').textContent=`${ok} / ${checks.length}`;$('oracleList').innerHTML='';for(const c of checks){const div=document.createElement('article');div.className=`oracle ${c.result}`;const badge=document.createElement('span');badge.className='status';badge.textContent=c.result==='ok'?'UPPFYLLT':c.result==='unknown'?'OKÄNT':'EJ UPPFYLLT';const h=document.createElement('h3');h.textContent=`${c.id} · ${c.name}`;const p=document.createElement('p');p.textContent=c.desc;div.append(badge,h,p);$('oracleList').append(div);}}
function currentSpeedKmh(){const watts=S.source==='none'?null:S.liveWatts,grade=gradeAtProgress();return watts===null?0:Math.max(0,6+.094*watts-(Number.isFinite(grade)?grade*.7:0));}
function updateTelemetry(){
 const watts=S.source==='none'?null:S.liveWatts;
 $('watts').textContent=watts===null?'—':Math.round(watts);
 $('cadence').textContent=S.telemetry.cadence===null?'—':Math.round(S.telemetry.cadence);
 $('distance').textContent=S.km.toFixed(2);
 $('speed').textContent=watts===null?'—':currentSpeedKmh().toFixed(1);
 $('position').textContent=`${latestExperience.position}/${latestExperience.total}`;
}
function gradeAtProgress(){return gradientOnRoute(S.route,S.km,distanceKm);}
function renderRaceRadar(st){
 const root=$('raceRadar');root.replaceChildren();
 const marker=document.createElement('span');marker.className='radar-self';marker.title='DU';marker.textContent='▲';root.append(marker);
 const you=st.player.km;
 for(const p of st.others){const relative=(p.km-you)*1000;const dot=document.createElement('span');dot.className='radar-dot';
 dot.style.left=`${Math.max(2,Math.min(98,50+relative*.43))}%`;
 dot.style.backgroundColor=p.color;dot.title=`${p.name}: ${Math.round(Math.abs(relative))} meter ${relative>0?'framför':'bakom'}`;root.append(dot);}
 $('radarText').textContent=`${st.others.filter(p=>p.km>you).length} framför · ${st.others.filter(p=>p.km<you).length} bakom`;
 root.setAttribute('aria-label',`${$('radarText').textContent}. Din placering ${st.position} av ${st.total}.`);
}
function updateExperienceUi({announce=false}={}){
 const st=latestExperience;
 renderRaceRadar(st);
 $('position').textContent=st.position+'/'+st.total;
 $('racePackCount').textContent=`${st.nearby} nära`;
 $('raceGap').textContent=st.frontGapM===null?'Du leder':`${st.frontGapM} m till nästa`;
 $('raceTicker').textContent=experienceText(st,visualMode==='minimal'?'essential':visualMode==='detailed'?'detailed':'tactical');
 $('raceDetail').textContent=st.events.at(-1)?.text||'Klungan rör sig efter samma simulerade tävlingsdata som topplistan.';
 $('raceEvent').textContent=st.events.at(-1)?.text||(S.running?'Racet är igång · 7 cyklister i det lokala demonstrationsfältet':'Välj Kör demo direkt för ett lokalt simulerat race.');
 $('raceInfo').dataset.visual=visualMode;
 if(soundMode!=='off'&&announce&&S.running)talkRace(st);
}
function talkRace(st){
 if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window))return;
 const ms=Date.now(),frequency=soundMode==='essential'?25000:soundMode==='tactical'?14500:8500;
 const recent=st.events.at(-1),newEvent=recent&&recent.seq>spokenEvent&&recent.elapsed>=st.elapsed-2;
 if(ms-lastAudioAt<4500 || (!newEvent && ms-lastAudioAt<frequency))return;
 lastAudioAt=ms;
 const msg=newEvent?recent.text:experienceText(st,soundMode);
 if(newEvent)spokenEvent=recent.seq;
 window.speechSynthesis.cancel();
 const speech=new SpeechSynthesisUtterance(msg);speech.lang='sv-SE';speech.rate=1.02;speech.volume=.85;
 window.speechSynthesis.speak(speech);
}
function setAudioMode(mode){
 soundMode=mode;$('audioMode').value=mode;
 if(mode==='off'){window.speechSynthesis?.cancel();$('audioStatus').textContent='Ljudbeskrivning av';return;}
 if(!('speechSynthesis' in window)){$('audioStatus').textContent='Den här webbläsaren saknar talstöd.';soundMode='off';$('audioMode').value='off';return;}
 lastAudioAt=0;$('audioStatus').textContent='Ljudbeskrivning aktiv · svenskt tal · '+(mode==='essential'?'enkel':mode==='tactical'?'taktisk':'detaljerad');
 if(latestExperience&&S.running)talkRace(latestExperience);
}
$('audioMode').addEventListener('change',e=>setAudioMode(e.target.value));
$('visualMode').addEventListener('change',e=>{visualMode=e.target.value;updateExperienceUi();});
function raceTick(){
 if(!S.running)return;
 S.elapsed++;
 if(S.source==='demo'){
  S.liveWatts=Math.round(153+35*Math.sin(S.elapsed/14)+14*Math.sin(S.elapsed/3));
  S.telemetry.power=S.liveWatts;S.telemetry.cadence=Math.round(79+8*Math.sin(S.elapsed/8));
 }
 const kmh=currentSpeedKmh();S.km+=kmh/3600;
 const max=S.route?distanceKm(S.route.points):12.4;
 if(S.km>=max&&max>0){S.km=max;S.running=false;$('raceToggle').textContent='✓ Målgång';void recordRide(true);radio.disableControl();resState.lastSent=null;}
 latestExperience=experience.step({elapsed:S.elapsed,km:S.km,watts:S.liveWatts,speedKmh:kmh,grade:gradeAtProgress(),running:S.running});
 lastExperienceMs=performance.now();
 updateTelemetry();$('raceTime').textContent=`${String(Math.floor(S.elapsed/60)).padStart(2,'0')}:${String(S.elapsed%60).padStart(2,'0')}`;
 updateLeaderboard();updateExperienceUi({announce:true});updateResistanceUi();void syncAutoResistance();
}
$('raceToggle').addEventListener('click',()=>{
 if(S.source==='none'){$('rideNotice').textContent='Anslut cykeln eller tryck Kör demo direkt.';return;}
 if(S.running){S.running=false;$('raceToggle').textContent='▶ Fortsätt';window.speechSynthesis?.cancel();}
 else {const max=S.route?distanceKm(S.route.points):12.4;if(S.km>=max){S.km=0;S.elapsed=0;S.lastSavedElapsed=-1;experience.reset();latestExperience=experience.snapshot();}
 S.running=true;$('raceToggle').textContent='Ⅱ Pausa race';$('rideNotice').textContent=S.source==='ftms'?'Verkliga watt från cykeln · motståndare simulerade.':'DEMOLÄGE · effekter, medspelare och resultat simulerade.';
 }
 updateExperienceUi();updateResistanceUi();if(S.running)void syncAutoResistance();
});
$('raceDemo').addEventListener('click',()=>{
 if(!S.route){S.demoWorld=true;$('demoWorldPanel').hidden=false;chooseCompleteDemoRoute(S.demoRouteId);}
 radio.disconnect();disableAutoResistance();S.source='demo';S.telemetry={source:'demo',power:153,cadence:79,speed:null,hr:null};S.liveWatts=153;
 updateDevice('SIMULERAD DATA · inte cykelmätning');$('disconnect').hidden=false;
 if(!S.running)$('raceToggle').click();updateTelemetry();updateLeaderboard();
});
$('raceReset').addEventListener('click',()=>{
 S.running=false;S.km=0;S.elapsed=0;S.lastSavedElapsed=-1;experience.reset();latestExperience=experience.snapshot();
 $('raceToggle').textContent='▶ Starta race';$('raceTime').textContent='00:00';window.speechSynthesis?.cancel();
 radio.disableControl();resState.lastSent=null;updateTelemetry();updateLeaderboard();updateExperienceUi();updateResistanceUi();
});
function updateLeaderboard(){
 const people=latestExperience.all;
 const list=$('leaderboard');list.replaceChildren();
 people.forEach((p,i)=>{
  const el=document.createElement('div');el.className='racerow'+(p.me?' me':'');
  const place=document.createElement('span');place.textContent=String(i+1).padStart(2,'0');
  const name=document.createElement('span');name.textContent=p.name;
  const dist=document.createElement('span');dist.textContent=Math.max(0,p.km-0.07).toFixed(2)+' km';
  el.append(place,name,dist);list.append(el);
 });
 $('position').textContent=`${latestExperience.position}/${latestExperience.total}`;
}
let canvas=$('raceCanvas'),cw=0,ch=0,sceneRenderer=null,raceCtx=null,activeGraphics='2d';
function resizeRace(){
 const r=canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;
 cw=r.width;ch=r.height;const dpr=Math.min(1.5,devicePixelRatio||1);
 if(sceneRenderer)sceneRenderer.resize(cw,ch,dpr);
 else{canvas.width=Math.floor(cw*dpr);canvas.height=Math.floor(ch*dpr);raceCtx=canvas.getContext('2d');if(raceCtx)raceCtx.setTransform(dpr,0,0,dpr,0,0);}
}
function initializeRaceRenderer(){
 const current=$('graphicsMode').value;
 if(sceneRenderer){sceneRenderer.dispose();sceneRenderer=null;}
 // A canvas cannot use both 2D and WebGL; replace the element when changing modes.
 const next=canvas.cloneNode(false);canvas.replaceWith(next);canvas=next;raceCtx=null;activeGraphics='2d';
 if(current==='webgl'){
  try{sceneRenderer=new SyntractGraphics3D(canvas);activeGraphics='webgl';}
  catch(e){$('graphicsMessage').textContent='3D saknas på enheten. Stabil 2,5D används: '+(e.message||e);}
 }
 if(!sceneRenderer)raceCtx=canvas.getContext('2d');
 if(sceneRenderer){$('graphicsMessage').textContent='3D WebGL2 aktiv · scener byggs från explicita Syntract-orakel. Ingen fotorealistisk platsrekonstruktion.';}
 if($('graphicsStatus'))$('graphicsStatus').textContent=activeGraphics==='webgl'?'WebGL2 · Syntract Graphics 3D, orakelbaserad scen':'Canvas 2D · stabil reservrenderare';
 resizeRace();
}
$('graphicsMode').addEventListener('change',initializeRaceRenderer);
$('sceneBiome').addEventListener('change',()=>{latestSceneKey='';if(sceneRenderer)sceneRenderer.lastKey='';});
$('sceneSeason').addEventListener('change',()=>{latestSceneKey='';if(sceneRenderer)sceneRenderer.lastKey='';});
$('sceneRoadside').addEventListener('change',()=>{latestSceneKey='';if(sceneRenderer)sceneRenderer.lastKey='';});
$('sceneLighting').addEventListener('change',()=>{latestSceneKey='';if(sceneRenderer)sceneRenderer.lastKey='';});
$('sceneAtmosphere').addEventListener('change',()=>{latestSceneKey='';if(sceneRenderer)sceneRenderer.lastKey='';});
$('sceneQuality').addEventListener('change',()=>{if(sceneRenderer)sceneRenderer.lastKey='';});
window.addEventListener('resize',()=>{resizeRace();drawProfile();});
let latestSceneResult=null,latestSceneKey='';
function activeSceneResult(){
 const key=[S.route?.id||S.route?.name||'none',S.mode,$('sceneBiome').value,$('sceneSeason').value,$('sceneRoadside').value,$('sceneLighting').value,$('sceneAtmosphere').value,S.route?.surface||'',S.route?.points?.length||0].join('|');
 if(key!==latestSceneKey){latestSceneKey=key;latestSceneResult=inferSyntractScene({route:S.route,mode:S.mode,override:$('sceneBiome').value,seasonOverride:$('sceneSeason').value,roadsideOverride:$('sceneRoadside').value,lightingOverride:$('sceneLighting').value,atmosphereOverride:$('sceneAtmosphere').value});}
 return latestSceneResult;
}
function raceDraw(timestamp){
 requestAnimationFrame(raceDraw);if(!cw||!ch||S.tab!=='ride')return;
 const now=timestamp||performance.now(),extra=S.running?Math.max(0,Math.min(950,now-lastExperienceMs))/3600000:0;
 const st=latestExperience;
 const drawState={...st,player:{...st.player,km:st.player.km+st.speedKmh*extra},others:st.others.map(b=>({...b,km:b.km+(b.speedKmh||20)*extra}))};
 const visual=activeSceneResult();
 if(sceneRenderer){
  try{const quality=$('sceneQuality').value==='auto'?(cw<720?'low':'high'):$('sceneQuality').value;
   sceneRenderer.render({snapshot:drawState,scene:visual,route:S.route,routeMeters:S.km*1000,quality,time:now/1000});
  }catch(e){$('graphicsMessage').textContent='3D-rendering pausad: '+(e?.message||e)+'. Välj 2,5D som reservvy.';}
 }else if(raceCtx)paintSyntractRace(raceCtx,cw,ch,drawState,now/1000,S.mode,visualMode);
 if(now-(window._syntractSceneStatusAt||0)>2200){
  $('sceneInfo').textContent=`${visual.label} · ${visual.matched.length} uppfyllda orakel / ${visual.candidateCount} giltiga syntestillstånd · ${visual.state.season} · ${visual.state.roadside} · ${visual.state.lighting} · ${visual.state.atmosphere} · ${visual.syntheticElevation?'syntetisk demohöjd':visual.realElevation?'höjddata inläst':'terränghöjd illustrerad'} · ${S.route?.demo?'syntetisk banprofil':''+(S.route?'banans GPS/OSM används för kurvförhandsvisning':'generisk demoslinga')}`;
  window._syntractSceneStatusAt=now;
 }
}
initEngine().then(()=>{if($('wasmStatus'))$('wasmStatus').textContent=engineStatus();updateHandicap();updateRoute();});
initializeRaceRenderer();
setInterval(raceTick,1000);setInterval(()=>{if(S.source==='demo'&&!S.running){S.liveWatts=115;updateTelemetry();}},5000);updateDevice('Väntar på Bluetooth FTMS');updateHandicap();updateRoute();updateTelemetry();updateLeaderboard();requestAnimationFrame(raceDraw);resizeRace();updateExperienceUi();updateResistanceUi();