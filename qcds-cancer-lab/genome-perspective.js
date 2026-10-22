/* QCDS Cancer Lab — cross-person, multi-locus combinatorial prototype.
 * Ten synthetic loci across five cases plus five independent comparator profiles.
 * The 2^10 subset-state oracle is evaluated and amplified by the shared QCDS
 * ideal Grover kernel. No DNA reference is loaded and no genomic-scale speedup
 * is claimed. Theory and creation by Patrik Sundblom.
 */
(function(root,factory){
  const api=factory(root.QCDSCore);
  if(typeof module!=="undefined" && module.exports) module.exports=api;
  root.CancerGenomePerspective=api;
  if(typeof document!=="undefined") api.initialize();
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
  const CASES=[
    {id:"C01",variants:[0,1,2,4,7]},
    {id:"C02",variants:[1,3,4,5,7]},
    {id:"C03",variants:[1,4,6,7,8]},
    {id:"C04",variants:[0,1,4,7,9]},
    {id:"C05",variants:[1,2,4,6,7]}
  ];
  const CONTROLS=[
    {id:"K01",variants:[0,1,2,5]},
    {id:"K02",variants:[2,3,4,9]},
    {id:"K03",variants:[0,5,6,7]},
    {id:"K04",variants:[1,4,6,8]},
    {id:"K05",variants:[3,4,7,9]}
  ];
  const N=1 << LOCI.length;
  const CHOOSE_THREE=120;
  const GENOME_BASES=3000000000n;
  const ALL=Object.freeze([...CASES.map(p=>({...p,group:"cases"})),...CONTROLS.map(p=>({...p,group:"controls"}))]);
  let seeds=[1];
  let search=null;
  let activeState=null;
  const $=id=>document.getElementById(id);
  function element(tag,cls,text){
    const el=document.createElement(tag);
    if(cls) el.className=cls;
    if(text!==undefined) el.textContent=String(text);
    return el;
  }
  function bits(state){
    return LOCI.map((_,i)=>(state&(1<<i))!==0?i:-1).filter(i=>i>=0);
  }
  function mask(indices){
    return indices.reduce((sum,i)=>sum|(1<<i),0);
  }
  function countBits(v){
    let count=0;
    while(v){v&=v-1;count++;}
    return count;
  }
  function coverage(state,profiles){
    return profiles.reduce((sum,profile)=>sum+(bits(state).every(i=>profile.variants.includes(i))?1:0),0);
  }
  function evaluateOracle(options={}){
    if(!Q || typeof Q.runGrover!=="function")throw Error("QCDS Grover core is required for multi-locus evaluation.");
    const anchors=options.anchors===undefined?[1]:options.anchors;
    const minCases=options.minCases===undefined?5:Number(options.minCases);
    const maxControls=options.maxControls===undefined?0:Number(options.maxControls);
    if(!Array.isArray(anchors)||anchors.length>3||new Set(anchors).size!==anchors.length||anchors.some(i=>!Number.isInteger(i)||i<0||i>=LOCI.length))throw Error("Choose up to three distinct valid locus anchors.");
    if(!Number.isInteger(minCases)||minCases<1||minCases>5||!Number.isInteger(maxControls)||maxControls<0||maxControls>5)throw Error("Invalid cohort thresholds.");
    const must=mask(anchors);
    const marked=[];
    const evaluated=[];
    for(let state=0;state<N;state++){
      if(countBits(state)!==3)continue;
      const caseCount=coverage(state,CASES);
      const controlCount=coverage(state,CONTROLS);
      const passed=(state&must)===must&&caseCount>=minCases&&controlCount<=maxControls;
      evaluated.push({state,loci:bits(state),caseCount,controlCount,passed});
      if(passed)marked.push(state);
    }
    const grover=Q.runGrover(N,marked,40);
    const ranked=evaluated.filter(x=>x.passed).map(x=>({...x,probability:grover.probabilities[x.state]}))
      .sort((a,b)=>b.probability-a.probability||b.caseCount-a.caseCount||a.controlCount-b.controlCount||a.state-b.state);
    const best=ranked[0]||null;
    const leaveOneOut=best?CASES.map(p=>({excluded:p.id,remaining:coverage(best.state,CASES.filter(x=>x.id!==p.id))})):null;
    return {anchors:anchors.slice(),minCases,maxControls,states:N,evaluatedTriples:evaluated.length,
      markedCount:marked.length,grover,ranked,selected:best,leaveOneOut};
  }
  function choose3(n){const v=BigInt(n);return v*(v-1n)*(v-2n)/6n;}
  function formatPct(v){return (v*100).toFixed(2)+"%";}
  function lociString(selected){
    return selected.map(i=>LOCI[i].label+" (chr"+LOCI[i].chr+")").join(" · ");
  }
  function renderSelectors(){
    const select=$("cohortLoci");if(!select)return;
    select.replaceChildren();
    LOCI.forEach((locus,i)=>{
      const btn=element("button","cohort-locus");
      btn.type="button";
      const on=seeds.includes(i);
      btn.classList.toggle("is-anchor",on);
      btn.setAttribute("aria-pressed",on?"true":"false");
      btn.setAttribute("aria-label",locus.label+", chromosome "+locus.chr+". "+(on?"Selected":"Not selected")+" as required anchor");
      btn.append(element("strong","",locus.label),element("small","","chr"+locus.chr));
      btn.addEventListener("click",()=>{
        if(seeds.includes(i))seeds=seeds.filter(k=>k!==i);
        else if(seeds.length<3)seeds=seeds.concat(i).sort((a,b)=>a-b);
        else {const msg=$("cohortError");if(msg)msg.textContent="Select no more than three anchor loci. Deselect one before adding another.";return;}
        const msg=$("cohortError");if(msg)msg.textContent="";
        run();
      });
      select.append(btn);
    });
    const label=$("cohortAnchors");
    if(label)label.textContent=seeds.length?"Required anchors: "+lociString(seeds):"No fixed anchor: all three-locus patterns are eligible for the cohort oracle.";
  }
  function renderTracks(){
    const holder=$("cohortGenomeTracks");
    if(!holder)return;
    holder.replaceChildren();
    ALL.forEach(p=>{
      const row=element("div","cohort-genome-row");
      row.classList.add(p.group==="cases"?"cohort-case":"cohort-control");
      const label=element("span","cohort-person",p.id);
      label.title=p.group==="cases"?"Synthetic cancer case":"Synthetic comparator";
      const track=element("div","cohort-genome-track");
      track.setAttribute("aria-label",p.id+" schematic whole-genome coordinate axis with 10 synthetic variant sites");
      LOCI.forEach((l,i)=>{
        const btn=element("button","cohort-site");
        btn.type="button";
        btn.style.left=(l.position*100).toFixed(1)+"%";
        const variant=p.variants.includes(i);
        btn.classList.toggle("has-variant",variant);
        btn.classList.toggle("is-anchor",seeds.includes(i));
        btn.classList.toggle("is-hit",Boolean(activeState && (activeState&(1<<i)) && variant && p.group==="cases"));
        btn.classList.toggle("is-control-hit",Boolean(activeState && (activeState&(1<<i)) && variant && p.group==="controls"));
        btn.title=p.id+" · "+l.label+" (chr"+l.chr+") · "+(variant?"variant 1":"variant 0");
        btn.setAttribute("aria-label",btn.title);
        btn.addEventListener("click",()=>{seeds=seeds.includes(i)?seeds.filter(x=>x!==i):seeds.length<3?[...seeds,i].sort((a,b)=>a-b):seeds;run();});
        track.append(btn);
      });
      const count=element("span","cohort-genome-count",p.group==="cases"?"case":"control");
      row.append(label,track,count);
      holder.append(row);
    });
    const matrix=$("cohortDataMatrix");
    if(!matrix)return;
    matrix.replaceChildren();
    const head=element("div","cohort-matrix-header");
    head.append(element("span","","Profile"));
    LOCI.forEach((loc,i)=>{
      const btn=element("button","cohort-matrix-name",loc.label);
      btn.type="button";btn.title="Select "+loc.label+" chr"+loc.chr;
      btn.classList.toggle("is-anchor",seeds.includes(i));
      btn.addEventListener("click",()=>{if(seeds.includes(i))seeds=seeds.filter(x=>x!==i);else if(seeds.length<3)seeds.push(i);run();});
      head.append(btn);
    });
    matrix.append(head);
    ALL.forEach(p=>{
      const row=element("div","cohort-matrix-row");
      row.classList.add(p.group==="cases"?"is-case":"is-control");
      row.append(element("span","",p.id));
      LOCI.forEach((loc,i)=>{
        const bit=p.variants.includes(i)?"1":"0";
        const cell=element("span","cohort-bit",bit);
        cell.classList.toggle("is-variant",bit==="1");
        cell.classList.toggle("is-highlight",Boolean(activeState && (activeState&(1<<i)) && p.group==="cases" && bit==="1"));
        cell.classList.toggle("is-anchor",seeds.includes(i));
        cell.title=p.id+" / "+loc.label+": synthetic variant "+bit;
        row.append(cell);
      });
      matrix.append(row);
    });
  }
  function renderResults(){
    const out=$("cohortOutcome"),detail=$("cohortOutcomeDetail"),metrics=$("cohortGroverStats"),alts=$("cohortAlternatives");
    if(!search||!out||!detail||!metrics||!alts)return;
    const q=search;
    metrics.replaceChildren();
    [
      ["Encoded logical states","1,024"],
      ["Three-locus candidate subsets",q.evaluatedTriples.toLocaleString("en-US")],
      ["Oracle-marked subsets",q.markedCount],
      ["Grover iterations (m)",q.grover.iterations],
      ["Marked-state probability mass",formatPct(q.grover.markedMass)]
    ].forEach(([name,value])=>{
      const card=element("div","cohort-stat");
      card.append(element("small","",name),element("strong","",value));
      metrics.append(card);
    });
    alts.replaceChildren();
    if(!q.markedCount){
      out.textContent="No compatible three-locus signature satisfies the chosen cohort conditions.";
      detail.textContent="Nothing is highlighted as a QCDS candidate. Adjust the required anchors or evidence thresholds. This synthetic absence is not biological evidence.";
      activeState=null;
    }else{
      const pick=q.ranked.find(x=>x.state===activeState)||q.ranked[0];
      activeState=pick.state;
      out.textContent=q.markedCount===1
        ?"One three-locus combination satisfies the current oracle."
        :q.markedCount+" combinations satisfy the oracle; no unique signature is established.";
      const loo=q.leaveOneOut && q.selected?.state===pick.state
        ?q.leaveOneOut.every(x=>x.remaining===4)
        :CASES.every(p=>coverage(pick.state,CASES.filter(k=>k.id!==p.id))>=q.minCases-1);
      detail.textContent=lociString(pick.loci)+". Co-occurrence: "+pick.caseCount+"/5 synthetic cases and "+pick.controlCount+
        "/5 synthetic comparators. Model probability per marked subset: "+formatPct(pick.probability)+
        ". "+(loo?"The pattern persists in a leave-one-case-out check. ":"")+
        "These synthetic variants were constructed for demonstration; this result does not identify a real cancer driver.";
      q.ranked.slice(0,16).forEach(item=>{
        const btn=element("button","cohort-alt",lociString(item.loci));
        btn.type="button";
        btn.classList.toggle("is-selected",item.state===activeState);
        btn.title="View candidate "+lociString(item.loci);
        btn.addEventListener("click",()=>{activeState=item.state;renderResults();renderTracks();});
        alts.append(btn);
      });
    }
  }
  function run(){
    const min=Number($("cohortMinCases")?.value||5);
    const max=Number($("cohortMaxControls")?.value||0);
    search=evaluateOracle({anchors:seeds,minCases:min,maxControls:max});
    activeState=search.selected?.state||null;
    renderSelectors();renderResults();renderTracks();
  }
  function initialize(){
    if(typeof document==="undefined" || !$("cohortCombinatorial"))return;
    $("cohortRun").addEventListener("click",run);
    $("cohortMinCases").addEventListener("change",run);
    $("cohortMaxControls").addEventListener("change",run);
    run();
  }
  return {LOCI,CASES,CONTROLS,N,CHOOSE_THREE,GENOME_BASES,choose3,bits,mask,countBits,coverage,evaluateOracle,initialize};
});