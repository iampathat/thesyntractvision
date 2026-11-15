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
function bike(ctx,x,y,scale,color,player=false,lean=0,seconds=0,cadence=82){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(lean);
 ctx.fillStyle='#0c1720aa';ctx.beginPath();ctx.ellipse(0,4,30,7,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#111f29';ctx.lineWidth=4;for(const dx of [-21,20]){ctx.beginPath();ctx.ellipse(dx,-3,11,14,0,0,Math.PI*2);ctx.stroke();}
 ctx.lineWidth=3;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(-21,-3);ctx.lineTo(-5,-24);ctx.lineTo(20,-3);ctx.lineTo(-21,-3);ctx.moveTo(-5,-24);ctx.lineTo(7,-5);ctx.stroke();
 ctx.strokeStyle='#d9e6ef';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-4,-28);ctx.lineTo(-10,-45);ctx.lineTo(8,-50);ctx.stroke();
 // Pedal crank drives opposite legs in this low-power Canvas fallback too.
 for(const side of [-1,1]){
  const phase=seconds*Math.max(0,Math.min(190,cadence))*Math.PI/30+(side>0?Math.PI:0);
  const hipX=side*4,hipY=-42,footX=-1+9*Math.cos(phase),footY=-15+9*Math.sin(phase);
  const kneeX=(hipX+footX)/2+11,kneeY=(hipY+footY)/2-3;
  ctx.strokeStyle=side<0?'#202e33':'#334149';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(hipX,hipY);ctx.lineTo(kneeX,kneeY);ctx.stroke();
  ctx.strokeStyle='#c08c69';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(kneeX,kneeY);ctx.lineTo(footX,footY);ctx.stroke();
  ctx.strokeStyle='#c6d4d9';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(footX,footY-3);ctx.lineTo(footX+8,footY);ctx.stroke();
 }

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
    bike(ctx,x,p.y-3*size,size,b.color,false,Math.sin(t/3+Number(b.offsetM))*.025,t,b.cadence||78);
    if((visual==='detailed'||visual==='tactical')&&d>=0&&d<130){ctx.textAlign='center';ctx.fillStyle='#f2fbf9';ctx.shadowBlur=5;ctx.shadowColor='#081b27';ctx.font=`800 ${clamp(size*10,9,16)}px system-ui`;ctx.fillText(b.name,x,p.y-91*size);ctx.shadowBlur=0;}
  }
  const me=road(30);bike(ctx,me.x,me.y,clamp(w/850,.8,1.55),'#75f5d7',true,Math.sin(t*.02)*.022,t,snapshot.cadence||82);
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

/* module: pedal-kinematics.js */

const CRANK_RADIUS=0.17;
function pedalPose({seconds=0,cadence=82,side=1,phase=0}={}){
 const rpm=Math.max(0,Math.min(190,Number(cadence)||0));
 const theta=seconds*rpm*Math.PI/30+(side>0?Math.PI:0)+phase;
 const hip={x:side*0.16,y:1.43,z:-0.23};
 const foot={x:side*0.205,y:0.78+CRANK_RADIUS*Math.sin(theta),z:0.01+CRANK_RADIUS*Math.cos(theta)};
 const dy=foot.y-hip.y,dz=foot.z-hip.z,distance=Math.max(0.001,Math.hypot(dy,dz));
 const femur=0.57,tibia=0.59;
 const limit=Math.min(distance,femur+tibia-0.0001);
 const along=(femur*femur-tibia*tibia+limit*limit)/(2*limit);
 const perpendicular=Math.sqrt(Math.max(0,femur*femur-along*along));
 const uy=dy/distance,uz=dz/distance;
 const knee={x:side*0.19,y:hip.y+uy*along+uz*perpendicular,z:hip.z+uz*along-uy*perpendicular};
 return {hip,knee,foot,theta,crank:{x:side*0.19,y:0.78,z:0.01},cadence:rpm};
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
 float z=max(0.18,aPos.z+5.0);
 float f=2.42;
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
 float ambient=.52+max(n.y,0.0)*.10;
 vec3 c=vCol*(ambient+.83*dif);
 float gloss=pow(max(dot(reflect(-light,n),normalize(vec3(.05,.60,-.95))),0.0),18.0);
 c+=vec3(.17,.22,.22)*gloss*clamp(vMat-2.0,0.0,1.0);
 c=mix(c,c*vec3(1.15,.82,.70)*.92,uLate*.55);
 if(vMat<2.5){
   float a=noise2(floor(vWorld.xz*17.0));
   float b=noise2(floor(vWorld.xz*3.2));
   c*=1.0+(a-.5)*.18+(b-.5)*.11;
 }
 if(vMat>2.3&&vMat<3.2){
  float micro=noise2(floor(vWorld.xz*48.0));
  float grain=noise2(floor(vWorld.xz*151.0));
  float grooves=sin(vWorld.x*43.0+sin(vWorld.z*.30)*.5)*.012;
  c*=.87+.13*micro+.045*grain+grooves;
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
uniform sampler2D uBackdrop;
uniform float uBackdropMix;
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
 float panoY=clamp((y-.41)/.59,0.0,1.0);
 vec3 scenic=texture(uBackdrop,vec2(clamp(uv.x,0.002,.998),panoY)).rgb;
 float blend=uBackdropMix*smoothstep(.41,.56,y);
 col=mix(col,scenic,blend);
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
function addBike(mesh,x,y,z,color,player=false,clock=0,cadence=82,phase=0){
 const rubber=[.055,.066,.077],metal=[.36,.44,.47],shadow=[.025,.055,.067],skin=[.83,.55,.39];
 const pos=(dx,dy,dz)=>[x+dx,y+dy,z+dz];
 // Road frame with two wheels in the travel plane, spokes and 3D wheel rims.
 for(const wz of [-.73,.73]){
  for(let i=0;i<24;i++){const a=i*2*Math.PI/24,b=(i+1)*2*Math.PI/24;
   mesh.bar(pos(.0,.42+.415*Math.sin(a),wz+.415*Math.cos(a)),pos(.0,.42+.415*Math.sin(b),wz+.415*Math.cos(b)),.034,rubber);
  }
  for(let i=0;i<12;i++){const a=i*Math.PI/6;
   mesh.bar(pos(0,.42,wz),pos(0,.42+.387*Math.sin(a),wz+.387*Math.cos(a)),.007,[.54,.59,.61]);}
  mesh.ball(x,y+.42,z+wz,.069,metal,5,9);
 }
 // Coherent road bicycle frame, saddle, cockpit, crankset.
 const bottom=pos(0,.77,.01),front=pos(0,.64,.73),back=pos(0,.69,-.73),seat=pos(0,1.17,-.32),stem=pos(0,1.20,.55);
 for(const [a,b] of [[bottom,front],[bottom,seat],[seat,back],[back,bottom],[seat,stem],[stem,front]])mesh.bar(a,b,.046,color);
 mesh.bar(pos(-.19,1.15,.59),pos(.19,1.15,.59),.034,rubber);
 mesh.prism(x,y+1.18,z-.34,.35,.05,.29,rubber);
 mesh.ball(x,y+.77,z+.01,.095,[.18,.20,.20],5,10);
 // Rider bib shorts and jersey are attached to the body; no independent floating legs.
 mesh.ball(x,y+1.43,z-.26,.245,[.105,.15,.18],6,11);
 mesh.bar(pos(0,1.49,-.29),pos(0,1.84,-.03),.193,color);
 mesh.ball(x,y+1.82,z-.03,.235,color,6,11);
 // Contrasting back panel and race jersey emblem.
 mesh.prism(x,y+1.77,z-.245,.15,.13,.045,player?[.14,.97,.79]:[.79,.85,.87]);
 for(const side of [-1,1]){
  const pose=pedalPose({seconds:clock,cadence,side,phase});
  const {hip,knee,foot,crank}=pose;
  const at=p=>pos(p.x,p.y,p.z);
  // Crank arms rotate independently 180 degrees apart, each foot stays on its pedal.
  mesh.bar(at(crank),at(foot),.024,metal);
  mesh.bar(pos(side*.12,foot.y,foot.z-.11),pos(side*.28,foot.y,foot.z-.11),.029,rubber);
  mesh.bar(at(hip),at(knee),.108,[.19,.23,.27]);
  mesh.ball(x+knee.x,y+knee.y,z+knee.z,.095,skin,5,9);
  mesh.bar(at(knee),at(foot),.068,skin);
  // White socks and forward-pointing cycling shoes.
  mesh.bar(pos(foot.x,foot.y+.09,foot.z),pos(foot.x,foot.y+.015,foot.z),.070,[.88,.91,.91]);
  mesh.prism(x+foot.x,y+foot.y-.04,z+foot.z+.085,.17,.115,.29,player?[.96,.98,.97]:[.16,.18,.20]);
  // Two arms fixed on drop bars, elbows flexed.
  const sh=pos(side*.20,1.77,-.05),el=pos(side*.28,1.48,.22),hand=pos(side*.22,1.23,.58);
  mesh.bar(sh,el,.073,skin);mesh.ball(...el,.074,skin,5,8);mesh.bar(el,hand,.051,skin);
 }
 // Neck, helmet, aerodynamic vents and protective glasses.
 mesh.bar(pos(0,1.88,.08),pos(0,1.99,.17),.085,skin);
 mesh.ball(x,y+2.11,z+.17,.158,skin,7,10);
 mesh.ball(x,y+2.21,z+.14,.190,player?[.13,.19,.23]:[.16,.18,.21],6,12);
 for(const side of [-1,1])mesh.bar(pos(side*.085,2.34,.16),pos(side*.10,2.28,.30),.029,player?[.13,.88,.76]:[.75,.81,.83]);
 // Shadow follows rider: deliberate stylization, not measured contact shadow.
 mesh.quad(pos(-.37,.026,-.94),pos(.37,.026,-.94),pos(.37,.026,1.04),pos(-.37,.026,1.04),[.072,.091,.105],2.8);
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
  this.backdrop=gl.createTexture();this.backdropReady=false;
  gl.bindTexture(gl.TEXTURE_2D,this.backdrop);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([95,137,158,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const panorama=new Image();this.backdropImage=panorama;
  panorama.onload=()=>{try{gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.backdrop);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,panorama);this.backdropReady=true;}catch(e){this.backdropReady=false;}};
  panorama.onerror=()=>{this.backdropReady=false;};
  panorama.src='data:image/webp;base64,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';
  this.buf=gl.createBuffer();this.skyBuffer=gl.createBuffer();this.lastKey='';this.lastBiome='';this.count=0;this.vertices=null;
  gl.bindBuffer(gl.ARRAY_BUFFER,this.skyBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  this.locs={aspect:gl.getUniformLocation(this.p,'uAspect'),pitch:gl.getUniformLocation(this.p,'uPitch'),camy:gl.getUniformLocation(this.p,'uCamY'),fog:gl.getUniformLocation(this.p,'uFog'),time:gl.getUniformLocation(this.p,'uTime'),late:gl.getUniformLocation(this.p,'uLate')};
  this.skyLoc={fog:gl.getUniformLocation(this.sky,'uFog'),time:gl.getUniformLocation(this.sky,'uTime'),alpine:gl.getUniformLocation(this.sky,'uAlpine'),late:gl.getUniformLocation(this.sky,'uLate'),backdrop:gl.getUniformLocation(this.sky,'uBackdrop'),backdropMix:gl.getUniformLocation(this.sky,'uBackdropMix')};
  gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 }
 dispose(){const gl=this.gl;gl.deleteBuffer(this.buf);gl.deleteBuffer(this.skyBuffer);gl.deleteTexture(this.backdrop);gl.deleteProgram(this.p);gl.deleteProgram(this.sky);}
 resize(w,h,dpr){const ratio=Math.max(.65,Math.min(2,dpr||1,Math.sqrt(7000000/Math.max(1,w*h))));const width=Math.round(w*ratio),height=Math.round(h*ratio);if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}this.gl.viewport(0,0,width,height);}
 makeStatic(scene,progress,routeView,quality='high'){
  const m=new Mesh(),p=scene.palette,forest=scene.biome==='forest',urban=scene.biome==='urban',alpine=scene.biome==='alpine';
  const center=z=>routeView?routeView.center(z):Math.sin((progress+z)/85)*4+Math.sin((progress+z)/170)*8-(Math.sin(progress/85)*4+Math.sin(progress/170)*8);
  const hill=z=>{const routeHeight=routeView?.height(z);return routeHeight!==null&&routeHeight!==undefined?routeHeight:1.2*Math.sin((progress+z)/150)-1.2*Math.sin(progress/150);};
  const ground=(x,z)=>hill(z)+Math.max(0,(Math.abs(x-center(z))-6)/36)*p.terrainAmp*(.34*Math.sin(x*.11+z*.03)+.43*Math.sin(z*.018+x*.031)+.27*Math.sin(x*.04));
  for(let zi=0;zi<48;zi++){
   const za=-4+zi*13,zb=za+13;
   for(let xi=0;xi<38;xi++){
    const xa=-190+xi*10,xb=xa+10;
    const al=hash(xi*491+zi*331+31),color=p.ground.map(v=>clip(v*(.85+.26*al),0,1));
    m.quad([xa,ground(xa,za)-.1,za],[xb,ground(xb,za)-.1,za],[xb,ground(xb,zb)-.1,zb],[xa,ground(xa,zb)-.1,zb],color,1);
   }
  }
  const roadColor=scene.state?.surface==='gravel'?[.36,.31,.26]:scene.state?.surface==='trail'?[.21,.27,.23]:scene.biome==='arid'?[.42,.37,.30]:forest?[.32,.35,.35]:[.39,.41,.43];
  for(let z=-4;z<600;z+=7){const z2=z+7,ca=center(z),cb=center(z2),ha=hill(z),hb=hill(z2),pos=(x,y,z)=>[x,y,z];
   for(let side of [-1,1]){
    // verges follow outside the asphalt with shoulder material
    const x1=ca+side*4.3,x2=ca+side*5.4,y1=ha+.09,y2=hb+.09;
    m.quad(pos(ca+side*3.65,ha+.17,z),pos(x2,y1,z),pos(cb+side*5.4,y2,z2),pos(cb+side*3.65,hb+.17,z2),p.shoulder,1);
    m.quad(pos(ca+side*3.66,ha+.21,z),pos(ca+side*3.78,ha+.21,z),pos(cb+side*3.78,hb+.21,z2),pos(cb+side*3.66,hb+.21,z2),[.88,.86,.77],3.7);
   }
   m.quad(pos(ca-3.68,ha+.19,z),pos(ca+3.68,ha+.19,z),pos(cb+3.68,hb+.19,z2),pos(cb-3.68,hb+.19,z2),roadColor,2.7);
   if(Math.floor((z+progress)/13)%3!==0){m.quad(pos(ca-.065,ha+.225,z),pos(ca+.065,ha+.225,z),pos(cb+.065,hb+.225,z2),pos(cb-.065,hb+.225,z2),[.94,.95,.90],4);}
  }
  if(quality!=='low')for(let z=12;z<270;z+=7){
   for(const side of [-1,1]){
    const n=Math.floor((progress+z)/7)*137+side*1033;
    if(hash(n)>.67){const x=center(z)+side*(7.4+7*hash(n+3)),g=ground(x,z);
      const shade=hash(n+7)>.55?[.62,.47,.21]:[.37,.51,.25];
      m.cone(x,g,z,.33+hash(n+12)*.40,.40+hash(n+19)*.72,shade,5);
    }
   }
  }
  const density=(quality==='low'?1.8:1)*(scene.state?.vegetation==='dense'?.67:scene.state?.vegetation==='sparse'?1.7:1)*(scene.state?.season==='winter'?1.25:1);
  for(let z=14;z<=545;z+=11*density){
   const seed=Math.floor((progress+z)/11),base=center(z),groundY=hill(z);
   for(const side of [-1,1]){
    for(let j=0;j<(forest?3:2);j++){
     const k=seed*17+j*107+(side+2)*1134;
     if(hash(k)<(urban?.43:.16))continue;
     const spread=12+Math.pow(hash(k+3),.85)*(forest?31:53),x=base+side*spread;
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
  gl.uniform3fv(this.skyLoc.fog,new Float32Array(scene.palette.fog));gl.uniform1f(this.skyLoc.time,time);gl.uniform1f(this.skyLoc.alpine,scene.biome==='alpine'?1:0);gl.uniform1f(this.skyLoc.late,scene.state?.lighting==='late'?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.backdrop);
  gl.uniform1i(this.skyLoc.backdrop,0);
  gl.uniform1f(this.skyLoc.backdropMix,this.backdropReady&&route?.demo===true&&scene.biome==='alpine'?.92:0);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.enable(gl.DEPTH_TEST);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(this.p);
  gl.uniform1f(this.locs.aspect,this.canvas.width/Math.max(1,this.canvas.height));gl.uniform1f(this.locs.pitch,.11);gl.uniform1f(this.locs.camy,2.28);gl.uniform3fv(this.locs.fog,new Float32Array(scene.palette.fog));gl.uniform1f(this.locs.time,time);gl.uniform1f(this.locs.late,scene.state?.lighting==='late'?1:0);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);gl.bufferData(gl.ARRAY_BUFFER,this.static.vertices,gl.DYNAMIC_DRAW);
  for(const [loc,size,offset] of [[0,3,0],[1,3,12],[2,3,24],[3,1,36]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,40,offset);}
  gl.drawArrays(gl.TRIANGLES,0,this.static.vertices.length/10);
  const bikes=new Mesh();const player=snapshot?.player;
  if(player){const meZ=1.5;addBike(bikes,this.static.center(meZ),this.static.hill(meZ)+.2,meZ,[.10,.88,.72],true,time,Number(snapshot?.cadence||82));}
  for(const rider of snapshot?.others||[]){const z=1.5+(Number(rider.km)-Number(player?.km||0))*1000;
   if(z>=-3&&z<270){let hex=(rider.color||'#53bee5').replace('#','');if(hex.length===3)hex=hex.split('').map(s=>s+s).join('');const color=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255||.4);const x=this.static.center(Math.max(0,z))+(rider.laneAnimated??rider.lane??0)*1.6;addBike(bikes,x,this.static.hill(Math.max(0,z))+.2,z,color,false,time,Number(rider.cadence||75+Math.round(rider.speedKmh||20)*.20),rider.offsetM*.09);}
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
 const strip=$('pelotonStrip');if(strip){
  const all=latestExperience.all,pl=latestExperience.player?.km||0;
  strip.replaceChildren();
  const title=document.createElement('div');title.className='peloton-title';
  const label=document.createElement('strong');label.textContent='◉ FÄLT ('+all.length+')';
  const hint=document.createElement('span');hint.textContent='SINGELRACE · SIMULERAT';
  title.append(label,hint);strip.append(title);
  for(const [i,rider] of all.entries()){
    const node=document.createElement('div');node.className='peloton-entry'+(rider.me?' current':'');
    const rank=document.createElement('b');rank.textContent=String(i+1);
    const name=document.createElement('strong');name.textContent=rider.me?'DU':rider.name;
    const gap=document.createElement('small');const seconds=Math.round(Math.abs((rider.km-pl)*3600/Math.max(8,latestExperience.speedKmh||20)));
    gap.textContent=rider.me?'AKTIV':((rider.km>=pl?'+':'−')+seconds+' s');
    node.append(rank,name,gap);strip.append(node);
  }
 }
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
 const strip=$('pelotonStrip');if(strip){
  const all=latestExperience.all,pl=latestExperience.player?.km||0;
  strip.replaceChildren();
  const title=document.createElement('div');title.className='peloton-title';
  const label=document.createElement('strong');label.textContent='◉ FÄLT ('+all.length+')';
  const hint=document.createElement('span');hint.textContent='SINGELRACE · SIMULERAT';
  title.append(label,hint);strip.append(title);
  for(const [i,rider] of all.entries()){
    const node=document.createElement('div');node.className='peloton-entry'+(rider.me?' current':'');
    const rank=document.createElement('b');rank.textContent=String(i+1);
    const name=document.createElement('strong');name.textContent=rider.me?'DU':rider.name;
    const gap=document.createElement('small');const seconds=Math.round(Math.abs((rider.km-pl)*3600/Math.max(8,latestExperience.speedKmh||20)));
    gap.textContent=rider.me?'AKTIV':((rider.km>=pl?'+':'−')+seconds+' s');
    node.append(rank,name,gap);strip.append(node);
  }
 }
 $('position').textContent=`${latestExperience.position}/${latestExperience.total}`;
}
let canvas=$('raceCanvas'),cw=0,ch=0,sceneRenderer=null,raceCtx=null,activeGraphics='2d';
function resizeRace(){
 const r=canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;
 cw=r.width;ch=r.height;const dpr=Math.min($('sceneQuality')?.value==='ultra'?2:1.5,devicePixelRatio||1);
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
async function toggleCinematicFullscreen(){
 const arena=$('cinematicArena');
 try{
  if(document.fullscreenElement===arena)await document.exitFullscreen();
  else if(arena.requestFullscreen)await arena.requestFullscreen();
  else arena.classList.toggle('tv-fallback');
 }catch(e){arena.classList.toggle('tv-fallback');}
 $('tvExit').hidden=!(document.fullscreenElement===arena||arena.classList.contains('tv-fallback'));
 resizeRace();
}
$('tvMode').addEventListener('click',toggleCinematicFullscreen);
$('tvModeHeader').addEventListener('click',()=>{changeTab('ride');void toggleCinematicFullscreen();});
$('tvExit').addEventListener('click',()=>{if(document.fullscreenElement){void document.exitFullscreen();}else $('cinematicArena').classList.remove('tv-fallback');$('tvExit').hidden=true;resizeRace();});
document.addEventListener('fullscreenchange',()=>{resizeRace();const full=document.fullscreenElement===$('cinematicArena');$('tvExit').hidden=!full;$('tvMode').textContent=full?'⛶ AVSLUTA HELSKÄRM':'⛶ TV / HELSKÄRM';});
$('graphicsMode').addEventListener('change',initializeRaceRenderer);
$('sceneBiome').addEventListener('change',()=>{latestSceneKey='';if(sceneRenderer)sceneRenderer.lastKey='';});
$('sceneSeason').addEventListener('change',()=>{latestSceneKey='';if(sceneRenderer)sceneRenderer.lastKey='';});
$('sceneRoadside').addEventListener('change',()=>{latestSceneKey='';if(sceneRenderer)sceneRenderer.lastKey='';});
$('sceneLighting').addEventListener('change',()=>{latestSceneKey='';if(sceneRenderer)sceneRenderer.lastKey='';});
$('sceneAtmosphere').addEventListener('change',()=>{latestSceneKey='';if(sceneRenderer)sceneRenderer.lastKey='';});
$('sceneQuality').addEventListener('change',()=>{if(sceneRenderer)sceneRenderer.lastKey='';resizeRace();});
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
 const drawState={...st,cadence:Number(S.telemetry?.cadence||82),player:{...st.player,km:st.player.km+st.speedKmh*extra},others:st.others.map(b=>({...b,km:b.km+(b.speedKmh||20)*extra}))};
 const visual=activeSceneResult();const scenic=activeGraphics==='webgl'&&S.route?.demo===true&&visual.biome==='alpine'&&visual.state.season!=='winter'?'alpine':'none';if($('cinematicArena').dataset.scenic!==scenic)$('cinematicArena').dataset.scenic=scenic;
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