// QCDS / The Syntract Vision / Project Glasswing / Security Lab
// Visual System Guide edition 4, preserving the 18-page reference's editorial hierarchy.
// Copyright (c) 2026 Patrik Sundblom. All Rights Reserved.
// OpenAI/ChatGPT: research & development support.
// Deliberately no embedded images or encoded payloads: assets are separate files.
import { registerReportFonts } from './vendor/report-fonts.mjs';
import { buildGuideModel } from './system-guide-editorial.mjs';
const W=595.28,H=841.89,M=43,R=W-M,CW=W-2*M;
const ink=[229,241,246],navy=[3,20,33],panel=[14,39,58],line=[50,87,104],gold=[225,187,125],cyan=[128,225,239],muted=[166,195,205];
const section={intro:'00 / THE READING KEY',condition:'01 / CONDITION FORMATION',
 lenses:'02 / THE SECURITY LENSES',vectors:'03 / ATTACK VECTOR FABRIC',recursive:'04 / RECURSIVE INFERENCE',
 execution:'05 / EXECUTION & VERIFICATION',example:'06 / WORKED EXAMPLE',contract:'07 / DOCUMENT CONTRACT',glossary:'08 / REFERENCE'};
function color(d,method,rgb){d[method](...rgb)}
function font(d,pts=10,bold=false,serif=false){d.setFont(serif?'times':'QCDSReport',bold?'bold':'normal');d.setFontSize(pts)}
function smart(v){return String(v??'').replace(/[\x00-\x1f]/g,' ').replace(/[‐–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").trim()}
function wrapped(d,v,width,pts=10,bold=false,serif=false){
 font(d,pts,bold,serif);let lines=[],line='';
 for(let token of smart(v).split(/\s+/)){
  if(d.getTextWidth(token)>width){
   if(line){lines.push(line);line=''}
   let chunk='';
   for(const letter of token){if(chunk&&d.getTextWidth(chunk+letter)>width){lines.push(chunk);chunk=letter}else chunk+=letter}
   if(chunk)line=chunk;
   continue;
  }
  if(line&&d.getTextWidth(line+' '+token)>width){lines.push(line);line=token}
  else line+=(line?' ':'')+token;
 }
 if(line)lines.push(line);return lines.length?lines:[''];
}
function copy(d,v,x,y,width,pts=10,rgb=ink,leading=1.46,opts={}){
 const ls=wrapped(d,v,width,pts,!!opts.bold,!!opts.serif);
 font(d,pts,!!opts.bold,!!opts.serif);color(d,'setTextColor',rgb);
 const limit=opts.limit??ls.length;
 ls.slice(0,limit).forEach((s,i)=>d.text(s,x,y+pts*leading*i));
 return y+Math.min(limit,ls.length)*pts*leading;
}
function background(d){
 color(d,'setFillColor',navy);d.rect(0,0,W,H,'F');
 color(d,'setDrawColor',line);d.setLineWidth(.8);
 d.line(M,82,R,82);d.line(M,H-49,R,H-49);
}
function mark(d,title,n){
 background(d);
 copy(d,'QCDS',M,51,62,21,ink,1.0,{serif:true,bold:true});
 copy(d,'SECURITY LAB',M+76,51,CW-76,8.3,gold,1.0,{bold:true});
 copy(d,'THE SYNTRACT VISION  /  PROJECT GLASSWING  /  '+title,M,69,CW,7.4,muted,1.1);
 copy(d,String(n).padStart(2,'0'),R-21,H-26,24,8,gold,1.0,{bold:true});
 copy(d,'CREATED BY PATRIK SUNDBLOM',M,H-26,300,7,gold,1.0);
}
function heading(d,kicker,title,dek){
 copy(d,kicker,M,112,CW,8.6,gold,1.2,{bold:true});
 let y=copy(d,title,M,154,CW,22,ink,1.15,{serif:true,bold:true})+7;
 return copy(d,dek,M,y,CW,9.7,muted,1.5)+16;
}
function hero(d,photo,chapter,title,sub,n){
 background(d);
 // Chapter artwork already contains its own editorial lettering. Treat it as
 // a complete portrait A4 spread; adding opaque bars would cover the design.
 if(photo){try{d.addImage(photo,'JPEG',0,0,W,H);return}catch{}}
 // Text-only fallback for missing artwork.
 color(d,'setFillColor',navy);d.rect(0,0,W,133,'F');d.rect(0,H-123,W,123,'F');
 color(d,'setFillColor',gold);d.rect(M,21,40,2,'F');
 copy(d,'QCDS   /   THE SYNTRACT VISION   /   PROJECT GLASSWING',M,45,CW,8.3,gold,1.1,{bold:true});
 copy(d,chapter+'   '+title,M,94,CW,22,ink,1.12,{serif:true,bold:true});
 copy(d,sub,M,H-84,CW,10.5,ink,1.3,{limit:2});
 copy(d,'THEORY AND CREATION BY PATRIK SUNDBLOM',M,H-25,CW,7.3,gold,1);
 copy(d,String(n).padStart(2,'0'),R-20,H-25,20,7.3,gold,1);
}
function panelBox(d,x,y,w,h){
 color(d,'setFillColor',panel);color(d,'setDrawColor',line);
 d.setLineWidth(.7);d.roundedRect(x,y,w,h,5,5,'FD');
}
function box(d,x,y,w,h,title,body,extra=''){
 panelBox(d,x,y,w,h);
 copy(d,title.toUpperCase(),x+13,y+24,w-26,9.4,gold,1.25,{bold:true,limit:2});
 copy(d,body,x+13,y+42,w-26,9.2,ink,1.38,{limit:Math.max(2,Math.floor((h-48)/13))});
 if(extra)copy(d,extra,x+13,y+h-13,w-26,7.6,muted,1.0,{limit:1});
}
function lineBullet(d,title,body,y,{x=M,w=CW,bullet=true}={}){
 if(bullet){color(d,'setFillColor',cyan);d.rect(x,y-12,3,16,'F')}
 let last=copy(d,title,x+(bullet?11:0),y,w-(bullet?11:0),11.8,ink,1.2,{bold:true});
 last=copy(d,body,x+(bullet?11:0),last+7,w-(bullet?11:0),9.6,muted,1.4);
 return last+14;
}
function twoColRows(d,items,y,{max=items.length,rowH=70}={}){
 const gap=13,w=(CW-gap)/2;
 items.slice(0,max).forEach(([title,body],i)=>{
  const x=M+(i%2)*(w+gap),yt=y+Math.floor(i/2)*(rowH+8);
  box(d,x,yt,w,rowH,title,body);
 });
 return y+Math.ceil(Math.min(max,items.length)/2)*(rowH+8);
}
function cover(d,art,model){
 background(d);
 // A4 portrait artwork is a COMPLETE magazine cover, not a landscape
 // banner to stretch into the middle of a portrait sheet.
 if(art){try{d.addImage(art,'JPEG',0,0,W,H);return}catch{}}
 color(d,'setFillColor',navy);d.rect(0,0,W,187,'F');d.rect(0,H-144,W,144,'F');
 copy(d,'QCDS',M,91,CW,54,ink,1,{serif:true,bold:true});
 copy(d,'S E C U R I T Y   L A B',M,117,CW,15,gold,1,{serif:true,bold:true});
 copy(d,'THE SYNTRACT VISION  /  PROJECT GLASSWING',M,145,CW,8.9,cyan,1);
 copy(d,'A Guide to Condition-Driven Security Inference',M,170,CW,13,ink,1.0);
 copy(d,'Dimensions, attack vectors, seven security lenses, recursive inference and truth-aligned verification.',
   M,H-110,CW,10.5,muted,1.45);
 copy(d,'THEORY AND CREATION / PATRIK SUNDBLOM',M,H-37,CW,8,gold,1.0);
 copy(d,'VISUAL EDITION  /  18 PAGE MASTER',R-175,H-37,175,7.8,cyan,1);
}
function authorship(d,model){
 let y=heading(d,section.glossary,'Glossary & authorship','A compact reading key and the boundaries of the claims made here.');
 const terms=[
 ['Dimension','A separately represented property of the target system.'],
 ['Attack vector','A modeled mechanism and route toward a consequence.'],
 ['Oracle','A predicate or test that constrains candidate states.'],
 ['STRIDE','Six classic threat categories used as an analytical lens.'],
 ['OWASP','A family of application and API security reference frameworks.'],
 ['QCDS','Condition-driven synthesis across a structured candidate space.'],
 ['Syntract binding','Alignment of a scoped claim with specific supporting evidence.']
 ];
 for(const [term,meaning]of terms){copy(d,term,M,y,127,9.5,gold,1.3,{bold:true});const yy=copy(d,meaning,M+130,y,CW-130,9.5,ink,1.35);y=Math.max(y+18,yy+12)}
 panelBox(d,M,y+16,CW,95);
 copy(d,'PROJECT GLASSWING',M+15,y+40,CW-30,12,gold,1.0,{bold:true});
 copy(d,'A research direction within QCDS / The Syntract Vision. Each real-world finding requires scoped evidence, not only a modeled pathway.',
 M+15,y+58,CW-30,9.1,ink,1.45);
 copy(d,'Theory and creation by Patrik Sundblom; OpenAI/ChatGPT as R&D support.',
 M+15,y+93,CW-30,8.1,muted,1);
}
export function createVisualGlasswingPdf(jsPDF,snapshot,{artwork={},edition='4.0'}={}){
 const model=buildGuideModel(snapshot),d=new jsPDF({unit:'pt',format:'a4',compress:true,putOnlyUsedFonts:true});
 registerReportFonts(d);let p=1;
 const next=(tag)=>{d.addPage();mark(d,tag,++p)};
 cover(d,artwork.guardian,model);
 next('OVERVIEW');
 let y=heading(d,section.intro,'The guide behind the investigation',
  'The visual spreads explain the method. The compact text pages describe the current system model.');
 panelBox(d,M,y,CW,92);
 copy(d,'QCDS Security Lab',M+15,y+26,CW-30,10.3,cyan,1,{bold:true});
 copy(d,'Study a target, derive conditions, form possible attack paths, challenge them through multiple perspectives and bind specific claims to evidence. A coherent route is not a confirmed vulnerability.',
 M+15,y+49,CW-30,9.8,ink,1.5);
 y+=113;
 y=twoColRows(d,[['Four QCDS phases','Condition Formation / Conditional Evolution / Recursive Inference / Truth-Alignment Verification.'],
  ['Security perspectives',model.lenses.map(x=>x.name).join(' / ')],
  ['Three fact states','1 = present; 0 = absent; ? = unresolved. Unknowns are maintained explicitly.'],
  ['Evidence contract','Every finding must identify its claim, route, conditions, test context and verification status.']],y,{rowH:105});
 y+=13;
 lineBullet(d,'How to read the publication',
  'The image spreads express the architecture. The intervening pages are readable explanations and live source-derived facts; they are not an exhaustive vulnerability catalog.',y);
 next('ILLUSTRATED PHASE');hero(d,artwork.dimensions,'01','Condition Formation',
  'From plain-language input to a navigable, condition-defined logical space.',p);
 next('EXPLANATION');
 y=heading(d,section.condition,'From descriptions to dimensions','Separate checkable facts from interpretations of what could go wrong.');
 y=lineBullet(d,'A dimension is a condition, not a risk score.',
 'The system models each declared fact as 1, 0 or ?. An unresolved fact expands the set of possible states rather than silently becoming true.',y);
 y=lineBullet(d,'Why the question mark matters',
 'If k independent binary conditions remain unknown, the corresponding logical mask admits up to 2^k assignments. That is a search-space count, not the probability of an attack.',y);
 twoColRows(d,[['1 / Present','Supported by the current scoped system description.'],
  ['0 / Absent','Ruled out by the stated boundary or observations.'],
  ['? / Unresolved','Needs further questioning or a bounded test.'],
  ['Condition update','Changing one answer changes which candidate routes stay plausible.']],y+10,{rowH:125});
 next('LIVE REGISTER');
 y=heading(d,'01A / CURRENT CORE CONDITIONS','The actual '+model.conditions.length+' core inputs',
  'Generated from the active engine definitions, grouped compactly so the guide stays readable.');
 const current=model.conditions.slice(0,14);
 current.forEach((v,i)=>{
   const ry=y+5+i*32.5;
   if(i%2===1)panelBox(d,M,ry-16,CW,29);
   copy(d,v.id,M+13,ry+3,52,9.1,gold,1,{bold:true,limit:1});
   copy(d,v.meaning||v.name,M+67,ry+3,CW-82,9.0,ink,1.2,{limit:1});
 });
 if(model.conditions.length>14)copy(d,
   '+'+(model.conditions.length-14)+' further conditions in the active engine. See the current source register for full names.',
   M,730,CW,9.2,cyan,1.2,{limit:2});
 heroPage('02','The seven security lenses','Different frameworks; one investigated system.','lenses');
 next('LENS EXPLANATIONS');
 y=heading(d,'02 / FRAMEWORK OVERVIEW','Seven perspectives, one target',
  'Each lens asks different questions about the same candidate routes; classifications are not independent proof.');
 for(const lens of model.lenses.slice(0,4)){
  y=lineBullet(d,lens.name,lens.description,y);
  if(y>690)break;
 }
 heroContinuation();
 next('LENS EXPLANATIONS');
 y=heading(d,'02A / FRAMEWORK OVERVIEW','Seven perspectives / continued',
  'The remaining perspectives keep their own conditions and scope, including AI-target applicability.');
 for(const lens of model.lenses.slice(4,8))y=lineBullet(d,lens.name,lens.description,y);
 if(model.lenses.length>8)copy(d,model.lenses.length+' perspectives in current release. Additional lenses are tracked by the live engine.',M,717,CW,9.5,cyan);
 next('SYNTHESIS');
 y=heading(d,'02B / SHARED UNDERLYING ROUTE','How multiple lenses converge',
 'The same route can receive several classifications without becoming several separate vulnerabilities.');
 y=twoColRows(d,[['One route','A proposed mechanism and path over a defined target.'],
  ['One evidence requirement','Observations, counter-tests and scoped context remain mandatory.'],
  ['Many lenses','Each active perspective highlights different kinds of failure.'],
  ['One investigation','The synthesis binds perspectives, controls and observations.']],y,{rowH:119});
 y+=13;
 lineBullet(d,'Counterfactual rotation','Remove one perspective or change a known condition to ?; examine which candidate routes lose support.',y);
 heroPage('03','Attack vectors across the system landscape','Paths, dependencies and exposure surfaces.','attack');
 next('VECTOR EXPLANATIONS');
 y=heading(d,'03 / ATTACK VECTORS','How the Attack Vector Fabric is formed',
  'Combine a mechanism, route variant, target surface and consequence; then constrain with known conditions.');
 y=lineBullet(d,'What is an attack vector?','A possible way an adversary or failure could cross a boundary. It is not a confirmed exploit.',y);
 y=lineBullet(d,'What the model currently contains',model.seeds.length+' mechanism seeds; '+model.variants.length+' route variants; '+model.targets.length+' target surfaces.',y);
 twoColRows(d,[['Mechanisms',model.seeds.slice(0,4).map(x=>x.title).join(' / ')],
  ['Route variants',model.variants.map(x=>x.label).join(' / ')],
  ['Target surfaces',model.targets.map(x=>x.key).join(' / ')],
  ['Open Search','Explores boundary crossings outside named framework labels; it is not automatically OSINT.']],y+8,{rowH:125});
 heroPage('04','Recursive inference','Route, control, bypass, counter-test and verification.','recursive');
 next('INFERENCE');
 y=heading(d,'04 / RECURSIVE INFERENCE','Challenge the protection, not only the threat',
  'The loop examines controls, alternate routes and surviving assumptions.');
 for(const [a,b] of [['The candidate','A plausible route is selected from the compatible model.'],
 ['The protection','An explicit control should interrupt that route.'],
 ['The alternative','Another endpoint, asynchronous step or cached state might bypass the control.'],
 ['The verification','Use scoped evidence and counter-tests to accept, reject or qualify a claim.']]){
 y=lineBullet(d,a,b,y);
 }
 panelBox(d,M,y+8,CW,72);
 copy(d,'CONVERGENCE IS NOT PROOF',M+14,y+32,CW-28,10.3,gold,1,{bold:true});
 copy(d,'A stable logical result or simulated distribution does not itself establish a real-world security flaw.',
  M+14,y+53,CW-28,9.5,ink,1.3);
 heroPage('05','Execution and truth-alignment','The same oracle, different computational representations.','execution');
 next('EXECUTION MODES');
 y=heading(d,'05 / EXECUTION & VERIFICATION','The same oracle, different execution modes',
  'QCDS separates the logical definition of a problem from the substrate used to evaluate it.');
 for(const [a,b] of [
  ['Symbolic','A compact representation of 1 / 0 / ?-constrained states.'],
  ['Exact classical','A CPU calculation used for comparison and reproducibility.'],
  ['Ideal Grover reference','Illustrative mathematical amplitude amplification under an ideal oracle.'],
  ['Noisy circuit','A small CPU-simulated quantum circuit with an illustrative noise model.'],
  ['Verified claim','Only a real scoped observation can justify an assertion about a target system.']]){
   y=lineBullet(d,a,b,y);
 }
 next('CASE STUDY');
 y=heading(d,'06 / FROM QUESTION TO FINDING','A worked example: customer-records portal',
  'A synthetic account boundary, explained from question to evidence.');
 for(const [a,b] of [
  ['1 / The target and goal','A customer portal must prevent users from reading another customer’s records.'],
  ['2 / The condition mask','External input, protected data and shared principals are present; authorization may be unknown.'],
  ['3 / Candidate vector and perspectives','An alternate record identifier may test object-level authorization; OWASP, STRIDE, Identity and Privacy provide different views.'],
  ['4 / The proposed control and bypass','Authorize the exact principal and object on every direct, asynchronous and cached path.'],
  ['5 / Evidence and decision','Harmless fixture accounts, responses and attributable logs are required to establish whether the control worked.']
 ])y=lineBullet(d,a,b,y);
 panelBox(d,M,y+7,CW,73);
 copy(d,'EXAMPLE, NOT A FINDING',M+14,y+32,CW-28,10.0,gold,1,{bold:true});
 copy(d,'This teaching case makes no claim about a particular deployed portal.',
  M+14,y+52,CW-28,9.5,ink,1.3);
 next('DOCUMENT CONTRACT');
 y=heading(d,'07 / DYNAMIC DOCUMENT CONTRACT','Current facts, evolving guide',
 'What must update automatically, and what must remain an intentionally edited explanation.');
 for(const [a,b] of [
  ['Source of truth','Condition definitions, lens names, vector seeds, route variants and target surfaces are read from the live engine.'],
  ['Snapshots and versioning','App '+model.release+' / engine '+model.engine+' / guide generated '+model.date+'.'],
  ['Stable editorial method','The four phases and educational text remain authored explanations; they are not regenerated from arbitrary counts.'],
  ['Curated selections','New registry items change current totals and representative examples without turning the guide into a multi-page dump.'],
  ['Independent validation','A future visual regression should compare this generated layout against the approved 18-page design master.']
 ])y=lineBullet(d,a,b,y);
 next('REFERENCE');
 authorship(d,model);
 if(d.getNumberOfPages()!==18)throw new Error('Visual editorial guide must produce exactly 18 pages; got '+d.getNumberOfPages());
 d.setProperties({title:'QCDS / The Syntract Vision / Project Glasswing / Security Lab - Visual System Guide',
   subject:'Visual editorial guide with current source-derived facts',author:'Patrik Sundblom',
   keywords:'QCDS, Project Glasswing, Security Lab, STRIDE, OWASP, dynamic inference'});
 return {doc:d,summary:{pages:18,edition,release:model.release,engine:model.engine,conditions:model.conditions.length,
  lenses:model.lenses.length,mechanisms:model.seeds.length}};
 function heroPage(chapter,title,sub,key){d.addPage();hero(d,artwork[key],chapter,title,sub,++p)}
 function heroContinuation(){ /* part of the two editorial lens explanation pages */ }
}
