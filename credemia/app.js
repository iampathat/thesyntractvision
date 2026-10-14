/* CREDEMIA — The Syntract Vision. This UI never computes its own QCDS inference. */
'use strict';

const ORACLES = [
  {id:'prior', short:'Documented chronology', name:'A is documented earlier than B', detail:'Compare authentic publication dates. Chronology alone cannot establish who influenced whom.'},
  {id:'overlap', short:'Specific technical overlap', name:'The works share a distinctive, testable contribution', detail:'Compare actual mechanisms, proofs, algorithms or reproducible experiments — not keywords or general themes.'},
  {id:'access', short:'Evidence of access', name:'A traceable route exists by which B could access A', detail:'A citation, correspondence, shared review, dated download, presentation or other documented access path.'},
  {id:'credit', short:'Appropriate attribution', name:'B accurately credits A for the relevant contribution', detail:'Check whether acknowledgment matches the specific contribution rather than just appearing in the references.'},
  {id:'independent', short:'Independent derivation', name:'An independent development path for B is documented', detail:'Dated notebooks, preprints, derivations, code or experiments that support an independent route.'},
  {id:'primary', short:'Primary-source verification', name:'Relevant claims are supported by authentic primary records', detail:'Original papers or dated archives rather than reposts, summaries or institutional press claims.'},
  {id:'conflict', short:'Contradictory evidence', name:'Material evidence disputes the proposed attribution narrative', detail:'Record counterevidence explicitly; it must not disappear because one hypothesis sounds persuasive.'}
];
const ANSWERS = [{value:'?',text:'?  Unknown'}, {value:'1',text:'1  Supported'}, {value:'0',text:'0  Contradicted'}];
const FIELD_IDS = ['caseName','aDoi','aTitle','aAuthor','aDate','aUrl','bDoi','bTitle','bAuthor','bDate','bUrl','comparison'];
const $ = id => document.getElementById(id);
const session = {worker:null, ready:null, lookups:{a:null,b:null}, lastRuns:null, lastSnapshot:null, running:false, stale:false};
const escapeText = text => String(text == null ? '' : text);
function element(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined) el.textContent = escapeText(content);
  return el;
}
function fieldValue(id){return $(id).value.trim();}
function changed(){
  if (session.lastRuns && !session.running){
    session.stale = true;
    $('engineStatus').textContent = 'Inputs changed — run QCDS again to update the report.';
    $('engineStatus').className = '';
  }
}
function renderOracles(){
  const host = $('oracleRows');
  host.replaceChildren();
  for (const def of ORACLES){
    const row=element('div','oracle');row.dataset.oracle=def.id;
    const top=element('div','oracle-top');
    const label=element('strong');label.append(element('small','',def.id.toUpperCase()), document.createTextNode(def.name));
    top.append(label,element('span','status-chip','USER ASSERTION'));row.append(top,element('p','',def.detail));
    const controls=element('div','oracle-controls');
    const state=element('label','field','Condition 1 / 0 / ?');
    const select=element('select');select.id='v-'+def.id;select.setAttribute('aria-label',def.name);
    for(const ans of ANSWERS){const opt=element('option','',ans.text);opt.value=ans.value;select.append(opt);}
    state.append(select);
    const source=element('label','field','Primary evidence link (optional)');
    const input=element('input');input.id='s-'+def.id;input.type='url';input.placeholder='https://doi.org/... or archive';input.spellcheck=false;source.append(input);
    const trust=element('label','field','Claim strength');
    const strength=element('select');strength.id='c-'+def.id;
    for(const pair of [['0.55','Tentative · 0.55'],['0.75','Moderate · 0.75'],['0.95','Strong · 0.95']]){const opt=element('option','',pair[1]);opt.value=pair[0];if(pair[0]==='0.75')opt.selected=true;strength.append(opt);}
    trust.append(strength);controls.append(state,source,trust);row.append(controls);host.append(row);
    row.querySelectorAll('select,input').forEach(ctrl=>ctrl.addEventListener('change',changed));
  }
}
function getSnapshot(){
  const fields={};for(const id of FIELD_IDS) fields[id]=fieldValue(id);
  const conditions={};for(const def of ORACLES) conditions[def.id]={mask:$('v-'+def.id).value,source:fieldValue('s-'+def.id),confidence:Number($('c-'+def.id).value)};
  return {schema:'credemia-case-v1', created:new Date().toISOString(), fields,conditions,lookups:structuredClone(session.lookups)};
}
function setCase(data){
  if(!data||data.schema!=='credemia-case-v1'||typeof data.fields!=='object'||typeof data.conditions!=='object') throw new Error('Not a CREDEMIA v1 case file.');
  for(const id of FIELD_IDS)$(id).value=escapeText(data.fields[id]||'').slice(0,1600);
  for(const def of ORACLES){
    const item=data.conditions[def.id]||{};
    $('v-'+def.id).value=['0','1','?'].includes(item.mask)?item.mask:'?';
    $('s-'+def.id).value=escapeText(item.source||'').slice(0,1200);
    const c=String(item.confidence||0.75);$('c-'+def.id).value=['0.55','0.75','0.95'].includes(c)?c:'0.75';
  }
  // Imported lookup state is never treated as a freshly verified remote response.
  session.lookups={a:null,b:null};
  updateCitation();
  $('aStatus').textContent='Imported/manual metadata — check DOI again to verify';
  $('bStatus').textContent='Imported/manual metadata — check DOI again to verify';
  $('aStatus').className='lookup-status';$('bStatus').className='lookup-status';
  const priorChip=document.querySelector('[data-oracle="prior"] .status-chip');if(priorChip){priorChip.textContent='USER ASSERTION';priorChip.classList.remove('attested');}
  session.lastRuns=null;session.lastSnapshot=null;session.stale=false;
  $('results').replaceChildren(element('div','empty','Case loaded. Run QCDS to infer from the current evidence.'));
  $('caseSummary').textContent='No current analysis. Run QCDS.';
  $('nextEvidence').textContent='Awaiting inference.';
  changed();
}
function fictionalExample(){
  const fields={
    caseName:'Fictional: the Meridian / Apex attribution dispute',
    aDoi:'',aTitle:'Meridian: a constraint-first method for stabilizing an oscillator',
    aAuthor:'Dr. Mira Vale (fictional)',aDate:'2024-02-12',aUrl:'',
    bDoi:'',bTitle:'Apex: dynamic stability by ordered constraints',
    bAuthor:'Dr. Felix North (fictional)',bDate:'2026-06-18',bUrl:'',
    comparison:'Both fictional papers describe a similar constraint ordering method. Technical equivalence and possible dependence have not been independently verified.'
  };
  const masks={prior:'1',overlap:'1',access:'?',credit:'0',independent:'?',primary:'?',conflict:'?'};
  const conditions={};for(const def of ORACLES)conditions[def.id]={mask:masks[def.id],source:'',confidence:0.75};
  setCase({schema:'credemia-case-v1',fields,conditions});
  $('caseSummary').textContent='FICTIONAL TRAINING CASE loaded. Dates and claims are invented, not independently verified. Run QCDS to inspect what cannot yet be concluded.';
  $('sources').scrollIntoView({behavior:'smooth',block:'start'});
}
function clearCase(){
  const fields={};for(const id of FIELD_IDS)fields[id]='';
  const conditions={};for(const def of ORACLES)conditions[def.id]={mask:'?',source:'',confidence:0.75};
  setCase({schema:'credemia-case-v1',fields,conditions});
  $('sources').scrollIntoView({behavior:'smooth',block:'start'});
}
function normalizeDOI(text){
  return text.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').replace(/^doi:\s*/i,'').trim();
}
function crossrefDate(message){
  for(const key of ['published-online','published-print','published','issued']){
    const parts=message[key]&&message[key]['date-parts']&&message[key]['date-parts'][0];
    if(Array.isArray(parts)&&parts.length>=1&&Number(parts[0])>=1600){
      return {text:parts.join('-'),full:parts.length>=3,date:parts.length>=3?parts.slice(0,3).map((p,i)=>i?String(p).padStart(2,'0'):String(p)).join('-'):''};
    }
  }
  return null;
}
async function lookup(which){
  const doi=normalizeDOI(fieldValue(which+'Doi'));const status=$(which+'Status');const btn=$('lookup'+which.toUpperCase());
  if(!/^10\.\d{4,9}\/\S+$/i.test(doi)){status.textContent='Enter a valid DOI starting with 10.';status.className='lookup-status err';return;}
  btn.disabled=true;status.textContent='Checking Crossref / DataCite DOI registries…';status.className='lookup-status';
  session.lookups[which]=null;
  try{
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),14000);
    let item=null;
    try{
      const response=await fetch('https://api.crossref.org/works/'+encodeURIComponent(doi),{headers:{Accept:'application/json'},signal:controller.signal});
      if(response.ok){
        const message=(await response.json()).message;
        if(!message||!message.DOI)throw new Error('Crossref response has no DOI');
        const date=crossrefDate(message);
        const refs=Array.isArray(message.reference)?message.reference:[];
        item={
          doi:message.DOI,provider:'Crossref',date,
          title:Array.isArray(message.title)?String(message.title[0]||''):'',
          author:(message.author||[]).slice(0,5).map(p=>[p.given,p.family].filter(Boolean).join(' ')).join(', '),
          referenceCount:refs.length,
          referenceDois:refs.map(ref=>normalizeDOI(String(ref.DOI||ref.doi||'')).toLowerCase()).filter(Boolean)
        };
      }else if(response.status!==404)throw new Error('Crossref returned HTTP '+response.status);
      if(!item){
        const fallback=await fetch('https://api.datacite.org/dois/'+encodeURIComponent(doi),{headers:{Accept:'application/vnd.api+json'},signal:controller.signal});
        if(!fallback.ok)throw new Error('DataCite returned HTTP '+fallback.status);
        const attributes=(await fallback.json()).data?.attributes;
        if(!attributes||!attributes.doi)throw new Error('DataCite response has no DOI');
        const dateRows=Array.isArray(attributes.dates)?attributes.dates:[];
        const rawDate=dateRows.find(d=>['Issued','Available','Created'].includes(String(d.dateType)))?.date||attributes.published||String(attributes.publicationYear||'');
        const dateText=String(rawDate||'').slice(0,10);
        const date=/^\d{4}-\d{2}-\d{2}$/.test(dateText)?{text:dateText,full:true,date:dateText}:dateText?{text:dateText,full:false,date:''}:null;
        const related=Array.isArray(attributes.relatedIdentifiers)?attributes.relatedIdentifiers:[];
        const refs=related.filter(x=>['References','Cites'].includes(String(x.relationType))&&String(x.relatedIdentifierType||'').toUpperCase()==='DOI');
        item={
          doi:attributes.doi,provider:'DataCite',date,
          title:String((attributes.titles||[])[0]?.title||''),
          author:(attributes.creators||[]).slice(0,5).map(person=>person.name||[person.givenName,person.familyName].filter(Boolean).join(' ')).join(', '),
          referenceCount:refs.length,
          referenceDois:refs.map(x=>normalizeDOI(String(x.relatedIdentifier)).toLowerCase())
        };
      }
    }finally{clearTimeout(timeout);}
    if(item.title)$(which+'Title').value=item.title.slice(0,260);
    if(item.author)$(which+'Author').value=item.author.slice(0,220);
    if(item.date&&item.date.full)$(which+'Date').value=item.date.date;
    if(!fieldValue(which+'Url'))$(which+'Url').value='https://doi.org/'+item.doi;
    session.lookups[which]={
      doi:item.doi,title:item.title,published:item.date?item.date.text:null,
      exactDate:item.date&&item.date.full?item.date.date:null,
      referenceCount:item.referenceCount,referenceDois:item.referenceDois,
      checkedAt:new Date().toISOString(),provider:item.provider
    };
    status.textContent=item.provider+' metadata: '+(item.date?item.date.text+' ('+(item.date.full?'day known':'partial date')+')':'publication date missing')+'. This is bibliographic metadata, not scientific validation.';
    status.className='lookup-status ok';
    updateChronology();
    changed();
  }catch(error){status.textContent='DOI lookup failed: '+String(error.message||error)+'. Manual input remains possible.';status.className='lookup-status err';changed();}
  finally{btn.disabled=false;}
}
function updateCitation(){
  const host=$('citationStatus'),a=session.lookups.a,b=session.lookups.b;
  if(!a||!b){host.textContent='DOI citation check: retrieve both works from Crossref or DataCite. Missing deposited references are not evidence of omitted attribution.';return;}
  const matches=Array.isArray(b.referenceDois)&&b.referenceDois.includes(normalizeDOI(a.doi).toLowerCase());
  if(matches)host.textContent=b.provider+' metadata for work B lists DOI '+a.doi+' as a reference. This establishes a deposited DOI citation, NOT whether scientific credit is adequate.';
  else host.textContent='No direct DOI match was found in B’s '+b.referenceCount+' deposited '+b.provider+' reference records. Deposits may be incomplete or use other identifiers; this does NOT prove absence of citation or credit.';
}
function updateChronology(){
  const a=session.lookups.a,b=session.lookups.b;
  updateCitation();
  if(!a||!b||!a.exactDate||!b.exactDate)return;
  $('v-prior').value=a.exactDate<b.exactDate?'1':'0';
  $('s-prior').value='https://doi.org/'+a.doi;
  $('c-prior').value='0.95';
  const chip=document.querySelector('[data-oracle="prior"] .status-chip');
  if(chip){chip.textContent='CROSSREF DATE METADATA';chip.classList.add('attested');}
}
function initCore(){
  const worker=new Worker(new URL('../session_core_worker.js',location.href));session.worker=worker;
  let initializeResolve,initializeReject;
  session.ready=new Promise((resolve,reject)=>{initializeResolve=resolve;initializeReject=reject;});
  const requests=new Map();let counter=0;
  worker.onmessage=event=>{
    const msg=event.data||{};
    if(msg.type==='ready'){initializeResolve();$('engineStatus').textContent='Canonical QCDS core ready · Python / WebAssembly';$('engineStatus').className='ready';return;}
    if(msg.type==='error'){initializeReject(new Error(msg.error||'Core initialization failed'));return;}
    const pending=requests.get(msg.id);
    if(pending){requests.delete(msg.id);if(msg.error)pending.reject(new Error(msg.error));else pending.resolve(msg.result);}
    else if(msg.error&&counter===0){initializeReject(new Error(msg.error));$('engineStatus').textContent=msg.error;$('engineStatus').className='error';}
  };
  worker.onerror=e=>{initializeReject(new Error(e.message||'Worker failed'));$('engineStatus').textContent='Could not start WebAssembly worker. Network or content blocker?';$('engineStatus').className='error';};
  worker.postMessage({type:'init',packageUrl:new URL('../qcds_fabric.zip',location.href).href});
  return async function(payload){
    await session.ready;
    return new Promise((resolve,reject)=>{const id=++counter;requests.set(id,{resolve,reject});worker.postMessage({type:'run',id,payload});});
  };
}
let coreRun;
function qcdsPayload(snapshot,def){
  const item=snapshot.conditions[def.id];
  const evidence=[];
  if(item.mask!=='?'){
    const fromCrossref=def.id==='prior'&&session.lookups.a&&session.lookups.b&&session.lookups.a.exactDate&&session.lookups.b.exactDate&&
      snapshot.fields.aDate===session.lookups.a.exactDate&&snapshot.fields.bDate===session.lookups.b.exactDate;
    evidence.push({
      subject:'research-comparison',predicate:def.id,value:item.mask==='1'?'supported':'contradicted',
      source_id:fromCrossref?'crossref:published-dates':(item.source?'user-linked:'+def.id:'user-assertion:'+def.id),
      confidence:item.confidence,polarity:true
    });
  }
  return {
    space:{domain_id:'credemia-'+def.id,title:'CREDEMIA / '+def.short,tagline:'Scientific credit / evidence and priority',audience:'Researchers and reviewers',
      universe_mode:'simulation',description:'Explicit source-labelled attribution questions without invented evidence.',
      challenge:'Is this specific research attribution condition supported, contradicted or unknown?',
      learning_target:'Preserve uncertainty and source attribution.',
      explore_prompt:'What independent primary evidence could falsify this condition?',
      observations:[{binding_id:'credemia-context-'+def.id,terms:['research-comparison',def.id,'evaluation'],source_id:'credemia:context',confidence:1.0}],starter_rules:[],truth_boundary:{external_truth_claim:false,solution_rule_supplied:false,starting_lab_modifies_reality:false}},
    probe:{subject:'research-comparison',predicate:def.id,candidate_values:['supported','contradicted']},
    evidence,max_width:12
  };
}
function probability(result,value){
  const candidates=result.stabilized||[];
  const item=candidates.find(row=>row.value===value);
  return item?Number(item.probability):0.5;
}
function classification(result){
  const p=probability(result,'supported');
  if(p>=0.8)return 'SUPPORTED UNDER PROVIDED ASSUMPTIONS';
  if(p<=0.2)return 'CONTRADICTED UNDER PROVIDED ASSUMPTIONS';
  return 'UNRESOLVED';
}
function drawResults(runs){
  const host=$('results');host.replaceChildren();
  for(const def of ORACLES){
    const result=runs[def.id],p=probability(result,'supported');
    const row=element('div','result');
    row.append(element('h5','',def.short));
    const bar=element('div','bar'),fill=element('div');fill.style.width=(100*p).toFixed(1)+'%';bar.append(fill);
    row.append(bar,element('div','percent',(p*100).toFixed(1)+'%'));
    row.append(element('small','',classification(result)+' · mask '+$('v-'+def.id).value+' · core width '+String(result.logical_width||'?')+' · no external truth claim'));
    host.append(row);
  }
  const conflict=ORACLES.flatMap(def=>runs[def.id].conflict_markers||[]);
  host.append(element('p','analysis-footer','7 explicit logical probes · canonical QCDS Fabric · no browser scoring surrogate · conflict markers: '+conflict.length+'. Percentages are conditional inference outputs, NOT validated real-world odds of misconduct.'));
}
function supported(runs,id){return probability(runs[id],'supported')>=0.8;}
function contradicted(runs,id){return probability(runs[id],'supported')<=0.2;}
function summarize(snapshot,runs){
  const p=supported(runs,'prior'),o=supported(runs,'overlap'),a=supported(runs,'access'),c=supported(runs,'credit'),i=supported(runs,'independent'),x=supported(runs,'conflict');
  const messages=[];
  if(!snapshot.fields.aTitle||!snapshot.fields.bTitle)messages.push('The comparison is incomplete: supply identifiable works A and B.');
  if(p&&o)messages.push('The supplied conditions support an earlier documented work and a specific alleged technical overlap.');
  else if(p)messages.push('Chronological priority is asserted, but distinctive technical overlap is not established.');
  else if(o)messages.push('Technical overlap is asserted, but chronological priority is not established.');
  else messages.push('Neither documented priority nor distinctive technical overlap is established by the present input.');
  if(p&&o&&a&&!c&&!i&&!x)messages.push('An attribution question deserves further expert review: possible access is asserted, but missing credit and independent derivation have not both been resolved.');
  if(c)messages.push('An attribution pathway is asserted to be adequately credited; inspect whether the citation actually covers the contribution.');
  if(i)messages.push('An independent development pathway is asserted; examine its dated primary records.');
  if(x)messages.push('Contrary evidence is present. No one-sided attribution narrative should be bound.');
  if(!a)messages.push('Access and dependence cannot be inferred from resemblance or chronology alone.');
  messages.push('STATUS: INDETERMINATE AS TO COPYING, INTENT OR MISCONDUCT. This tool does not decide ownership or award entitlement.');
  $('caseSummary').textContent=messages.join('\n\n');
  const next=[];
  for(const def of ORACLES){
    const value=snapshot.conditions[def.id];
    if(value.mask==='?')next.push('Find independent, dated primary records addressing: '+def.name+'.');
    else if(!value.source&&!(def.id==='prior'&&session.lookups.a&&session.lookups.b))next.push('Attach and inspect a primary citation for: '+def.short+'.');
  }
  if(!next.length)next.push('Independently reproduce the technical comparison and invite a documented counterargument from both sides.');
  next.push('Check whether apparent independent citations originate from one shared source.');
  next.push('Review preprints, repositories, notebooks and correspondence under appropriate access rights. Date of public release differs from date of invention.');
  const list=element('ol');for(const q of next)list.append(element('li','',q));
  $('nextEvidence').replaceChildren(list);
}
async function runAnalysis(){
  if(session.running)return;
  session.running=true;session.stale=false;$('run').disabled=true;
  const snapshot=getSnapshot();
  try{
    if(!snapshot.fields.aTitle||!snapshot.fields.bTitle)throw new Error('Enter titles for work A and work B before running QCDS.');
    await session.ready;
    const runs={};
    for(let n=0;n<ORACLES.length;n++){
      const def=ORACLES[n];$('engineStatus').textContent='Core running: '+(n+1)+' / '+ORACLES.length+' — '+def.short;
      runs[def.id]=await coreRun(qcdsPayload(snapshot,def));
      if(runs[def.id].core_execution!=='qcds_fabric.problem.problem_to_syntract')throw new Error('Unexpected inference engine; refusing to show results.');
    }
    session.lastRuns=runs;session.lastSnapshot=snapshot;
    drawResults(runs);summarize(snapshot,runs);
    $('engineStatus').textContent='QCDS finished · '+ORACLES.length+' canonical core executions · no verdict invented';
    $('engineStatus').className='ready';
    $('results').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){$('engineStatus').textContent='Could not complete core inference: '+String(e.message||e);$('engineStatus').className='error';}
  finally{session.running=false;$('run').disabled=false;}
}
function markdownReport(snapshot,runs){
  const f=snapshot.fields;
  const lines=[
    '# CREDEMIA — QCDS Scientific Credit Lab',
    '',
    'Case: '+(f.caseName||'Unnamed'), 'Exported: '+new Date().toISOString(),
    'STATUS: Experimental evidentiary analysis, not a finding of plagiarism, copying, intent or entitlement.',
    '',
    '## Work A','Title: '+f.aTitle,'Author: '+f.aAuthor,'Public date (claimed/metadata): '+f.aDate,'DOI: '+f.aDoi,'URL: '+f.aUrl,'',
    '## Work B','Title: '+f.bTitle,'Author: '+f.bAuthor,'Public date (claimed/metadata): '+f.bDate,'DOI: '+f.bDoi,'URL: '+f.bUrl,'',
    '## Specific technical comparison',f.comparison||'Not supplied','',
    '## Source metadata audit',JSON.stringify(snapshot.lookups,null,2),'',
    '## Explicit oracles / QCDS stabilized distributions'
  ];
  for(const def of ORACLES){
    const item=snapshot.conditions[def.id],result=runs&&runs[def.id];
    lines.push('', '### '+def.short,'Condition: '+def.name,'Input mask: '+item.mask,'Source link/record: '+(item.source||'(none supplied)'),
      'User-selected assertion confidence: '+item.confidence,
      'QCDS P(supported | submitted oracles): '+(result?probability(result,'supported').toFixed(6):'not run'),
      'Core: '+(result?result.core_execution:'not run'),
      'Core conflict markers: '+(result?JSON.stringify(result.conflict_markers||[]):'not run'));
  }
  lines.push('','## Conditional synthesis', $('caseSummary').textContent,'','## Next evidence',
    $('nextEvidence').textContent,'','## Boundaries',
    'Crossref only retrieves metadata; it does not verify the content, access, intent or derivation of scientific work.',
    'QCDS inference outputs are conditional on explicitly entered assertions and the compilation, not calibrated misconduct probabilities.',
    'A DOI date can differ from preprints, earlier versions, patent disclosures and private work. Research credit requires expert assessment.',
    'Publication does not license reuse of CREDEMIA source or product.',
    '','Theory and creation by Patrik Sundblom',
    'with OpenAI / ChatGPT as research & development support',
    'Licensed separately: ./LICENSE.md');
  return lines.join('\n');
}
function downloadFile(filename,text,format){
  const blob=new Blob([text],{type:format});const url=URL.createObjectURL(blob);
  const a=element('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function exportReport(){
  if(!session.lastRuns||session.stale){alert('Run QCDS with the current input before exporting an inference report.');return;}
  downloadFile('credemia-evidence-report.md',markdownReport(session.lastSnapshot,session.lastRuns),'text/markdown;charset=utf-8');
}
function exportCase(){
  const data=getSnapshot();data.lastRun=session.lastRuns&&!session.stale?{at:new Date().toISOString(),engine:'qcds_fabric.problem.problem_to_syntract',results:session.lastRuns}:null;
  downloadFile('credemia-case.json',JSON.stringify(data,null,2),'application/json;charset=utf-8');
}
function bindEvents(){
  for(const id of FIELD_IDS){
    $(id).addEventListener('change',changed);
    if(id==='aDoi'||id==='bDoi'||id==='aDate'||id==='bDate'){
      $(id).addEventListener('input',()=>{const w=id[0];session.lookups[w]=null;updateCitation();const chip=document.querySelector('[data-oracle="prior"] .status-chip');if(chip&&chip.classList.contains('attested')){$('v-prior').value='?';$('s-prior').value='';$('c-prior').value='0.75';}if(chip){chip.textContent='USER ASSERTION';chip.classList.remove('attested');}changed();});
    }
  }
  $('loadExample').addEventListener('click',fictionalExample);
  $('clearCase').addEventListener('click',clearCase);
  $('lookupA').addEventListener('click',()=>lookup('a'));
  $('lookupB').addEventListener('click',()=>lookup('b'));
  $('run').addEventListener('click',runAnalysis);
  $('exportMd').addEventListener('click',exportReport);
  $('exportJson').addEventListener('click',exportCase);
  $('importJson').addEventListener('change',async event=>{
    const file=event.target.files&&event.target.files[0];if(!file)return;
    try{
      if(file.size>200000)throw new Error('Case file is too large.');
      const data=JSON.parse(await file.text());setCase(data);
    }catch(e){alert('Could not import case: '+String(e.message||e));}
    finally{event.target.value='';}
  });
}
renderOracles();bindEvents();
try{coreRun=initCore();}catch(error){$('engineStatus').textContent=String(error.message||error);$('engineStatus').className='error';}
