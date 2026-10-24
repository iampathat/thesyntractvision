/* QCDS Oncology Lab guided reproducible example regression.
 * This tests the same 8+12 presets against the REAL four-to-one engine,
 * plus the actual public UI API via a minimal browser DOM.
 * Author: Patrik Sundblom; OpenAI / ChatGPT R&D support.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const base=path.join(__dirname,"..");
const read=name=>fs.readFileSync(path.join(base,name),"utf8");
const html=read("index.html");
const exampleSource=read("onco-examples.js");
const genomeSource=read("genome-perspective.js");
const Q=require("../qcds-core.js");
const D=require("../genome-discovery.js");
const F=require("../genome-funnel.js");
assert(html.includes('src="./onco-examples.js?v='),"guides script is loaded");
for(const file of ["genome-perspective.js","onco-navigation.js","onco-examples.js"]){
 assert(html.includes('src="./'+file+'?v='));
}
assert(html.indexOf('src="./genome-perspective.js?')<html.indexOf('src="./onco-navigation.js?'));
assert(html.indexOf('src="./onco-navigation.js?')<html.indexOf('src="./onco-examples.js?'));
assert(!exampleSource.includes("target_state"),"no planted winning states");
for(const mode of [
 {id:"shared-pattern",seed:42,dataMode:"structure",shouldFind:true},
 {id:"null-control",seed:81,dataMode:"null",shouldFind:false}
]){
 const dataset=D.generateProfiles(mode.seed,mode.dataMode,8,12);
 const result=F.run({dataset,anchors:[],relation:"cooccurrence",
   minCases:5,maxControls:2,maxPasses:6,readoutNoise:0});
 assert.equal(Boolean(result.selected),mode.shouldFind);
 const cal=D.permutationAudit({dataset,anchors:[],relation:"cooccurrence",
   minCases:5,maxControls:2,selectedState:result.selected?.state});
 assert.equal(cal.method,"monte_carlo");
 assert.equal(cal.assignments,399);
 if(mode.shouldFind){
  assert.equal(result.selected.caseCount,5);
  assert.equal(result.selected.controlCount,1);
  assert.equal(result.leaders.length,1);
  assert.equal(result.stable,true);
 }
}
class Element{
 constructor(tag="div"){
  this.tag=tag;this.children=[];this.attrs={};this.dataset={};
  this.style={};this.events={};this.hidden=false;this.textContent="";this.value="";
  this.classList={values:new Set(),add(n){this.values.add(n)},toggle(n,on){if(on)this.values.add(n);else this.values.delete(n)}};
 }
 append(...items){this.children.push(...items)}
 prepend(...items){this.children.unshift(...items)}
 replaceChildren(...items){this.children=items}
 after(item){this.afterItem=item}
 addEventListener(type,fn){this.events[type]=fn}
 setAttribute(n,v){this.attrs[n]=v}
 getAttribute(n){return this.attrs[n]}
 scrollIntoView(){}
}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size);
const elements=Object.fromEntries(ids.map(id=>[id,new Element()]));
for(const [id,value] of Object.entries({
 cohortCaseCount:"5",cohortControlCount:"5",cohortMinCases:"3",cohortMaxControls:"1",
 cohortDataSeed:"173",cohortDataMode:"structure",cohortRelation:"cooccurrence",
 funnelPasses:"6",funnelNoise:"0"
}))elements[id].value=value;
const pages=Object.fromEntries(["home","setup","findings","engine"].map(x=>[x,new Element("section")]));
const welcome=new Element("div");
pages.home.querySelector=selector=>selector===".onco-welcome"?welcome:null;
const doc={
 readyState:"complete",
 getElementById:id=>elements[id]||null,
 createElement:tag=>new Element(tag),
 querySelector:selector=>pages[selector?.match(/onco-view="([^"]+)"/)?.[1]]||null,
 querySelectorAll:()=>[]
};
const routes=[];
const context={
 QCDSCore:Q,CancerGenomeDiscovery:D,QCDSGenomeFunnel:F,
 OncologyLabViews:{navigate(name){routes.push(name)},current(){return routes.at(-1)}}
};
context.globalThis=context;context.window=context;context.document=doc;
vm.runInNewContext(genomeSource,context,{filename:"genome-perspective.js",timeout:10000});
vm.runInNewContext(exampleSource,context,{filename:"onco-examples.js",timeout:10000});
const api=context.CancerGenomePerspective,examples=context.OncologyLabExamples;
assert(api&&examples&&examples.list().length===2);
examples.load("shared-pattern");
let snap=api.getSnapshot();
assert.equal(snap.exampleId,"shared-pattern");
assert.equal(snap.dataset.cases.length,8);
assert.equal(snap.dataset.controls.length,12);
assert.equal(snap.result.selected.caseCount,5);
assert.equal(snap.result.selected.controlCount,1);
assert.equal(routes.at(-1),"setup");
assert(pages.setup.children[0].children.length>3);
assert(pages.findings.children[0].children.length>3);
assert(pages.engine.children[0].children.length>3);
assert(elements.cohortEvidence.textContent.includes("399"));
const visibleText=node=>[node.textContent,...(node.children||[]).flatMap(child=>visibleText(child))].join(" ");
const initialHeadline=visibleText(elements.funnelHeadlineSummary);
assert(initialHeadline.includes("RESULTATET I KORTHET"));
assert(initialHeadline.includes("99,95 %"),"Parent Grover marked mass is prominently displayed");
assert(initialHeadline.includes("0,80 %"),"Pre-Grover percentage is displayed as a DIFFERENT distribution");
assert(initialHeadline.includes("en annan fördelning över 1024 tillstånd"),
  "Do not present the two percentages as direct clinical probability increase");
assert(initialHeadline.includes("1 markerad kandidat"),
  "The headline distinguishes singleton from a group of marked candidates");
const earlier=pages.findings.children[0].children.map(x=>x.textContent).join(" ");
elements.cohortMinCases.value="8";
if(elements.cohortMinCases.events.change)elements.cohortMinCases.events.change();
snap=api.getSnapshot();
assert.equal(snap.exampleChanged,true);
assert(pages.setup.children[0].children.length>3);
assert.equal(snap.result.settings.minCases,8);
examples.load("null-control");
snap=api.getSnapshot();
assert.equal(snap.exampleId,"null-control");
assert.equal(snap.result.qualifiedCount,0);
assert.equal(snap.result.selected,null);
assert(elements.cohortOutcome.textContent.startsWith("Inget samband uppfyller"));
assert(pages.findings.children[0].children.length>2);
assert.equal(routes.at(-1),"setup");
const nullHeadline=visibleText(elements.funnelHeadlineSummary);
assert(nullHeadline.includes("Ingen kombination uppfyllde villkoren"));
assert(!nullHeadline.includes("99,95 %"),"Null dataset must not imply Parent Grover amplification");
assert(html.includes('id="funnelHeadlineSummary"'));
assert(html.indexOf('id="funnelHeadlineSummary"')<html.indexOf('id="funnelLaneGrid"'));
assert(html.includes('class="funnel-inspection-details"'),"Technical graphs preserved but collapsed");
assert(html.includes('class="funnel-candidate-details"'),"Candidate distribution preserved but collapsed");
api.loadExample({id:"screenshot-173",seed:173,mode:"structure",caseCount:5,controlCount:5,
 minCases:3,maxControls:1,anchors:[],relation:"cooccurrence",maxPasses:6,readoutNoise:0});
const screenshotHeadline=visibleText(elements.funnelHeadlineSummary);
assert(screenshotHeadline.includes("6,34 %"),"Screenshot pre-Grover distribution should show 6.34%");
assert(screenshotHeadline.includes("99,95 %"),"Screenshot post-Grover marked mass should show 99.95%");
assert(screenshotHeadline.includes("148 av 375"),"Classically qualified 148 out of 375");
assert(screenshotHeadline.includes("Av dem valdes 1"),"Only one leader is marked for final Grover");
assert(screenshotHeadline.includes("1024 tillstånd"),"Parent search is 1024, not 375 state space");
console.log("Oncology Lab prominent Grover model interpretation and guided examples: PASS");