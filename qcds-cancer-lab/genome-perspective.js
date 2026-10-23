/* Multi-person distributed-locus QCDS research demonstrator UI.
 * This is not sequence matching. Computational results come from the
 * reproducible 10D cohort oracle, ideal Grover and perturbation checks.
 * © 2026 Patrik Sundblom · OpenAI / ChatGPT R&D support.
 */
(function(root,factory){
  // The browser reads the ordered scripts; CommonJS tests require dependencies explicitly.
  const hasNode=typeof module!=="undefined"&&Boolean(module.exports);
  if(hasNode && !root.QCDSCore)require("./qcds-core.js");
  const api=factory(
    root.CancerGenomeDiscovery||(hasNode?require("./genome-discovery.js"):null),
    root.QCDSGenomeFunnel||(hasNode?require("./genome-funnel.js"):null)
  );
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.CancerGenomePerspective=api;
  if(typeof document!=="undefined")api.initialize();
})(typeof globalThis!=="undefined"?globalThis:this,function(D,F){
  "use strict";
  if(!D||!F)throw Error("Genomdelen och den roterande QCDS-tratten måste vara laddade.");
  const LOCI=D.LOCI,N=D.N;
  let dataset=D.generateProfiles(173,"structure");
  let anchors=[];
  let result=null,audit=null,selectedState=null,selectedPass=0;
  let exampleId=null,exampleChanged=false;
  const subscribers=new Set();
  function notify(){
    const snap=getSnapshot();
    for(const cb of subscribers){try{cb(snap)}catch(e){if(typeof console!=="undefined")console.error("Oncology Lab: uppdatering av exempel",e)}}
  }
  function changed(){if(exampleId)exampleChanged=true;}
  function getSnapshot(){return {dataset,anchors:anchors.slice(),result,audit,selectedState,exampleId,exampleChanged};}
  function subscribe(callback){
    if(typeof callback!=="function")throw Error("En funktion krävs.");
    subscribers.add(callback);
    if(result)callback(getSnapshot());
    return ()=>subscribers.delete(callback);
  }
  const $=id=>document.getElementById(id);
  function e(tag,cls,value){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(value!==undefined)node.textContent=String(value);
    return node;
  }
  function locusNames(indices){
    return indices.map(i=>LOCI[i].label+" (kromosom "+LOCI[i].chr+")").join(" · ");
  }
  function all(){return [...dataset.cases,...dataset.controls];}
  function percent(p){return (100*p).toFixed(2)+"%";}
  function toggleAnchor(i){
    changed();
    if(anchors.includes(i))anchors=anchors.filter(x=>x!==i);
    else if(anchors.length<3)anchors=[...anchors,i].sort((a,b)=>a-b);
    else{$("cohortError").textContent="Högst tre startpositioner kan väljas. Ta bort en position eller rensa villkoret.";return;}
    $("cohortError").textContent="";
    run();
  }
  function renderSelectors(){
    const panel=$("cohortLoci");
    panel.replaceChildren();
    LOCI.forEach((loc,i)=>{
      const btn=e("button","cohort-locus");
      btn.type="button";
      btn.classList.toggle("is-anchor",anchors.includes(i));
      btn.setAttribute("aria-pressed",anchors.includes(i)?"true":"false");
      btn.setAttribute("aria-label","Startposition "+loc.label+" kromosom "+loc.chr);
      btn.append(e("strong","",loc.label),e("small","","krom. "+loc.chr));
      btn.addEventListener("click",()=>toggleAnchor(i));
      panel.append(btn);
    });
    $("cohortAnchors").textContent=anchors.length
      ?"Startpositioner: "+locusNames(anchors)+". Övriga positioner är fortfarande öppna."
      :"Inget valt: QCDS söker fritt bland exemplets tio positioner.";
  }
  function renderGenomes(){
    const holder=$("cohortGenomeTracks"),matrix=$("cohortDataMatrix");
    holder.replaceChildren();matrix.replaceChildren();
    const header=e("div","cohort-matrix-header");
    header.append(e("span","","Profil"));
    LOCI.forEach((loc,i)=>{
      const b=e("button","cohort-matrix-name",loc.label);
      b.type="button";b.title="Välj "+loc.label+" som startposition";
      b.classList.toggle("is-anchor",anchors.includes(i));
      b.addEventListener("click",()=>toggleAnchor(i));header.append(b);
    });
    matrix.append(header);
    all().forEach((person,profileIndex)=>{
      const relation=result?.settings?.relation||"cooccurrence";
      const fullMatch=selectedState!==null&&D.satisfies(selectedState,person,relation);
      const row=e("div","cohort-genome-row");
      row.classList.add(person.group==="cases"?"cohort-case":"cohort-control");
      row.classList.toggle("is-full-match",fullMatch);
      row.append(e("span","cohort-person",person.id));
      const track=e("div","cohort-genome-track");
      track.setAttribute("aria-label",person.id+" · schematisk genomaxel");
      LOCI.forEach((loc,i)=>{
        const present=person.variants.includes(i);
        const hit=selectedState!==null&&(selectedState&(1<<i))!==0;
        const circle=e("button","cohort-site");
        circle.type="button";circle.style.left=(100*loc.position).toFixed(1)+"%";
        circle.classList.toggle("has-variant",present);
        circle.classList.toggle("is-anchor",anchors.includes(i));
        circle.classList.toggle("is-hit",hit&&present&&fullMatch&&person.group==="cases");
        circle.classList.toggle("is-control-hit",hit&&present&&fullMatch&&person.group==="controls");
        circle.classList.toggle("is-partial-match",hit&&present&&!fullMatch);
        circle.classList.toggle("is-pattern-missing",hit&&!present&&relation==="parity"&&fullMatch);
        circle.title=person.id+" · "+loc.label+": "+(present?"varianten finns":"varianten saknas")+". Tryck för att ändra observationen.";
        circle.setAttribute("aria-label",circle.title);
        circle.addEventListener("click",()=>toggleVariant(profileIndex,i));
        track.append(circle);
      });
      row.append(track,e("span","cohort-genome-count",
        selectedState===null?(person.group==="cases"?"fall":"jämförelse"):(fullMatch?"matchar":"delvis")));
      holder.append(row);
      const matrixRow=e("div","cohort-matrix-row");
      matrixRow.classList.add(person.group==="cases"?"is-case":"is-control");
      matrixRow.append(e("span","",person.id));
      LOCI.forEach((loc,i)=>{
        const present=person.variants.includes(i);
        const cell=e("button","cohort-bit",present?"1":"0");
        cell.type="button";
        cell.classList.toggle("is-variant",present);
        cell.classList.toggle("is-anchor",anchors.includes(i));
        const component=selectedState!==null&&(selectedState&(1<<i))!==0;
        cell.classList.toggle("is-highlight",component&&present&&fullMatch&&person.group==="cases");
        cell.classList.toggle("is-pattern-missing",component&&!present&&fullMatch&&relation==="parity");
        cell.classList.toggle("is-partial-match",component&&present&&!fullMatch);
        cell.title="Ändra syntetisk observation "+person.id+" / "+loc.label;
        cell.setAttribute("aria-label",person.id+" "+loc.label+": "+(present?"1":"0")+". Tryck för att ändra.");
        cell.addEventListener("click",()=>toggleVariant(profileIndex,i));
        matrixRow.append(cell);
      });
      matrix.append(matrixRow);
    });
  }
  function toggleVariant(profileIndex,locusIndex){
    changed();
    const target=profileIndex<dataset.cases.length?dataset.cases[profileIndex]:dataset.controls[profileIndex-dataset.cases.length];
    if(target.variants.includes(locusIndex))target.variants=target.variants.filter(i=>i!==locusIndex);
    else target.variants=[...target.variants,locusIndex].sort((a,b)=>a-b);
    run();
  }
  function showStats(){
    const panel=$("cohortGroverStats");panel.replaceChildren();
    const iters=result.rounds.flatMap(r=>r.lanes.map(l=>l.iterations));
    const metrics=[
      ["Indata",all().length+" fiktiva profiler × "+LOCI.length+" positioner"],
      ["Litet logiskt rum","4 bitar / 16 tillstånd"],
      ["Trattens bandbredd","16 → 4 → 1"],
      ["Lokala Grover-sökningar",String(iters.length)],
      ["Rotationspass",String(result.rotations)],
      ["Aktiva lokala förstärkningar",iters.filter(v=>v>0).length+"/"+iters.length],
      ["Kandidatdelmängder",String(result.evaluatedCount)],
      ["Godkända av hela gruppens regler",String(result.qualifiedCount)],
      ["Överordnad Grover: m",String(result.parentGrover.iterations)],
      ["Överordnad markerad massa",percent(result.parentGrover.markedMass)],
      ["Sammanbunden entropi",result.entropyBits.toFixed(3)+" bits"],
      ["Konvergens efter rotation",result.stable?"Ja":"Inte påvisad"]
    ];
    for(const [label,value] of metrics){
      const card=e("div","cohort-stat");
      card.append(e("small","",label),e("strong","",value));panel.append(card);
    }
  }
  function miniBars(values,cls){
    const el=e("div",cls),max=Math.max(1e-12,...values);
    values.forEach((p,i)=>{
      const bar=e("i","");bar.style.height=Math.max(3,100*p/max).toFixed(1)+"%";
      bar.title="Index "+i+": "+percent(p);el.append(bar);
    });
    return el;
  }
  function renderFunnel(){
    const local=$("funnelLaneGrid"),groups=$("funnelGroupGrid"),timeline=$("funnelTimeline");
    const dist=$("funnelDistribution"),notes=$("funnelDiagnostics");
    if(!local||!groups||!timeline||!dist||!notes)return;
    local.replaceChildren();groups.replaceChildren();timeline.replaceChildren();dist.replaceChildren();notes.replaceChildren();
    const pass=result.rounds[Math.min(selectedPass,result.rotations-1)];
    for(const [i,r] of result.rounds.entries()){
      const btn=e("button","funnel-pass-button","R"+(i+1));
      btn.type="button";btn.classList.toggle("is-selected",r.index===pass.index);
      btn.addEventListener("click",()=>{selectedPass=i;renderFunnel();});
      timeline.append(btn);
    }
    $("funnelPassDescription").textContent="Rotation "+pass.index+"/"+result.rotations+
      " · 16 separata fyrpositionsfördelningar · 4 grupper med 4 rum · 1 sammanbunden tiodimensionell fördelning. Entropi: "+
      pass.alignment.boundEntropyBits.toFixed(3)+" bits.";
    for(const lane of pass.lanes){
      const card=e("article","funnel-lane-card");
      card.append(e("strong","","L"+String(lane.index+1).padStart(2,"0")+" · "+lane.window.map(i=>LOCI[i].label).join(" / ")));
      card.append(miniBars(lane.likelihood,"funnel-lane-spark"));
      card.append(e("small","","16 tillstånd · M="+lane.marks+" · Grover m="+lane.iterations+" · massa "+percent(lane.markedMass)));
      local.append(card);
    }
    for(const g of pass.groups){
      const card=e("article","funnel-fold-card");
      card.append(e("strong","","F"+(g.index+1)+" · L"+g.memberIndices.map(i=>i+1).join(", L")));
      const vals=g.posterior.filter(p=>p>0).sort((a,b)=>b-a).slice(0,12);
      card.append(miniBars(vals,"funnel-fold-spark"));
      card.append(e("small","","Gemensam tiodimensionell fördelning · entropi "+g.entropyBits.toFixed(3)+" bits"));
      groups.append(card);
    }
    const top=result.ranked.slice(0,12);
    if(!top.length)dist.append(e("p","funnel-empty","Inget mönster uppfyller det slutliga oraklet. Tratten hittar inte på en markering."));
    for(const [i,item] of top.entries()){
      const btn=e("div","funnel-prob-row");
      btn.classList.toggle("is-selected",selectedState===item.state);
      btn.append(e("span","funnel-prob-name","#"+(i+1)+" · "+locusNames(item.loci)));
      const track=e("span","funnel-prob-track"),bar=e("i","");
      bar.style.width=Math.max(3,100*item.foldedProbability/(top[0].foldedProbability||1)).toFixed(1)+"%";
      track.append(bar);btn.append(track,e("b","",percent(item.foldedProbability)));
      // Visual probability bars only: candidate selection lives once, in the result panel.
      dist.append(btn);
    }
    const last=result.rounds.at(-1).alignment;
    const messages=[
      ["Bevarade sannolikheter","Alla 16 sannolikheter från varje fyrbitarsrum förs vidare, inte bara det högst rankade tillståndet."],
      ["Syntes mellan rotationer","4→1-sammanbindningen bevarar gruppernas fördelningar. Rotationspassen vägs lika utan att räknas flera gånger som oberoende evidens."],
      ["Konvergens","TVD "+(last.deltaTvd===null?"—":last.deltaTvd.toFixed(4))+
       " · top-k Jaccard "+(last.topkJaccard===null?"—":last.topkJaccard.toFixed(2))+
       " · "+(result.stable?"stabil":"inte stabil inom vald gräns")],
      ["Samstämmighet i samma data","Kandidaterna kontrolleras mot SAMMA syntetiska observationer som användes för sökningen. Det är ingen oberoende biologisk verifiering."],
      ["Informationsgräns","Korrelationer som sträcker sig över flera fyrpositionsfönster går inte alltid att återskapa efter sammanbindningen."]
    ];
    for(const [title,desc] of messages){const row=e("p","funnel-diagnostic");row.append(e("strong","",title+": "),e("span","",desc));notes.append(row);}
  }
  function renderAudit(){
    const target=$("cohortAudit");
    if(!target)return;
    target.replaceChildren();
    target.append(e("h4","","Separata känslighetskontroller för grupporaklet · syntetisk modell"));
    const usableLeaveOneOut=audit.leaveOneOut.filter(x=>!x.skipped);
    const leaveOneText=usableLeaveOneOut.length
      ?usableLeaveOneOut.filter(x=>x.retainsTop).length+"/"+usableLeaveOneOut.length+
          " körningar med ett fall uteslutet innehåller fortfarande referenskandidaten"
      :"Kan inte utföras: om ett fall utesluts återstår färre än två profiler.";
    const items=[
      ["8 % oberoende bitvändningar",audit.repeatability+"/5 körningar behåller samma topprankade mönster; "+audit.retained+"/5 har det kvar bland de godkända kandidaterna"],
      ["Uteslut ett fall i taget",leaveOneText],
      ["Ombytta gruppetiketter",audit.negativeControl.markedCount+" godkända mönster; ursprungsresultatet kvar: "+(audit.negativeControl.retainsTop?"ja":"nej")]
    ];
    for(const [key,value] of items){
      const row=e("div","cohort-audit-row");
      row.append(e("strong","",key),e("span","",value));target.append(row);
    }
    target.append(e("p","cohort-audit-caveat","Kontrollerna kör det fristående grupporaklet, inte hela den roterande tratten. Brusinställningen lägger till klassisk avläsningsosäkerhet, inte verkligt NISQ-brus från grindar eller dekoherens. Inget av detta bevisar brustålighet, avsaknad av snedvridning eller klinisk giltighet."));
  }
  function renderOutcome(){
    const headline=$("cohortOutcome"),detail=$("cohortOutcomeDetail"),alts=$("cohortAlternatives"),
      quality=$("cohortQuality"),evidence=$("cohortEvidence");
    alts.replaceChildren();
    if(!result.selected){
      headline.textContent="Inget samband uppfyller de valda villkoren.";
      detail.textContent="Ingen av kombinationerna klarade kontrollen mot hela exempelgruppen. Prova en annan startposition eller ändra exempeldata.";
      if($("cohortCandidatesPanel"))$("cohortCandidatesPanel").hidden=true;
      quality.dataset.status="unresolved";
      quality.textContent="Modellen har ingen giltig träff. Inga DNA-positioner markeras. Det säger inget om verkliga patienter.";
      if(evidence)evidence.textContent="Ingen kandidat uppfyllde reglerna i de påhittade observationerna. Detta är ett modellresultat, inte en slutsats om en verklig person.";
      selectedState=null;
      return;
    }
    if($("cohortCandidatesPanel"))$("cohortCandidatesPanel").hidden=result.ranked.length<=1;
    const item=result.ranked.find(x=>x.state===selectedState)||result.selected;
    selectedState=item.state;
    const count=result.leaders.length;
    headline.textContent=count===1
      ?"QCDS markerar ett ledande möjligt samband."
      :count+" möjliga samband ligger nära toppen – inget entydigt svar har fastställts.";
    const relation=result.settings.relation==="parity"?"en gemensam kombination av närvarande (1) och frånvarande (0) egenskaper":"varianter som förekommer tillsammans";
    detail.textContent="Markerade positioner: "+locusNames(item.loci)+". Sökningen gäller "+
      relation+". Mönstret uppfylls av "+item.caseCount+" av "+dataset.cases.length+" påhittade fall och "+
      item.controlCount+" av "+dataset.controls.length+" jämförelser. Detta är modellsamband, inte en cancerdiagnos.";
    quality.dataset.status=result.stable?"stable":"unstable";
    quality.textContent=(result.stable
      ?"Sannolikhetsmönstret uppfyllde modellens interna stabilitetsvillkor."
      :"Sannolikheterna har INTE stabiliserats inom det valda antalet pass.")+
      " "+result.rotations+" rotationer beräknades. Stabilitet är inte samma sak som biologisk sanning.";
    if(evidence){
      const nullCheck=D.permutationAudit({...readSettings(),selectedState:item.state});
      const pct=(100*nullCheck.familywiseFraction).toFixed(1)+"%";
      evidence.dataset.status=nullCheck.familywiseFraction>.05?"weak":"unvalidated";
      const groupDescription=dataset.cases.length+" fall och "+dataset.controls.length+" jämförelser";
      const samplingText=nullCheck.method==="exact"
        ?"Vi kontrollerade alla "+nullCheck.assignments+" möjliga sätt att omfördela "+groupDescription+"."
        :"Vi provade "+nullCheck.assignments+" reproducerbara slumpmässiga omfördelningar av "+groupDescription+
          "; detta är en UPPSKATTNING från ett urval gruppetiketter, inte en uttömmande genomgång.";
      const proportionText=nullCheck.method==="exact"
        ?nullCheck.tailAssignments+" av dessa omfördelningar ("+pct+")"
        :nullCheck.tailAssignments+" av de slumpmässiga omfördelningarna (korrigerad uppskattning "+pct+")";
      evidence.textContent="Hur starkt är stödet för gruppskillnaden? "+samplingText+" "+
        proportionText+" gav minst ett godkänt mönster med en minst lika stor gruppskillnad. "+
        "Vi undersökte "+nullCheck.validCandidates+" kandidatkombinationer. Kontrollen tar inte hänsyn till att sökregler kan ändras efter att resultaten setts, och är ingen medicinsk evidens.";
    }
    const allOptions=result.ranked.slice(0,16);
    for(const alt of allOptions){
      const b=e("button","cohort-alt",locusNames(alt.loci));b.type="button";
      b.setAttribute("aria-pressed",selectedState===alt.state?"true":"false");
      b.classList.toggle("is-selected",selectedState===alt.state);
      b.addEventListener("click",()=>{selectedState=alt.state;renderOutcome();renderGenomes();renderFunnel();notify();});
      alts.append(b);
    }
    const title=$("cohortAlternativeTitle");
    if(title)title.textContent="Visa andra möjliga DNA-samband ("+Math.min(result.ranked.length,16)+")";
  }
  function readSettings(){
    return {
      dataset,
      anchors:anchors.slice(),
      minCases:Number($("cohortMinCases").value),
      maxControls:Number($("cohortMaxControls").value),
      relation:$("cohortRelation").value,
      readoutNoise:Number($("funnelNoise").value)/100,
      maxPasses:Number($("funnelPasses").value),
      minSize:2,
      maxSize:4
    };
  }
  function run(){
    try{
      result=F.run(readSettings());
      selectedPass=result.rotations-1;
      selectedState=result.selected?.state??null;
      audit=D.stabilityAudit(D.evaluate(readSettings()));
      $("cohortError").textContent="";
      renderSelectors();showStats();renderOutcome();renderGenomes();renderFunnel();renderAudit();
      notify();
    }catch(error){$("cohortError").textContent=error.message;}
  }
  // The cohort is a user-chosen research input, never a fixed property av QCDS.
  // Refresh available counts, preserving each old threshold as a fraction
  // av its prior group size if the sample size changes.
  function populateThresholds(previousCases,previousControls){
    const cases=dataset.cases.length,controls=dataset.controls.length;
    for(const [id,n,oldN,minMode] of [
      ["cohortMinCases",cases,previousCases,true],
      ["cohortMaxControls",controls,previousControls,false]
    ]){
      const el=$(id);
      const old=Number(el.value);
      const fraction=Number.isFinite(old)&&oldN>0?old/oldN:(minMode?.6:.2);
      const chosen=minMode?Math.min(n,Math.max(1,Math.ceil(fraction*n-.000001))):
        Math.max(0,Math.min(n,Math.floor(fraction*n+.000001)));
      el.replaceChildren();
      for(let i=minMode?1:0;i<=n;i++){
        const option=e("option","",(minMode?"Minst ":"Högst ")+i+" / "+n);
        option.value=String(i);
        el.append(option);
      }
      el.value=String(chosen);
    }
    if($("cohortStatsPeople"))$("cohortStatsPeople").textContent=cases+" + "+controls;
    if($("cohortStatsPeopleLabel"))
      $("cohortStatsPeopleLabel").textContent="fiktiva fall + fiktiva jämförelser · ändringsbart exempel";
    if($("cohortHeaderCount"))$("cohortHeaderCount").textContent=cases+" fall + "+controls+" jämförelser";
  }
  function regenerate(delta=0){
    const seedInput=$("cohortDataSeed");
    const seed=Number(seedInput.value)+delta;
    const mode=$("cohortDataMode").value;
    const caseCount=Number($("cohortCaseCount").value),controlCount=Number($("cohortControlCount").value);
    if(!Number.isInteger(caseCount)||!Number.isInteger(controlCount)||
       caseCount<2||controlCount<2||caseCount>30||controlCount>30)
      throw Error("Välj mellan 2 och 30 påhittade profiler per grupp i detta webbläsarexempel.");
    const previousCases=dataset.cases.length,previousControls=dataset.controls.length;
    const next=D.generateProfiles(seed,mode,caseCount,controlCount);
    changed();
    dataset=next;
    populateThresholds(previousCases,previousControls);
    seedInput.value=String(seed);
    anchors=[];
    selectedState=null;
    run();
  }
  // Load only declarative input conditions. Every result is recalculated by
  // the SAME production genome funnel; no answer mask is part av a preset.
  function loadExample(config){
    if(!config||!["structure","null"].includes(config.mode))throw Error("Okänt handledningsexempel.");
    const {seed,mode,caseCount,controlCount}=config;
    const c=Number(caseCount),k=Number(controlCount);
    if(!Number.isInteger(c)||!Number.isInteger(k)||c<2||k<2||c>30||k>30)
      throw Error("De guidade exemplen stöder 2–30 syntetiska profiler per grupp.");
    const generated=D.generateProfiles(Number(seed),mode,c,k);
    const minCases=Number(config.minCases),maxControls=Number(config.maxControls);
    if(!Number.isInteger(minCases)||minCases<1||minCases>c||
       !Number.isInteger(maxControls)||maxControls<0||maxControls>k)
       throw Error("Exemplets tröskelvärden stämmer inte med gruppstorleken.");
    const relation=config.relation||"cooccurrence";
    if(!["cooccurrence","parity"].includes(relation))throw Error("Okänt sambandsorakel i exemplet.");
    const chosen=config.anchors||[];
    if(!Array.isArray(chosen)||chosen.length>3||new Set(chosen).size!==chosen.length||
       chosen.some(n=>!Number.isInteger(n)||n<0||n>=10))
       throw Error("Exemplet innehåller ogiltiga startpositioner.");
    const passes=Number(config.maxPasses||6);
    if(![3,6,9,12].includes(passes))throw Error("Ogiltigt antal rotationer i exemplet.");
    const readoutNoise=Number(config.readoutNoise||0);
    if(![0,.08,.15,.25].includes(readoutNoise))throw Error("Ogiltig brusinställning i exemplet.");
    const formerCases=dataset.cases.length,formerControls=dataset.controls.length;
    dataset=generated;
    anchors=chosen.slice();
    $("cohortCaseCount").value=String(c);
    $("cohortControlCount").value=String(k);
    $("cohortDataSeed").value=String(seed);
    $("cohortDataMode").value=mode;
    $("cohortRelation").value=relation;
    $("funnelPasses").value=String(passes);
    $("funnelNoise").value=String(Math.round(readoutNoise*100));
    populateThresholds(formerCases,formerControls);
    $("cohortMinCases").value=String(minCases);
    $("cohortMaxControls").value=String(maxControls);
    exampleId=config.id||null;
    exampleChanged=false;
    selectedState=null;
    run();
    if(!result)throw Error("Guided example failed to compute.");
    return getSnapshot();
  }
  function initialize(){
    if(typeof document==="undefined"||!$("cohortCombinatorial"))return;
    $("cohortRun").addEventListener("click",()=>{
      run();
      const conclusion=$("cohortResultTitle");
      if(conclusion && typeof conclusion.scrollIntoView==="function")conclusion.scrollIntoView({behavior:"smooth",block:"start"});
    });
    populateThresholds(dataset.cases.length,dataset.controls.length);
    $("cohortCaseCount").addEventListener("change",()=>{try{regenerate(0)}catch(e){$("cohortError").textContent=e.message;}});
    $("cohortControlCount").addEventListener("change",()=>{try{regenerate(0)}catch(e){$("cohortError").textContent=e.message;}});
    $("cohortMinCases").addEventListener("change",()=>{changed();run();});
    $("cohortMaxControls").addEventListener("change",()=>{changed();run();});
    $("cohortRelation").addEventListener("change",()=>{changed();run();});
    $("funnelNoise").addEventListener("change",()=>{changed();run();});
    $("funnelPasses").addEventListener("change",()=>{changed();run();});
    $("cohortRebuild").addEventListener("click",()=>{try{regenerate(0)}catch(e){$("cohortError").textContent=e.message;}});
    $("cohortNextDataset").addEventListener("click",()=>{try{regenerate(1)}catch(e){$("cohortError").textContent=e.message;}});
    $("cohortClearAnchors").addEventListener("click",()=>{changed();anchors=[];run();});
    if(typeof document.querySelectorAll==="function"){
      for(const link of document.querySelectorAll('a[href="#workbench"], a[data-open-details="funnelDeepDive"]')){
        link.addEventListener("click",()=>{
          const id=link.getAttribute("href")==="#workbench"?"legacyWorkbenchDetails":"funnelDeepDive";
          const advanced=$(id);
          if(advanced)advanced.open=true;
        });
      }
    }
    run();
  }
  return {LOCI,N,generateProfiles:D.generateProfiles,evaluateOracle:D.evaluate,initialize,
    loadExample,getSnapshot,subscribe};
});