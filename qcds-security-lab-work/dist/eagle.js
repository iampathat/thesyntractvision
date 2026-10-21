// Glasswing / Work. Original articulated SVG artwork by Patrik Sundblom
// with OpenAI / ChatGPT as research & development support.
// Every visible surface is a vector. No raster textures or encoded assets.
const poly = (points,fill,extra='') => `<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${fill}" ${extra}/>`;
function feather(x,y,tx,ty,w,index,layer=0) {
  const dx=tx-x,dy=ty-y,len=Math.hypot(dx,dy),nx=-dy/len*w,ny=dx/len*w;
  const a=[x+nx*.35,y+ny*.35],b=[x+dx*.38+nx,y+dy*.38+ny],c=[tx,ty],d=[x+dx*.45-nx*.72,y+dy*.45-ny*.72],e=[x-nx*.2,y-ny*.2],m=[x+dx*.6,y+dy*.6];
  return `<g class="feather" style="--lag:${(index%9)*-.13}s;--fx:${x}px;--fy:${y}px;--ripple:${layer?1:2.3}deg">${poly([a,b,c,d,e],'url(#ice)')}${poly([a,b,m],index%3?'#c2f5ff':'#fff','opacity=".9"')}${poly([b,c,m],index%2?'#9ddff5':'#effdff')}${poly([c,d,m],'#1785c2')}${poly([d,e,m],'#123756')}${poly([a,m,e],'#4096c0')}<path d="M${x} ${y} ${tx} ${ty}" stroke="#dbfbff" stroke-width=".6" opacity=".65"/></g>`;
}
function wing() {
  let out='<g class="arm">';
  out+=`<path d="M5 17 Q-52-78-134-80L-264-145-286-114-210-29-96 60Z" fill="url(#wingBase)"/>`;
  // Secondaries fan from the forearm, overlapping like real flight feathers.
  for(let i=0;i<14;i++) {
    const s=i/13;
    out+=feather(-22-s*197,-15-s*90,-28-s*253,120-s*85,12+s*4,i);
  }
  out+='<g class="hand">';
  const tips=[[-376,-236],[-395,-192],[-397,-147],[-387,-101],[-369,-58],[-341,-19],[-307,13]];
  tips.slice().reverse().forEach((tip,j)=>{const i=6-j;out+=feather(-220-i*3,-103+i*7,...tip,17.5,j)});
  for(let i=0;i<8;i++) out+=feather(-180-i*11,-98-i*4,-292-i*10,-128-i*8,8.5,i,1);
  out+='</g>';
  // Three staggered covert rows form a faceted, continuous wing surface.
  for(let row=0;row<3;row++) for(let i=0;i<15;i++) {
    const s=i/14,x=-8-s*241,y=-18-s*104+row*14;
    out+=feather(x,y,x-29-s*17,y+26+row*9,7+row*1.5,i+row,1);
  }
  out+=`<path d="M0-7 Q-83-66-145-79L-262-142" fill="none" stroke="#b9f8ff" stroke-width="2" opacity=".9"/>`;
  const nodes=[[0,0],[-52,-26],[-100,-57],[-154,-71],[-210,-101],[-267,-140],[-174,-20],[-95,16]];
  out+=`<g class="wing-circuit"><path d="M${nodes.slice(0,6).map(p=>p.join(' ')).join(' L')}M-210-101-174-20-100-57-95 16 0 0M-154-71-174-20" fill="none" stroke="#3be4ff" stroke-width="1.8"/>`;
  nodes.forEach(([x,y],i)=>{out+=`<circle cx="${x}" cy="${y}" r="${i%2?4.2:5.5}" fill="#0d4059" stroke="#b9faff" stroke-width="1.5"/><circle class="light-node" style="--delay:${i*-.5}s" cx="${x}" cy="${y}" r="2.4" fill="#fff"/>`});
  out+=`<path class="energy-travel" d="M0 0-52-26-100-57-154-71-210-101-267-140" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="7 260"/></g></g>`;
  return out;
}
function talon(side) {
  let s=`<g class="talon ${side}"><path d="M-3-20-12 7-8 26 5 34 19 21 18 2 9-14Z" fill="url(#metal)" stroke="#b8e5ed" stroke-width="1.4"/>`;
  for(let i=0;i<3;i++){let x=-10+i*12; s+=`<path d="M${x} 13 Q${x-9} 19 ${x-10} 35L${x-5} 47 ${x+2} 37Q${x-3} 23 ${x+5} 25" fill="url(#metal)" stroke="#70a6ba" stroke-width="1.3"/><path d="M${x-10} 34Q${x-20} 53 ${x-4} 63L${x-6} 49 ${x-5} 42Z" fill="url(#claw)" stroke="#bde9fa" stroke-width=".7"/>`}
  return s+'</g>';
}
export function createEagleScene(host) {
  let torso='';
  for(let row=4;row>=0;row--) for(let i=0;i<7;i++) {
    const x=(i-3)*(11-row*.6),y=232+row*20;
    torso+=feather(x,y,x+(i-3)*3, y+40,8.3,i+row,1);
  }
  let crown='';
  for(let row=2;row>=0;row--) for(let i=0;i<7;i++) {
    const x=(i-3)*(9-row),y=-40+row*17;
    crown+=feather(x,y,x+(i-3)*4,y-18-row*4,7,i+row,1);
  }
  let ground='';
  for(let i=0;i<16;i++){const x=25+i*62;ground+=`<path d="M500 420 ${x} 690"/>`}
  for(let i=0;i<8;i++){const y=438+i*i*3.6;ground+=`<path d="M${100-i*30} ${y}Q500 ${y-50} ${900+i*30} ${y}"/>`}
  let lights='';
  const positions=[[220,535],[310,500],[397,559],[550,522],[672,557],[778,502],[470,615],[810,615],[156,620]];
  positions.forEach(([x,y],i)=>{lights+=`<g class="ground-node" style="--delay:${i*-.6}s"><path d="M${x} ${y}v-${15+i%3*12}" stroke="#44bde8" stroke-width="1"/><circle cx="${x}" cy="${y}" r="4" fill="#82f3ff"/><circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#59e8ff" opacity=".25"/></g>`});
  host.innerHTML=`<svg viewBox="0 0 1000 720" class="flight-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>
  <linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#edfaff"/><stop offset=".46" stop-color="#92d9f1"/><stop offset="1" stop-color="#116aa0"/></linearGradient><linearGradient id="wingBase" x2="0" y2="1"><stop stop-color="#c4f3ff"/><stop offset=".4" stop-color="#206b9f"/><stop offset="1" stop-color="#06192c"/></linearGradient><linearGradient id="metal" x2="1" y2=".3"><stop stop-color="#edfaff"/><stop offset=".4" stop-color="#21506e"/><stop offset=".65" stop-color="#c3e2ec"/><stop offset="1" stop-color="#1a3149"/></linearGradient><linearGradient id="claw" x2=".6" y2="1"><stop stop-color="#6eb6ce"/><stop offset="1" stop-color="#061020"/></linearGradient><radialGradient id="aura"><stop stop-color="#207ebe" stop-opacity=".2"/><stop offset="1" stop-color="#124269" stop-opacity="0"/></radialGradient><radialGradient id="shieldFill"><stop stop-color="#55d2ff" stop-opacity="0"/><stop offset=".9" stop-color="#52ddff" stop-opacity=".025"/><stop offset="1" stop-color="#52ddff" stop-opacity=".16"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
  <ellipse cx="500" cy="330" rx="470" ry="330" fill="url(#aura)"/>
  <g class="orbital" fill="none" stroke="#25618a"><circle cx="500" cy="300" r="227" opacity=".2"/><circle cx="500" cy="300" r="250" stroke-dasharray="2 15" opacity=".4"/><path d="M250 300a250 250 0 0 1 250-250M750 300a250 250 0 0 1-250 250" stroke="#4592bf" opacity=".3"/></g>
  <g class="world" fill="none" stroke="#1d5b82" stroke-width="1" opacity=".6">${ground}</g><g>${lights}</g>
  <path class="shield" d="M209 555Q270 358 500 360Q730 358 791 555Q500 642 209 555Z" fill="url(#shieldFill)" stroke="#40ccea" stroke-width="1.2"/>
  <g class="attack-traces" fill="none" stroke="#e7a46c"><path class="trace-one" d="M60 450 235 490 190 415"/><path class="trace-two" d="M930 470 774 500 832 413"/></g>
  <g class="eagle-flight"><g transform="translate(500 45)">
  <g transform="translate(0 266)"><g class="tail">${feather(-19,0,-49,111,14,0)}${feather(19,0,49,111,14,1)}${feather(0,0,0,127,18,2)}</g></g>
  <g transform="translate(-32 234)"><g class="left-wing">${wing()}</g></g><g transform="translate(32 234) scale(-1 1)"><g class="right-wing">${wing()}</g></g>
  <path d="M-37 217Q0 194 37 217L49 268 22 327 0 352-22 327-49 268Z" fill="url(#wingBase)"/>
  ${torso}<g transform="translate(-30 304) rotate(12)">${talon('left')}</g><g transform="translate(38 310) rotate(-9)">${talon('right')}</g>
  <g transform="translate(0 235)"><g class="eagle-head"><path d="M-38-34-26-58 0-73 29-53 39-24 28 16 0 37-29 15Z" fill="url(#ice)"/>${crown}
  ${poly([[-33,-28],[-4,-54],[-9,-7]],'#e6f9ff')}${poly([[4,-54],[33,-28],[9,-7]],'#bde9fa')}${poly([[-33,-28],[-38,-6],[-18,17],[-9,-7]],'#1a6a9c')}${poly([[33,-28],[38,-6],[18,17],[9,-7]],'#0c4165')}
  <path d="M-30-18-10-11-12 0-27-7ZM30-18 10-11 12 0 27-7Z" fill="#031426"/><path class="eye" d="M-27-13-14-8-16-5-25-8ZM27-13 14-8 16-5 25-8Z" fill="#78f6ff"/>
  <path d="M-9-6 4-14 22-5 31 9 28 26 14 42 18 20 5 15-9 8Z" fill="url(#metal)" stroke="#d4f5ff" stroke-width="1"/><path d="M4-13 9 9 23 14 14 42 28 26 31 9 22-5Z" fill="#285579"/><path d="M4 0 9-2 11 2 7 4Z" fill="#061426"/><path d="M-37-4-29 24-19 17-13 31-9 10M37-4 29 24 19 17 13 31 9 10" fill="#c9f4ff"/>
  </g></g>
  </g></g><ellipse class="ground-ring" cx="500" cy="551" rx="226" ry="45" fill="none" stroke="#5cdbf7" stroke-width="1"/>
  </svg>`;
  return {replay(){host.classList.remove('arrival');void host.offsetWidth;host.classList.add('arrival')},pause(value){host.classList.toggle('paused',value)}};
}
