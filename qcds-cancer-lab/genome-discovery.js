/* QCDS Cancer Lab: small, reproducible, hypothesis-open 10-locus cohort engine.
   Classical simulation of ideal Grover amplitudes; no quantum-hardware run.
   No predefined winning locus IDs or planted answer sequence.
   © 2026 Patrik Sundblom. Research and development support: OpenAI / ChatGPT.
*/
(function(root,factory){
  const api=factory(root.QCDSCore);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.CancerGenomeDiscovery=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Q){
  "use strict";
  const LOCI=[
    {chr:"1",label:"L01",position:.035},
    {chr:"3",label:"L02",position:.145},
    {chr:"5",label:"L03",position:.235},
    {chr:"7",label:"L04",position:.345},
    {chr:"9",label:"L05",position:.438},
    {chr:"11",label:"L06",position:.548},
    {chr:"13",label:"L07",position:.648},
    {chr:"15",label:"L08",position:.758},
    {chr:"17",label:"L09",position:.849},
    {chr:"X",label:"L10",position:.950}
  ];
  const N=1<<LOCI.length;
  const MAX_ITERATIONS=40, ALIGNMENT_THRESHOLD=.999;

  function randomSource(seed){
    let state=(Number(seed)>>>0)||1;
    return function(){
      state=(state+0x6D2B79F5)>>>0;
      let x=state;
      x=Math.imul(x^(x>>>15),x|1);
      x^=x+Math.imul(x^(x>>>7),x|61);
      return ((x^(x>>>14))>>>0)/4294967296;
    };
  }
  function clamp(value,a,b){return Math.max(a,Math.min(b,value));}
  function generateProfiles(seed=173,mode="structure"){
    if(!["structure","null"].includes(mode))throw Error("Unknown synthetic generation mode");
    if(!Number.isInteger(Number(seed))||Number(seed)<1||Number(seed)>1000000)throw Error("Data seed must be an integer from 1 to 1,000,000.");
    const rand=randomSource(seed);
    // Unobserved cohort-level shift and locus-specific effects are sampled,
    // rather than hardcoding a winning triple or fixed set of co-occurrences.
    const parameters=LOCI.map(()=>({
      base:.23+.38*rand(),
      delta:mode==="null"?0:(rand()-.40)*1.35,
      covariance:(rand()-.5)*.38
    }));
    const cases=[],controls=[];
    for(const [group,target] of [["cases",cases],["controls",controls]]){
      for(let k=0;k<5;k++){
        const latent=(rand()-.5)*2;
        const variants=[];
        parameters.forEach((p,i)=>{
          const prob=clamp(p.base+(group==="cases"?p.delta:0)+p.covariance*latent,.03,.96);
          if(rand()<prob)variants.push(i);
        });
        target.push({id:(group==="cases"?"C":"K")+String(k+1).padStart(2,"0"),variants,group});
      }
    }
    return {seed:Number(seed),mode,cases,controls,parameters};
  }

  function bits(state){
    const out=[];
    for(let i=0;i<LOCI.length;i++)if(state&(1<<i))out.push(i);
    return out;
  }
  function mask(indices){return indices.reduce((s,i)=>s|(1<<i),0);}
  function countBits(v){let count=0;while(v){v&=v-1;count++;}return count;}
  function satisfies(state,person,relation="cooccurrence"){
    const chosen=bits(state);
    const positives=chosen.filter(i=>person.variants.includes(i)).length;
    if(relation==="cooccurrence")return positives===chosen.length;
    if(relation==="parity")return positives%2===1;
    throw Error("Unsupported relation-oracle family.");
  }
  function coverage(state,profiles,relation="cooccurrence"){
    return profiles.reduce((sum,p)=>sum+Number(satisfies(state,p,relation)),0);
  }
  function checkProfiles(dataset){
    if(!dataset||!Array.isArray(dataset.cases)||!Array.isArray(dataset.controls)||dataset.cases.length<2||dataset.controls.length<2)
      throw Error("Provide at least two synthetic cases and two comparators.");
    for(const p of [...dataset.cases,...dataset.controls]){
      if(!Array.isArray(p.variants)||new Set(p.variants).size!==p.variants.length||p.variants.some(i=>!Number.isInteger(i)||i<0||i>=LOCI.length))
        throw Error("Invalid genotype vector for profile "+p.id);
    }
  }
  function assess(state,dataset,relation="cooccurrence"){
    const c=coverage(state,dataset.cases,relation),k=coverage(state,dataset.controls,relation);
    const caseRate=c/dataset.cases.length,controlRate=k/dataset.controls.length;
    const contrast=caseRate-controlRate;
    return {caseCount:c,controlCount:k,caseRate,controlRate,contrast};
  }
  function evaluate(options={}){
    if(!Q||typeof Q.runGrover!=="function"||typeof Q.peakIterationCount!=="function")throw Error("QCDS core with tangent and threshold Grover required.");
    const dataset=options.dataset||generateProfiles(173,"structure");
    checkProfiles(dataset);
    const anchors=options.anchors===undefined?[]:options.anchors;
    const minCases=options.minCases===undefined?3:Number(options.minCases);
    const maxControls=options.maxControls===undefined?1:Number(options.maxControls);
    const minSize=options.minSize===undefined?2:Number(options.minSize);
    const maxSize=options.maxSize===undefined?4:Number(options.maxSize);
    const relation=options.relation||"cooccurrence";
    if(!["cooccurrence","parity"].includes(relation))throw Error("Unsupported relation-oracle family.");
    if(!Array.isArray(anchors)||anchors.length>3||new Set(anchors).size!==anchors.length||anchors.some(i=>!Number.isInteger(i)||i<0||i>=LOCI.length))throw Error("Choose up to three distinct valid locus anchors.");
    if(!Number.isInteger(minCases)||minCases<1||minCases>dataset.cases.length||
       !Number.isInteger(maxControls)||maxControls<0||maxControls>dataset.controls.length)
       throw Error("Invalid cohort thresholds.");
    if(!Number.isInteger(minSize)||!Number.isInteger(maxSize)||minSize<2||maxSize>5||minSize>maxSize)throw Error("Invalid subset-size interval.");
    const must=mask(anchors);
    const examined=[],marked=[];
    for(let state=1;state<N;state++){
      const size=countBits(state);
      if(size<minSize||size>maxSize)continue;
      const assessment=assess(state,dataset,relation);
      const eligible=(state&must)===must;
      const passed=eligible&&assessment.caseCount>=minCases&&assessment.controlCount<=maxControls&&assessment.contrast>0;
      const row={state,loci:bits(state),size,...assessment,passed,eligible};
      examined.push(row);
      if(passed)marked.push(state);
    }
    // The oracle marks every qualifying combinatorial state; the *winner*
    // is not encoded in the data generator or the Grover engine.
    const grover=Q.runGrover(N,marked,MAX_ITERATIONS);
    const ranked=examined.filter(x=>x.passed).map(x=>({...x,probability:grover.probabilities[x.state]}))
      .sort((a,b)=>b.contrast-a.contrast||a.controlCount-b.controlCount||b.caseCount-a.caseCount||a.size-b.size||a.state-b.state);
    // Predefined second stage: retain ALL maximal-contrast patterns.
    // No gene IDs, winning locus mask or external known answer enter this criterion.
    const bestContrast=ranked.length?ranked[0].contrast:-1;
    const refined=ranked.filter(x=>Math.abs(x.contrast-bestContrast)<1e-12);
    const refinedGrover=Q.runGrover(N,refined.map(x=>x.state),MAX_ITERATIONS);
    const theta=marked.length&&marked.length<N?Math.asin(Math.sqrt(marked.length/N)):0;
    const m=grover.iterations;
    const massAtNext=theta?Q.groverSuccessProbability(N,marked.length,m+1):0;
    let stopReason="No marked states";
    if(marked.length===N)stopReason="All states marked; no discrimination";
    else if(marked.length){
      if(grover.markedMass>=ALIGNMENT_THRESHOLD-1e-10)stopReason="Alignment threshold 0.999";
      else if(m>=MAX_ITERATIONS)stopReason="Maximum 40 iterations";
      else if(massAtNext<grover.markedMass-1e-10)stopReason="First tangent / Grover peak";
      else stopReason="First-peak selection";
    }
    return {
      dataset,anchors:anchors.slice(),minCases,maxControls,minSize,maxSize,relation,
      states:N,examinedCount:examined.length,markedCount:marked.length,
      ranked,refined,selected:refined[0]||null,grover,refinedGrover,refinedCount:refined.length,stopReason,threshold:ALIGNMENT_THRESHOLD,
      ratio:marked.length/N,theta
    };
  }
  function perturb(dataset,seed,rate=.08){
    checkProfiles(dataset);
    const rand=randomSource(seed);
    return {...dataset,cases:dataset.cases.map(p=>({...p,variants:LOCI.map((_,i)=>{
      const has=p.variants.includes(i);
      return (has!==(rand()<rate))?i:-1;
    }).filter(i=>i>=0)})),
    controls:dataset.controls.map(p=>({...p,variants:LOCI.map((_,i)=>{
      const has=p.variants.includes(i);
      return (has!==(rand()<rate))?i:-1;
    }).filter(i=>i>=0)}))};
  }
  function stabilityAudit(baseline,options={}){
    const settings={
      anchors:baseline.anchors,minCases:baseline.minCases,maxControls:baseline.maxControls,
      minSize:baseline.minSize,maxSize:baseline.maxSize,relation:baseline.relation
    };
    const top=baseline.selected?.state;
    const seed=Number(baseline.dataset.seed||173);
    const simulations=[];
    for(let r=0;r<5;r++){
      const noisy=perturb(baseline.dataset,seed+7001+r*101,.08);
      const pass=evaluate({...settings,dataset:noisy});
      simulations.push({run:r+1,markedCount:pass.markedCount,
        sameTop:Boolean(top&&pass.selected?.state===top),
        retainsTop:Boolean(top&&pass.ranked.some(x=>x.state===top))});
    }
    const leaveOneOut=baseline.dataset.cases.map((person,i)=>{
      const reduced={...baseline.dataset,cases:baseline.dataset.cases.filter((_,j)=>i!==j)};
      const run=evaluate({...settings,minCases:Math.min(settings.minCases,reduced.cases.length),dataset:reduced});
      return {excluded:person.id,sameTop:Boolean(top&&run.selected?.state===top),retainsTop:Boolean(top&&run.ranked.some(x=>x.state===top))};
    });
    const permuted={...baseline.dataset,cases:baseline.dataset.controls,controls:baseline.dataset.cases};
    const nullRun=evaluate({...settings,dataset:permuted});
    return {
      simulations,leaveOneOut,negativeControl:{markedCount:nullRun.markedCount,retainsTop:Boolean(top&&nullRun.ranked.some(x=>x.state===top))},
      repeatability:simulations.filter(x=>x.sameTop).length,
      retained:simulations.filter(x=>x.retainsTop).length
    };
  }

  // Exact conditional randomization check over all C(10,5)=252 case-label assignments.
  // Compares the selected result with the MOST extreme qualifying association
  // under each shuffled labeling, explicitly accounting for searching hundreds
  // of loci combinations. It is a synthetic-data diagnostic, not validation.
  function permutationAudit(options={}){
    const dataset=options.dataset;
    checkProfiles(dataset);
    if(dataset.cases.length!==5||dataset.controls.length!==5)
      throw Error("Exact permutation calibration currently requires 5 cases and 5 comparisons.");
    const anchors=options.anchors||[];
    if(!Array.isArray(anchors)||new Set(anchors).size!==anchors.length||
       anchors.some(i=>!Number.isInteger(i)||i<0||i>=LOCI.length))
       throw Error("Invalid permutation anchor Condition.");
    const must=mask(anchors);
    const relation=options.relation||"cooccurrence";
    const minCases=options.minCases===undefined?3:Number(options.minCases);
    const maxControls=options.maxControls===undefined?1:Number(options.maxControls);
    const minSize=options.minSize===undefined?2:Number(options.minSize);
    const maxSize=options.maxSize===undefined?4:Number(options.maxSize);
    if(!["cooccurrence","parity"].includes(relation))throw Error("Unsupported relation oracle.");
    if(!Number.isInteger(minCases)||minCases<1||minCases>5||
       !Number.isInteger(maxControls)||maxControls<0||maxControls>5||
       !Number.isInteger(minSize)||!Number.isInteger(maxSize)||minSize<2||maxSize>5||minSize>maxSize)
       throw Error("Invalid permutation search constraints.");
    const people=[...dataset.cases,...dataset.controls];
    const candidates=[];
    for(let state=1;state<N;state++){
      const size=countBits(state);
      if(size<minSize||size>maxSize||(state&must)!==must)continue;
      let positive=0;
      people.forEach((person,index)=>{
        if(satisfies(state,person,relation))positive|=1<<index;
      });
      candidates.push({state,positive,total:countBits(positive)});
    }
    const observed=options.selectedState;
    const observedCaseMask=(1<<dataset.cases.length)-1;
    const observedDatum=observed==null?null:assess(observed,dataset,relation);
    if(observed!=null && (!Number.isInteger(observed)||observed<0||observed>=N ||
       !candidates.some(c=>c.state===observed)))
       throw Error("Selected state is not a valid candidate under the Condition.");
    const threshold=observedDatum?.contrast;
    let assignments=0,asExtreme=0,maxObserved=-1,obsQualified=0;
    const FULL=(1<<10)-1;
    const bestForCases=(caseMask)=>{
      let best=-1;
      for(const candidate of candidates){
        const cases=countBits(candidate.positive&caseMask);
        const controls=candidate.total-cases;
        if(cases<minCases||controls>maxControls)continue;
        const contrast=(cases-controls)/5;
        if(contrast>0 && contrast>best)best=contrast;
      }
      return best;
    };
    maxObserved=bestForCases(observedCaseMask);
    obsQualified=candidates.filter(c=>{
      const cases=countBits(c.positive&observedCaseMask);
      const controls=c.total-cases;
      return cases>=minCases&&controls<=maxControls&&cases>controls;
    }).length;
    // Combination masks: 10 bits with exactly 5 selected cases.
    const nullMax=[];
    for(let caseMask=0;caseMask<=FULL;caseMask++){
      if(countBits(caseMask)!==5)continue;
      const max=bestForCases(caseMask);
      nullMax.push(max);assignments++;
      if(threshold!==undefined && max>=threshold-1e-12)asExtreme++;
    }
    const passed=observed!==undefined&&observed!==null&&
      observedDatum.caseCount>=minCases&&observedDatum.controlCount<=maxControls&&observedDatum.contrast>0;
    return {assignments,validCandidates:candidates.length,observedQualified:obsQualified,
      selectedContrast:threshold??null,observedMaximumContrast:maxObserved,
      tailAssignments:passed?asExtreme:null,
      familywiseFraction:passed?asExtreme/assignments:null,
      nullAnyFraction:nullMax.filter(v=>v>0).length/assignments,
      method:"Exact label permutations across all eligible 2–4-locus candidates; conditional on these ten synthetic observations and the chosen oracle family."
    };
  }
  return {LOCI,N,MAX_ITERATIONS,ALIGNMENT_THRESHOLD,randomSource,generateProfiles,permutationAudit,
    bits,mask,countBits,satisfies,coverage,assess,evaluate,perturb,stabilityAudit};
});