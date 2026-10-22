/* Multi-person distributed-locus QCDS research demonstrator UI.
 * This is not sequence matching. Computational results come from the
 * reproducible 10D cohort oracle, ideal Grover and perturbation checks.
 * © 2026 Patrik Sundblom · OpenAI / ChatGPT R&D support.
 */
(function(root,factory){
  const api=factory(root.CancerGenomeDiscovery);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.CancerGenomePerspective=api;
  if(typeof document!=="undefined")api.initialize();
})(typeof globalThis!=="undefined"?globalThis:this,function(D){
  "use strict";
  if(!D)throw Error("CancerGenomeDiscovery must load first.");
  const LOCI=D.LOCI,N=D.N;
  let dataset=D.generateProfiles(173,"structure");
  let anchors=[];
  let result=null,audit=null,selectedState=null;
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
      ?"Fixed Condition: "+locusNames(anchors)+". Other implicated loci remain unknown."
      :"No fixed locus: QCDS can search for previously unspecified combinations.";
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
    const panel=$("cohortGroverStats");
    panel.replaceChildren();
    const stats=[
      ["Input breadth",all().length+" profiles × 10 loci"],
      ["Candidate space","1,024 subsets"],
      ["2–4-locus subsets tested",result.examinedCount.toLocaleString("en-US")],
      ["First oracle marks",result.markedCount],
      ["Grover 1 iterations",result.grover.iterations],
      ["Grover 1 marked mass",percent(result.grover.markedMass)],
      ["Grover stop",result.stopReason],
      ["Second-stage candidates",result.refinedCount],
      ["Grover 2 iterations",result.refinedGrover.iterations],
      ["Grover 2 marked mass",percent(result.refinedGrover.markedMass)]
    ];
    stats.forEach(([label,value])=>{
      const box=e("div","cohort-stat");
      box.append(e("small","",label),e("strong","",value));
      panel.append(box);
    });
  }
  function renderAudit(){
    const target=$("cohortAudit");
    if(!target)return;
    target.replaceChildren();
    target.append(e("h4","","Perturbation / bias checks · synthetic model"));
    const items=[
      ["8% independent bit flips",audit.repeatability+"/5 runs retain the same first-ranked pattern; "+audit.retained+"/5 still include it among eligible candidates"],
      ["Leave-one-case-out",audit.leaveOneOut.filter(x=>x.retainsTop).length+"/"+audit.leaveOneOut.length+" trials retain the original pattern"],
      ["Reversed cohort labels",audit.negativeControl.markedCount+" eligible patterns; original result retained: "+(audit.negativeControl.retainsTop?"yes":"no")]
    ];
    for(const [key,value] of items){
      const row=e("div","cohort-audit-row");
      row.append(e("strong","",key),e("span","",value));target.append(row);
    }
    target.append(e("p","cohort-audit-caveat","These are robustness probes, not proof of NISQ noise tolerance, freedom from bias, statistical significance or clinical validity."));
  }
  function renderOutcome(){
    const headline=$("cohortOutcome"),detail=$("cohortOutcomeDetail"),alts=$("cohortAlternatives");
    alts.replaceChildren();
    if(!result.markedCount){
      headline.textContent="No relationship meets the current Condition and cohort thresholds.";
      detail.textContent="No locus is amplified as a valid answer. Try modifying synthetic data, constraints or minimum cohort support. Absence is an admissible inference outcome.";
      selectedState=null;
    }else{
      const selected=result.ranked.find(x=>x.state===selectedState)||result.selected;
      selectedState=selected.state;
      headline.textContent=result.refinedCount===1
        ?"One previously unspecified relation is strongest under the declared oracle."
        :result.refinedCount+" equally strong relations survive refinement; no unique answer.";
      detail.textContent=locusNames(selected.loci)+". Relation satisfied in "+selected.caseCount+"/"+dataset.cases.length+
        " synthetic cases versus "+selected.controlCount+"/"+dataset.controls.length+
        " synthetic comparators. Difference: "+percent(selected.contrast)+
        ". Relation: "+(result.relation==="parity"?"odd parity among selected 0/1 loci":"all selected variants present")+". Grover amplitudes quantify oracle-marked states, not biological confidence or causal discovery.";
      result.ranked.slice(0,20).forEach(x=>{
        const btn=e("button","cohort-alt",locusNames(x.loci));
        btn.type="button";
        btn.classList.toggle("is-selected",x.state===selectedState);
        btn.addEventListener("click",()=>{selectedState=x.state;renderOutcome();renderGenomes();});
        alts.append(btn);
      });
    }
  }
  function readSettings(){
    return {
      dataset,
      anchors:anchors.slice(),
      minCases:Number($("cohortMinCases").value),
      maxControls:Number($("cohortMaxControls").value),
      relation:$("cohortRelation").value,
      minSize:2,
      maxSize:4
    };
  }
  function run(){
    try{
      result=D.evaluate(readSettings());
      selectedState=result.selected?.state??null;
      audit=D.stabilityAudit(result);
      $("cohortError").textContent="";
      renderSelectors();showStats();renderOutcome();renderGenomes();renderAudit();
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
    $("cohortRun").addEventListener("click",run);
    $("cohortMinCases").addEventListener("change",run);
    $("cohortMaxControls").addEventListener("change",run);
    $("cohortRelation").addEventListener("change",run);
    $("cohortRebuild").addEventListener("click",()=>{try{regenerate(0)}catch(e){$("cohortError").textContent=e.message;}});
    $("cohortNextDataset").addEventListener("click",()=>{try{regenerate(1)}catch(e){$("cohortError").textContent=e.message;}});
    $("cohortClearAnchors").addEventListener("click",()=>{anchors=[];run();});
    run();
  }
  return {LOCI,N,generateProfiles:D.generateProfiles,evaluateOracle:D.evaluate,initialize};
});