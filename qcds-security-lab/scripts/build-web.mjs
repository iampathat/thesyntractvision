// Reproducible web/native payload. QCDS by Patrik Sundblom.
import {readdir,readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Resvg} from '@resvg/resvg-js';
import {build} from 'esbuild';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),at=args.indexOf('--out');
const out=resolve(at>=0?args[at+1]:resolve(root,'dist'));
if(out===root||root.startsWith(out+'/'))throw new Error('Output must not replace source files.');
await mkdir(out,{recursive:true});
const files=[];
async function copyFolder(folder='') {
  for(const entry of await readdir(resolve(root,folder),{withFileTypes:true})) {
    const path=folder?`${folder}/${entry.name}`:entry.name;
    if(entry.isDirectory()) {if(['assets','vendor','qa'].includes(path))await copyFolder(path);continue;}
    if(!['.html','.css','.js','.mjs','.md','.svg','.png','.webmanifest','.txt'].includes(extname(path)))continue;
    if(['native-bridge.js'].includes(path))continue;
    await mkdir(dirname(resolve(out,path)),{recursive:true});
    await copyFile(resolve(root,path),resolve(out,path));files.push(path);
  }
}
await copyFolder();
const svg=await readFile(resolve(root,'assets/app-icon.svg'),'utf8');
for(const size of [180,192,512,1024]) {
  const path=`assets/app-icon-${size}.png`;
  await writeFile(resolve(out,path),new Resvg(svg,{fitTo:{mode:'width',value:size}}).render().asPng());files.push(path);
}
if(args.includes('--native')) {
  await build({entryPoints:[resolve(root,'mobile/native-bridge.mjs')],outfile:resolve(out,'native-bridge.js'),bundle:true,format:'esm',platform:'browser',target:['es2022'],minify:true});files.push('native-bridge.js');
}
const offline=files.filter(path=>!path.startsWith('qa/')&&path!=='sw.js'&&path!=='README.md');
await writeFile(resolve(out,'offline-assets.json'),JSON.stringify(offline.sort(),null,2)+'\n');
console.log(JSON.stringify({output:out,files:files.length,offlineAssets:offline.length,native:args.includes('--native')}));
