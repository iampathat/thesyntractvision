/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Camera-independent materials derived from the same complete QCDS world oracle.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function worldSurface(oracle){
 if(!oracle || !Array.isArray(oracle.sunDirection) || oracle.sunDirection.length!==3)throw Error('Missing joint world oracle');
 const sun=oracle.sunDirection;
 if(!sun.every(Number.isFinite))throw Error('Invalid sunlight vector');
 const wet=clamp(Number(oracle.roadWetness)||0,0,1);
 const rough=clamp(Number(oracle.surfaceRoughness)??.83,0,1);
 const shadow=clamp(Number(oracle.shadowStrength)||0,0,1);
 const relief=clamp(Number(oracle.relief)||0,0,60);
 const density=clamp(Number(oracle.forestDensity)||0,0,1);
 const late=sun[1]<.6;
 const roadDry=[.38,.36,.32],roadWet=[.19,.21,.23];
 const road=roadDry.map((v,i)=>v*(1-wet)+roadWet[i]*wet);
 const terrain=[.29-relief*.0005,.37-relief*.0008,.23];
 const crowns=[.17+density*.035,.32+density*.08,.17];
 return Object.freeze({road,terrain,crowns,trunks:[.32,.245,.17],water:[.12,.32,.4],sun:[...sun],wetness:wet,roughness:rough,shadow,late});
}
