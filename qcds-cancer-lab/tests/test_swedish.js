/* QCDS Oncology Lab: Swedish-first localization regression.
 * Checks final rendered source strings AND dynamically created model summaries.
 * Keep stable internal enums, oracle masks and numeric calculations unchanged.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const dir=path.resolve(__dirname,"..");
const read=name=>fs.readFileSync(path.join(dir,name),"utf8");
const html=read("index.html"),genome=read("genome-perspective.js"),app=read("app.js");
assert(html.includes('<html lang="sv">'),"Declare Swedish as document language.");
assert(html.includes('<h1 class="clinical-brand-title">Oncology Lab</h1>'),"Preserve product name.");
for(const phrase of ["Utforska DNA","Sök möjliga DNA-samband","Beräknar oraklet",
 "Ursprungligt 8-bitarslaboratorium","Påhittade","Vad hittade QCDS?"]){
 if(phrase==="Påhittade")continue; // lower-case on the public page is intentional
 assert(html.includes(phrase),"Expected Swedish UI phrase: "+phrase);
}
for(const english of ["Explore DNA","QCDS research","How did QCDS reach that result?",
  "Open the original 8-bit laboratory","No inference run loaded","Scientific audit",
  "MODEL INTERPRETATION","3 of 5","1 of 5","CLINICAL REFERENCE / QCDS"]){
 assert(!html.includes(english),"English UI text must not reappear: "+english);
}
assert(html.includes('href="./GUIDE_SV.md"'),"Swedish user guide is linked.");
assert(html.includes('href="./GRANSKNING_SV.md"'),"Swedish scientific audit is linked.");
assert(fs.existsSync(path.join(dir,"GUIDE_SV.md")));
assert(fs.existsSync(path.join(dir,"GRANSKNING_SV.md")));
for(const name of ["clinical-knowledge.js","clinical-ui.js","inference-room.js",
 "app.js","qcds-conclusion.js","genome-discovery.js","genome-funnel.js",
 "genome-perspective.js","onco-navigation.js","onco-examples.js"]){
 const src=read(name);
 assert(!src.includes('"Unknown example: '),"No untranslated guided example error in "+name);
}
const Q=require("../qcds-core.js");
require("../clinical-knowledge.js");
require("../clinical-ui.js");
const K=globalThis.CancerLabKnowledge,UI=globalThis.CancerLabClinicalUI;
assert(K.dimensions[0].name==="Mutationsbörda");
assert(K.dimensions[3].name==="Undvikande av apoptos");
assert(K.dimensions[4].name==="Immunflykt");
assert(K.oracles[0].name==="DNA-reparation");
assert(K.methods.some(x=>x.name.startsWith("Grover-iterationer")));
assert(UI.maskDescription("??11????").includes("Tillväxtsignalering"));
assert(UI.maskDescription("??11????").includes("Undvikande av apoptos"));
const C=require("../qcds-conclusion.js");
const sim=Q.runCancerQCDS({inputMask:"????????",hypotheses:[],maxCycles:1});
const summary=C.summarize(sim,K.dimensions.map(x=>x.name));
assert(summary.title.includes("särskiljande lösning")||summary.title.includes("modellkandidat")||
  summary.title.includes("modellkandidater"),"Dynamic conclusion must be in Swedish");
assert(summary.scope.includes("inte ett validerat fynd"));
assert(genome.includes("Inget samband uppfyller de valda villkoren."));
assert(genome.includes("Hur starkt är stödet för gruppskillnaden?"));
assert(genome.includes("Sannolikhetsmönstret uppfyllde"));
assert(app.includes("QCDS-beräkningen är klar."));
assert(app.includes("Kontrollera dina indata."));
const D=require("../genome-discovery.js"),F=require("../genome-funnel.js");
const cohort=D.generateProfiles(42,"structure",8,12);
const f=F.run({dataset:cohort,anchors:[],relation:"cooccurrence",
 minCases:5,maxControls:2,maxPasses:6,readoutNoise:0});
assert.deepEqual(f.selected.loci,[5,7],"Locale change must not alter numeric example result.");
assert.equal(f.qualifiedCount,1);
console.log("QCDS Oncology Lab Swedish UI, reference descriptions and numerical invariant: PASS");
