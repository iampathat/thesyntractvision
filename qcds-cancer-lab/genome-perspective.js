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
  if(!D||!F)throw Error("Cancer Genome Discovery and rotating QCDS funnel are required.");
  const LOCI=D.LOCI,N=D.N;
  let dataset=D.generateProfiles(173,"structure");
  let anchors=[];
  let result=null,audit=null,selectedState=null,selectedPass=0;
  const $=id=>document.getElementById(id);
  function e(tag,cls,value){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(value!==undefined)node.textContent=String(value);
    return node;
  }
  function locusNames(indices){
    return indices.map(i=>LOCI[i].label+" (chr"+LOCI[i].chr+")").join(" · ");
  }
  function all(){return [...dataset.cases,...dataset.controls];}
  function percent(p){return (100*p).toFixed(2)+"%";}
  function toggleAnchor(i){
    if(anchors.includes(i))anchors=anchors.filter(x=>x!==i);
    else if(anchors.length<3)anchors=[...anchors,i].sort((a,b)=>a-b);
    else{$("cohortError").textContent="Max three anchors. Remove one or clear the Condition.";return;}
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
      btn.setAttribute("aria-label","Anchor locus "+loc.label+" chromosome "+loc.chr);
      btn.append(e("strong","",loc.label),e("small","","chr"+loc.chr));
      btn.addEventListener("click",()=>toggleAnchor(i));
      panel.append(btn);
    });
    $("cohortAnchors").textContent=anchors.length
      ?"Starting here: "+locusNames(anchors)+". Other possible parts remain open."
      :"Nothing selected: QCDS is free to look across all ten example positions.";
  }
  function renderGenomes(){
    const holder=$("cohortGenomeTracks"),matrix=$("cohortDataMatrix");
    holder.replaceChildren();matrix.replaceChildren();
    const header=e("div","cohort-matrix-header");
    header.append(e("span","","Profile"));
    LOCI.forEach((loc,i)=>{
      const b=e("button","cohort-matrix-name",loc.label);
      b.type="button";b.title="Set "+loc.label+" as a starting anchor";
      b.classList.toggle("is-anchor",anchors.includes(i));
      b.addEventListener("click",()=>toggleAnchor(i));header.append(b);
    });
    matrix.append(header);
    all().forEach((person,profileIndex)=>{
      const row=e("div","cohort-genome-row");
      row.classList.add(person.group==="cases"?"cohort-case":"cohort-control");
      row.append(e("span","cohort-person",person.id));
      const track=e("div","cohort-genome-track");
      track.setAttribute("aria-label",person.id+" synthetic genome locus axis");
      LOCI.forEach((loc,i)=>{
        const present=person.variants.includes(i);
        const hit=selectedState!==null&&(selectedState&(1<<i))!==0;
        const circle=e("button","cohort-site");
        circle.type="button";circle.style.left=(100*loc.position).toFixed(1)+"%";
        circle.classList.toggle("has-variant",present);
        circle.classList.toggle("is-anchor",anchors.includes(i));
        circle.classList.toggle("is-hit",hit&&present&&person.group==="cases");
        circle.classList.toggle("is-control-hit",hit&&present&&person.group==="controls");
        circle.classList.toggle("is-pattern-missing",hit&&!present&&result?.relation==="parity"&&D.satisfies(selectedState,person,"parity"));
        circle.title=person.id+" · "+loc.label+": "+(present?"variant present":"variant absent")+". Click to toggle observation.";
        circle.setAttribute("aria-label",circle.title);
        circle.addEventListener("click",()=>toggleVariant(profileIndex,i));
        track.append(circle);
      });
      row.append(track,e("span","cohort-genome-count",person.group==="cases"?"case":"control"));
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
        cell.classList.toggle("is-highlight",present&&person.group==="cases"&&selectedState!==null&&(selectedState&(1<<i))!==0);
        cell.classList.toggle("is-pattern-missing",!present&&selectedState!==null&&(selectedState&(1<<i))!==0&&result?.relation==="parity"&&D.satisfies(selectedState,person,"parity"));
        cell.title="Toggle synthetic observation "+person.id+" / "+loc.label;
        cell.setAttribute("aria-label",person.id+" "+loc.label+": "+(present?"1":"0")+". Toggle.");
        cell.addEventListener("click",()=>toggleVariant(profileIndex,i));
        matrixRow.append(cell);
      });
      matrix.append(matrixRow);
    });
  }
  function toggleVariant(profileIndex,locusIndex){
    const target=profileIndex<dataset.cases.length?dataset.cases[profileIndex]:dataset.controls[profileIndex-dataset.cases.length];
    if(target.variants.includes(locusIndex))target.variants=target.variants.filter(i=>i!==locusIndex);
    else target.variants=[...target.variants,locusIndex].sort((a,b)=>a-b);
    run();
  }
  function showStats(){
    const panel=$("cohortGroverStats");panel.replaceChildren();
    const iters=result.rounds.flatMap(r=>r.lanes.map(l=>l.iterations));
    const metrics=[
      ["Input","10 profiles × 10 loci"],
      ["Small logical room","4 bits / 16 states"],
      ["Funnel bandwidth","16 → 4 → 1"],
      ["Local Grover searches",String(iters.length)],
      ["Rotation passes",String(result.rotations)],
      ["Active local amplifications",iters.filter(v=>v>0).length+"/"+iters.length],
      ["Candidate subsets",String(result.evaluatedCount)],
      ["Independently verified",String(result.qualifiedCount)],
      ["Parent Grover m",String(result.parentGrover.iterations)],
      ["Parent marked mass",percent(result.parentGrover.markedMass)],
      ["Composite entropy",result.entropyBits.toFixed(3)+" bits"],
      ["Rotational convergence",result.stable?"Yes":"Not demonstrated"]
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
      " · 16 independent four-locus probability distributions · 4 groups of 4 · 1 bound 10D distribution. Entropy "+
      pass.alignment.boundEntropyBits.toFixed(3)+" bits.";
    for(const lane of pass.lanes){
      const card=e("article","funnel-lane-card");
      card.append(e("strong","","L"+String(lane.index+1).padStart(2,"0")+" · "+lane.window.map(i=>LOCI[i].label).join(" / ")));
      card.append(miniBars(lane.likelihood,"funnel-lane-spark"));
      card.append(e("small","","16 states · M="+lane.marks+" · Grover m="+lane.iterations+" · mass "+percent(lane.markedMass)));
      local.append(card);
    }
    for(const g of pass.groups){
      const card=e("article","funnel-fold-card");
      card.append(e("strong","","F"+(g.index+1)+" · L"+g.memberIndices.map(i=>i+1).join(", L")));
      const vals=g.posterior.filter(p=>p>0).sort((a,b)=>b-a).slice(0,12);
      card.append(miniBars(vals,"funnel-fold-spark"));
      card.append(e("small","","Joint 10D distribution · entropy "+g.entropyBits.toFixed(3)+" bits"));
      groups.append(card);
    }
    const top=result.ranked.slice(0,12);
    if(!top.length)dist.append(e("p","funnel-empty","The final oracle confirms no valid pattern. The folder does not invent a highlight."));
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
      ["Probability retention","All 16 probabilities from each four-bit Grover room pass into its fold, not just the winning index."],
      ["Rotation synthesis","The 4→1 bind retains each group's probability distribution; rotation passes are equally pooled without double-counting them as independent evidence."],
      ["Convergence","TVD "+(last.deltaTvd===null?"—":last.deltaTvd.toFixed(4))+
       " · top-k Jaccard "+(last.topkJaccard===null?"—":last.topkJaccard.toFixed(2))+
       " · "+(result.stable?"stable":"not stable under pass cap")],
      ["Independent truth gate","Candidate highlights are checked against all case/control observations and the exact specified Condition."],
      ["Information bound","Correlations spanning more than one four-locus projection need not be recoverable after folding."]
    ];
    for(const [title,desc] of messages){const row=e("p","funnel-diagnostic");row.append(e("strong","",title+": "),e("span","",desc));notes.append(row);}
  }
  function renderAudit(){
    const target=$("cohortAudit");
    if(!target)return;
    target.replaceChildren();
    target.append(e("h4","","Independent cohort-oracle sensitivity · synthetic model"));
    const items=[
      ["8% independent bit flips",audit.repeatability+"/5 runs retain the same first-ranked pattern; "+audit.retained+"/5 still include it among eligible candidates"],
      ["Leave-one-case-out",audit.leaveOneOut.filter(x=>x.retainsTop).length+"/"+audit.leaveOneOut.length+" trials retain the original pattern"],
      ["Reversed cohort labels",audit.negativeControl.markedCount+" eligible patterns; original result retained: "+(audit.negativeControl.retainsTop?"yes":"no")]
    ];
    for(const [key,value] of items){
      const row=e("div","cohort-audit-row");
      row.append(e("strong","",key),e("span","",value));target.append(row);
    }
    target.append(e("p","cohort-audit-caveat","These checks rerun the standalone cohort oracle, not the complete rotating funnel. The noise selector above adds classical readout uncertainty, not real NISQ gate/decoherence noise. Neither proves NISQ robustness, freedom from bias or clinical validity."));
  }
  function renderOutcome(){
    const headline=$("cohortOutcome"),detail=$("cohortOutcomeDetail"),alts=$("cohortAlternatives"),
      quality=$("cohortQuality");
    alts.replaceChildren();
    if(!result.selected){
      headline.textContent="No matching connection found with these settings.";
      detail.textContent="None of the possible combinations passed the complete sample check. You can try a different starting point or change the example data.";
      quality.dataset.status="unresolved";
      quality.textContent="The model has no valid match. No DNA positions are highlighted; this does not rule anything out for real patients.";
      selectedState=null;
      return;
    }
    const item=result.ranked.find(x=>x.state===selectedState)||result.selected;
    selectedState=item.state;
    const count=result.leaders.length;
    headline.textContent=count===1
      ?"QCDS highlights one leading possible connection."
      :count+" possible connections remain near the top — there is no single answer.";
    const relation=result.settings.relation==="parity"?"a shared combination of present (1) and absent (0) features":"variants that occur together";
    detail.textContent="Highlighted positions: "+locusNames(item.loci)+". This is a search for "+
      relation+". It fits "+item.caseCount+" of the 5 invented cancer examples and "+
      item.controlCount+" of the 5 comparisons. The positions are linked by the model rules, not by a known cancer diagnosis.";
    quality.dataset.status=result.stable?"stable":"unstable";
    quality.textContent=(result.stable
      ?"The probability pattern met the model's internal stability checks."
      :"The rotating probabilities have NOT fully stabilized in the selected number of passes.")+
      " "+result.rotations+" rotations were calculated. This is not a medically validated discovery.";
    const allOptions=result.ranked.slice(0,16);
    for(const alt of allOptions){
      const b=e("button","cohort-alt",locusNames(alt.loci));b.type="button";
      b.setAttribute("aria-pressed",selectedState===alt.state?"true":"false");
      b.classList.toggle("is-selected",selectedState===alt.state);
      b.addEventListener("click",()=>{selectedState=alt.state;renderOutcome();renderGenomes();renderFunnel();});
      alts.append(b);
    }
    const title=$("cohortAlternativeTitle");
    if(title)title.textContent=result.ranked.length===1?"The model's selected candidate":"Compare other matching connections";
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
    }catch(error){$("cohortError").textContent=error.message;}
  }
  function regenerate(delta=0){
    const seedInput=$("cohortDataSeed");
    const seed=Number(seedInput.value)+delta;
    const mode=$("cohortDataMode").value;
    dataset=D.generateProfiles(seed,mode);
    seedInput.value=String(seed);
    anchors=[];
    selectedState=null;
    run();
  }
  function initialize(){
    if(typeof document==="undefined"||!$("cohortCombinatorial"))return;
    $("cohortRun").addEventListener("click",()=>{
      run();
      const conclusion=$("cohortResultTitle");
      if(conclusion && typeof conclusion.scrollIntoView==="function")conclusion.scrollIntoView({behavior:"smooth",block:"start"});
    });
    $("cohortMinCases").addEventListener("change",run);
    $("cohortMaxControls").addEventListener("change",run);
    $("cohortRelation").addEventListener("change",run);
    $("funnelNoise").addEventListener("change",run);
    $("funnelPasses").addEventListener("change",run);
    $("cohortRebuild").addEventListener("click",()=>{try{regenerate(0)}catch(e){$("cohortError").textContent=e.message;}});
    $("cohortNextDataset").addEventListener("click",()=>{try{regenerate(1)}catch(e){$("cohortError").textContent=e.message;}});
    $("cohortClearAnchors").addEventListener("click",()=>{anchors=[];run();});
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
  return {LOCI,N,generateProfiles:D.generateProfiles,evaluateOracle:D.evaluate,initialize};
});