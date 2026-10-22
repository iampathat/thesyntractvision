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
async function jpegArtwork(relativePath) {
  try {
    const response=await fetch(new URL(relativePath,import.meta.url),{cache:'no-store'});
    if (!response.ok) return null;
    const original=await response.blob();
    let source;
    if (typeof createImageBitmap === 'function') {
      source=await createImageBitmap(original);
    } else {
      const url=URL.createObjectURL(original);
      try {
        source=await new Promise((resolve,reject)=>{
          const image=new Image();
          image.onload=()=>resolve(image);
          image.onerror=()=>reject(new Error('Artwork decode failed'));
          image.src=url;
        });
      } finally { URL.revokeObjectURL(url); }
    }
    const canvas=document.createElement('canvas');
    const ratio=Math.min(1,1024/Math.max(source.width,source.height));
    canvas.width=Math.max(1,Math.round(source.width*ratio));
    canvas.height=Math.max(1,Math.round(source.height*ratio));
    canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
    source.close?.();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.86));
    return blob?new Uint8Array(await blob.arrayBuffer()):null;
  } catch { return null; }
}
async function loadSystemGuidePlates() {
  const names=[
    'qcds-the-guardian-network.jpg',
    'qcds-dimensional-inference-guide.jpg',
    'attack-vectors-across-the-system-landscape.jpg',
    'the-seven-security-lenses.jpg',
    'recursive-investigation-guide.jpg',
    'quantum-execution-and-verification-guide.jpg'
  ];
  // Optional chapter artwork: the engine remains fully functional if a media
  // asset is unavailable or not yet installed by this release.
  const plateFiles=await Promise.all(names.map(async name=>
    (await jpegArtwork('./assets/system-guide/'+name)) ||
    (await jpegArtwork('./assets/system-guide/'+name.replace(/\.jpg$/,'.svg')))
  ));
  const fallback=plateFiles[0]||await jpegArtwork('./glasswing-approved.webp');
  return {cover:fallback,chapters:plateFiles.slice(1)};
}

export async function downloadSystemGuidePdf() {
  // Fetch all registry definitions from the same modules as the current Lab.
  const [jsPDF, { createEditorialSystemGuidePdf }, core, vectors] = await Promise.all([
    pdfEngine(),
    import("./system-guide-editorial.mjs?v=3.0.0"),
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
  const {doc,summary} = createEditorialSystemGuidePdf(jsPDF,snapshot,{
    artwork: {
      guardian: media.cover,
      dimensions: media.chapters[0],
      attack: media.chapters[1],
      lenses: media.chapters[2],
      recursive: media.chapters[3],
      execution: media.chapters[4],
    },
    edition: "3.0.0",
  });
  await saveDeviceFile(doc.output("blob"),"QCDS-Project-Glasswing-Security-Lab-System-Guide.pdf","application/pdf");
  return summary;
}
