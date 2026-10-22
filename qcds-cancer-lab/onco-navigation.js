/* QCDS Oncology Lab — six real views, one numerical backend.
   Moves source nodes (never clones IDs or creates duplicate engines).
   Theory/creation: Patrik Sundblom; OpenAI/ChatGPT R&D support. */
(function(root){
"use strict";
function init(){
 const $=id=>document.getElementById(id), q=sel=>document.querySelector(sel);
 const shell=q("main.shell"),header=q(".clinical-header");
 const nodes={
  strip:q(".research-strip"),scope:q(".research-scope"),
  intro:$("genomePerspective"),input:$("cohortCombinatorial"),
  result:q(".cohort-result"),visual:q(".cohort-visual-head"),
  legend:q(".cohort-legend"),tracks:$("cohortGenomeTracks"),
  matrix:q(".cohort-matrix-details"),funnel:$("funnelDeepDive"),
  old:$("workbench"),references:$("referenceHub"),methods:$("methods")
 };
 if(!shell||!header||Object.values(nodes).some(x=>!x))return;
 const info=[
  ["home","Översikt","Så hänger Oncology Lab ihop."],
  ["setup","Undersökning","Välj grupper, startpositioner och regler."],
  ["findings","Resultat","Se det som hittats och hur säkert det är."],
  ["engine","QCDS-motorn","Följ Grover, rotationerna och tratten 16→4→1."],
  ["legacy","8-bitarslab","Ett separat äldre experiment, inte en andra DNA-undersökning."],
  ["knowledge","Kunskapsbank","Förklaringar, vetenskapliga källor och dokumentation."]
 ];
 const titles={home:"Välkommen till Oncology Lab",setup:"1 · Skapa en undersökning",
  findings:"2 · Resultat och upplysta DNA-positioner",engine:"3 · Så arbetar QCDS",
  legacy:"Separat 8-bitars metodlaboratorium",knowledge:"Kunskapsbank och metoder"};
 const links={home:"#start",setup:"#investigation",findings:"#findings",
  engine:"#qcds-engine",legacy:"#workbench",knowledge:"#referenceHub"};
 const aliases={start:"home",home:"home",genomePerspective:"home",
  investigation:"setup",setup:"setup",cohortCombinatorial:"setup",cohortAdvancedSettings:"setup",
  findings:"findings",result:"findings",cohortOutcome:"findings",cohortResultTitle:"findings",
  cohortGenomeTracks:"findings",cohortChecks:"findings",cohortDataMatrix:"findings",
  "qcds-engine":"engine",engine:"engine",qcdsFunnel:"engine",funnelDeepDive:"engine",
  workbench:"legacy",legacy:"legacy",results:"legacy",qcdsConclusion:"legacy",
  referenceHub:"knowledge",methods:"knowledge",knowledge:"knowledge"};
 const workspace=document.createElement("div");workspace.id="oncoWorkspace";workspace.className="onco-workspace";
 const sidebar=document.createElement("nav");sidebar.className="onco-sidebar";sidebar.setAttribute("aria-label","Delar i Oncology Lab");
 const navHead=document.createElement("div");navHead.className="onco-nav-heading";
 navHead.innerHTML="<strong>ONCOLOGY LAB</strong><span>En sak i taget</span>";sidebar.append(navHead);
 const navigation=new Map();
 for(const [index,[name,label,desc]] of info.entries()){
  if(index===4){const divider=document.createElement("div");divider.className="onco-nav-divider";divider.textContent="SEPARATA FÖRDJUPNINGAR";sidebar.append(divider);}
  const btn=document.createElement("button");btn.type="button";btn.className="onco-nav-button";
  btn.dataset.route=name;btn.setAttribute("aria-controls","oncoView-"+name);
  const n=document.createElement("span");n.className="onco-nav-number";n.textContent=index===0?"⌂":index<4?"0"+index:index===4?"◈":"▤";
  const copy=document.createElement("span");copy.className="onco-nav-copy";
  const strong=document.createElement("strong");strong.textContent=label;
  const small=document.createElement("small");small.textContent=desc;
  copy.append(strong,small);btn.append(n,copy);
  btn.addEventListener("click",()=>navigate(name));sidebar.append(btn);navigation.set(name,btn);
 }
 const content=document.createElement("div");content.className="onco-content";
 const mast=document.createElement("div");mast.className="onco-page-mast";
 mast.innerHTML='<div class="onco-breadcrumb">QCDS ONCOLOGY LAB <span>›</span> <strong id="oncoCurrentCrumb">Översikt</strong></div>'+
  '<h2 id="oncoPageTitle" tabindex="-1">Välkommen till Oncology Lab</h2><p id="oncoPageDescription"></p>';
 content.append(mast);
 const pages=new Map();
 for(const [name] of info){
  const section=document.createElement("section");section.id="oncoView-"+name;
  section.className="onco-view";section.dataset.oncoView=name;
  section.setAttribute("aria-label",titles[name]);section.hidden=true;
  content.append(section);pages.set(name,section);
 }
 workspace.append(sidebar,content);
 header.after(workspace);
 const home=pages.get("home"),setup=pages.get("setup"),findings=pages.get("findings"),
  engine=pages.get("engine"),old=pages.get("legacy"),knowledge=pages.get("knowledge");
 const welcome=document.createElement("div");welcome.className="onco-welcome";
 welcome.innerHTML='<strong>Vad kan jag göra här?</strong>'+
   '<p>Jämför påhittade DNA-profiler, låt QCDS-simuleringen pröva samband och se vilka positioner som markeras. Resultatet har en egen vy, skild från den tekniska beräkningen.</p>'+
   '<p><b>Observera:</b> detta är en matematisk forskningsmodell, inte verkliga patientgenom, medicinska slutsatser eller ett NISQ-experiment.</p>';
 home.append(welcome);
 const cards=document.createElement("div");cards.className="onco-action-grid";
 for(const [destination,n,title,description] of [
  ["setup","01","Undersökning","Välj gruppstorlek och vilka mönster som ska prövas."],
  ["findings","02","Resultat","Se slutsatsen och vad som lyser upp i profilerna."],
  ["engine","03","QCDS-beräkning","Se hur de 16 små rummen binds fyra till ett."]
 ]){
  const b=document.createElement("button");b.type="button";b.className="onco-action-card";
  b.innerHTML='<span>'+n+'</span><strong>'+title+'</strong><small>'+description+'</small><em>Öppna →</em>';
  b.addEventListener("click",()=>navigate(destination));cards.append(b);
 }
 home.append(cards,nodes.strip,nodes.scope);
 // Keep the input, the inference result and the machinery in different pages;
 // move actual DOM objects, preserving all IDs and bound event listeners.
 setup.append(nodes.input);
 findings.append(nodes.result,nodes.visual,nodes.legend,nodes.tracks,nodes.matrix);
 engine.append(nodes.funnel);
 old.append(nodes.old);
 knowledge.append(nodes.references,nodes.methods);
 home.append(nodes.intro);
 const quick=nodes.intro.querySelector(".genome-quickstart");if(quick)quick.hidden=true;
 const footer=nodes.intro.querySelector(".genome-perspective-foot");
 if(footer)home.append(footer);
 // Previous wrappers are unnecessary once their children move to focused routes.
 const makeFooter=(page,buttons)=>{
  const row=document.createElement("div");row.className="onco-step-footer";
  for(const [dest,label,primary] of buttons){
   const b=document.createElement("button");b.type="button";
   b.className=primary?"onco-next":"onco-secondary";b.textContent=label;
   b.addEventListener("click",()=>navigate(dest));row.append(b);
  }
  page.append(row);
 };
 // The main "Find connections" button performs the search and opens Results;
 // no second lookalike submit/action button is added here.
 makeFooter(findings,[["setup","← Ändra undersökningen",false],["engine","Hur räknade QCDS? →",true]]);
 makeFooter(engine,[["findings","← Till resultatet",false]]);
 nodes.funnel.open=true;
 const older=$("legacyWorkbenchDetails");if(older)older.open=true;
 const resources=document.createElement("div");resources.className="onco-library-links";
 resources.innerHTML='<strong>Vetenskaplig granskning och källor</strong>'+
  '<a href="./AUDIT_2026-10-22.md">Granskningsrapport ↗</a>'+
  '<a href="./README.md">Teknisk dokumentation ↗</a>'+
  '<a href="./LICENSE.md">Licens ↗</a>';
 knowledge.prepend(resources);
 let active="";
 function show(page,writeHash=false,focus=false){
  const route=pages.has(page)?page:"home";
  for(const [name,node] of pages){
   node.hidden=name!==route;
   const btn=navigation.get(name);btn.classList.toggle("is-active",name===route);
   if(name===route)btn.setAttribute("aria-current","page");else btn.removeAttribute("aria-current");
  }
  active=route;
  $("oncoCurrentCrumb").textContent=info.find(x=>x[0]===route)[1];
  $("oncoPageTitle").textContent=titles[route];
  $("oncoPageDescription").textContent=info.find(x=>x[0]===route)[2];
  if(route==="engine")nodes.funnel.open=true;
  if(route==="legacy"&&older)older.open=true;
  if(writeHash&&root.location.hash!==links[route])root.history.pushState(null,"",links[route]);
  if(focus)$("oncoPageTitle").focus({preventScroll:true});
  if(root.scrollTo)root.scrollTo({top:0,behavior:"instant"});
 }
 function navigate(route){show(route,true,true)}
 function infer(){
  const key=decodeURIComponent(root.location.hash.slice(1));
  if(!key)return "home";
  if(aliases[key])return aliases[key];
  return $(key)?.closest?.("[data-onco-view]")?.dataset.oncoView||"home";
 }
 root.addEventListener("hashchange",()=>show(infer()));
 root.addEventListener("popstate",()=>show(infer()));
 // Existing deep links continue to work, even though their nodes now live in a
 // distinct page. This also fixes the previously broken library link.
 document.addEventListener("click",event=>{
  const a=event.target.closest?.('a[href^="#"]');if(!a)return;
  const hash=a.getAttribute("href").slice(1);
  const dest=aliases[hash]||$(hash)?.closest?.("[data-onco-view]")?.dataset.oncoView;
  if(!dest)return;event.preventDefault();navigate(dest);
 },true);
 // Pressing "Find connections" runs its original engine and opens the result.
 $("cohortRun")?.addEventListener("click",()=>navigate("findings"));
 // Adjusting controls recomputes without forcibly switching pages.
 shell.classList.add("onco-router-ready");
 show(infer());
 root.OncologyLabViews={navigate,current:()=>active,views:()=>Array.from(pages.keys())};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})(window);
