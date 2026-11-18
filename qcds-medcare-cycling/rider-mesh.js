/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Articulated cycling mesh, procedural fallback until licensed rigged GLB is available.
 * Local metres: bicycle rolls along +Z. Cadence drives cranks, knees and feet.
 */
const PI=Math.PI;
function builder(){const p=[],n=[],idx=[];return {p,n,idx,
 tube(a,b,r=0.035,sides=9){const axis=b.map((v,i)=>v-a[i]),length=Math.hypot(...axis);if(length<1e-5)return;const t=axis.map(v=>v/length),helper=Math.abs(t[1])<.9?[0,1,0]:[1,0,0];let u=[t[1]*helper[2]-t[2]*helper[1],t[2]*helper[0]-t[0]*helper[2],t[0]*helper[1]-t[1]*helper[0]];let m=Math.hypot(...u);u=u.map(v=>v/m);const v=[t[1]*u[2]-t[2]*u[1],t[2]*u[0]-t[0]*u[2],t[0]*u[1]-t[1]*u[0]];const base=p.length/3;for(const end of [a,b])for(let k=0;k<sides;k++){const angle=2*PI*k/sides,normal=u.map((x,i)=>x*Math.cos(angle)+v[i]*Math.sin(angle));p.push(...end.map((x,i)=>x+r*normal[i]));n.push(...normal);}for(let k=0;k<sides;k++){const j=(k+1)%sides;idx.push(base+k,base+j,base+sides+k,base+j,base+sides+j,base+sides+k);}},
 finish(){return {positions:new Float32Array(p),normals:new Float32Array(n),indices:new Uint32Array(idx)};}};}
function segment(b,a,c,r){b.tube(a,c,r);}
export function buildRiderMesh({cadence=80,time=0,offset=0,roadHeight=0,lean=0}={}){
 const b=builder(),phase=time*Math.max(0,cadence)/60*2*PI+offset;
 const X=x=>x+lean*.25,Y=y=>y+roadHeight;
 const P=(x,y,z)=>[X(x),Y(y),z];
 const backZ=0,frontZ=1.06,wheelY=.36,wheelR=.35;
 for(const z of [backZ,frontZ])for(let k=0;k<32;k++){
  const a=2*PI*k/32,c=2*PI*(k+1)/32;
  segment(b,P(-.02,wheelY+wheelR*Math.cos(a),z+wheelR*Math.sin(a)),P(-.02,wheelY+wheelR*Math.cos(c),z+wheelR*Math.sin(c)),.025);
 }
 const crank=P(0,.48,.48),seat=P(0,.99,.38),steer=P(0,.95,.9),front=P(0,wheelY,frontZ),rear=P(0,wheelY,backZ);
 for(const [a,c,r] of [[rear,crank,.035],[crank,seat,.035],[seat,rear,.035],[seat,steer,.032],[crank,steer,.032],[steer,front,.034]])segment(b,a,c,r);
 const pelvis=P(0,1.15,.34),shoulders=P(0,1.43,.66),head=P(0,1.65,.74);
 segment(b,pelvis,shoulders,.115);segment(b,shoulders,head,.065);
 // Each leg is a two-bone IK chain, constrained by moving pedal and hip.
 for(const side of [-1,1]){
  const hip=P(side*.12,1.13,.35);
  const pedal=P(side*.18,.48+.17*Math.sin(phase+side*PI/2),.48+.17*Math.cos(phase+side*PI/2));
  const knee=P(side*.16,.84+.08*Math.sin(phase+side*PI/2),.49+.17*Math.cos(phase+side*PI/2));
  segment(b,hip,knee,.075);segment(b,knee,pedal,.056);
  segment(b,pedal,P(side*.18,pedal[1]-.025,pedal[2]+.13),.045);
  const shoulder=P(side*.16,1.43,.66),elbow=P(side*.19,1.17,.78),hand=P(side*.21,1.04,1.00);
  segment(b,shoulder,elbow,.062);segment(b,elbow,hand,.048);
  segment(b,P(side*.19,1.04,.97),P(side*.19,1.04,1.08),.03);
 }
 segment(b,P(-.13,1.65,.74),P(.13,1.65,.74),.12);
 return b.finish();
}
