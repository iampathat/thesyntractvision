// Generate reproducible native projects; credentials and signing stay outside git.
import {access,readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Resvg} from '@resvg/resvg-js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const platform=process.argv[2];
if(!['android','ios'].includes(platform))throw new Error('Choose android or ios.');
function run(command,args){const r=spawnSync(command,args,{cwd:root,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
run(process.execPath,['scripts/build-web.mjs','--native']);
const cap=resolve(root,'node_modules/@capacitor/cli/bin/capacitor');
try{await access(resolve(root,platform));}catch{run(process.execPath,[cap,'add',platform]);}
run(process.execPath,[cap,'sync',platform]);
if(platform==='android') {
  const gradle=resolve(root,'android/app/build.gradle');
  let source=await readFile(gradle,'utf8');source=source.replace(/versionCode \d+/,'versionCode 11401').replace(/versionName "[^"]+"/,'versionName "1.14.1"');await writeFile(gradle,source);
  const manifest=resolve(root,'android/app/src/main/AndroidManifest.xml');
  let xml=await readFile(manifest,'utf8');xml=xml.replace('android:allowBackup="true"','android:allowBackup="false"');await writeFile(manifest,xml);
  const svg=await readFile(resolve(root,'assets/app-icon.svg'),'utf8');
  for(const [density,size] of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})) {
    for(const name of ['ic_launcher','ic_launcher_round','ic_launcher_foreground']) {
      const output=resolve(root,`android/app/src/main/res/mipmap-${density}/${name}.png`);await mkdir(dirname(output),{recursive:true});
      await writeFile(output,new Resvg(svg,{fitTo:{mode:'width',value:name==='ic_launcher_foreground'?Math.round(size*2.25):size}}).render().asPng());
    }
  }
} else {
  await copyFile(resolve(root,'dist/assets/app-icon-1024.png'),resolve(root,'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'));
  await copyFile(resolve(root,'mobile/PrivacyInfo.xcprivacy'),resolve(root,'ios/App/App/PrivacyInfo.xcprivacy'));
  const project=resolve(root,'ios/App/App.xcodeproj/project.pbxproj');let text=await readFile(project,'utf8');
  if(!text.includes('PrivacyInfo.xcprivacy in Resources')) {
    const fileId='A11401000000000000000001',buildId='A11401000000000000000002';
    text=text.replace('/* End PBXBuildFile section */',`${buildId} /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ${fileId} /* PrivacyInfo.xcprivacy */; };\n/* End PBXBuildFile section */`);
    text=text.replace('/* End PBXFileReference section */',`${fileId} /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n/* End PBXFileReference section */`);
    text=text.replace('504EC3101FED79650016851F /* LaunchScreen.storyboard */,',`504EC3101FED79650016851F /* LaunchScreen.storyboard */,\n${fileId} /* PrivacyInfo.xcprivacy */,`);
    text=text.replace('504EC3121FED79650016851F /* LaunchScreen.storyboard in Resources */,',`504EC3121FED79650016851F /* LaunchScreen.storyboard in Resources */,\n${buildId} /* PrivacyInfo.xcprivacy in Resources */,`);
  }
  text=text.replace(/MARKETING_VERSION = [^;]+;/g,'MARKETING_VERSION = 1.14.1;').replace(/CURRENT_PROJECT_VERSION = [^;]+;/g,'CURRENT_PROJECT_VERSION = 11401;');await writeFile(project,text);
}
console.log(`Q Security ${platform} project prepared. Signing is not configured.`);
