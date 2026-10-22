import { saveDeviceFile } from "./device-files.js?v=1.0.0";
// PDF export stays on this device. No system details are sent to a report service.
let loading;
async function pdfEngine() {
  if (globalThis.jspdf?.jsPDF) return globalThis.jspdf.jsPDF;
  if (!loading)
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("./vendor/jspdf.umd.min.js", import.meta.url).href;
      script.onload = () =>
        globalThis.jspdf?.jsPDF
          ? resolve(globalThis.jspdf.jsPDF)
          : reject(new Error("PDF engine did not initialize."));
      script.onerror = () => {
        loading = null;
        script.remove();
        reject(new Error("Could not load the PDF engine. Please retry."));
      };
      document.head.append(script);
    });
  return loading;
}
export async function downloadSecurityPdf(model, project, options = {}) {
  const [jsPDF, { createSecurityPdf }] = await Promise.all([
    pdfEngine(),
    import("./report-pdf.mjs?v=1.0.0"),
  ]);
  const { doc, summary } = createSecurityPdf(jsPDF, model, project, options);
  const slug =
    (model.input.name || "assessment")
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 70) || "assessment";
  const lens = options.perspective
    ? "-" + options.perspective.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : "";
  await saveDeviceFile(doc.output("blob"), `QCDS-${slug}${lens}-security-report.pdf`, "application/pdf");
  return summary;
}

// The system guide is universal; it does not read, export or modify saved cases.
// Visual assets remain separate from editable explanations. Raster artwork is
// converted to JPEG bytes in memory; no hidden encoded source or remote PDF service.
// The approved Glasswing plates are PORTRAIT A4 artwork, including their
// composited chapter typography. Never convert them to a landscape crop.
const GUIDE_A4_RATIO = 595.28 / 841.89;
async function jpegArtwork(relativePath,{ requirePortrait=true }={}) {
  let objectUrl;
  try {
    const response = await fetch(new URL(relativePath,import.meta.url),{cache:'no-store'});
    if(!response.ok) return null;
    objectUrl=URL.createObjectURL(await response.blob());
    const img=await new Promise((resolve,reject)=>{
      const el=new Image();
      el.onload=()=>resolve(el);
      el.onerror=()=>reject(new Error('Illustration unavailable: '+relativePath));
      el.src=objectUrl;
    });
    const ratio=img.naturalWidth/img.naturalHeight;
    // Prevent landscape brand posters from masquerading as portrait book pages.
    if(requirePortrait && (ratio<0.64 || ratio>0.79)) return null;
    const canvas=document.createElement('canvas');
    canvas.width=1055; canvas.height=1491;
    const g=canvas.getContext('2d',{alpha:false});
    if(!g) return null;
    g.fillStyle='#031421';
    g.fillRect(0,0,canvas.width,canvas.height);
    const scale=Math.min(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight);
    const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    g.drawImage(img,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.93));
    return blob?new Uint8Array(await blob.arrayBuffer()):null;
  } catch {return null}
  finally {if(objectUrl)URL.revokeObjectURL(objectUrl)}
}
async function loadSystemGuidePlates() {
  const names=[
    'qcds-the-guardian-network',
    'qcds-dimensional-inference-guide',
    'attack-vectors-across-the-system-landscape',
    'the-seven-security-lenses',
    'recursive-investigation-guide',
    'quantum-execution-and-verification-guide'
  ];
  const plates=await Promise.all(names.map(async name=>
    (await jpegArtwork('./assets/system-guide/'+name+'.jpg')) ||
    (await jpegArtwork('./assets/system-guide/'+name+'.svg'))
  ));
  // Approved portrait chapter plate first. Landscape marketing material MUST
  // NOT be used as a book cover, even in the fallback path.
  const cover=plates[0] ||
    (await jpegArtwork('./glasswing-mobile.webp')) ||
    null;
  return {cover,chapters:plates.slice(1)};
}

export async function downloadSystemGuidePdf() {
  // Fetch all registry definitions from the same modules as the current Lab.
  const [jsPDF, { createVisualGlasswingPdf }, core, vectors] = await Promise.all([
    pdfEngine(),
    import("./system-guide-visual-v4.mjs?v=4.0.0"),
    import("./engine.mjs"),
    import("./attack-vectors.mjs"),
  ]);
  const media = await loadSystemGuidePlates();
  const src = document.querySelector('script[type="module"][src*="app-stage"]')?.src;
  const appRelease = src ? new URL(src,location.href).searchParams.get("v") : null;
  const snapshot = {
    appRelease: appRelease || core.VERSION,
    engineVersion: core.VERSION,
    conditions: core.CONDITION_DEFS,
    fieldMeta: core.FIELD_META,
    lenses: core.LENSES,
    seeds: vectors.ATTACK_VECTOR_SEEDS,
    variants: vectors.ROUTE_VARIANTS,
    targets: vectors.TARGETS,
    generatedAt: new Date().toISOString().slice(0,10),
  };
  const {doc,summary} = createVisualGlasswingPdf(jsPDF,snapshot,{
    artwork: {
      guardian: media.cover,
      dimensions: media.chapters[0],
      attack: media.chapters[1],
      lenses: media.chapters[2],
      recursive: media.chapters[3],
      execution: media.chapters[4],
    },
    edition: "4.0.0",
  });
  await saveDeviceFile(doc.output("blob"),"QCDS-Project-Glasswing-Security-Lab-System-Guide.pdf","application/pdf");
  return summary;
}
