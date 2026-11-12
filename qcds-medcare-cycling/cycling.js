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

/* module: ftms.js */

const FM=0x1826, BIKE=0x2AD2;
function parseIndoorBike(value){let p=0;const flags=value.getUint16(p,true);p+=2;const output={power:null,cadence:null,speed:null,hr:null};function has(bytes){return p+bytes<=value.byteLength;}function u8(){if(!has(1))throw Error('Short packet');return value.getUint8(p++);}function u16(){if(!has(2))throw Error('Short packet');let x=value.getUint16(p,true);p+=2;return x;}function i16(){if(!has(2))throw Error('Short packet');let x=value.getInt16(p,true);p+=2;return x;}function u24(){if(!has(3))throw Error('Short packet');let x=value.getUint8(p)+(value.getUint8(p+1)<<8)+(value.getUint8(p+2)<<16);p+=3;return x;}
try{if(!(flags&1))output.speed=u16()/100;if(flags&2)u16();if(flags&4)output.cadence=u16()/2;if(flags&8)u16();if(flags&16)u24();if(flags&32)i16();if(flags&64)output.power=i16();if(flags&128)i16();if(flags&256)u16();if(flags&512)u16();if(flags&1024)u8();if(flags&2048)output.hr=u8();}catch(e){throw Error('Ogiltigt/trunkerat FTMS-paket');}return output;}
class BikeFTMS{constructor(onData,onStatus){this.onData=onData;this.onStatus=onStatus;this.device=null;this.characteristic=null;this._handler=e=>{try{this.onData(parseIndoorBike(e.target.value));}catch(err){this.onStatus(err.message);}};this._disconnect=()=>this.onStatus('Bluetooth frånkopplad');}
async connect(){if(!navigator.bluetooth)throw Error('Web Bluetooth saknas. Använd Chrome på Mac via HTTPS eller localhost.');this.onStatus('Söker efter cykel …');const device=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:[FM]});this.device=device;device.addEventListener('gattserverdisconnected',this._disconnect);this.onStatus('Ansluter till '+device.name+' …');const server=await device.gatt.connect();const service=await server.getPrimaryService(FM);this.characteristic=await service.getCharacteristic(BIKE);await this.characteristic.startNotifications();this.characteristic.addEventListener('characteristicvaluechanged',this._handler);this.onStatus('FTMS ansluten: '+(device.name||'cykel'));return device.name||'FTMS';}
disconnect(){if(this.characteristic)this.characteristic.removeEventListener('characteristicvaluechanged',this._handler);if(this.device){this.device.removeEventListener('gattserverdisconnected',this._disconnect);if(this.device.gatt?.connected)this.device.gatt.disconnect();}this.characteristic=null;this.device=null;this.onStatus('Frånkopplad');}}

/* module: renderer-capabilities.js */


const RENDERERS=Object.freeze({
 canvas:{label:'Canvas 2D',status:'available',platforms:['all modern browsers'],implementation:'src/app.js'},
 webgpu:{label:'WebGPU 3D',status:'planned',platforms:['supported browsers and GPUs'],implementation:null},
 nvidia_dlss5:{label:'NVIDIA DLSS 5',status:'integration-blocked',platforms:['supported GeForce RTX 50 / native runtime'],implementation:null,requires:['NVIDIA partner SDK / access','RTX-compatible native renderer','color/depth/motion vectors','SDK/license compliance']}
});
function graphicsStatus(){return {
 active:'canvas',
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
 if(n.some(v=>!Number.isFinite(v))||n[2]-n[0]>.11||n[3]-n[1]>.16||n[2]<=n[0]||n[3]<=n[1])throw Error('Zooma in lite mer (området får vara högst cirka 10 km brett).');
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
function reconstruct(net,parents,end){const keys=[end];let k=end;while(parents.has(k)&&keys.length<25000){k=parents.get(k).from;keys.push(k);}keys.reverse();return keys.map(id=>({lat:net.nodes.get(id).lat,lon:net.nodes.get(id).lon,ele:null}));}
const approximateCenter = b=>({lat:(b.getSouth()+b.getNorth())/2,lon:(b.getWest()+b.getEast())/2});
function generateConnectedRoutes(ways,{mode='road',bounds,targetKm=8,count=4}={}){
 const net=buildRouteNetwork(ways,mode);
 if(!net.edges||net.nodes.size<3)return {routes:[],nodeCount:net.nodes.size,edgeCount:net.edges,largestKm:0};
 const center=bounds?approximateCenter(bounds):[...net.nodes.values()][0];
 const nearest=[...net.nodes.values()].sort((a,b)=>Math.abs(a.lat-center.lat)+Math.abs(a.lon-center.lon)-Math.abs(b.lat-center.lat)-Math.abs(b.lon-center.lon)).slice(0,16);
 const origin=nearest.reduce((best,p)=>{
  const score=(net.adj.get(p.id)?.length||0) - kmBetween(p,center)*4;
  return score>best.score?{p,score}:best;
 },{p:nearest[0],score:-Infinity}).p;
 const {dist,parents}=dijkstra(net,origin.id,Math.max(10,targetKm*1.6));
 const ranked=[...dist].filter(([k,d])=>d>=Math.max(1.3,targetKm*.57)&&d<=targetKm*1.35).map(([id,km])=>({id,km,p:net.nodes.get(id)}));
 ranked.sort((a,b)=>Math.abs(a.km-targetKm)-Math.abs(b.km-targetKm));
 const routes=[],ends=[];
 for(const entry of ranked){
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
 for(const [id,oneWayKm] of [...dist].sort((a,b)=>Math.abs(a[1]*2-targetKm)-Math.abs(b[1]*2-targetKm))){
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
 routes.sort((a,b)=>Math.abs(distanceKm(a.points)-targetKm)-Math.abs(distanceKm(b.points)-targetKm));
 routes.length=Math.min(count,routes.length);
 const longest=Math.max(0,...dist.values());
 return {routes,nodeCount:net.nodes.size,edgeCount:net.edges,largestKm:longest};
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
 if(!route||route.points?.length<2)throw Error('Välj en rutt först.');
 if(route.points.every(p=>Number.isFinite(p.ele)))return {...route,elevationSource:route.elevationSource||'GPX / tidigare höjddata'};
 const sample=distanceSample(route.points,75);if(sample.length<2)throw Error('Banan är för kort för en höjdprofil.');
 const locations=sample.map(p=>`${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join('|');
 const eu=sample.every(regionEurope),datasets=eu?['eudem25m','mapzen']:['mapzen'];let last=null;
 for(const dataset of datasets){
  onProgress(`Hämtar ${sample.length} höjdpunkter från ${dataset==='eudem25m'?'EU DEM 25 m':'Mapzen global DEM'} …`);
  try{
   // The public test API allows at most one request per second; serialize
   // requests in this browser. Production must use a private licensed service.
   const until=lastPublicDemoCall+1150-Date.now();
   if(until>0)await new Promise((resolve,reject)=>{const t=setTimeout(resolve,until);signal?.addEventListener('abort',()=>{clearTimeout(t);reject(Error('Höjdhämtningen avbröts.'));},{once:true});});
   lastPublicDemoCall=Date.now();
   const url=`https://api.opentopodata.org/v1/${dataset}?locations=${encodeURIComponent(locations)}`;
   const raw=await responseJson(url,fetcher,signal);
   if(raw.status!=='OK'||!Array.isArray(raw.results)||raw.results.length!==sample.length)throw Error(raw.error||'Ogiltigt höjdsvar');
   const h=raw.results.map(r=>typeof r.elevation==='number'&&Number.isFinite(r.elevation)?r.elevation:null);
   if(h.filter(v=>v!==null).length<sample.length*.85)throw Error('Ofullständig höjdmodell för området.');
   return {...route,points:interpolateHeights(route.points,sample,h),elevationSource:`OpenTopoData ${dataset} · terrängmodell`,elevationResolution:dataset==='eudem25m'?'25 m':'≈30 m',elevationSamples:sample.length};
  }catch(e){last=e;if(signal?.aborted)throw e;}
 }
 throw Error(`Höjddata saknas eller tjänsten svarar inte: ${last?.message||'okänt fel'}`);
}

/* module: app.js */
const wasmCourseIndex=index;









const $=id=>document.getElementById(id);
const S={mode:'road',tab:'explore',route:null,map:null,mapLayer:null,osmLayer:null,osmWays:[],source:'none',telemetry:{source:'none',power:null,cadence:null,speed:null,hr:null},running:false,elapsed:0,km:0,liveWatts:0,tick:0,graphWays:[],generatedRoutes:[],heightAbort:null};
const modeWords={road:'ROAD RACE',gravel:'GRAVEL CHALLENGE',mtb:'MTB TRAIL',downhill:'DOWNHILL EXPERIENCE'};
const radio=new BikeFTMS(data=>{S.source='ftms';S.telemetry={...S.telemetry,...data,source:'ftms'};S.liveWatts=Number.isFinite(data.power)?Math.max(0,data.power):S.liveWatts; updateDevice('FTMS · livemätning');updateTelemetry();renderOracles();},status=>{updateDevice(status);});
function updateDevice(msg){$('deviceText').textContent=msg;$('feedStatus').textContent=S.source==='ftms'?'CYKEL ANSLUTEN':S.source==='demo'?'SIMULERAD DATA':'EJ ANSLUTEN';$('dataStatus').textContent=S.source==='ftms'?'● FTMS LIVE':S.source==='demo'?'● DEMO · SIMULERAT':'● DEMO / LOKALT';$('btLight').classList.toggle('online',S.source==='ftms');document.querySelector('.led').classList.toggle('online',S.source==='ftms');}
function changeTab(tab){S.tab=tab;document.querySelectorAll('.tab').forEach(n=>n.classList.toggle('active',n.dataset.tab===tab));document.querySelectorAll('.view').forEach(n=>n.classList.toggle('visible',n.id===tab));if(tab==='explore'&&S.map)setTimeout(()=>S.map.invalidateSize(),70);if(tab==='ride')resizeRace();if(tab==='oracles')renderOracles();if(tab==='league')updateLeague();}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>changeTab(b.dataset.tab)));
document.querySelectorAll('.discipline').forEach(b=>b.addEventListener('click',()=>{S.mode=b.dataset.mode;document.querySelectorAll('.discipline').forEach(x=>x.classList.toggle('active',x===b));$('modeLabel').textContent=modeWords[S.mode];$('hcpMode').textContent=MODES[S.mode];$('leagueMode').textContent=MODES[S.mode];updateHandicap();updateRoute();renderOracles();if(S.graphWays.length)renderRouteSuggestions();}));
const WORLD_DESTINATIONS=[
 ['Göteborg',57.7089,11.9746,12],['Åre',63.3995,13.0838,12],['Mallorca',39.7214,2.6202,12],
 ['Alpe d’Huez',45.0918,6.0698,12],['Dolomiterna',46.5405,11.7210,12],['Girona',41.9794,2.8214,12],
 ['Chamonix',45.9237,6.8694,12],['Moab',38.5733,-109.5498,12],['Whistler',50.1163,-122.9574,12],
 ['Kapstaden',-33.9249,18.4241,12],['Kyoto',35.0116,135.7681,12],['Queenstown',-45.0312,168.6626,12],
 ['Cusco',-13.5319,-71.9675,12],['Tasmanien',-42.8821,147.3272,12],['Nya Zeeland · Rotorua',-38.1368,176.2497,12],['Boulder',40.0150,-105.2705,12]
];
function flyToWorld(lat,lon,label,zoom=12){
 if(!S.map){$('worldStatus').textContent='Kartan är inte tillgänglig.';return;}
 S.map.setView([lat,lon],zoom,{animate:true});$('worldStatus').textContent=label+' · kartan flyttad. Tryck ”Skapa rutter från OSM-vägar” för att hämta riktiga vägar.';
 S.graphWays=[];S.generatedRoutes=[];$('routeSuggestions').replaceChildren();
 const p=document.createElement('p');p.className='empty-routes';p.textContent='Hämta vägar på den nya platsen för att bygga sammanhängande turer.';$('routeSuggestions').append(p);
}
for(const [label,lat,lon,zoom] of WORLD_DESTINATIONS){const btn=document.createElement('button');btn.type='button';btn.className='world-place';btn.textContent=label;btn.addEventListener('click',()=>flyToWorld(lat,lon,label,zoom));$('worldPlaces').append(btn);}
$('goCoords').addEventListener('click',()=>{const m=$('gotoCoords').value.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/);if(!m){$('worldStatus').textContent='Skriv koordinater, exempel: 45.9237, 6.8694';return;}const lat=Number(m[1]),lon=Number(m[2]);if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>85||Math.abs(lon)>180){$('worldStatus').textContent='Koordinater utanför giltigt intervall.';return;}flyToWorld(lat,lon,`${lat.toFixed(4)}, ${lon.toFixed(4)}`);});
function getInputs(){const ftp=Number($('ftp').value),weight=Number($('weight').value);return {ftp,weight,valid:Number.isFinite(ftp)&&ftp>=40&&ftp<=700&&Number.isFinite(weight)&&weight>=35&&weight<=250};}
function updateHandicap(){const d=getInputs();const h=d.valid?chp(d.ftp,d.weight,S.mode):null;$('hcp').textContent=h===null?'—':h.toFixed(1);$('hcpLarge').textContent=h===null?'—':h.toFixed(1);$('hcpExplainer').textContent=d.valid?`${(d.ftp/d.weight).toFixed(2)} W/kg · uppskattad grundklass.`:'Ange FTP 40–700 W och vikt 35–250 kg.';renderOracles();}
$('ftp').addEventListener('input',updateHandicap);$('weight').addEventListener('input',updateHandicap);
$('connect').addEventListener('click',async()=>{try{await radio.connect();S.source='ftms';$('disconnect').hidden=false;$('demoBtn').textContent='▶ Testa demokälla';updateDevice('Cykel ansluten. Väntar på watt…');}catch(err){updateDevice('Anslutning misslyckades: '+(err.message||String(err)));}});
$('demoBtn').addEventListener('click',()=>{radio.disconnect();S.source='demo';S.telemetry={source:'demo',power:115,cadence:78,speed:null,hr:null};S.liveWatts=115;updateDevice('SIMULERAD DATA · inte cykelmätning');$('disconnect').hidden=false;renderOracles();updateTelemetry();});
$('disconnect').addEventListener('click',()=>{radio.disconnect();S.source='none';S.liveWatts=0;S.telemetry={source:'none',power:null,cadence:null,speed:null,hr:null};$('disconnect').hidden=true;updateDevice('Frånkopplad');renderOracles();updateTelemetry();});
$('tvMode').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){alert('TV-läge kräver att webbläsaren tillåter helskärm.');}});
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
  S.map.on('click',event=>{if(S.drawing)addDrawPoint(event.latlng);});
  if(window.ResizeObserver){const ob=new ResizeObserver(()=>{if(!S.map)return;const r=el.getBoundingClientRect();if(r.width>0&&r.height>0)S.map.invalidateSize({pan:false});});ob.observe(el);}
  S.map.whenReady(()=>setTimeout(()=>S.map?.invalidateSize({pan:false}),100));
 }catch(e){console.error('Map initialization failed',e);$('osmInfo').textContent='Kartan kunde inte startas: '+e.message;}
}
function cleanRoute(points){return points.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180).slice(0,25000);}
function selectRoute(route){route.points=cleanRoute(route.points);if(route.points.length<2){$('osmInfo').textContent='Den valda rutten saknar tillräckligt med koordinater.';return;}S.heightAbort?.abort();S.heightAbort=null;
 S.route=route;
 $('loadElevation').disabled=route.points.every(p=>Number.isFinite(p.ele));
 $('elevationStatus').textContent=route.points.every(p=>Number.isFinite(p.ele))?'Höjdvärden finns för rutten.': 'Höjdprofil saknas. Tryck Hämta verklig höjdprofil – DEM-data från extern tjänst.';
 $('routeKind').textContent=route.generated?`PRELIMINÄR OSM-TUR ${route.generatedType==='out-and-back'?'TUR & RETUR':'EN VÄG'} · kontrollera tillträde`:route.source?.startsWith('Importerad GPX')?'IMPORTERAD GPX-RUTT':route.source?.includes('Egenritad')?'EGENRITAD · RAKA LINJER':'VERKLIG GPS-GEOMETRI';
 S.km=0;S.elapsed=0;S.lastSavedElapsed=-1;S.running=false;$('raceToggle').textContent='▶ Starta race';updateRoute();if(S.map&&window.L){S.mapLayer.clearLayers();const line=L.polyline(route.points.map(p=>[p.lat,p.lon]),{color:'#00b88c',weight:7,opacity:.95}).addTo(S.mapLayer);S.map.fitBounds(line.getBounds(),{padding:[30,30],maxZoom:15});}renderOracles();}
function updateRoute(){const r=S.route;const a=r?altitude(r.points):null;const dist=r?distanceKm(r.points):null;const idx=r?wasmCourseIndex(r,S.mode):null;$('routeName').textContent=r?.name||'Ingen bana vald';$('routeKm').textContent=dist===null?'—':dist.toFixed(2);$('routeClimb').textContent=a?.valid?a.climb:'—';$('routeIndex').textContent=idx===null?'—':idx;$('rideRouteName').textContent=r?.name||'Illustrerad testbana';$('rideLabel').textContent=r?.source||'ILLUSTRERAD TESTBANA';$('routeIndex').title= a?.valid?'Uppskattat experimentellt index':'Preliminärt index utan höjddata';$('routeClimb').title=a?.valid?(r?.elevationSource||'Källfilens höjddata, ej kvalitetsgranskade'):'Höjddata saknas';$('sourceLabel').textContent=r?`Källa: ${r.source} · ${r.points.length} koordinater · ${a?.valid?'höjdprofil: '+(r.elevationSource||'GPX'):'höjddata saknas'} · tillstånd ej validerat`:'Inga ruttdata inlästa.';$('rideRouteInfo').textContent=r?`Verkligt koordinatspår från ${r.source}. Spelvyn är illustrerad; återgivningen av terräng är ännu inte georefererad 3D.`:'Ladda en OSM-led eller GPX för att cykla efter riktiga spår. Den animerade spelvyn är en illustration, inte en geografisk 3D-rendering.';$('realAltitude').textContent=a?.valid?`${a.climb} m upp / ${a.drop} m ned`:'Ej inläst';updateLeague();drawProfile();}
function drawProfile(){const c=$('profile'),ctx=c.getContext('2d'),rect=c.getBoundingClientRect();c.width=Math.max(280,Math.round(rect.width*devicePixelRatio));c.height=110*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio);const w=c.width/devicePixelRatio,h=110;ctx.clearRect(0,0,w,h);const pts=S.route?.points.filter(p=>Number.isFinite(p.ele))||[];if(pts.length<2){$('profileHint').textContent='Ingen höjdprofil. Tryck Hämta verklig höjdprofil för terrängdata.';return;}const vals=pts.map(p=>p.ele),min=Math.min(...vals),max=Math.max(...vals),span=Math.max(10,max-min);ctx.fillStyle='#073844';ctx.strokeStyle='#57dfc8';ctx.lineWidth=2;ctx.beginPath();vals.forEach((v,i)=>{const x=10+(i/(vals.length-1))*(w-20),y=h-12-(v-min)/span*(h-24);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.lineTo(w-10,h);ctx.lineTo(10,h);ctx.closePath();ctx.globalAlpha=.35;ctx.fill();ctx.globalAlpha=1;$('profileHint').textContent=`${S.route?.elevationSource||'Källfilens höjddata'} · ${Math.round(min)}–${Math.round(max)} möh`;} 
$('loadElevation').addEventListener('click',async()=>{
 const route=S.route;if(!route)return;
 const ctl=new AbortController();S.heightAbort=ctl;
 $('loadElevation').disabled=true;
 try{
  const updated=await enrichRouteElevation(route,{signal:ctl.signal,onProgress:t=>$('elevationStatus').textContent=t});
  if(S.route!==route||ctl.signal.aborted)return;
  S.route=updated;updateRoute();renderOracles();
  $('elevationStatus').textContent=`Klart: ${updated.elevationSamples} uppmätta DEM-punkter (${updated.elevationResolution}), höjd interpolerad längs rutten. Inte trailmätning. Spara banan för att behålla profilen lokalt.`;
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
function renderRouteSuggestions(){
 const area=$('routeSuggestions');area.replaceChildren();
 if(!S.graphWays.length){const p=document.createElement('p');p.className='empty-routes';p.textContent='Ingen nätverksdata laddad. Hämta OSM-vägar eller importera GPX.';area.append(p);return;}
 const target=Number($('routeLength').value)||10;
 const generated=generateConnectedRoutes(S.graphWays,{mode:S.mode,bounds:S.map?.getBounds(),targetKm:target,count:4});
 S.generatedRoutes=generated.routes;
 const heading=document.createElement('p');heading.className='route-summary';heading.textContent=`${generated.routes.length} sammanhängande turförslag · ${generated.edgeCount} vägkanter · ${generated.nodeCount} OSM-noder`;
 area.append(heading);
 if(!generated.routes.length){const p=document.createElement('p');p.className='empty-routes';p.textContent=`Inget sammanhängande ruttnät på cirka ${target} km från dessa vägar (längsta nåbara sträcka ≈ ${generated.largestKm.toFixed(1)} km). Zooma eller välj kortare distans och hämta igen. Vi hittar INTE på förbindelser.`;area.append(p);return;}
 for(let i=0;i<generated.routes.length;i++){
  const r=generated.routes[i],div=document.createElement('article');div.className='route-suggestion';
  const num=document.createElement('span');num.className='route-number';num.textContent='TUR '+String(i+1).padStart(2,'0');
  const title=document.createElement('strong');title.textContent=`${distanceKm(r.points).toFixed(1)} km · ${r.generatedType==='out-and-back'?'tur & retur':'enkelriktad tur'}`;
  const info=document.createElement('small');info.textContent=`${r.points.length} vägkoordinater · OSM-noder länkade · höjddata kan hämtas`;
  const button=document.createElement('button');button.type='button';button.textContent='Välj tur →';button.addEventListener('click',()=>selectRoute({...r,points:r.points.map(p=>({...p}))}));
  div.append(num,title,info,button);area.append(div);
 }
}
$('routeLength').addEventListener('change',renderRouteSuggestions);
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
 if(!S.map){$('osmInfo').textContent='Kartan kan inte laddas. Importera GPX i stället.';return;}
 const bounds=S.map.getBounds(),provider=$('osmProvider').value;let q;
 try{
  if(provider==='osm-api'&&!smallBbox(bounds))throw Error('OSM direkt behöver ett mycket litet område. Zooma in till cirka 1 km.');
  q=buildOverpassQuery(bounds,S.mode);
 }catch(err){$('osmInfo').textContent=err.message;return;}
 const cacheKey=osmCacheKey(bounds,S.mode);
 const cached=await localDB.getCache(cacheKey).catch(()=>null);
 // Keep a recently retrieved response while online endpoints are under load.
 if(provider==='auto'&&cached?.rows?.length&&Date.now()-cached.savedAt<7*864e5){
  displayOsmOnMap(cached.rows);renderOsmRows(cached.rows);S.graphWays=rowsToWays(cached.rows);renderRouteSuggestions();
  $('osmInfo').textContent=`${cached.rows.length} råa vägsegment från lokal cache, ${S.generatedRoutes.length} sammanhängande turer. Välj turförslag nedan. (${new Date(cached.savedAt).toLocaleDateString('sv-SE')})`;
  return;
 }
 osmAbort=new AbortController();
 $('loadOSM').disabled=true;$('cancelOSM').hidden=false;
 $('osmInfo').textContent='Startar sökning …';
 try{
  const {data,host}=await requestOverpass(q,{bounds,mode:S.mode,provider,signal:osmAbort.signal,onProgress:s=>$('osmInfo').textContent=s});
  const rows=osmRows(data,S.mode);
  displayOsmOnMap(rows);renderOsmRows(rows);S.graphWays=data.elements||rowsToWays(rows);renderRouteSuggestions();
  $('osmInfo').textContent=rows.length?`Hittade ${rows.length} vägsegment via ${host}. Ruttmotorn skapade ${S.generatedRoutes.length} SAMMANHÄNGANDE förslag av dessa. Segmenten är bara byggstenar.`:'Inga leder hittades. Flytta kartan, zooma eller välj en annan disciplin.';
  if(rows.length&&localDB.db)await localDB.putCache({key:cacheKey,rows,savedAt:Date.now()}).catch(()=>{});
 }catch(err){
  if(cached?.rows?.length){displayOsmOnMap(cached.rows);renderOsmRows(cached.rows);S.graphWays=rowsToWays(cached.rows);renderRouteSuggestions();$('osmInfo').textContent='Kartservern svarade inte – visar tidigare hämtade leder från lokalt minne.';}
  else $('osmInfo').textContent=err.message||'Kunde inte hämta OSM. Prova igen eller importera GPX.';
 }finally{osmAbort=null;$('loadOSM').disabled=false;$('cancelOSM').hidden=true;}
});

// QCDS Local Database – all stored records remain on this browser/device.
function libraryNotice(message){$('libraryMessage').textContent=message;}
async function refreshLibrary(){
 if(!localDB.db)return;
 const [routes,rides]=await Promise.all([localDB.listRoutes(),localDB.listRides()]);
 const saved=$('savedRoutes');saved.replaceChildren();
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
 const row={id:newCyclingId(),date:new Date().toISOString(),name:S.route?.name||'Illustrerad testbana',routeId:S.route?.id||null,mode:S.mode,elapsedSeconds:S.elapsed,km:S.km,source:S.source,finished,ftp:Number($('ftp').value),weight:Number($('weight').value)};
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
function updateTelemetry(){const watts=S.source==='none'?null:S.liveWatts;$('watts').textContent=watts===null?'—':Math.round(watts);$('cadence').textContent=S.telemetry.cadence===null?'—':Math.round(S.telemetry.cadence);$('distance').textContent=S.km.toFixed(2);const hill=gradeAtProgress();const kmh=watts===null?0:Math.max(0,6+0.094*watts-(Number.isFinite(hill)?hill*.7:0));$('speed').textContent=watts===null?'—':kmh.toFixed(1);$('position').textContent=watts===null?'—':Math.max(1,Math.min(5,3-Math.round((watts-140)/65)))+'/5';}
function gradeAtProgress(){const pts=S.route?.points;if(!pts||pts.length<2)return null;let i=Math.floor((S.km/Math.max(.1,distanceKm(pts)))*(pts.length-2));i=Math.max(0,Math.min(pts.length-2,i));const a=pts[i],b=pts[i+1];if(!Number.isFinite(a.ele)||!Number.isFinite(b.ele))return null;const d=distanceKm([a,b])*1000;return wasmGrade(b.ele-a.ele,d);}
function raceTick(){if(!S.running)return;S.elapsed++;if(S.source==='demo'){S.liveWatts=Math.round(125+37*Math.sin(S.elapsed/14)+13*Math.sin(S.elapsed/3));S.telemetry.power=S.liveWatts;S.telemetry.cadence=Math.round(79+8*Math.sin(S.elapsed/8));}const hill=gradeAtProgress();const kmh=Math.max(0,6+.094*S.liveWatts-(Number.isFinite(hill)?hill*.7:0));S.km+=kmh/3600;const max=S.route?distanceKm(S.route.points):12.4;if(S.km>=max&&max>0){S.km=max;S.running=false;$('raceToggle').textContent='✓ Målgång';void recordRide(true);}updateTelemetry();$('raceTime').textContent=`${String(Math.floor(S.elapsed/60)).padStart(2,'0')}:${String(S.elapsed%60).padStart(2,'0')}`;updateLeaderboard();}
$('raceToggle').addEventListener('click',()=>{if(S.source==='none'){$('rideNotice').textContent='Anslut cykeln eller välj Testa demokälla i sidopanelen först.';return;}if(S.running){S.running=false;$('raceToggle').textContent='▶ Fortsätt';}else{const max=S.route?distanceKm(S.route.points):12.4;if(S.km>=max){S.km=0;S.elapsed=0;S.lastSavedElapsed=-1;}S.running=true;$('raceToggle').textContent='Ⅱ Pausa race';$('rideNotice').textContent=S.source==='ftms'?'Träningswatt läses live. Simulerad bana och motståndare.':'DEMOLÄGE: watt, motståndare och resultat är simulerade.';}});
$('raceReset').addEventListener('click',()=>{S.running=false;S.km=0;S.elapsed=0;S.lastSavedElapsed=-1;$('raceToggle').textContent='▶ Starta race';$('raceTime').textContent='00:00';updateTelemetry();updateLeaderboard();});
function updateLeaderboard(){const bots=[{name:'NOVA · bot',pace:16.2},{name:'RIDGE · bot',pace:20.1},{name:'SOLAR · bot',pace:18.4},{name:'VISTA · bot',pace:14.7}];const people=[{name:'DU · cykel',d:S.km,me:true},...bots.map(b=>({name:b.name,d:b.pace*S.elapsed/3600,me:false}))].sort((a,b)=>b.d-a.d);$('leaderboard').innerHTML='';people.forEach((p,i)=>{const el=document.createElement('div');el.className='racerow'+(p.me?' me':'');const j=document.createElement('span');j.textContent=String(i+1).padStart(2,'0');const n=document.createElement('span');n.textContent=p.name;const d=document.createElement('span');d.textContent=p.d.toFixed(2)+' km';el.append(j,n,d);$('leaderboard').append(el);});$('position').textContent=(people.findIndex(x=>x.me)+1)+'/5';}
const canvas=$('raceCanvas');let cw=0,ch=0,phase=0;
function resizeRace(){const r=canvas.getBoundingClientRect();if(r.width<=0)return;const dpr=Math.min(2,devicePixelRatio||1);cw=r.width;ch=r.height;canvas.width=Math.floor(cw*dpr);canvas.height=Math.floor(ch*dpr);canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);}
window.addEventListener('resize',()=>{resizeRace();drawProfile();});
function raceDraw(){requestAnimationFrame(raceDraw);if(!cw||!ch||S.tab!=='ride')return;const ctx=canvas.getContext('2d'),w=cw,h=ch;const ground=h*.52;const sky=ctx.createLinearGradient(0,0,0,ground);sky.addColorStop(0,'#173454');sky.addColorStop(1,'#62a1a7');ctx.fillStyle=sky;ctx.fillRect(0,0,w,ground);const m=(x,y)=>[x*w,y*h];ctx.fillStyle='#1b5260';ctx.beginPath();ctx.moveTo(0,ground);for(let i=0;i<=12;i++){let x=i/12,y=.43-.1*Math.abs(Math.sin(i*1.4+2));ctx.lineTo(x*w,y*h);}ctx.lineTo(w,ground);ctx.fill();ctx.fillStyle='#25494b';ctx.beginPath();ctx.moveTo(0,ground);for(let i=0;i<=9;i++){ctx.lineTo((i/9)*w,(.49-.05*Math.abs(Math.sin(i*1.8+1)))*h);}ctx.lineTo(w,ground);ctx.fill();ctx.fillStyle='#284b43';ctx.fillRect(0,ground,w,h-ground);
// Stylized race road, deliberately not claimed as true 3D cartography.
ctx.fillStyle='#304554';ctx.beginPath();ctx.moveTo(w*.45,ground);ctx.lineTo(w*.55,ground);ctx.lineTo(w*.92,h);ctx.lineTo(w*.08,h);ctx.closePath();ctx.fill();ctx.strokeStyle='#f8e6a3';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(w*.45,ground);ctx.lineTo(w*.08,h);ctx.moveTo(w*.55,ground);ctx.lineTo(w*.92,h);ctx.stroke();if(S.running)phase+=Math.min(2,.25+S.liveWatts/280);for(let j=0;j<8;j++){const t=((j/8+phase*.035)%1);const y=ground+(h-ground)*t*t;const half=(.08+.36*t)*w/2;ctx.strokeStyle='#b5c5bc';ctx.lineWidth=1+3*t;ctx.beginPath();ctx.moveTo(w/2-(2+5*t),y);ctx.lineTo(w/2+(2+5*t),y);ctx.stroke();}
// A pack of illustrated opponents.
for(let i=0;i<6;i++){const depth=(i+1)/8,x=w/2+Math.sin(i*1.8+phase*.01)*w*(.02+.09*depth),y=ground+depth*depth*(h-ground)*.85;const sz=4+depth*19;ctx.fillStyle=['#ffbc65','#75e8ce','#d9e6fd'][i%3];ctx.beginPath();ctx.arc(x,y-sz,sz*.48,0,Math.PI*2);ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=Math.max(2,sz*.23);ctx.beginPath();ctx.moveTo(x,y-sz*.45);ctx.lineTo(x,y+sz*.7);ctx.moveTo(x-sz*.6,y+sz*.2);ctx.lineTo(x+sz*.6,y+sz*.2);ctx.stroke();}
// Player avatar / bike illustration.
const bx=w*.5,by=h*.86,scale=Math.min(w/800,1.2);ctx.strokeStyle='#131e25';ctx.lineWidth=5*scale;ctx.beginPath();ctx.arc(bx-24*scale,by,13*scale,0,Math.PI*2);ctx.moveTo(bx+25*scale+13*scale,by);ctx.arc(bx+25*scale,by,13*scale,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#56e7d0';ctx.lineWidth=4*scale;ctx.beginPath();ctx.moveTo(bx-24*scale,by);ctx.lineTo(bx,by-18*scale);ctx.lineTo(bx+25*scale,by);ctx.lineTo(bx-24*scale,by);ctx.stroke();ctx.fillStyle='#71e8d7';ctx.beginPath();ctx.arc(bx,by-60*scale,9*scale,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e3f6fa';ctx.lineWidth=8*scale;ctx.beginPath();ctx.moveTo(bx,by-47*scale);ctx.lineTo(bx,by-22*scale);ctx.stroke();
ctx.fillStyle='#d9edf0';ctx.font=`bold ${Math.max(12,16*scale)}px sans-serif`;ctx.textAlign='center';ctx.fillText('DU',bx,by-82*scale);
}
initEngine().then(()=>{if($('wasmStatus'))$('wasmStatus').textContent=engineStatus();updateHandicap();updateRoute();});
if($('graphicsStatus'))$('graphicsStatus').textContent='Canvas 2D aktiv · WebGPU förberett · DLSS 5 kräver RTX-native/SDK';
setInterval(raceTick,1000);setInterval(()=>{if(S.source==='demo'&&!S.running){S.liveWatts=115;updateTelemetry();}},5000);updateDevice('Väntar på Bluetooth FTMS');updateHandicap();updateRoute();updateTelemetry();updateLeaderboard();initMap();requestAnimationFrame(raceDraw);resizeRace();