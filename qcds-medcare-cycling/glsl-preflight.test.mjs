/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Fail before Chromium when a WebGL shader introduces a reserved GLSL identifier.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const dir=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(resolve(dir,'qcds-world-webgl.js'),'utf8');
const shaders=[...source.matchAll(/const\s+(VERT|FRAG)\s*=\s*`([\s\S]*?)`\s*;/g)];
assert.equal(shaders.length,2,'Expected both live WebGL shader sources');
const reserved=new Set(['patch','sample','subroutine','common','partition','active','filter','input','output','resource','superp','asm','class','union','enum','typedef','template','this','packed','goto','inline','noinline','public','static','extern','external','interface','long','short','half','fixed','unsigned','namespace','using','cast','sizeof']);
function inspect(shader){
 const clean=shader.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
 const names=[...clean.matchAll(/\b(?:float|int|uint|bool|vec[234]|mat[234]|sampler2D)\s+([A-Za-z_]\w*)\b/g)].map(m=>m[1]);
 return names.filter(name=>reserved.has(name));
}
for(const [,name,shader] of shaders){assert.match(shader,/#version\s+300\s+es/);assert.deepEqual(inspect(shader),[],`${name} declares reserved GLSL identifiers`);}
assert.deepEqual(inspect('void main(){float patch=1.;}'),['patch'],'Regression: reserved patch must fail');
assert.deepEqual(inspect('void main(){float groundPatch=1.;}'),[]);
console.log('GLSL reserved identifier preflight PASS: live VERT/FRAG and mutation regression');
