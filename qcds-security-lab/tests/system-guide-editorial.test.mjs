import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGuideModel,guideOutline,createEditorialSystemGuidePdf} from '../system-guide-editorial.mjs';
import {VERSION,CONDITION_DEFS,FIELD_META,LENSES} from '../engine.mjs';
import {ATTACK_VECTOR_SEEDS,ROUTE_VARIANTS,TARGETS} from '../attack-vectors.mjs';

const facts={
  appRelease:'1.26.1-guide-preview',engineVersion:VERSION,
  conditions:CONDITION_DEFS,fieldMeta:FIELD_META,lenses:LENSES,
  seeds:ATTACK_VECTOR_SEEDS,variants:ROUTE_VARIANTS,targets:TARGETS,
  generatedAt:'2026-10-22',
};
class PDFStub{
  constructor(){this.page=1;this.pages=1;this.outside=[];this.seen=[];}
  addPage(){this.page=++this.pages;} setPage(i){this.page=i;}
  getNumberOfPages(){return this.pages;}
  getTextWidth(v){return String(v).length*5.1;}
  setFont(){}setFontSize(){}setFillColor(){}setTextColor(){}
  setDrawColor(){}setLineWidth(){}rect(){}line(){}roundedRect(){}circle(){}
  addImage(){}setProperties(){}
  text(str,x,y){this.seen.push([str,x,y,this.page]);if(x<0||y<0||x>595.28||y>841.89)this.outside.push({str,x,y,page:this.page});}
}
test('Live QCDS definitions are the unique source for the guide',()=>{
  const model=buildGuideModel(facts);
  assert.equal(model.conditions.length,CONDITION_DEFS.length);
  assert.equal(model.lenses.length,Object.keys(LENSES).length);
  assert.equal(model.seeds.length,ATTACK_VECTOR_SEEDS.length);
  assert.equal(model.variants.length,Object.keys(ROUTE_VARIANTS).length);
  assert.equal(model.targets.length,Object.keys(TARGETS).length);
  assert.equal(guideOutline(model)[2][1],'The Security Lenses');
  assert.equal(guideOutline(model)[3][1],'Attack Vector Fabric');
});
test('New lenses, conditions and attack mechanisms appear in the next export',()=>{
  const expanded=buildGuideModel({
    ...facts,
    conditions:[...CONDITION_DEFS,['future_dimension','The future dimension explanation']],
    lenses:{...LENSES,'New Threat View':{tests:[['future_dimension','The new question to evaluate']]}},
    seeds:[...ATTACK_VECTOR_SEEDS,{id:'FUTURE',title:'New attack mechanism',mechanism:'New possible route'}],
  });
  assert.equal(expanded.conditions.length,CONDITION_DEFS.length+1);
  assert.equal(expanded.lenses.length,Object.keys(LENSES).length+1);
  assert.equal(expanded.seeds.length,ATTACK_VECTOR_SEEDS.length+1);
  assert.ok(expanded.lenses.find(x=>x.name==='New Threat View').tests[0].question.includes('new question'));
});
test('Fully paginated PDF is independent of the current case',()=>{
  const result=createEditorialSystemGuidePdf(PDFStub,facts);
  assert.equal(result.summary.lenses,Object.keys(LENSES).length);
  assert.equal(result.summary.conditions,CONDITION_DEFS.length);
  assert.equal(result.summary.mechanisms,ATTACK_VECTOR_SEEDS.length);
  assert.ok(result.summary.pages>=16);
  assert.deepEqual(result.doc.outside,[]);
  assert.ok(result.doc.seen.some(x=>String(x[0]).includes('PROJECT GLASSWING')));
});
test('Long extensions paginate with no page-overflow coordinates',()=>{
  const massive={...facts,
    conditions:[...CONDITION_DEFS,...Array.from({length:30},(_,i)=>['new'+i,'This very long description has a paragraph of dynamically added explanation that is deliberately extended to check whether the page engine can wrap and continue rather than draw outside the page boundaries. '.repeat(3)])]};
  const result=createEditorialSystemGuidePdf(PDFStub,massive);
  assert.ok(result.summary.pages>22);
  assert.equal(result.doc.outside.length,0);
});
