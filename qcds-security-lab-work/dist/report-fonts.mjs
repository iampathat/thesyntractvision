// Original QCDS Report Sans (Liberation Sans Latin-1 subsets, renamed).
// SIL OFL 1.1: see vendor/report-fonts-LICENSE.txt.
// Font assets are ordinary binary TTF files. No encoded payloads in source.
export function registerReportFonts(doc, fonts) {
  for (const [style, weight] of [['regular', 'normal'], ['bold', 'bold']]) {
    const bytes = fonts?.[style];
    if (!(bytes instanceof Uint8Array) || !bytes.length) {
      throw Error(`Missing ${style} report font bytes`);
    }
    const filename = `QCDSReportSans-${style}.ttf`;
    const chunks = [];
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
    }
    doc.addFileToVFS(filename, chunks.join(''));
    doc.addFont(filename, 'QCDSReport', weight);
  }
}
