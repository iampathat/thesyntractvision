# PDF dependency

`jspdf.umd.min.js` is the unmodified browser UMD distribution of jsPDF 4.2.1,
installed from the official npm `jspdf` package. Its MIT license is preserved
in `jspdf-LICENSE.txt` and in the distribution header.

Loaded locally and only when a PDF is requested. The report uses vector drawing
and text APIs; it does not use HTML rendering, remote images, JavaScript actions
inside PDFs, or the optional HTML/SVG conversion dependencies.

Upstream: https://github.com/parallax/jsPDF/releases/tag/v4.2.1

The PDF embeds Latin-1 subsets of Liberation Sans 2.1.5, renamed QCDS Report
Sans under SIL OFL 1.1. Its copyright and license are preserved in
`report-fonts-LICENSE.txt`. `scripts/build-report-fonts.py` reproduces the
module from the original regular and bold TTF files using fontTools. Embedded
fonts keep metrics and appearance consistent across PDF readers.

Font upstream: https://github.com/liberationfonts/liberation-fonts
