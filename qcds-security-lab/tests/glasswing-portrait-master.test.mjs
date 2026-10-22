import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createVisualGlasswingPdf} from '../system-guide-visual-v4.mjs';
import {VERSION,CONDITION_DEFS,FIELD_META,LENSES} from '../engine.mjs';
import {ATTACK_VECTOR_SEEDS,ROUTE_VARIANTS,TARGETS} from '../attack-vectors.mjs';
const loader=readFileSync(new URL('../report-export.js',import.meta.url),'utf8');
class PDF {
 constructor(){this.n=1;this.pg=1;this.images=[];this.textBounds=[];}
 addPage(){this.pg=++this.n;}getNumberOfPages(){return this.n;}setPage(n){this.pg=n;}
 addFileToVFS(){}addFont(){}setFont(){}setFontSize(){}setTextColor(){}setDrawColor(){}
 setFillColor(){}setLineWidth(){}rect(){}roundedRect(){}line(){}circle(){}setProperties(){}
 getTextWidth(t){return String(t).length*5;}
 text(s,x,y){if(x<0||x>595.3||y<0||y>841.9)this.textBounds.push({s,x,y,page:this.pg});}
 addImage(bytes,format,x,y,w,h){this.images.push({format,x,y,w,h,page:this.pg});}
}
const snap={appRelease:'1.26.6',engineVersion:VERSION,conditions:CONDITION_DEFS,
 fieldMeta:FIELD_META,lenses:LENSES,seeds:ATTACK_VECTOR_SEEDS,variants:ROUTE_VARIANTS,
 targets:TARGETS,generatedAt:'2026-10-22'};
test('No more crop of portrait art to a 595x491 or 595x562 landscape window',()=>{
 assert.match(loader,/canvas\.width=1055; canvas\.height=1491/);
 assert.match(loader,/g\.drawImage\(img,\(canvas\.width-w\)\/2,\(canvas\.height-h\)\/2,w,h\)/);
 assert.doesNotMatch(loader,/cropW|cropH|glasswing-selected\.webp|595\s*\/\s*491|595\s*\/\s*562/);
 assert.match(loader,/ratio<0\.64 \|\| ratio>0\.79/);
});
test('All six artworks cover complete portrait A4; never obscured by duplicate title panels',()=>{
 const artwork={guardian:new Uint8Array(10),dimensions:new Uint8Array(10),lenses:new Uint8Array(10),
 attack:new Uint8Array(10),recursive:new Uint8Array(10),execution:new Uint8Array(10)};
 const {doc,summary}=createVisualGlasswingPdf(PDF,snap,{artwork});
 assert.equal(summary.pages,18);
 assert.equal(doc.images.length,6);
 assert.deepEqual(doc.images.map(x=>x.page),[1,3,6,10,12,14]);
 for(const image of doc.images){
  assert.equal(image.format,'JPEG');
  assert.equal(image.x,0);assert.equal(image.y,0);
  assert.ok(Math.abs(image.w-595.28)<.01);
  assert.ok(Math.abs(image.h-841.89)<.01);
 }
 assert.deepEqual(doc.textBounds,[]);
});
test('The other twelve pages retain source-driven facts',()=>{
 const added={...snap,conditions:[...CONDITION_DEFS,['future','New dimension']],
 lenses:{...LENSES,'Future lens':{tests:[]}},
 seeds:[...ATTACK_VECTOR_SEEDS,{id:'FUTURE',title:'Future possible route'}]};
 const {doc,summary}=createVisualGlasswingPdf(PDF,added);
 assert.equal(doc.n,18);
 assert.equal(summary.conditions,CONDITION_DEFS.length+1);
 assert.equal(summary.lenses,Object.keys(LENSES).length+1);
 assert.equal(summary.mechanisms,ATTACK_VECTOR_SEEDS.length+1);
 assert.deepEqual(doc.textBounds,[]);
});
