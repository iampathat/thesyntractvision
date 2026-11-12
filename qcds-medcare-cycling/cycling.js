/* © 2026 Patrik Sundblom. All Rights Reserved. Proprietary executable distribution. */


const MODES={road:'Landsväg',gravel:'Gravel',mtb:'MTB / trail',downhill:'Downhill'};
function distanceKm(points){let km=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];const dlat=(b.lat-a.lat)*Math.PI/180,dlon=(b.lon-a.lon)*Math.PI/180;const q=Math.sin(dlat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dlon/2)**2;km+=6371*2*Math.atan2(Math.sqrt(q),Math.sqrt(Math.max(0,1-q)));}return km;}
function altitude(points){let climb=0,drop=0,ok=0;for(let i=1;i<points.length;i++){const a=points[i-1].ele,b=points[i].ele;if(Number.isFinite(a)&&Number.isFinite(b)){const delta=b-a;if(delta>2)climb+=delta;else if(delta< -2)drop-=delta;ok++;}}return {valid:ok>0&&ok>=0.7*Math.max(1,points.length-1),climb:Math.round(climb),drop:Math.round(drop),coverage:ok/Math.max(1,points.length-1)};}
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



const FM=0x1826, BIKE=0x2AD2;
function parseIndoorBike(value){let p=0;const flags=value.getUint16(p,true);p+=2;const output={power:null,cadence:null,speed:null,hr:null};function has(bytes){return p+bytes<=value.byteLength;}function u8(){if(!has(1))throw Error('Short packet');return value.getUint8(p++);}function u16(){if(!has(2))throw Error('Short packet');let x=value.getUint16(p,true);p+=2;return x;}function i16(){if(!has(2))throw Error('Short packet');let x=value.getInt16(p,true);p+=2;return x;}function u24(){if(!has(3))throw Error('Short packet');let x=value.getUint8(p)+(value.getUint8(p+1)<<8)+(value.getUint8(p+2)<<16);p+=3;return x;}
try{if(!(flags&1))output.speed=u16()/100;if(flags&2)u16();if(flags&4)output.cadence=u16()/2;if(flags&8)u16();if(flags&16)u24();if(flags&32)i16();if(flags&64)output.power=i16();if(flags&128)i16();if(flags&256)u16();if(flags&512)u16();if(flags&1024)u8();if(flags&2048)output.hr=u8();}catch(e){throw Error('Ogiltigt/trunkerat FTMS-paket');}return output;}
class BikeFTMS{constructor(onData,onStatus){this.onData=onData;this.onStatus=onStatus;this.device=null;this.characteristic=null;this._handler=e=>{try{this.onData(parseIndoorBike(e.target.value));}catch(err){this.onStatus(err.message);}};this._disconnect=()=>this.onStatus('Bluetooth frånkopplad');}
async connect(){if(!navigator.bluetooth)throw Error('Web Bluetooth saknas. Använd Chrome på Mac via HTTPS eller localhost.');this.onStatus('Söker efter cykel …');const device=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:[FM]});this.device=device;device.addEventListener('gattserverdisconnected',this._disconnect);this.onStatus('Ansluter till '+device.name+' …');const server=await device.gatt.connect();const service=await server.getPrimaryService(FM);this.characteristic=await service.getCharacteristic(BIKE);await this.characteristic.startNotifications();this.characteristic.addEventListener('characteristicvaluechanged',this._handler);this.onStatus('FTMS ansluten: '+(device.name||'cykel'));return device.name||'FTMS';}
disconnect(){if(this.characteristic)this.characteristic.removeEventListener('characteristicvaluechanged',this._handler);if(this.device){this.device.removeEventListener('gattserverdisconnected',this._disconnect);if(this.device.gatt?.connected)this.device.gatt.disconnect();}this.characteristic=null;this.device=null;this.onStatus('Frånkopplad');}}




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


const wasmCourseIndex=index;





const $=id=>document.getElementById(id);
const S={mode:'road',tab:'explore',route:null,map:null,mapLayer:null,osmLayer:null,osmWays:[],source:'none',telemetry:{source:'none',power:null,cadence:null,speed:null,hr:null},running:false,elapsed:0,km:0,liveWatts:0,tick:0};
const modeWords={road:'ROAD RACE',gravel:'GRAVEL CHALLENGE',mtb:'MTB TRAIL',downhill:'DOWNHILL EXPERIENCE'};
const radio=new BikeFTMS(data=>{S.source='ftms';S.telemetry={...S.telemetry,...data,source:'ftms'};S.liveWatts=Number.isFinite(data.power)?Math.max(0,data.power):S.liveWatts; updateDevice('FTMS · livemätning');updateTelemetry();renderOracles();},status=>{updateDevice(status);});
function updateDevice(msg){$('deviceText').textContent=msg;$('feedStatus').textContent=S.source==='ftms'?'CYKEL ANSLUTEN':S.source==='demo'?'SIMULERAD DATA':'EJ ANSLUTEN';$('dataStatus').textContent=S.source==='ftms'?'● FTMS LIVE':S.source==='demo'?'● DEMO · SIMULERAT':'● DEMO / LOKALT';$('btLight').classList.toggle('online',S.source==='ftms');document.querySelector('.led').classList.toggle('online',S.source==='ftms');}
function changeTab(tab){S.tab=tab;document.querySelectorAll('.tab').forEach(n=>n.classList.toggle('active',n.dataset.tab===tab));document.querySelectorAll('.view').forEach(n=>n.classList.toggle('visible',n.id===tab));if(tab==='explore'&&S.map)setTimeout(()=>S.map.invalidateSize(),70);if(tab==='ride')resizeRace();if(tab==='oracles')renderOracles();if(tab==='league')updateLeague();}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>changeTab(b.dataset.tab)));
document.querySelectorAll('.discipline').forEach(b=>b.addEventListener('click',()=>{S.mode=b.dataset.mode;document.querySelectorAll('.discipline').forEach(x=>x.classList.toggle('active',x===b));$('modeLabel').textContent=modeWords[S.mode];$('hcpMode').textContent=MODES[S.mode];$('leagueMode').textContent=MODES[S.mode];updateHandicap();updateRoute();renderOracles();}));
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
  if(window.ResizeObserver){const ob=new ResizeObserver(()=>{if(!S.map)return;const r=el.getBoundingClientRect();if(r.width>0&&r.height>0)S.map.invalidateSize({pan:false});});ob.observe(el);}
  S.map.whenReady(()=>setTimeout(()=>S.map?.invalidateSize({pan:false}),100));
 }catch(e){console.error('Map initialization failed',e);$('osmInfo').textContent='Kartan kunde inte startas: '+e.message;}
}
function cleanRoute(points){return points.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180).slice(0,25000);}
function selectRoute(route){route.points=cleanRoute(route.points);if(route.points.length<2){$('osmInfo').textContent='Den valda rutten saknar tillräckligt med koordinater.';return;}S.route=route;S.km=0;S.elapsed=0;S.running=false;$('raceToggle').textContent='▶ Starta race';updateRoute();if(S.map&&window.L){S.mapLayer.clearLayers();const line=L.polyline(route.points.map(p=>[p.lat,p.lon]),{color:'#00b88c',weight:7,opacity:.95}).addTo(S.mapLayer);S.map.fitBounds(line.getBounds(),{padding:[30,30],maxZoom:15});}renderOracles();}
function updateRoute(){const r=S.route;const a=r?altitude(r.points):null;const dist=r?distanceKm(r.points):null;const idx=r?wasmCourseIndex(r,S.mode):null;$('routeName').textContent=r?.name||'Ingen bana vald';$('routeKm').textContent=dist===null?'—':dist.toFixed(2);$('routeClimb').textContent=a?.valid?a.climb:'—';$('routeIndex').textContent=idx===null?'—':idx;$('rideRouteName').textContent=r?.name||'Illustrerad testbana';$('rideLabel').textContent=r?.source||'ILLUSTRERAD TESTBANA';$('routeIndex').title= a?.valid?'Uppskattat experimentellt index':'Preliminärt index utan höjddata';$('routeClimb').title=a?.valid?'GPX-höjder, ej kvalitetsgranskade':'Höjddata saknas';$('sourceLabel').textContent=r?`Källa: ${r.source} · ${r.points.length} koordinater · ${a?.valid?'höjdprofil ingår':'höjddata saknas'} · tillstånd ej validerat`:'Inga ruttdata inlästa.';$('rideRouteInfo').textContent=r?`Verkligt koordinatspår från ${r.source}. Spelvyn är illustrerad; återgivningen av terräng är ännu inte georefererad 3D.`:'Ladda en OSM-led eller GPX för att cykla efter riktiga spår. Den animerade spelvyn är en illustration, inte en geografisk 3D-rendering.';$('realAltitude').textContent=a?.valid?`${a.climb} m upp / ${a.drop} m ned`:'Ej inläst';updateLeague();drawProfile();}
function drawProfile(){const c=$('profile'),ctx=c.getContext('2d'),rect=c.getBoundingClientRect();c.width=Math.max(280,Math.round(rect.width*devicePixelRatio));c.height=110*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio);const w=c.width/devicePixelRatio,h=110;ctx.clearRect(0,0,w,h);const pts=S.route?.points.filter(p=>Number.isFinite(p.ele))||[];if(pts.length<2)return;const vals=pts.map(p=>p.ele),min=Math.min(...vals),max=Math.max(...vals),span=Math.max(10,max-min);ctx.fillStyle='#073844';ctx.strokeStyle='#57dfc8';ctx.lineWidth=2;ctx.beginPath();vals.forEach((v,i)=>{const x=10+(i/(vals.length-1))*(w-20),y=h-12-(v-min)/span*(h-24);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.lineTo(w-10,h);ctx.lineTo(10,h);ctx.closePath();ctx.globalAlpha=.35;ctx.fill();ctx.globalAlpha=1;$('profileHint').textContent=`Höjdprofil från källfilen · ${Math.round(min)}–${Math.round(max)} möh`;} 
$('fileGPX').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>15e6){$('osmInfo').textContent='GPX-fil över 15 MB stöds inte i den här versionen.';return;}try{const xml=new DOMParser().parseFromString(await file.text(),'application/xml');if(xml.querySelector('parsererror'))throw Error('Felaktig XML');let nodes=[...xml.getElementsByTagName('trkpt')];if(nodes.length<2)nodes=[...xml.getElementsByTagName('rtept')];let pts=nodes.map(n=>{const ele=n.getElementsByTagName('ele')[0];return {lat:Number(n.getAttribute('lat')),lon:Number(n.getAttribute('lon')),ele:ele?Number(ele.textContent):null};});const title=xml.getElementsByTagName('name')[0]?.textContent?.trim()||file.name;selectRoute({name:title,source:'Importerad GPX',surface:null,points:pts});$('osmInfo').textContent=`Importerat ${file.name}. Använd den riktiga rutten i Live race.`;}catch(err){$('osmInfo').textContent=`GPX-fel: ${err.message}`;}e.target.value='';});
$('loadOSM').addEventListener('click',async()=>{if(!S.map){$('osmInfo').textContent='Karta kan inte laddas.';return;}const b=S.map.getBounds();if(b.getNorth()-b.getSouth()>.13||b.getEast()-b.getWest()>.19){$('osmInfo').textContent='Zooma in mer först (max ca 10 km brett).';return;}const rect=[b.getSouth(),b.getWest(),b.getNorth(),b.getEast()].map(n=>n.toFixed(6)).join(',');const filter=S.mode==='road'?'cycleway|path|track':S.mode==='gravel'?'track|cycleway': 'path|track|cycleway';const q=`[out:json][timeout:20];way["highway"~"^(${filter})$"](${rect});out geom 180;`;$('osmInfo').textContent='Hämtar riktiga OSM-segment från Overpass …';$('loadOSM').disabled=true;try{const response=await fetch('https://overpass.kumi.systems/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(q)});if(!response.ok)throw Error('Överbelastad kartserver ('+response.status+')');const data=await response.json();S.osmLayer.clearLayers();let count=0;for(const way of data.elements||[]){if(!way.geometry||way.geometry.length<2)continue;const pts=cleanRoute(way.geometry.map(x=>({lat:x.lat,lon:x.lon,ele:null})));if(pts.length<2)continue;const name=(way.tags?.name||way.tags?.ref||`OSM-led ${way.id}`);const surface=way.tags?.surface||way.tags?.tracktype||null;const access=way.tags?.bicycle==='no'||way.tags?.access==='private'||way.tags?.access==='no';const obj={name,source:`OpenStreetMap way/${way.id}`,surface,points:pts};const l=L.polyline(pts.map(p=>[p.lat,p.lon]),{color:access?'#e67e7e':'#f5c967',weight:4,opacity:.88});l.bindTooltip(`${name}${access?' · tillträde kan vara förbjudet':''} · ${surface||'okänd yta'}`);if(!access){l.on('click',()=>selectRoute(obj));l.addTo(S.osmLayer);count++;}else{l.addTo(S.osmLayer);} }$('osmInfo').textContent=`Hittade ${count} valbara segment. Klicka på en gul led. Kontrollera alltid faktisk tillåtelse för cykling.`;}catch(err){$('osmInfo').textContent=`OSM hämtning misslyckades (${err.message}). Försök igen eller importera GPX.`;}finally{$('loadOSM').disabled=false;}});
$('startRoute').addEventListener('click',()=>{if(!S.route){$('osmInfo').textContent='Välj först en OSM-led eller GPX.';return;}changeTab('ride');});
$('clearRoute').addEventListener('click',()=>{S.route=null;if(S.mapLayer)S.mapLayer.clearLayers();S.km=0;S.elapsed=0;S.running=false;updateRoute();renderOracles();});
function updateLeague(){const idx=wasmCourseIndex(S.route,S.mode);$('leagueIndex').textContent=idx??'—';$('leagueRoute').textContent=S.route?.name||'Ingen vald';}
function renderOracles(){const v=getInputs();const checks=evaluate({route:S.route,mode:S.mode,telemetry:S.telemetry,ftp:v.ftp,weight:v.weight});const ok=checks.filter(c=>c.result==='ok').length;$('oracleCount').textContent=`${ok} / ${checks.length}`;$('oracleList').innerHTML='';for(const c of checks){const div=document.createElement('article');div.className=`oracle ${c.result}`;const badge=document.createElement('span');badge.className='status';badge.textContent=c.result==='ok'?'UPPFYLLT':c.result==='unknown'?'OKÄNT':'EJ UPPFYLLT';const h=document.createElement('h3');h.textContent=`${c.id} · ${c.name}`;const p=document.createElement('p');p.textContent=c.desc;div.append(badge,h,p);$('oracleList').append(div);}}
function updateTelemetry(){const watts=S.source==='none'?null:S.liveWatts;$('watts').textContent=watts===null?'—':Math.round(watts);$('cadence').textContent=S.telemetry.cadence===null?'—':Math.round(S.telemetry.cadence);$('distance').textContent=S.km.toFixed(2);const hill=gradeAtProgress();const kmh=watts===null?0:Math.max(0,6+0.094*watts-(Number.isFinite(hill)?hill*.7:0));$('speed').textContent=watts===null?'—':kmh.toFixed(1);$('position').textContent=watts===null?'—':Math.max(1,Math.min(5,3-Math.round((watts-140)/65)))+'/5';}
function gradeAtProgress(){const pts=S.route?.points;if(!pts||pts.length<2)return null;let i=Math.floor((S.km/Math.max(.1,distanceKm(pts)))*(pts.length-2));i=Math.max(0,Math.min(pts.length-2,i));const a=pts[i],b=pts[i+1];if(!Number.isFinite(a.ele)||!Number.isFinite(b.ele))return null;const d=distanceKm([a,b])*1000;return wasmGrade(b.ele-a.ele,d);}
function raceTick(){if(!S.running)return;S.elapsed++;if(S.source==='demo'){S.liveWatts=Math.round(125+37*Math.sin(S.elapsed/14)+13*Math.sin(S.elapsed/3));S.telemetry.power=S.liveWatts;S.telemetry.cadence=Math.round(79+8*Math.sin(S.elapsed/8));}const hill=gradeAtProgress();const kmh=Math.max(0,6+.094*S.liveWatts-(Number.isFinite(hill)?hill*.7:0));S.km+=kmh/3600;const max=S.route?distanceKm(S.route.points):12.4;if(S.km>=max&&max>0){S.km=max;S.running=false;$('raceToggle').textContent='✓ Målgång';}updateTelemetry();$('raceTime').textContent=`${String(Math.floor(S.elapsed/60)).padStart(2,'0')}:${String(S.elapsed%60).padStart(2,'0')}`;updateLeaderboard();}
$('raceToggle').addEventListener('click',()=>{if(S.source==='none'){$('rideNotice').textContent='Anslut cykeln eller välj Testa demokälla i sidopanelen först.';return;}if(S.running){S.running=false;$('raceToggle').textContent='▶ Fortsätt';}else{const max=S.route?distanceKm(S.route.points):12.4;if(S.km>=max){S.km=0;S.elapsed=0;}S.running=true;$('raceToggle').textContent='Ⅱ Pausa race';$('rideNotice').textContent=S.source==='ftms'?'Träningswatt läses live. Simulerad bana och motståndare.':'DEMOLÄGE: watt, motståndare och resultat är simulerade.';}});
$('raceReset').addEventListener('click',()=>{S.running=false;S.km=0;S.elapsed=0;$('raceToggle').textContent='▶ Starta race';$('raceTime').textContent='00:00';updateTelemetry();updateLeaderboard();});
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