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
  // Present all computed probabilities, without changing any oracle result.
  // Equal-rank bins summarize the complete positive-support distribution, rather
  // than rendering only its twelve highest (possibly tied) states.
  function rankedDistributionBins(probabilities,count=15){
    const ranked=probabilities.filter(p=>p>0).slice().sort((a,b)=>b-a);
    if(!ranked.length)return [];
    const n=Math.min(count,ranked.length),bins=[];
    for(let i=0;i<n;i++){
      const start=Math.floor(i*ranked.length/n),end=Math.floor((i+1)*ranked.length/n);
      const group=ranked.slice(start,end);
      bins.push({start:start+1,end,count:group.length,
        mean:group.reduce((a,b)=>a+b,0)/group.length,
        mass:group.reduce((a,b)=>a+b,0),
        max:group[0],min:group.at(-1)});
    }
    return bins;
  }
  function miniBars(values,cls,scale=1,tooltips=[]){
    const el=e("div",cls);
    el.setAttribute("role","img");
    el.setAttribute("aria-label",cls==="funnel-fold-spark"?
      "Medelsannolikhet för hela den rangordnade fördelningen i likstora grupper; samma skala i alla fyra diagram":
      "Sannolikheten för alla sexton lokala tillstånd på en skala från noll till hundra procent");
    values.forEach((p,i)=>{
      const bar=e("i","");
      // Fixed, explicit y-axis: never rescale a flat 6.25% lane or each folded group to 100%.
      bar.style.height=Math.max(0,Math.min(100,100*p/scale)).toFixed(2)+"%";
      bar.title=tooltips[i]||"Tillstånd "+i+": "+percent(p);
      el.append(bar);
    });
    return el;
  }
  // The scientifically important readout comes FIRST; never hide the
  // Parent-Grover marked mass underneath a list of pre-Grover candidates.
  // The pre-fusion and Parent-Grover figures have different normalizations.
  // Main result must be readable before any of the optional technical charts.
  // Two numbers refer to DIFFERENT distributions, and the second is the
  // combined marked mass (not the probability that an association is true).
  function renderGroverHeadline(){
    const panel=$("funnelHeadlineSummary");
    if(!panel||!result)return;
    panel.replaceChildren();
    const pct=p=>(100*p).toLocaleString("sv-SE",
      {minimumFractionDigits:2,maximumFractionDigits:2})+" %";
    panel.append(e("span","funnel-main-kicker","RESULTATET I KORTHET"));
    if(!result.selected){
      panel.append(e("h3","funnel-main-title","Ingen kombination uppfyllde villkoren"));
      panel.append(e("p","funnel-main-desc",
        "Alla "+result.evaluatedCount+" möjliga kombinationer kontrollerades mot de påhittade profilerna. "+
        "Ingen uppfyllde de valda reglerna, så Grover har ingen utvald kandidat att förstärka."));
      panel.append(e("p","funnel-main-meaning",
        "Det betyder inte att sådana samband saknas i verkliga patientdata."));
      return;
    }
    const count=result.leaders.length;
    const before=result.selected.foldedProbability;
    const after=result.parentGrover.markedMass;
    const single=count===1;
    panel.append(e("h3","funnel-main-title",
      single?"Grover förstärkte den utvalda kandidaten":
             "Grover förstärkte "+count+" utvalda kandidater"));
    panel.append(e("p","funnel-main-intro",
      "Här visas två beräknade mått som kommer från olika delar av QCDS-modellen. "+
      "De är inte direkt jämförbara."));
    const measures=e("div","funnel-main-measures");
    const makeMeasure=(n,label,value,description,variant)=>{
      const card=e("div","funnel-main-measure "+variant);
      card.append(e("p","funnel-main-measure-label",n+" · "+label));
      card.append(e("p","funnel-main-value",pct(value)));
      card.append(e("p","funnel-main-explain",description));
      return card;
    };
    measures.append(
      makeMeasure("01","Efter rotationstratten",before,
        "Den ledande kandidatens andel efter "+result.rotations+
        " rotationer, i en fördelning över "+result.domainCount+" tillstånd.","is-before"),
      makeMeasure("02","Efter överordnad Grover",after,
        "Sammanlagd sannolikhetsmassa för "+count+
        (single?" markerad kandidat":" markerade kandidater")+
        " efter "+result.parentGrover.iterations+" Grover-iterationer i en "+
        "annan fördelning över "+result.parentGrover.stateCount+" tillstånd.","is-after")
    );
    panel.append(measures);
    const meaning=e("div","funnel-main-interpretation");
    meaning.append(e("strong","","Vad visar resultatet?"));
    meaning.append(e("p","",
      "Grover förstärker tillstånd som oraklet har markerat. "+
      "Det innebär inte "+pct(after)+" säkerhet om ett DNA-samband eller cancer."));
    meaning.append(e("p","funnel-main-evidence",
      "Klassisk kontroll: "+result.qualifiedCount+" av "+result.evaluatedCount+
      " syntetiska kombinationer uppfyllde villkoren. "+
      "Av dem valdes "+count+" till överordnad Grover. "+
      "Kontrollen använder samma data och är inte oberoende biologisk validering."));
    panel.append(meaning);
    const more=e("details","funnel-main-method");
    more.append(e("summary","","Varför går det inte att jämföra procenttalen direkt?"));
    more.append(e("p","",
      "Det första värdet är en kandidats andel efter sammanvägning av flera rotationsfördelningar. "+
      "Det andra är total sannolikhetsmassa för den markerade kandidatgruppen i en "+
      "ny idealiserad Grover-simulering. Den nya sökningen använder ett annat "+
      "tillståndsrum och en ny fördelning. Siffrorna utgör därför inte en "+
      "före–efter-mätning av samma sannolikhet."));
    more.append(e("p","",
      "Resultatet är en klassisk simulering av idealiserad Grover, inte ett "+
      "uppmätt kvantresultat eller ett medicinskt fynd."));
    panel.append(more);
  }
  function renderFunnel(){
    const local=$("funnelLaneGrid"),groups=$("funnelGroupGrid"),timeline=$("funnelTimeline");
    const dist=$("funnelDistribution"),notes=$("funnelDiagnostics"),bridge=$("funnelReconciliation");
    if(!local||!groups||!timeline||!dist||!notes||!bridge)return;
    renderGroverHeadline();
    local.replaceChildren();groups.replaceChildren();timeline.replaceChildren();
    dist.replaceChildren();notes.replaceChildren();bridge.replaceChildren();
    const pass=result.rounds[Math.min(selectedPass,result.rotations-1)];
    const referenceState=selectedState!==null?selectedState:result.selected?.state;
    const reference=referenceState===null||referenceState===undefined?
      null:result.ranked.find(x=>x.state===referenceState)||null;
    const swedishPercentage=p=>(100*p).toLocaleString("sv-SE",
      {minimumFractionDigits:2,maximumFractionDigits:2})+" %";
    const rankOf=(distribution,state)=>1+distribution.filter(p=>p>distribution[state]+1e-14).length;
    for(const [i,r] of result.rounds.entries()){
      const btn=e("button","funnel-pass-button","R"+(i+1));
      btn.type="button";btn.classList.toggle("is-selected",r.index===pass.index);
      btn.addEventListener("click",()=>{selectedPass=i;renderFunnel();});
      timeline.append(btn);
    }
    $("funnelPassDescription").textContent="DU TITTAR PÅ ROTATION R"+pass.index+" AV "+result.rotations+
      ". F1–F4 nedan gäller bara denna rotation – slutresultatet väger samman alla "+result.rotations+
      ". 16 lokala rum · 4 grupper · entropi efter sammanbindning i vald rotation: "+
      pass.alignment.boundEntropyBits.toFixed(3)+" bitar.";
    const markedLanes=pass.lanes.filter(l=>l.marks>0).length;
    local.append(e("p","funnel-reading-note",markedLanes+" av 16 lokala rum har minst en orakelträff. "+
      (markedLanes===0?"Inget rum kan förstärka något i denna rotation.":
       "Övriga rum lämnar bara en jämn grundfördelning och ger ingen egen urvalssignal.")));
    for(const lane of pass.lanes){
      const card=e("article","funnel-lane-card");
      card.append(e("strong","","Rum "+String(lane.index+1).padStart(2,"0")+" · positioner "+lane.window.map(i=>LOCI[i].label).join(" / ")));
      if(lane.marks===0){
        card.classList.add("funnel-lane-neutral");
        card.append(e("div","funnel-lane-nohit","Ingen lokal träff · 16 lika sannolika tillstånd (6,25 % var)"));
      }else{
        card.classList.add("funnel-lane-active");
        card.append(miniBars(lane.likelihood,"funnel-lane-spark",1,
          lane.likelihood.map((p,i)=>"Tillstånd "+i+": "+percent(p)+" av alla 16 tillstånd")));
      }
      card.append(e("small","",lane.marks===0?
        "M=0 · Grover m=0 · ingen förstärkning":
        "M="+lane.marks+" · Grover m="+lane.iterations+" · markerad massa "+percent(lane.markedMass)+
        " · staplarnas skala 0–100 %"));
      local.append(card);
    }
    // Show ALL candidate probabilities: equally sized bins by probability rank.
    // A shared vertical axis allows F1–F4 to be compared meaningfully.
    const bins=pass.groups.map(g=>rankedDistributionBins(g.posterior));
    const sharedScale=Math.max(1e-12,...bins.flatMap(group=>group.map(b=>b.mean)));
    const binSizes=bins[0].map(b=>b.count);
    const sizeLabel=Math.min(...binSizes)===Math.max(...binSizes)?
      binSizes[0]+" kandidater per grupp":
      Math.min(...binSizes)+"–"+Math.max(...binSizes)+" kandidater per grupp";
    groups.append(e("p","funnel-reading-note",
      "Alla "+binSizes.reduce((a,b)=>a+b,0)+" kandidater visas i "+bins[0].length+
      " ranggrupper ("+sizeLabel+"). Samma skala i alla fyra diagram: 0–"+
      percent(sharedScale)+" per kandidat, från högst till lägst."));
    for(const [j,g] of pass.groups.entries()){
      const card=e("article","funnel-fold-card");
      card.append(e("strong","","F"+(g.index+1)+" · rum "+
        g.memberIndices.map(i=>String(i+1).padStart(2,"0")).join(", ")));
      const groupBins=bins[j];
      card.append(miniBars(groupBins.map(b=>b.mean),"funnel-fold-spark",sharedScale,
        groupBins.map(b=>"Rang "+b.start+"–"+b.end+": medel "+percent(b.mean)+
          " per kandidat; tillsammans "+percent(b.mass))));
      const topProbability=Math.max(...g.posterior);
      const spread=Math.round(2**g.entropyBits);
      card.append(e("small","","Entropi "+g.entropyBits.toFixed(3)+" bitar · motsvarar ungefär "+
        spread+" jämnt fördelade kandidater · högsta enskilda "+percent(topProbability)));
      if(reference){
        const probability=g.posterior[reference.state];
        card.append(e("small","funnel-reference-score","Vald slutkandidat i F"+(g.index+1)+
          " (endast R"+pass.index+"): "+swedishPercentage(probability)+
          " · rang "+rankOf(g.posterior,reference.state)+" av "+result.domainCount));
      }
      groups.append(card);
    }
    // A visible, reproducible bridge between the selected R-pass charts and
    // the multi-pass final distribution. Numerical inputs come ONLY from the
    // production funnel result; no separately inferred/adjusted values.
    if(reference){
      const overview=e("div","funnel-reconciliation-overview");
      overview.append(
        e("span","funnel-bridge-tag","SÅ HÄNGER ROTATIONERNA IHOP"),
        e("strong","","Kandidat: "+locusNames(reference.loci)));
      const currentProbability=pass.bound[reference.state];
      overview.append(e("p","",
        "F1–F4 ovan är bara R"+pass.index+". Efter deras 4→1-sammanbindning får kandidaten "+
        swedishPercentage(currentProbability)+" i denna rotation (rang "+
        rankOf(pass.bound,reference.state)+" av "+result.domainCount+")."));
      overview.append(e("p","",
        "Nedan visas samma kandidats modellandel efter varje rotations egna fyra grupper. "+
        "Det är INTE sex oberoende patientprov eller sex biologiska bevis."));
      bridge.append(overview);
      const values=result.rounds.map(r=>r.bound[reference.state]);
      const max=Math.max(1e-14,...values);
      const rotationGrid=e("div","funnel-rotation-bridge");
      for(const [i,r] of result.rounds.entries()){
        const row=e("div","funnel-rotation-score");
        row.classList.toggle("is-current",r.index===pass.index);
        row.append(e("strong","","R"+r.index));
        const rail=e("span","funnel-rotation-rail");
        const bar=e("i","");
        bar.style.width=(100*values[i]/max).toFixed(2)+"%";
        rail.append(bar);
        rail.setAttribute("role","img");
        rail.setAttribute("aria-label","Rotation "+r.index+": "+swedishPercentage(values[i])+
          ". Diagrammets gemensamma skala är noll till "+swedishPercentage(max));
        row.append(rail,e("b","",swedishPercentage(values[i])));
        rotationGrid.append(row);
      }
      bridge.append(rotationGrid);
      bridge.append(e("p","funnel-bridge-scale",
        "Rotationsstaplarna jämförs med samma axel: 0–"+swedishPercentage(max)+
        ". Procenttalen är absoluta andelar av respektive rotations fulla fördelning."));
      const conclusion=e("div","funnel-rotation-final");
      conclusion.append(e("strong","","Efter "+result.rotations+
        " rotationer: "+swedishPercentage(result.distribution[reference.state])));
      conclusion.append(e("p","",
        "Slutvärdet beräknas som ett NORMALISERAT GEOMETRISKT MEDEL av de "+
        result.rotations+" HELA rotationsfördelningarna, inte som medelvärdet av kandidatens sex procenttal. "+
        "Alla "+result.domainCount+" möjliga tillstånd normaliseras gemensamt. "+
        "Först därefter filtreras kandidaterna genom det klassiska grupporaklet "+
        "("+result.qualifiedCount+" godkända av "+result.evaluatedCount+")."));
      bridge.append(conclusion);
    }else{
      bridge.append(e("p","funnel-reading-note",
        "Det finns ingen kandidat som uppfyller grupporaklet. De "+result.rotations+
        " rotationerna sammanbinds matematiskt, men den klassiska kontrollen "+
        "ger ingen giltig slutkandidat."));
    }
    const top=result.ranked.slice(0,12);
    dist.append(e("p","funnel-reading-note",
      "FÖRE överordnad Grover: sannolikheten är kandidatens andel av hela fördelningen över "+
      result.domainCount+" tillåtna tillstånd. Stapeln har en absolut skala 0–100 %."+
      " Kandidaterna godkänns genom klassisk kontroll av samtliga "+
      result.evaluatedCount+" kombinationer mot samma syntetiska data; tratten rangordnar sedan dem."));
    if(!top.length)dist.append(e("p","funnel-empty","Inget mönster uppfyller det slutliga oraklet. Tratten hittar inte på en markering."));
    for(const [i,item] of top.entries()){
      const btn=e("div","funnel-prob-row");
      btn.classList.toggle("is-selected",selectedState===item.state);
      btn.append(e("span","funnel-prob-name","#"+(i+1)+" · "+locusNames(item.loci)));
      const track=e("span","funnel-prob-track"),bar=e("i","");
      bar.style.width=(100*item.foldedProbability).toFixed(4)+"%";
      track.setAttribute("role","img");
      track.setAttribute("aria-label","Absolut sannolikhet "+percent(item.foldedProbability)+" av hela den sammanbundna fördelningen");
      track.append(bar);btn.append(track,e("b","",percent(item.foldedProbability)));
      // A visually short bar is intended: this is NOT a normalized top-rank bar.
      dist.append(btn);
    }
    // The Parent-Grover mass is explained PROMINENTLY above the entire diagram,
    // not buried as a parenthetical footnote after the candidate list.
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
  return {LOCI,N,rankedDistributionBins,generateProfiles:D.generateProfiles,evaluateOracle:D.evaluate,initialize,
    loadExample,getSnapshot,subscribe};
});