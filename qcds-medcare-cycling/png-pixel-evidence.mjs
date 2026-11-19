/* © 2026 Patrik Sundblom. All Rights Reserved. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
function decode(file){
 const b=fs.readFileSync(file);
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 let off=8,w=0,h=0,depth=0,type=0,interlace=0;const data=[];
 while(off<b.length){
  assert.ok(off+12<=b.length);
  const n=b.readUInt32BE(off),tag=b.toString('ascii',off+4,off+8);
  assert.ok(off+n+12<=b.length);
  const c=b.subarray(off+8,off+8+n);
  if(tag==='IHDR'){w=c.readUInt32BE(0);h=c.readUInt32BE(4);depth=c[8];type=c[9];interlace=c[12];}
  if(tag==='IDAT')data.push(c);
  off+=n+12;if(tag==='IEND')break;
 }
 assert.ok(w>=320&&h>=180&&w<=8192&&h<=8192);
 assert.equal(depth,8);assert.ok(type===2||type===6);assert.equal(interlace,0);
 const channels=type===6?4:3,stride=w*channels,raw=zlib.inflateSync(Buffer.concat(data));
 assert.equal(raw.length,(stride+1)*h);
 const pixels=Buffer.alloc(stride*h);
 for(let y=0;y<h;y++){
  const row=y*(stride+1),f=raw[row];assert.ok(f<=4);
  for(let x=0;x<stride;x++){
   const a=x>=channels?pixels[y*stride+x-channels]:0;
   const up=y?pixels[(y-1)*stride+x]:0;
   const ul=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0;
   let p=0;
   if(f===1)p=a;
   if(f===2)p=up;
   if(f===3)p=Math.floor((a+up)/2);
   if(f===4){const q=a+up-ul,da=Math.abs(q-a),db=Math.abs(q-up),dc=Math.abs(q-ul);p=da<=db&&da<=dc?a:db<=dc?up:ul;}
   pixels[y*stride+x]=(raw[row+1+x]+p)&255;
  }
 }
 return {w,h,channels,pixels};
}
const [fixed,random]=process.argv.slice(2);
assert.ok(fixed&&random,'usage: node png-pixel-evidence.mjs fixed.png random.png');
const a=decode(fixed),b=decode(random);
assert.equal(a.w,b.w);assert.equal(a.h,b.h);
let changed=0,colored=0;
for(let i=0,j=0;i<a.pixels.length;i+=a.channels,j+=b.channels){
 const d=Math.abs(a.pixels[i]-b.pixels[j])+Math.abs(a.pixels[i+1]-b.pixels[j+1])+Math.abs(a.pixels[i+2]-b.pixels[j+2]);
 if(d>36)changed++;
 if(Math.max(a.pixels[i],a.pixels[i+1],a.pixels[i+2])-Math.min(a.pixels[i],a.pixels[i+1],a.pixels[i+2])>15)colored++;
}
const n=a.w*a.h;
assert.ok(changed/n>0.01,'camera views differ in too few decoded pixels');
assert.ok(colored/n>0.01,'fixed view nearly monochrome or blank');
console.log('QCDS decoded PNG evidence PASS',JSON.stringify({changedFraction:changed/n,colorFraction:colored/n}));
