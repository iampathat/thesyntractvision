import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisualGlasswingPdf} from '../system-guide-visual-v4.mjs';
import {VERSION,CONDITION_DEFS,FIELD_META,LENSES} from '../engine.mjs';
import {ATTACK_VECTOR_SEEDS,ROUTE_VARIANTS,TARGETS} from '../attack-vectors.mjs';
class Doc {
 constructor(){this.count=1;this.current=1;this.outside=[];this.strings=[];}
 addPage(){this.current=++this.count;}
 getNumberOfPages(){return this.count;}
 setPage(n){this.current=n;}
 addFileToVFS(){} addFont(){}
 setFont(){}setFontSize(){}setDrawColor(){}setTextColor(){}setFillColor(){}setLineWidth(){}
 rect(){}line(){}roundedRect(){}circle(){}addImage(){}setProperties(){}
 getTextWidth(s){return String(s).length*5;}
 text(s,x,y){this.strings.push({s,x,y,page:this.current});if(x<0||x>596||y<0||y>842)this.outside.push({s,x,y,page:this.current});}
}
const snapshot={
 appRelease:'1.26.5',engineVersion:VERSION,conditions:CONDITION_DEFS,fieldMeta:FIELD_META,lenses:LENSES,
 seeds:ATTACK_VECTOR_SEEDS,variants:ROUTE_VARIANTS,targets:TARGETS,generatedAt:'2026-10-22'
};
test('Visual guide keeps the exact 18-page publication rhythm rather than listing 38 pages of boxes',()=>{
 const {doc,summary}=createVisualGlasswingPdf(Doc,snapshot);
 assert.equal(summary.pages,18);
 assert.equal(doc.count,18);
 assert.deepEqual(doc.outside,[]);
 assert.equal(summary.conditions,CONDITION_DEFS.length);
 assert.equal(summary.lenses,Object.keys(LENSES).length);
 assert.equal(summary.mechanisms,ATTACK_VECTOR_SEEDS.length);
});
test('The approved chapter order is conditions, security frameworks, attack vectors, recursion, execution',()=>{
 const {doc}=createVisualGlasswingPdf(Doc,snapshot);
 const all=doc.strings.map(x=>x.s).join('  ');
 for(const word of ['PROJECT GLASSWING','The seven security lenses','Attack vectors across the system landscape','Recursive inference','Execution and truth-alignment']){
   assert.ok(all.includes(word),word);
 }
 const chapterPages=doc.strings.filter(x=>/The seven security lenses|Attack vectors across the system landscape/.test(x.s));
 assert.equal(chapterPages.length,2);
 assert.ok(chapterPages[0].page<chapterPages[1].page);
});
test('New source definitions update stats without enlarging the editorial page count',()=>{
 const modified={...snapshot,
  conditions:[...CONDITION_DEFS,['future_condition','A new checkable coordinate']],
  seeds:[...ATTACK_VECTOR_SEEDS,{id:'FUTURE',title:'New possible mechanism'}],
  lenses:{...LENSES,'New Security Lens':{tests:[]}}};
 const a=createVisualGlasswingPdf(Doc,modified);
 assert.equal(a.summary.pages,18);
 assert.equal(a.summary.conditions,CONDITION_DEFS.length+1);
 assert.equal(a.summary.mechanisms,ATTACK_VECTOR_SEEDS.length+1);
 assert.equal(a.summary.lenses,Object.keys(LENSES).length+1);
 assert.deepEqual(a.doc.outside,[]);
});
