// QCDS — The Syntract Vision — Project Glasswing — Security Lab
// Editable editorial system-guide PDF generator. Created by Patrik Sundblom.
// OpenAI / ChatGPT provided research and development support.
// Media are separate files, never encoded as blobs in source.
import { registerReportFonts } from './vendor/report-fonts.mjs';
const P={navy:[7,22,37],panel:[16,41,60],ink:[239,248,251],muted:[179,201,209],
  cyan:[121,220,233],gold:[214,183,126],line:[58,84,102]};
const W=595.28,H=841.89,M=45,I=W-M*2,END=H-78;
const PHASES=[
 ['01 / Condition Formation','Express relevant target facts as 1 (present), 0 (absent) or ? (unresolved).'],
 ['02 / Conditional Evolution','Use oracle predicates to constrain and challenge the modeled candidate routes.'],
 ['03 / Recursive Inference','Rotate perspectives and follow route, control, possible bypass and counter-test.'],
 ['04 / Truth-Alignment Verification','Bind claims, observations, assumptions and reproducible counter-tests to a precise scope.']
];
const DESCRIPTIONS={
 'STRIDE':'Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service and Elevation of Privilege.',
 'OWASP / AppSec':'Web application and API security: access controls, processing, authorization and dangerous business logic.',
 'Identity':'Who acts, for whom, with which authority, and on what exact resource or action?',
 'Action / Tool Chain':'Trace delegated tool calls, consequential operations, approvals, containment and alternate routes.',
 'Privacy / Supply Chain':'Follow protected information and provenance across external providers, dependencies and boundaries.',
 'AI / GenAI':'Target-specific model context, untrusted data and AI-influenced behavior; not always applicable.',
 'Open Search':'Search beyond named framework labels by following entry points, assets, controls and consequences; not OSINT.'
};
const text=v=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim();
const ary=v=>Array.isArray(v)?v:[];
const pad=n=>String(n).padStart(2,'0');
const cut=(v,n=330)=>text(v).length>n?text(v).slice(0,n-1)+'…':text(v);
export function buildGuideModel(raw={}){
 const conditions=ary(raw.conditions).map(([key,meaning],i)=>({
  id:'C'+pad(i+1),key:text(key),name:text(raw.fieldMeta?.[key]?.[0]||key),meaning:text(meaning)}));
 const lenses=Object.entries(raw.lenses||{}).map(([name,item])=>({
  name,description:DESCRIPTIONS[name]||'Current system questions: '+ary(item?.tests).slice(0,2).map(x=>text(x[1])).join('; '),
  targetAI:!!item?.requiresTargetAI,tests:ary(item?.tests).map(t=>({
   key:text(t[0]),label:text(raw.fieldMeta?.[t[0]]?.[0]||t[0]),question:text(t[1])})),
  categories:[...new Set(ary(raw.seeds).flatMap(s=>ary(s.frameworks?.[name])))]}));
 const seeds=ary(raw.seeds).map(s=>({
  id:text(s.id),title:text(s.title),mechanism:text(s.mechanism),consequence:text(s.consequence),
  route:text(s.routeFamily),variants:ary(s.variants),targets:ary(s.targets)}));
 const variants=Object.entries(raw.variants||{}).map(([key,v])=>({key,label:text(v.label||key),description:text(v.segment)}));
 const targets=Object.entries(raw.targets||{}).map(([key,v])=>({key,description:text(v)}));
 return {release:text(raw.appRelease||'preview'),engine:text(raw.engineVersion||'unknown'),
  date:text(raw.generatedAt||new Date().toISOString().slice(0,10)),conditions,lenses,seeds,variants,targets};
}
export function guideOutline(model){
 return [
  ['00','Introduction',null],['01','Condition Formation','dimensions'],
  ['02','The Security Lenses','lenses'],['03','Attack Vector Fabric','attack'],
  ['04','Recursive Inference','recursive'],['05','Execution & Verification','execution'],
  ['06','Worked Example',null],['07','Implementation',null]
 ];
}
const set=(d,k,fn)=>d[fn](...P[k]);
const chooseFont=(d,size,style)=>d.setFont(size>=18?'times':'QCDSReport',style);
function base(d){
 set(d,'navy','setFillColor');d.rect(0,0,W,H,'F');
 set(d,'line','setDrawColor');d.setLineWidth(.65);
 d.line(M,56,W-M,56);d.line(M,H-52,W-M,H-52);
}
function one(d,s,x,y,size=10,c='ink',style='normal'){
 chooseFont(d,size,style);d.setFontSize(size);set(d,c,'setTextColor');d.text(text(s),x,y);
}
function wrap(d,s,width,size=10,style='normal'){
 chooseFont(d,size,style);d.setFontSize(size);const out=[];let cur='';
 for(const token of text(s).split(/\s+/)){
  if(d.getTextWidth(token)>width){
   if(cur){out.push(cur);cur='';}
   let word='';for(const ch of token){
    if(word&&d.getTextWidth(word+ch)>width){out.push(word);word=ch;}else word+=ch;
   }
   cur=word;continue;
  }
  if(cur&&d.getTextWidth(cur+' '+token)>width){out.push(cur);cur=token;}
  else cur+=(cur?' ':'')+token;
 }
 if(cur)out.push(cur);return out.length?out:[''];
}
function paragraphLines(d,s,x,y,width,size=10,c='ink',leading=1.45,style='normal'){
 const ls=wrap(d,s,width,size,style);
 chooseFont(d,size,style);d.setFontSize(size);set(d,c,'setTextColor');
 ls.forEach((line,i)=>d.text(line,x,y+i*size*leading));
 return y+ls.length*size*leading;
}
function head(d,kicker,title,dek){
 d.addPage();base(d);set(d,'gold','setFillColor');d.rect(0,0,4,H,'F');
 one(d,'QCDS  /  THE SYNTRACT VISION  /  PROJECT GLASSWING  /  SECURITY LAB',M,42,8,'gold','bold');
 one(d,kicker.toUpperCase(),M,82,9,'cyan','bold');
 let y=paragraphLines(d,title,M,118,I,24,'ink',1.19,'bold')+10;
 return paragraphLines(d,dek,M,y,I,10.1,'muted',1.4)+23;
}
function next(d,ctx){ctx.y=head(d,'CONTINUED',ctx.title,ctx.dek)}
function para(d,ctx,s,size=10.1,highlight=false){
 const ht=wrap(d,s,I,size).length*size*1.47+15;
 if(ctx.y+ht>END)next(d,ctx);
 ctx.y=paragraphLines(d,s,M,ctx.y,I,size,highlight?'gold':'ink',1.47)+15;
}
function block(d,ctx,title,body,detail=''){
 const width=I-31,htitle=wrap(d,title,width,11,'bold').length*14.1,
       hbody=wrap(d,body,width,9.8).length*13.9,
       hdetail=detail?wrap(d,detail,width,8.3).length*12:0,
       height=Math.max(82,47+htitle+hbody+hdetail);
 if(ctx.y+height+13>END)next(d,ctx);
 set(d,'panel','setFillColor');set(d,'line','setDrawColor');
 d.roundedRect(M,ctx.y-15,I,height,6,6,'FD');
 let y=paragraphLines(d,title,M+15,ctx.y+9,width,11,'gold',1.27,'bold')+5;
 y=paragraphLines(d,body,M+15,y,width,9.8,'ink',1.42)+3;
 if(detail)paragraphLines(d,detail,M+15,y,width,8.3,'muted',1.4);
 ctx.y+=height+13;
}
function label(d,ctx,title){
 const need=wrap(d,title,I,16,'bold').length*21+13;
 if(ctx.y+need>END)next(d,ctx);
 set(d,'gold','setFillColor');d.rect(M,ctx.y-12,3,17,'F');
 ctx.y=paragraphLines(d,title,M+13,ctx.y,I-13,16,'gold',1.3,'bold')+13;
}
function imagePage(d,photo,num,title,sub){
 d.addPage();base(d);
 if(photo){try{d.addImage(photo,'JPEG',0,132,W,562);}catch{}}
 else{
  const cx=W/2,cy=415;for(let i=0;i<22;i++){
   const a=i*Math.PI*2/22,r=125+(i%4)*26,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
   set(d,'cyan','setDrawColor');d.line(cx,cy,x,y);
   set(d,i%5?'cyan':'gold','setFillColor');d.circle(x,y,2.5,'F');
  }
 }
 set(d,'navy','setFillColor');d.rect(0,0,W,134,'F');d.rect(0,700,W,142,'F');
 one(d,num+'  /  PROJECT GLASSWING',M,48,9,'gold','bold');
 paragraphLines(d,title,M,94,I,24,'ink',1.2,'bold');
 paragraphLines(d,sub,M,738,I,11,'muted',1.4);
}
function cover(d,photo,model){
 d.addPage();base(d);
 if(photo)try{d.addImage(photo,'JPEG',0,209,W,491)}catch{}
 set(d,'navy','setFillColor');d.rect(0,0,W,212,'F');d.rect(0,701,W,141,'F');
 one(d,'QCDS',M,81,47,'ink','bold');
 one(d,'THE SYNTRACT VISION   /   PROJECT GLASSWING',M,111,10,'gold','bold');
 one(d,'SECURITY LAB',M,161,29,'ink','bold');
 one(d,'A Guide to Condition-Driven Security Inference',M,194,13.2,'cyan');
 paragraphLines(d,'Dimensions · attack vectors · security lenses · recursive inference · evidence-bound verification',
  M,733,I,11.8,'ink',1.43);
 one(d,'THEORY AND CREATION  /  PATRIK SUNDBLOM',M,803,8.8,'gold','bold');
}
function finish(d,model){
 const count=d.getNumberOfPages();
 for(let i=1;i<=count;i++){
  d.setPage(i);one(d,'PROJECT GLASSWING  /  SECURITY LAB',M,H-31,7,'muted');
  one(d,'ENGINE '+model.engine+'   /   '+pad(i)+' OF '+pad(count),W-186,H-31,7,'gold');
 }
}
export function createEditorialSystemGuidePdf(jsPDF,raw,{artwork={},edition='3.0'}={}){
 const model=buildGuideModel(raw);
 const d=new jsPDF({unit:'pt',format:'a4',compress:true,putOnlyUsedFonts:true});
 registerReportFonts(d);
 cover(d,artwork.guardian,model);
 let ctx={title:'How to read this guide',dek:'A living reference to the actual Security Lab implementation',y:0};
 ctx.y=head(d,'00 / THE READING KEY',ctx.title,ctx.dek);
 para(d,ctx,'QCDS Security Lab belongs to Project Glasswing within The Syntract Vision. The engine forms a logical model, generates possible attack routes and challenges them through complementary security perspectives and evidence. A modeled route is not a confirmed exploit.');
 block(d,ctx,'Live model snapshot',
  model.conditions.length+' core conditions; '+model.lenses.length+' active perspectives; '+model.seeds.length+
  ' mechanism seeds; '+model.variants.length+' route variants; '+model.targets.length+' target surfaces.',
  'App '+model.release+'  /  engine '+model.engine+'  /  generated '+model.date);
 for(const [a,b] of [
  ['The question','What is present, absent or still unknown?'],
  ['The candidate','Which path might be possible under those conditions?'],
  ['The comparison','Which frameworks recognize that same route?'],
  ['The evidence','What observation would support or refute the claim?']])block(d,ctx,a,b);
 imagePage(d,artwork.dimensions,'01','Condition Formation','From description to dimensions and ternary conditions');
 ctx={title:'The condition space',dek:'Core input definitions from the running engine',y:0};
 ctx.y=head(d,'01 / DIMENSIONS',ctx.title,ctx.dek);
 para(d,ctx,'In QCDS Security Lab, a dimension is an explicitly represented target fact. 1 means present, 0 means absent and ? means unresolved. With k unknown binary facts, the mask admits 2^k assignments. Those are theoretical logical possibilities, not observed vulnerabilities.');
 label(d,ctx,'Current condition register');
 for(const c of model.conditions)block(d,ctx,c.id+'  /  '+c.name,c.meaning,c.key);
 imagePage(d,artwork.lenses,'02','The Security Lenses',model.lenses.length+' perspectives examining one common vector fabric');
 ctx={title:'The security lens atlas',dek:'Perspective definitions follow the current engine exports',y:0};
 ctx.y=head(d,'02 / PERSPECTIVES',ctx.title,ctx.dek);
 para(d,ctx,'Each enabled perspective contributes questions and classification labels. Multiple perspectives can identify the same mechanism without proving several independent vulnerabilities.');
 for(const lens of model.lenses){
  label(d,ctx,lens.name);
  para(d,ctx,lens.description,9.7);
  if(lens.targetAI)para(d,ctx,'Applicability: target system contains an AI or learned-model component. Using AI as the analysis tool alone does not activate this lens.',9.6,true);
  for(const t of lens.tests)block(d,ctx,t.label,t.question,t.key);
  if(lens.categories.length)para(d,ctx,'Current mapped categories: '+cut(lens.categories.slice(0,20).join(' / '),750),9.1);
 }
 imagePage(d,artwork.attack,'03','Attack Vector Fabric','Mechanisms, routes, target surfaces and consequences');
 ctx={title:'How candidate vectors are formed',dek:'Source-backed mechanisms and all currently defined route types',y:0};
 ctx.y=head(d,'03 / ATTACK ROUTES',ctx.title,ctx.dek);
 para(d,ctx,'A possible route combines an attack mechanism, an interface or propagation variant, a target surface and a consequence. The 1/0/? mask constrains which candidates remain plausible. Generated routes are hypotheses until checked against evidence.');
 label(d,ctx,'Current route variants');
 for(const v of model.variants)block(d,ctx,v.label,v.description,v.key);
 label(d,ctx,'Target surfaces');
 for(const t of model.targets)block(d,ctx,t.key,t.description);
 label(d,ctx,'Current mechanism catalog  /  '+model.seeds.length+' seeds');
 for(const s of model.seeds)block(d,ctx,s.id+'  /  '+s.title,cut(s.mechanism+'. '+s.consequence,540),
  'Route '+s.route+' · variants '+s.variants.join(', ')+' · targets '+s.targets.join(', '));
 imagePage(d,artwork.recursive,'04','Recursive Inference','Challenge controls, alternate paths and counter-tests');
 ctx={title:'The QCDS inference loop',dek:'Theoretical phases and observable security questions',y:0};
 ctx.y=head(d,'04 / RECURSIVE INVESTIGATION',ctx.title,ctx.dek);
 for(const [a,b] of PHASES)block(d,ctx,a,b);
 label(d,ctx,'From control to counter-test');
 para(d,ctx,'A model can re-evaluate a route with one perspective removed, turn a single known coordinate into ?, and ask which previously plausible routes disappear or change. An authorization control can be challenged through alternate endpoints, asynchronous jobs and cached state.');
 block(d,ctx,'Convergence is not proof','Agreement among framework categories or a stabilized search distribution is not evidence that a real-world vulnerability exists.');
 imagePage(d,artwork.execution,'05','Execution & Verification','Symbolic modeling, ideal and noisy quantum calculations, evidence');
 ctx={title:'Computation versus evidence',dek:'Explain what the implementation actually does',y:0};
 ctx.y=head(d,'05 / EXECUTION MODES',ctx.title,ctx.dek);
 for(const [a,b] of [
  ['Symbolic execution','Inspect compatible Boolean assignments under known conditions and uncertainty.'],
  ['Ideal Grover reference','Calculate amplification under a mathematical oracle and selected iteration budget; this is not exploit probability.'],
  ['Noisy CPU circuit simulation','Illustrative noise experiments for small gate-level quantum circuits; not a physical QPU or calibrated hardware run.'],
  ['Truth-Alignment Verification','Bind a bounded claim to actual observations, source, scope and counter-evidence.']])block(d,ctx,a,b);
 para(d,ctx,'The current browser does not establish real quantum speedup or autonomous real-world penetration testing.',9.8,true);
 ctx={title:'Worked example: customer-records portal',dek:'Synthetic demonstration, not an allegation of a real flaw',y:0};
 ctx.y=head(d,'06 / WORKED EXAMPLE',ctx.title,ctx.dek);
 for(const [a,b] of [
  ['Target','A shared portal provides separate customers access to their protected records.'],
  ['Condition mask','External input, sensitive records and shared principals are present; object-level authorization may be unknown.'],
  ['Candidate path','A user may try an alternate object identifier or export interface that refers to a different customer.'],
  ['Framework projection','STRIDE classifies disclosure, OWASP asks about API authorization, Identity asks about principals, and Privacy examines sensitive information.'],
  ['Control and bypass','Enforce object-level authorization at every direct, queued and cached resource boundary.'],
  ['Safe counter-test','Use harmless fixture accounts and record the actual rejection, request context and logs.'],
  ['Result','Retain the path as conditional until traceable, scoped evidence supports or refutes it.']
 ])block(d,ctx,a,b);
 ctx={title:'Current implementation and provenance',dek:'Generated from source definitions, with clear limits',y:0};
 ctx.y=head(d,'07 / PROJECT GLASSWING',ctx.title,ctx.dek);
 block(d,ctx,'Application and inference engine',model.release+'  /  '+model.engine+'  /  '+model.date);
 block(d,ctx,'Model register',model.conditions.length+' conditions, '+model.lenses.length+' perspectives, '+
  model.seeds.length+' mechanisms, '+model.variants.length+' route variants, '+model.targets.length+' target surfaces.');
 block(d,ctx,'Active perspectives',model.lenses.map(v=>v.name).join(' · '));
 label(d,ctx,'Important limits');
 for(const [a,b] of [
  ['No automatic exploit claims','Candidate paths, framework mappings and simulated probabilities are not evidence of exploitable vulnerabilities.'],
  ['No QPU claim','The browser uses symbolic and CPU-backed modeling; a quantum hardware execution must be separately demonstrated.'],
  ['Illustrations and source facts','Illustrations convey architecture. The live counts, names and claims are selectable PDF text sourced from modules.'],
  ['Evolving software','When a new framework, condition or mechanism is added to the source registry, the next PDF rebuild includes it automatically.']
 ])block(d,ctx,a,b);
 label(d,ctx,'Reading key');
 for(const [a,b] of [
  ['Dimension','A checkable, independently declared logical coordinate.'],
  ['Attack vector','A modeled mechanism and route, not a confirmed breach.'],
  ['Oracle','A predicate or constraint used to test candidates.'],
  ['Syntract binding','A scope-specific link between condition, claim, observation and counter-test.']
 ])block(d,ctx,a,b);
 para(d,ctx,'Theory and creation by Patrik Sundblom — with OpenAI / ChatGPT as research and development support.',9.6,true);
 finish(d,model);
 d.setProperties({title:'QCDS / The Syntract Vision / Project Glasswing / Security Lab',
  subject:'Dynamic architecture guide reflecting current security inference engine exports',
  author:'Patrik Sundblom',keywords:'QCDS, Project Glasswing, Syntract, security, live documentation'});
 return {doc:d,summary:{pages:d.getNumberOfPages(),chapters:guideOutline(model).length,
  engine:model.engine,release:model.release,conditions:model.conditions.length,
  lenses:model.lenses.length,mechanisms:model.seeds.length,edition}};
}
