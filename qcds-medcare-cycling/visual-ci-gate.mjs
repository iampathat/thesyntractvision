/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Read-only Actions gate: do not substitute PR/check status for push CI.
 */
const EVENTS=new Set(['push','workflow_dispatch']);
export function classifyRuns(payload,{sha,branch='main',workflow='qcds-cycling-visual.yml'}={}){
 if(!Array.isArray(payload?.workflow_runs))throw Error('Actions workflow_runs missing');
 const runs=payload.workflow_runs.filter(r=>EVENTS.has(r.event)&&r.head_branch===branch&&
  (typeof r.path==='string'&&r.path.split('@')[0].split('/').pop()===workflow));
 runs.sort((a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0)||
  (b.run_attempt||1)-(a.run_attempt||1));
 const r=runs[0];
 if(!r)return {gate:'UNKNOWN',reason:'No eligible push/dispatch run'};
 const common={runId:r.id,runSha:r.head_sha,event:r.event,url:r.html_url||null};
 if(!sha)return {...common,gate:'UNKNOWN',reason:'Expected HEAD SHA required'};
 if(r.head_sha!==sha)return {...common,gate:'UNKNOWN',reason:'Latest workflow run does not match repository HEAD',expectedSha:sha};
 if(r.status!=='completed')return {...common,gate:'PENDING',status:r.status};
 if(r.conclusion==='success')return {...common,gate:'GREEN'};
 return {...common,gate:'RED',conclusion:r.conclusion||'unknown'};
}
export async function probe({owner='iampathat',repo='thesyntractvision',sha,token=process.env.GITHUB_TOKEN,fetchImpl=fetch}={}){
 const base=`https://api.github.com/repos/${owner}/${repo}`;
 const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(token)headers.Authorization=`Bearer ${token}`;
 const paths=['/actions/workflows/qcds-cycling-visual.yml/runs?branch=main&per_page=100',
 '/actions/runs?branch=main&event=push&per_page=100',
 '/actions/runs?branch=main&event=workflow_dispatch&per_page=100'];
 const attempts=[],combined=[];
 for(const path of paths){
  try{
   const response=await fetchImpl(base+path,{headers});
   if(!response.ok){attempts.push({path,error:`HTTP ${response.status}`});continue;}
   const body=await response.json();
   if(!Array.isArray(body.workflow_runs)){attempts.push({path,error:'Missing workflow_runs'});continue;}
   combined.push(...body.workflow_runs);attempts.push({path,ok:true,count:body.workflow_runs.length});
   if(path.includes('/workflows/'))break;
  }catch(e){attempts.push({path,error:String(e?.message||e)});}
 }
 const result=combined.length?classifyRuns({workflow_runs:combined},{sha}):{gate:'UNKNOWN',reason:'Actions runs unavailable from all attempted endpoints'};
 return {...result,attempts};
}
if(process.argv[1]?.endsWith('/visual-ci-gate.mjs')){
 const sha=process.env.QCDS_EXPECTED_SHA;
 if(!sha){console.error('QCDS_EXPECTED_SHA required; refusing to guess HEAD');process.exit(3);}
 const result=await probe({sha});console.log(JSON.stringify(result,null,2));
 process.exitCode=result.gate==='GREEN'?0:result.gate==='RED'?2:3;
}
