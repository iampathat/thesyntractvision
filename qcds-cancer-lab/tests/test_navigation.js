/* QCDS Oncology Lab: six-view navigation tests without browser dependencies.
 * The actual numerical engine is tested in test_funnel.js and test_genome.js.
 * Copyright 2026 Patrik Sundblom — OpenAI/ChatGPT R&D support.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const router=fs.readFileSync(path.join(__dirname,"../onco-navigation.js"),"utf8");
const order=["qcds-core.js","genome-discovery.js","genome-funnel.js","genome-perspective.js","onco-navigation.js"];
let last=-1;
for(const p of order){
 const at=html.indexOf('src="./'+p+'?v=');
 assert(at>last,"Must load "+p+" AFTER its engine dependencies");
 last=at;
}
assert(!html.includes('<section class="reference-hub"> id="referenceHub">'),"library markup repaired");
assert(html.includes('<section class="reference-hub" id="referenceHub">'));
assert(!router.includes("cloneNode("),"never clone a calculation or duplicate IDs");
for(const view of ["home","setup","findings","engine","legacy","knowledge"])
 assert(router.includes('"'+view+'"'),"route exists: "+view);
// Minimal DOM harness runs the REAL router. Deliberately no third party modules.
const byId=new Map(),all=[];
class Node {
 constructor(tag="div",id=null,classes=[]){
  this.tag=tag;this.id=id;this._classes=new Set(classes);
  this.parent=null;this.children=[];this.events={};this.attrs={};
  this.dataset={};this.hidden=false;this.textContent="";this._html="";
  this.classList={
   add:n=>this._classes.add(n),
   toggle:(n,value)=>{if(value)this._classes.add(n);else this._classes.delete(n)},
   contains:n=>this._classes.has(n)
  };
  if(id)byId.set(id,this);all.push(this);
 }
 set innerHTML(value){
  this._html=String(value);
  for(const m of this._html.matchAll(/\bid="([^"]+)"/g))this.append(new Node("span",m[1]));
 }
 get innerHTML(){return this._html}
 append(...nodes){for(const node of nodes){
   if(node.parent)node.parent.children=node.parent.children.filter(x=>x!==node);
   node.parent=this;this.children.push(node);
 }}
 prepend(...nodes){for(const node of nodes.reverse()){
   if(node.parent)node.parent.children=node.parent.children.filter(x=>x!==node);
   node.parent=this;this.children.unshift(node);
 }}
 after(node){
  assert(this.parent,"after() requires a parent");
  if(node.parent)node.parent.children=node.parent.children.filter(x=>x!==node);
  const n=this.parent.children.indexOf(this);
  this.parent.children.splice(n+1,0,node);node.parent=this.parent;
 }
 setAttribute(k,v){this.attrs[k]=v}
 removeAttribute(k){delete this.attrs[k]}
 addEventListener(k,cb){(this.events[k] ||= []).push(cb)}
 focus(){this.focused=true}
 matches(selector){
  return selector.startsWith(".")?this._classes.has(selector.slice(1)):
    selector.startsWith("#")?this.id===selector.slice(1):false;
 }
 querySelector(selector){
  const visit=node=>{
   for(const child of node.children){
    if(child.matches(selector))return child;
    const result=visit(child);if(result)return result;
   }
   return null;
  };
  return visit(this);
 }
 closest(selector){
  let p=this;
  while(p){
   if(selector==="[data-onco-view]" && p.dataset.oncoView)return p;
   p=p.parent;
  }
  return null;
 }
}
const shell=new Node("main",null,["shell"]);
const header=new Node("header",null,["clinical-header"]);
const strip=new Node("section",null,["research-strip"]);
const scope=new Node("div",null,["research-scope"]);
const intro=new Node("section","genomePerspective",["genome-perspective"]);
const quick=new Node("div",null,["genome-quickstart"]);
const footer=new Node("div",null,["genome-perspective-foot"]);
const cohort=new Node("div","cohortCombinatorial",["cohort-lab"]);
const result=new Node("section",null,["cohort-result"]);
const visual=new Node("div",null,["cohort-visual-head"]);
const legend=new Node("div",null,["cohort-legend"]);
const tracks=new Node("div","cohortGenomeTracks");
const matrix=new Node("details",null,["cohort-matrix-details"]);
const funnel=new Node("details","funnelDeepDive");
const legacy=new Node("section","workbench");
const legacyDetails=new Node("details","legacyWorkbenchDetails");
const refs=new Node("section","referenceHub",["reference-hub"]);
const methods=new Node("details","methods");
const run=new Node("button","cohortRun");
intro.append(quick,cohort,footer);
cohort.append(run,result,visual,legend,tracks,matrix,funnel);
legacy.append(legacyDetails);
shell.append(header,strip,scope,intro,legacy,refs,methods);
const eventHandlers={};
const fakeDoc={
 readyState:"complete",
 createElement:t=>new Node(t),
 getElementById:id=>byId.get(id)||null,
 querySelector:selector=>shell.querySelector(selector),
 addEventListener:(name,fn)=>{(eventHandlers["doc:"+name] ||= []).push(fn)}
};
const fakeWindow={
 location:{hash:"#start"},
 history:{pushState(_x,_y,hash){fakeWindow.location.hash=hash}},
 scrollTo(){},
 addEventListener:(name,fn)=>{(eventHandlers[name] ||= []).push(fn)}
};
vm.runInNewContext(router,{document:fakeDoc,window:fakeWindow},
 {filename:"onco-navigation.js",timeout:1500});
const ui=fakeWindow.OncologyLabViews;
assert(ui,"router must initialize with complete DOM");
assert.equal(ui.views().length,6);
assert.equal(ui.current(),"home");
const view=id=>byId.get("oncoView-"+id);
for(const name of ["setup","findings","engine","legacy","knowledge"]){
 assert.equal(view(name).hidden,true,"only overview visible initially");
}
ui.navigate("setup");
assert.equal(ui.current(),"setup");assert.strictEqual(cohort.parent,view("setup"));
assert.equal(view("home").hidden,true);
ui.navigate("findings");
assert.strictEqual(result.parent,view("findings"));assert.strictEqual(tracks.parent,view("findings"));
assert.equal(cohort.parent,view("setup"),"same source input, not a duplicate");
assert.equal(view("findings").hidden,false);
ui.navigate("engine");
assert.strictEqual(funnel.parent,view("engine"));assert(funnel.open);
ui.navigate("legacy");assert.strictEqual(legacy.parent,view("legacy"));assert(legacyDetails.open);
ui.navigate("knowledge");assert.strictEqual(refs.parent,view("knowledge"));
assert.strictEqual(methods.parent,view("knowledge"));
fakeWindow.location.hash="#qcdsFunnel";
for(const handler of eventHandlers.hashchange||[])handler();
assert.equal(ui.current(),"engine","old deep link routes to dedicated QCDS page");
ui.navigate("setup");
for(const cb of run.events.click||[])cb();
assert.equal(ui.current(),"findings","run action must reveal Result rather than scrolling a hidden section");
assert.strictEqual(byId.get("cohortRun"),run,"original button stays unique");
console.log("Oncology Lab six focused views, deep links, model separation and navigation: PASS");