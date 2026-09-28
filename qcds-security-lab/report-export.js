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
  doc.save(`QCDS-${slug}${lens}-security-report.pdf`);
  return summary;
}
