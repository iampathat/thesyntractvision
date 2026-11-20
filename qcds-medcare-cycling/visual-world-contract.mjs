/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Fail-closed audit of real Chromium evidence; no image synthesis.
 */
import fs from 'node:fs';
export function validateVisualWorld(result) {
  const fail = message => { throw Error('Syntract Graphics visual world contract: '+message); };
  if (!result || result.failure || result.errors?.length || result.consoleErrors?.length) fail('browser errors or missing result');
  if (result.result?.webgl2 !== true || result.result?.visible !== true || result.result?.webglError !== 0) fail('live visible WebGL2 required');
  const g=result.forestGeometry, p=result.forestPixelEvidence;
  if (!g || !p || !(g.forestDensity>0)) fail('selected QCDS world must contain forest');
  if (!(g.trunkTriangles>0 && g.crownTriangles>0)) fail('forest draw geometry missing');
  if (!(p.forestOnlyPixels>=100) || !(p.totalPixels>0)) fail('forest not visible in rendered pixels');
  const fixed=result.cameraMetadata?.fixed, random=result.randomEvidence?.random;
  if (!fixed || !random || !Array.isArray(fixed.position) || !Array.isArray(random.position)) fail('both live camera poses required');
  if (fixed.position.length!==3 || random.position.length!==3 || ![...fixed.position,...random.position].every(Number.isFinite)) fail('invalid camera coordinates');
  const distance=Math.hypot(...fixed.position.map((v,i)=>v-random.position[i]));
  if (distance<2) fail('cameras are not spatially distinct');
  return {forestPixels:p.forestOnlyPixels,forestTriangles:g.trunkTriangles+g.crownTriangles,cameraSeparation:distance};
}
if (process.argv[1] && import.meta.url === new URL('file://'+process.argv[1]).href) {
  const path=process.argv[2]||'qcds-medcare-cycling/visual-evidence/results.json';
  console.log('Syntract Graphics evidence PASS',validateVisualWorld(JSON.parse(fs.readFileSync(path,'utf8'))));
}
