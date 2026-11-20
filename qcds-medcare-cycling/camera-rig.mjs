/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Deterministic two-view camera contract for QCDS world visual regression.
 * Coordinates are metres: x lateral, y elevation, z forward.
 */
export const FIXED_CAMERA=Object.freeze({position:[0,3.4,-13],target:[0,1.2,20],fov:65});
function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let x=hash(seed)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
export function cameraPair({worldSeed='qcds-baseline',cameraSeed='camera-001',field=null}={}){
 const random=rng(`${worldSeed}:${cameraSeed}`);
 const z=25+random()*100,side=(random()<.5?-1:1)*(18+random()*16);
 const road=field?.road?.(z);
 const centerX=Number.isFinite(road?.x)?road.x:0;
 const x=centerX+side;
 const ground=field?.height?.(x,z);
 // The seeded second view must clear the forest canopy instead of sitting inside a crown.
 // Elevation is derived from the same QCDS terrain field used by all world geometry.
 const y=(Number.isFinite(ground)?ground:0)+24+random()*12;
 const focus=field?.road?.(z+42);
 const target=[Number.isFinite(focus?.x)?focus.x:0,Number.isFinite(focus?.y)?focus.y+1.4:1.4,z+42];
 const randomCamera={position:[x,y,z],target,fov:65};
 if(randomCamera.position.some(v=>!Number.isFinite(v))||target.some(v=>!Number.isFinite(v)))throw Error('Non-finite camera geometry');
 return {worldSeed:String(worldSeed),cameraSeed:String(cameraSeed),fixed:{...FIXED_CAMERA,position:[...FIXED_CAMERA.position],target:[...FIXED_CAMERA.target]},random:randomCamera};
}
