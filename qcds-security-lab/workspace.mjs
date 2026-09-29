// QCDS by Patrik Sundblom. Contributor: ChatGPT (OpenAI). LICENSE.md.
export const WORKSPACE_KEY = 'qcds-security-lab:workspace:v1';
export const isCaseId = id => /^(portal|support|knowledge|coding|invoice|custom|case-[a-z0-9-]{1,70})$/.test(id);
export function restoreWorkspace(saved, validate) {
  if (!saved || typeof saved !== 'object' || !isCaseId(saved.caseId)) return null;
  const cases = {}, places = {}, archived = [], rejected = [];
  for (const [id, value] of Object.entries(saved.cases || {})) {
    if (!isCaseId(id)) continue;
    try {
      cases[id] = validate(value);
      if(cases[id].example && value.input?.flags?.ai_component === undefined) cases[id].input.flags.ai_component = id === "portal" ? false : true;
      if (typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt))) cases[id].updatedAt = value.updatedAt;
      const place = saved.places?.[id];
      places[id] = {question:Number.isInteger(place?.question) ? Math.min(5,Math.max(1,place.question)) : 1, findingId:typeof place?.findingId === 'string' ? place.findingId.slice(0,100) : null};
      if (saved.archived?.includes(id) && id !== saved.caseId) archived.push(id);
    } catch { rejected.push(id); }
  }
  const caseId = cases[saved.caseId] ? saved.caseId : Object.keys(cases)[0];
  return caseId ? {caseId,cases,places,archived,rejected,recovery:rejected.length?JSON.stringify(saved):saved.recovery||null} : null;
}
export function writeWorkspace(storage, state) {
  // One atomic setItem: quota failure leaves the previously saved workspace intact.
  storage.setItem(WORKSPACE_KEY,JSON.stringify({caseId:state.caseId,cases:state.cases,places:state.places,archived:state.archived,...(state.recovery?{recovery:state.recovery}:{})}));
}
export function copyAsOwnProject(project, name) {
  const copy=structuredClone(project);
  copy.example=false;
  copy.input.name=name || `${project.input.name} · copy`;
  // Synthetic example observations must never become a consumer's evidence.
  if(project.example){copy.evidence=[];copy.actions={};delete copy.research;}
  copy.updatedAt=new Date().toISOString();
  return copy;
}
export const STARTERS = [
  {id:'personal',icon:'shield',name:'My digital life',description:'Email, shared accounts, cloud files and connected services.',goal:'Access my private information or take over one of my accounts.',assets:['Personal information','Accounts','Private files']},
  {id:'business',icon:'system',name:'My small business',description:'Customer records, invoices, staff access and suppliers.',goal:'Access customer information or change a business payment without permission.',assets:['Customer information','Payments','Business operations']},
  {id:'app',icon:'grid',name:'A website or app',description:'A product, service, API or connected system.',goal:'Access another user’s data or perform an action without permission.',assets:['User data','Service access','Availability']},
  {id:'ai',icon:'spark',name:'An AI workflow',description:'An assistant that reads information or performs actions.',goal:'Use untrusted input to make the assistant disclose private information or perform an unauthorized action.',assets:['Sensitive information','Connected actions','Credentials']},
];
