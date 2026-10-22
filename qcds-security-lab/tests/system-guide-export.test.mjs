// QCDS Security Lab dynamic system guide regression tests.
// The generated guide has no case dependency and inherits live engine metadata.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSystemGuidePdf,buildSystemGuideCatalog } from '../system-guide-pdf.mjs';
import { CONDITION_DEFS,LENSES,VERSION } from '../engine.mjs';
import { ATTACK_VECTOR_SEEDS,ROUTE_VARIANTS,TARGETS } from '../attack-vectors.mjs';

const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');
class DrawingStub {
  constructor(){this.count=1;this.outOfBounds=[];}
  addPage(){this.count++;}
  getNumberOfPages(){return this.count;}
  setTextColor(){} setFillColor(){} setDrawColor(){}
  setFont(){} setFontSize(){} setLineWidth(){}
  rect(){} roundedRect(){} line(){} circle(){} addImage(){}
  addFileToVFS(){} addFont(){} setProperties(){}
  splitTextToSize(value,width){
    const limit=Math.max(10,Math.floor(width/5));
    return String(value).split('\n').flatMap(p=>{
      const out=[];let buffer='';
      for(const word of p.split(/\s+/)){
        if(buffer && (buffer+' '+word).length>limit){out.push(buffer);buffer=word;}
        else buffer+=(buffer?' ':'')+word;
      }
      if(buffer)out.push(buffer);
      return out;
    });
  }
  text(text,x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>596||y<0||y>843)
      this.outOfBounds.push({x,y,text});
  }
}
test('universal PDF is generated from current engine and no case',()=>{
  const data=buildSystemGuideCatalog();
  const result=createSystemGuidePdf(DrawingStub);
  assert.equal(result.summary.frameworks,Object.keys(LENSES).length);
  assert.equal(result.summary.conditions,CONDITION_DEFS.length);
  assert.equal(result.summary.mechanismSeeds,ATTACK_VECTOR_SEEDS.length);
  assert.equal(result.summary.engineVersion,String(VERSION));
  assert.equal(result.summary.pages,data.length+2);
  assert.deepEqual(result.doc.outOfBounds,[]);
});
test('a newly declared lens and coordinate appear automatically',()=>{
  const lenses={...LENSES,'New Safety Lens':{tests:[['new_safe','Model new safety exposure']]}};
  const conditionDefs=[...CONDITION_DEFS,['new_safe','A new condition added later']];
  const catalog={lenses,conditionDefs,
    seeds:ATTACK_VECTOR_SEEDS,variants:ROUTE_VARIANTS,targets:TARGETS,engineVersion:'99.1'};
  const pages=buildSystemGuideCatalog(catalog);
  assert.ok(pages.some(p=>p.title==='New Safety Lens'));
  assert.ok(pages.some(p=>p.cards.some(row=>row[1].includes('A new condition added later'))));
  const result=createSystemGuidePdf(DrawingStub,{catalog});
  assert.equal(result.summary.frameworks,Object.keys(LENSES).length+1);
  assert.equal(result.summary.conditions,CONDITION_DEFS.length+1);
  assert.equal(result.summary.engineVersion,'99.1');
  assert.equal(result.summary.pages,pages.length+2);
});
test('route vocabulary is pulled from the attack vector implementation',()=>{
  const text=buildSystemGuideCatalog().map(p=>JSON.stringify(p)).join(' ');
  assert.ok(text.includes(String(ATTACK_VECTOR_SEEDS.length)));
  assert.ok(text.includes(String(Object.keys(ROUTE_VARIANTS).length)));
  assert.ok(text.includes(String(Object.keys(TARGETS).length)));
});
test('Reports has a separate case-free system guide action',()=>{
  const app=read('../app-stage-v118.js'),exp=read('../report-export.js');
  assert.ok(app.includes('data-action="system-guide-pdf"'));
  assert.ok(app.includes('case "system-guide-pdf"'));
  assert.ok(exp.includes('export async function downloadSystemGuidePdf()'));
  assert.ok(exp.includes('createVisualGlasswingPdf(jsPDF,'));
  assert.ok(exp.includes('QCDS-Project-Glasswing-Security-Lab-System-Guide.pdf'));
  assert.ok(!exp.includes('canvas.toDataURL('));
});
