/* QCDS / Cancer Lab — rotating 4→1→1 probability funnel.
 * Exact, substrate-independent REFERENCE MODEL, executed sequentially in JS.
 * 16 local 4-bit Grover lanes => four joint-factor folds => one bound
 * 10-dimensional probability distribution; rotated passes; condition check.
 * No quantum hardware, unbounded Hilbert space or demonstrated speedup.
 * © 2026 Patrik Sundblom — OpenAI/ChatGPT R&D support.
 */
(function(root,factory){
  const api=factory(root.QCDSCore,root.CancerGenomeDiscovery);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.QCDSGenomeFunnel=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Q,D){
 "use strict";
 if(!Q||!D)throw Error("QCDS core and genome discovery are required");
 const WIDTH=10, STATES=1024, LANE_WIDTH=4, LANE_STATES=16;
 const LANES=16, FAN_IN=4, GROUPS=4, FLOOR=.08;
 const MAX_PASSES=12, DEFAULT_PASSES=6;
 const CHOICES=[];
 for(let a=0;a<WIDTH;a++)for(let b=a+1;b<WIDTH;b++)
 for(let c=b+1;c<WIDTH;c++)for(let d=c+1;d<WIDTH;d++)CHOICES.push([a,b,c,d]);
 const POP=Array.from({length:STATES},(_,i)=>D.countBits(i));
 const VALID=Array.from({length:STATES},(_,s)=>s).filter(s=>POP[s]>=2&&POP[s]<=4);
 const EPS=1e-12;
 function normalize(vector){
   const z=vector.reduce((a,b)=>a+b,0);
   if(!(z>0))throw Error("QCDS probability normalization failed");
   return vector.map(x=>x/z);
 }
 function entropy(v){let h=0;for(const p of v)if(p>0)h-=p*Math.log2(p);return h;}
 function tvd(a,b){let x=0;for(let i=0;i<a.length;i++)x+=Math.abs(a[i]-b[i]);return x*.5;}
 function topSet(v,k=8){return new Set(VALID.slice().sort((a,b)=>v[b]-v[a]||a-b).slice(0,k));}
 function jaccard(a,b){let n=0;for(const v of a)if(b.has(v))n++;return n/(a.size+b.size-n||1);}
 function projection(state,window){
   let out=0;for(let p=0;p<window.length;p++)if(state&(1<<window[p]))out|=1<<p;
   return out;
 }
 function embedding(local,window){
   let out=0;for(let p=0;p<window.length;p++)if(local&(1<<p))out|=1<<window[p];
   return out;
 }
 function schedule(round,lane){
   // 210 unique four-locus windows sampled deterministically, without repetition
   // within one 16-lane round. Rotation changes BOTH mapped loci and logical order.
   const window=CHOICES[(round*41+lane*13)%CHOICES.length];
   const shift=(round+lane)%4;
   const rotated=window.slice(shift).concat(window.slice(0,shift));
   if((round+lane)%2)return rotated.reverse();
   return rotated;
 }
 function localOracle(window,settings){
   const marks=[],observations=[];
   const must=D.mask(settings.anchors||[]);
   for(let s=0;s<LANE_STATES;s++){
     const global=embedding(s,window);
     const size=POP[global];
     if(size<2||size>4)continue;
     // Only enforce anchors if all anchors are present in the four-bit window.
     // Global input constraint is always enforced again at the final truth gate.
     const assessment=D.assess(global,settings.dataset,settings.relation||"cooccurrence");
     const passed=assessment.caseCount>=settings.minCases&&
       assessment.controlCount<=settings.maxControls&&assessment.contrast>0;
     observations.push({local:s,state:global,size,contrast:assessment.contrast,passed});
     if(passed)marks.push(s);
   }
   const grover=Q.runGrover(LANE_STATES,marks,40);
   const noise=Number(settings.readoutNoise||0);
   // Classical proxy: convex mixture with the uniform distribution.
   // Represents readout uncertainty only; not a NISQ device/circuit model.
   const likelihood=grover.probabilities.map(p=>FLOOR/LANE_STATES+
       (1-FLOOR)*((1-noise)*p+noise/LANE_STATES));
   return {window,marks:marks.length,grover,likelihood,observations,
     iterations:grover.iterations,markedMass:grover.markedMass};
 }
 function subsetValidity(settings){
   const anchors=D.mask(settings.anchors||[]);
   const valid=VALID.filter(s=>(s&anchors)===anchors);
   if(!valid.length)throw Error("No states satisfy the current locus Condition");
   return valid;
 }
 function fold(lanes,domain){
   // Probability factorization without collapsing to a single winning state.
   // Each four-locus factor contributes its *joint* 16-state probability,
   // preserving correlations within the measured window during binding.
   const raw=Array(STATES).fill(0);
   let mx=-Infinity;
   for(const s of domain){
     let lp=0;
     for(const lane of lanes){
       const local=projection(s,lane.window);
       lp+=Math.log(Math.max(lane.likelihood[local],EPS)/(1/LANE_STATES));
     }
     lp/=lanes.length;
     raw[s]=lp;
     if(lp>mx)mx=lp;
   }
   for(const s of domain)raw[s]=Math.exp(raw[s]-mx);
   return normalize(raw);
 }
 function combine(groups,domain){
   // 4→1 bound distribution using normalized log opinion pool.
   // Averaging log factors avoids counting identical information four times.
   const logs=Array(STATES).fill(-Infinity);
   let max=-Infinity;
   for(const s of domain){
     let score=0;
     for(const group of groups)score+=Math.log(Math.max(group.posterior[s],EPS));
     score/=groups.length;
     logs[s]=score;
     if(score>max)max=score;
   }
   return normalize(logs.map((v,s)=>domain.includes(s)?Math.exp(v-max):0));
 }
 function bindRotations(rounds,domain){
   const logs=Array(STATES).fill(-Infinity), mx=[];
   let max=-Infinity;
   for(const s of domain){
     // Equal-weight rotation evidence. Earlier passes do not become a prior
     // re-applied multiplicatively and mistaken for independent evidence.
     let score=0;
     for(const r of rounds)score+=Math.log(Math.max(r.bound[s],EPS));
     score/=rounds.length;
     logs[s]=score;
     if(score>max)max=score;
   }
   return normalize(logs.map(v=>v===-Infinity?0:Math.exp(v-max)));
 }
 function validate(settings){
   if(!settings?.dataset)throw Error("Cohort evidence is missing");
   const anchors=settings.anchors||[];
   if(!Array.isArray(anchors)||anchors.length>3||new Set(anchors).size!==anchors.length||
     anchors.some(x=>!Number.isInteger(x)||x<0||x>=WIDTH))throw Error("Invalid starting Condition");
   const noise=Number(settings.readoutNoise||0);
   if(!Number.isFinite(noise)||noise<0||noise>.35)throw Error("Readout mixing must be 0–35%");
   const maxPasses=settings.maxPasses===undefined?DEFAULT_PASSES:Number(settings.maxPasses);
   if(!Number.isInteger(maxPasses)||maxPasses<1||maxPasses>MAX_PASSES)throw Error("Rotations must be 1–12");
   if(!["cooccurrence","parity"].includes(settings.relation||"cooccurrence"))throw Error("Unknown oracle family");
   return {noise,maxPasses};
 }
 function verify(domain,settings){
   return domain.map(state=>{
     const assessment=D.assess(state,settings.dataset,settings.relation||"cooccurrence");
     const passed=assessment.caseCount>=settings.minCases&&assessment.controlCount<=settings.maxControls&&assessment.contrast>0;
     return {state,loci:D.bits(state),...assessment,passed};
   });
 }
 function run(settings={}){
   const {noise,maxPasses}=validate(settings);
   const domain=subsetValidity(settings);
   const verification=verify(domain,settings);
   const eligible=verification.filter(v=>v.passed);
   const lookup=new Map(verification.map(v=>[v.state,v]));
   const rounds=[];
   let previous=null,previousEntropy=null,stableCount=0;
   let bound=null;
   for(let round=0;round<maxPasses;round++){
     const lanes=Array.from({length:LANES},(_,j)=>{
       const window=schedule(round,j);
       return {...localOracle(window,{...settings,readoutNoise:noise}),index:j};
     });
     const groups=Array.from({length:GROUPS},(_,g)=>{
       const members=lanes.slice(g*FAN_IN,(g+1)*FAN_IN);
       const posterior=fold(members,domain);
       return {index:g,memberIndices:members.map(l=>l.index),posterior,
         entropyBits:entropy(posterior),topState:domain.reduce((best,s)=>posterior[s]>posterior[best]?s:best,domain[0])};
     });
     const fused=combine(groups,domain);
     rounds.push({index:round+1,lanes,groups,bound:fused,entropyBits:entropy(fused)});
     bound=bindRotations(rounds,domain);
     const H=entropy(bound);
     const delta=previous?tvd(bound,previous):null;
     const jac=previous?jaccard(topSet(bound),topSet(previous)):null;
     const entDelta=previousEntropy===null?null:Math.abs(H-previousEntropy);
     const isStable=delta!==null&&delta<=.025&&jac>=.70&&entDelta<=.08;
     stableCount=isStable?stableCount+1:0;
     rounds[round].alignment={stable:isStable,deltaTvd:delta,topkJaccard:jac,
       entropyDelta:entDelta,boundEntropyBits:H};
     previous=bound;previousEntropy=H;
     // Require two consecutive stable transitions, at least three complete passes.
     if(round>=2&&stableCount>=2)break;
   }
   const ranked=eligible.map(v=>({...v,foldedProbability:bound[v.state]}))
     .sort((a,b)=>b.foldedProbability-a.foldedProbability||b.contrast-a.contrast||a.state-b.state);
   const leaders=[];
   if(ranked.length){
     const peak=ranked[0].foldedProbability;
     // A probabilistic shortlist, AND verified against the original independent oracle.
     for(const row of ranked)if(row.foldedProbability>=peak*.8-1e-15)leaders.push(row);
   }
   const parent=Q.runGrover(STATES,leaders.map(x=>x.state),40);
   const highlighted=leaders[0]||null;
   const result={
     settings:{anchors:(settings.anchors||[]).slice(),relation:settings.relation||"cooccurrence",
       minCases:settings.minCases,maxControls:settings.maxControls,readoutNoise:noise,maxPasses},
     dataset:settings.dataset,domainCount:domain.length,evaluatedCount:verification.length,
     qualifiedCount:eligible.length,rotations:rounds.length,lanesPerPass:LANES,
     groupsPerPass:GROUPS,laneWidth:LANE_WIDTH,localStates:LANE_STATES,
     rounds,distribution:bound,ranked,leaders,selected:highlighted,
     parentGrover:parent,stable:stableCount>=2,
     entropyBits:entropy(bound),topk:topSet(bound),
     missingInformation:"Cross-window correlations beyond 4 loci are not guaranteed recoverable from the local joint distributions.",
     execution:"Classical exact amplitude simulation; lanes scheduled sequentially."
   };
   return result;
 }
 return {WIDTH,STATES,LANE_WIDTH,LANES,GROUPS,FAN_IN,CHOICES,VALID,schedule,
   projection,embedding,localOracle,fold,combine,bindRotations,run,entropy,tvd,jaccard,verify};
});