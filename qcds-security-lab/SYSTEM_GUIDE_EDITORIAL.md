# QCDS / The Syntract Vision / Project Glasswing / Security Lab
## Living System Guide PDF (editorial edition 3)

**Author:** Patrik Sundblom  
**R&D support:** OpenAI / ChatGPT  
**License:** Copyright (c) 2026 Patrik Sundblom. All Rights Reserved.

### Location and export
From the application's **Reports & export** screen select **Generate Glasswing System Guide PDF**.
The existing case-report button continues to use `downloadSecurityPdf()` untouched.
The new action calls `downloadSystemGuidePdf()` in `report-export.js`, which supplies a current source snapshot to `createEditorialSystemGuidePdf()`.

### Registry: single source of truth
On every PDF generation, `report-export.js` imports the engine modules. These are the authoritative model definitions:
- `engine.mjs`: `VERSION`, `CONDITION_DEFS`, `FIELD_META`, `LENSES`
- `attack-vectors.mjs`: `ATTACK_VECTOR_SEEDS`, `ROUTE_VARIANTS`, `TARGETS`
- Script query version on `index.html`: application's preview/release stamp

When a new condition, lens, vector seed, route variant or target type is added to the exported model, the next PDF export includes it in the appropriate section without needing a duplicated static registry.
The renderer's theory explanations, glossary and worked teaching example are **edited content**: meaningful new methodology may require editorial review. No text generator can faithfully explain previously unseen research changes without content review.

### Chapter order
00 Orientation; 01 Condition Formation; **02 Security Lenses**; **03 Attack Vector Fabric**; 04 Recursive Inference; 05 Execution & Truth-Alignment; 06 Worked Example; 07 Implementation & Provenance.
The PDF separates candidate attacks from verified observations.

### Editorial media layer
These six **optional** local JPEG files are preferred:
- `assets/system-guide/qcds-the-guardian-network.jpg`
- `assets/system-guide/qcds-dimensional-inference-guide.jpg`
- `assets/system-guide/the-seven-security-lenses.jpg`
- `assets/system-guide/attack-vectors-across-the-system-landscape.jpg`
- `assets/system-guide/recursive-investigation-guide.jpg`
- `assets/system-guide/quantum-execution-and-verification-guide.jpg`

The first is a cover. Remaining files are chapter plates and keep independent, selectable caption text. All images are center-cropped to the PDF art frame; they are never distorted. They are created as JPEG bytes in memory in the browser.
The branch also includes six lightweight SVG variants as offline fallback assets. A missing JPEG must not block export.
The generated JPGs matching the art direction are in the separately provided **QCDS_Glasswing_Dynamic_Guide_Artwork_v3.zip**. These binary files have not been committed to this draft branch.

### Layout contract
A4; dedicated title page, art pages and text pages; consistent midnight/cyan/gold palette; dynamically measured text lines and blocks; automatic new pages when content grows; stable footer with engine version and page count. Source and text are inspectable.

### Tests
`node --test qcds-security-lab/tests/system-guide-editorial.test.mjs`

The tests cover actual registry counts, additions to the model, chapter order and A4 coordinate overflow. A stub PDF renderer does **not** validate font rendering, browser imaging, Safari SVG decoding or final physical print; these require visual QA before release.

### Compatibility
No user cases, observations, or project storage need to be read to export the guide. The PDF is generated on-device; no report data is sent to an external PDF-rendering service.
