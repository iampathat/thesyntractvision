"""Create embedded Latin-1 subsets from Liberation Sans 2.1.5 (fontTools).

Usage: python3 scripts/build-report-fonts.py /path/to/original/ttf/directory
Modified font names avoid the original reserved font names; see the OFL.
"""
from base64 import b64encode
from io import BytesIO
from pathlib import Path
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

source = Path(sys.argv[1])
output = Path(__file__).resolve().parents[1] / 'vendor' / 'report-fonts.mjs'
parts = ['// Latin-1 subsets of Liberation Sans 2.1.5, renamed QCDS Report Sans.\n'
         '// Font software: SIL OFL 1.1; see report-fonts-LICENSE.txt.\n']
for style in ['Regular', 'Bold']:
    font = TTFont(source / f'LiberationSans-{style}.ttf')
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_legacy = True
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=range(32, 256))
    sub.subset(font)
    names = {1: 'QCDS Report Sans', 2: style, 3: f'QCDSReportSans-{style}-1',
             4: f'QCDS Report Sans {style}', 6: f'QCDSReportSans-{style}',
             16: 'QCDS Report Sans', 17: style}
    for record in font['name'].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    data = BytesIO()
    font.save(data)
    parts.append(f'const {style.lower()} = "{b64encode(data.getvalue()).decode()}";\n')
parts.append('export function registerReportFonts(doc) {\n'
             '  doc.addFileToVFS("QCDSReportSans-Regular.ttf", regular);\n'
             '  doc.addFont("QCDSReportSans-Regular.ttf", "QCDSReport", "normal");\n'
             '  doc.addFileToVFS("QCDSReportSans-Bold.ttf", bold);\n'
             '  doc.addFont("QCDSReportSans-Bold.ttf", "QCDSReport", "bold");\n'
             '}\n')
output.write_text(''.join(parts))
print(f'Created {output.name}: {output.stat().st_size} bytes')
