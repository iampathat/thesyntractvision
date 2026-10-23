/* QCDS Oncology Lab · Guided, reproducible first-time examples.
 * This layer never creates results, hardcodes winning loci, or runs a second engine.
 * It loads parameters through CancerGenomePerspective.loadExample(), then reads
 * the actual four-to-one-funnel outcome.
 * Theory/creation by Patrik Sundblom. R&D support: OpenAI / ChatGPT.
 */
(function(root){
"use strict";
function initialize(){
 const api=root.CancerGenomePerspective,views=root.OncologyLabViews;
 if(!api||!views||typeof api.loadExample!=="function")return;
 const $=id=>document.getElementById(id);
 const home=document.querySelector('[data-onco-view="home"]');
 const setup=document.querySelector('[data-onco-view="setup"]');
 const findings=document.querySelector('[data-onco-view="findings"]');
 const engine=document.querySelector('[data-onco-view="engine"]');
 if(!home||!setup||!findings||!engine)return;
 const PRESETS=[
  {id:"shared-pattern",name:"Sök ett oväntat DNA-samband",
   lead:"Ett guidat exempel med flera möjliga DNA-positioner och en tydlig uppgift.",
   seed:42,mode:"structure",caseCount:8,controlCount:12,minCases:5,maxControls:2,
   relation:"cooccurrence",anchors:[],maxPasses:6,readoutNoise:0},
  {id:"null-control",name:"Kontroll: när inget samband behöver finnas",
   lead:"Jämför med ett exempel där inga systematiska gruppskillnader har byggts in.",
   seed:81,mode:"null",caseCount:8,controlCount:12,minCases:5,maxControls:2,
   relation:"cooccurrence",anchors:[],maxPasses:6,readoutNoise:0}
 ];
 const byId=new Map(PRESETS.map(p=>[p.id,p]));
 function element(tag,cls,text){
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);
  return el;
 }
 const rootCard=element("section","onco-examples");
 rootCard.id="oncoExamples";
 const title=element("div","onco-examples-head");
 title.append(element("span","onco-demo-kicker","PROVA ETT FÄRDIGT EXEMPEL"),
  element("h3","","Börja utan att behöva fylla i någonting"),
  element("p","","Välj ett exempel. Då laddas alla personer, DNA-observationer, frågor och Grover-inställningar på riktigt. Varje vy förklarar sedan sin del av samma beräkning."));
 rootCard.append(title);
 const cards=element("div","onco-example-grid");
 PRESETS.forEach((p,i)=>{
  const article=element("article","onco-example-card");
  const kind=element("span","onco-example-badge",i===0?"REKOMMENDERAT FÖRSTA EXEMPEL":"JÄMFÖRELSE / NOLLTEST");
  const h=element("h4","",p.name);
  const text=element("p","",p.lead);
  const note=element("p","onco-example-facts","8 påhittade profiler + 12 jämförelser · tio symboliska DNA-positioner · inga kända mållocus förprogrammerade.");
  const btn=element("button","onco-example-button",i===0?"▶ Ladda guidat exempel":"▶ Ladda kontrollen");
  btn.type="button";btn.dataset.example=p.id;
  btn.addEventListener("click",()=>load(p));
  article.append(kind,h,text,note,btn);cards.append(article);
 });
 rootCard.append(cards);
 const target=home.querySelector(".onco-welcome");
 if(target)target.after(rootCard);else home.prepend(rootCard);
 const setupPanel=element("section","onco-guide");setupPanel.id="oncoGuideSetup";
 const findingsPanel=element("section","onco-guide");findingsPanel.id="oncoGuideFindings";
 const enginePanel=element("section","onco-guide");enginePanel.id="oncoGuideEngine";
 setup.prepend(setupPanel);findings.prepend(findingsPanel);engine.prepend(enginePanel);
 let current=null;
 function clear(panel){panel.replaceChildren();}
 function titleBlock(panel,eyebrow,title,desc){
  panel.append(element("span","onco-guide-eyebrow",eyebrow));
  panel.append(element("h3","onco-guide-title",title));
  panel.append(element("p","onco-guide-lead",desc));
 }
 function explainRow(box,index,name,desc){
  const row=element("div","onco-guide-row");
  const n=element("span","onco-guide-n",String(index).padStart(2,"0"));
  const text=element("span","onco-guide-row-copy");
  text.append(element("strong","",name),element("small","",desc));
  row.append(n,text);box.append(row);
 }
 function aside(panel,message,kind){
  const p=element("p","onco-guide-note"+(kind?" is-"+kind:""),message);
  panel.append(p);
 }
 function stepButton(target,label){
  const b=element("button","onco-guide-link",label);
  b.type="button";b.addEventListener("click",()=>views.navigate(target));return b;
 }
 function labels(result){
  return result.selected?.loci.map(index=>{
   const locus=api.LOCI[index];return locus.label+" (kromosom "+locus.chr+")";
  }).join(" och ")||"Inget samband uppfyllde villkoren";
 }
 function render(snapshot){
  current=snapshot;
  const p=byId.get(snapshot.exampleId);
  if(!p)return;
  const changed=snapshot.exampleChanged;
  const n=snapshot.dataset.cases.length,m=snapshot.dataset.controls.length;
  const result=snapshot.result;
  const min=result?.settings.minCases??p.minCases;
  const max=result?.settings.maxControls??p.maxControls;
  const diff=changed?"Du har ändrat det laddade exemplet. Text och siffror nedan uppdateras efter dina inställningar.":"Samma inlästa exempel följer dig mellan vyerna.";
  clear(setupPanel);
  titleBlock(setupPanel,"GUIDAT EXEMPEL · STEG 1 AV 3",
    changed?"Du utforskar nu din egen variant":p.name,
    "Allt i den här vyn hör till frågan som QCDS ska undersöka. Inga fynd är förhandsvalda.");
  const sr=element("div","onco-guide-steps");
  explainRow(sr,1,"Vilka personer jämförs?",
    n+" påhittade cancerprofiler jämförs med "+m+" påhittade profiler i kontrollgruppen. Antalet är ditt val, inte en QCDS-gräns.");
  explainRow(sr,2,"Vilken fråga ställer vi?",
    "Kan flera DNA-positioner tillsammans förekomma hos minst "+min+" av "+n+
    " cancerprofiler och högst "+max+" av "+m+" jämförelseprofiler?");
  explainRow(sr,3,"Vad gör oraklet?",
    result?.settings.relation==="parity"?
      "Det prövar ett blandat 0/1-mönster med udda antal närvarande varianter. Ingen specifik vinnarkombination är inmatad.":
      "Det prövar samförekomst på olika DNA-positioner. Vilka positioner som väljs är inte förutbestämt.");
  explainRow(sr,4,"Vad händer när du kör?",
    "Fjorton? Nej: 16 små fyrdimensionsrum beräknas per rotation. Fyra grupper blir ett sammanbundet resultat.");
  setupPanel.append(sr);
  aside(setupPanel,"Tryck på den vanliga knappen ”Hitta DNA-samband” nedanför för att gå till Resultat. "+diff);

  clear(findingsPanel);
  titleBlock(findingsPanel,"GUIDAT EXEMPEL · STEG 2 AV 3",
    "Så tolkar du det verkligt beräknade resultatet",
    "Läs först slutsatsen här och titta sedan på de upplysta personraderna längre ned i den här vyn.");
  const fr=element("div","onco-guide-steps");
  if(result?.selected){
   explainRow(fr,1,"Vilka DNA-positioner markerades?",labels(result)+
    ". Positionerna ligger på skilda schematiska kromosomer; de representerar inte kartlagda cancer-gener.");
   explainRow(fr,2,"Varför markerades de?",
    "Hela kombinationen följer den valda regeln hos "+result.selected.caseCount+" av "+n+
    " cancerprofiler och "+result.selected.controlCount+" av "+m+" jämförelseprofiler.");
   explainRow(fr,3,"Betyder det att man hittat en cancerorsak?",
    "Nej. En kombination som passar oraklet är bara en kandidat i syntetiska data. Läs kontrollen för slumpträffar i resultatkortet.");
   explainRow(fr,4,"Är modellen stabil?",
    result.stable?"Fördelningarna klarade modellens interna stabilitetsvillkor efter "+result.rotations+
      " rotationer. Det är INTE medicinsk bekräftelse.":
      "Efter "+result.rotations+" rotationer uppfylldes inte alla interna stabilitetsvillkor. Resultatet behöver fler kontroller.");
  }else{
   explainRow(fr,1,"Vad betyder att ingen träff hittades?",
    "Ingen testad kombination klarade de angivna villkoren för den här syntetiska gruppen.");
   explainRow(fr,2,"Varför är det nyttigt?",
    "QCDS ska kunna säga ”ingen lösning” i stället för att alltid lysa upp en kandidat.");
   explainRow(fr,3,"Betyder det att cancer saknar samband?",
    "Nej. Det är bara detta lilla symboliska dataset och just dessa orakelvillkor som inte gav en träff.");
  }
  findingsPanel.append(fr);
  const actions=element("div","onco-guide-actions");
  actions.append(stepButton("setup","← Ändra frågan"),stepButton("engine","Visa 16→4→1-motorn →"));
  findingsPanel.append(actions);
  aside(findingsPanel,diff+
    " Grönt i genomvyn betyder att personen uppfyller HELA det valda mönstret; blått kan vara en delträff.");

  clear(enginePanel);
  titleBlock(enginePanel,"GUIDAT EXEMPEL · STEG 3 AV 3","Därför används Grover och den roterande tratten",
    "Detta är beräkningen bakom exakt samma exempel som visas under Resultat – ingen separat sökning.");
  const er=element("div","onco-guide-steps");
  explainRow(er,1,"16 små logiska rum",
    "Varje rum testar 4 av de 10 symboliska positionerna och räknar fram en fördelning över 16 möjliga lokala tillstånd.");
  explainRow(er,2,"Grover förstärker enligt villkor",
    "Oraklet markerar lokala tillstånd som uppfyller reglerna. Grover förstärker deras sannolikhet till första topp eller tröskel; inte sannolikheten för medicinsk sanning.");
  explainRow(er,3,"Tratten 16 → 4 → 1",
    "Alla 16 sannolikhetsvärden per rum skickas vidare. Fyra rum binds till en fördelning, och fyra sådana grupper blir ett större logiskt perspektiv.");
  explainRow(er,4,"Rotationer och ny prövning",
    "Dimensionerna placeras om och får nya fönster. I detta exempel beräknades "+(result?.rotations??0)+
    " rotationer, alltså "+((result?.rotations??0)*16)+" små Grover-körningar, i webbläsarens CPU.");
  explainRow(er,5,"Slutkontroll och begränsning",
    (result?.qualifiedCount??0)+" kombinationer uppfyllde hela de syntetiska gruppvillkoren. Parent-Grover kördes "+
    (result?.parentGrover?.iterations??0)+" iterationer. Några samband över fler än fyra samtidiga dimensioner kan gå förlorade.");
  enginePanel.append(er);
  aside(enginePanel,"Detta är en klassisk emulering av idealiserad Grover, inte en kvantdator. En hög förstärkningsgrad är inte ett cancersannolikhetsmått.");
  enginePanel.append(stepButton("findings","← Tillbaka till upplysta DNA-positioner"));
 }
 function load(p){
  try{
   const state=api.loadExample(p);
   render(state);
   views.navigate("setup");
   // Reveal that an example is loaded without auto-running an alternative engine.
   const btn=$("cohortRun");if(btn)btn.textContent="▶ Visa resultatet för det inlästa exemplet";
  }catch(error){
   const errorNode=$("cohortError");
   if(errorNode)errorNode.textContent="Exemplet kunde inte laddas: "+error.message;
   views.navigate("setup");
  }
 }
 const unsubscribe=api.subscribe(snapshot=>{
  if(byId.has(snapshot.exampleId))render(snapshot);
  else{
   setupPanel.replaceChildren();findingsPanel.replaceChildren();enginePanel.replaceChildren();
  }
 });
 root.OncologyLabExamples={
  load:id=>{const p=byId.get(id);if(!p)throw Error("Unknown example: "+id);load(p)},
  list:()=>PRESETS.map(p=>({id:p.id,name:p.name}))
 };
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
else initialize();
})(window);