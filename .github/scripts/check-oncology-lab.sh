#!/usr/bin/env bash
# Original Oncology Lab tests, now isolated from the shared Pages publishing job.
# One GitHub repository; separate project-specific validation.
set -euo pipefail

test -s _site/qcds-cancer-lab/index.html
test -s _site/qcds-cancer-lab/style.css
test -s _site/qcds-cancer-lab/clinical.css
test -s _site/qcds-cancer-lab/qcds-core.js
test -s _site/qcds-cancer-lab/app.js
test -s _site/qcds-cancer-lab/inference-room.js
test -s _site/qcds-cancer-lab/clinical-knowledge.js
test -s _site/qcds-cancer-lab/clinical-ui.js
test -s _site/qcds-cancer-lab/qcds-conclusion.js
test -s _site/qcds-cancer-lab/genome-perspective.js
test -s _site/qcds-cancer-lab/genome-discovery.js
test -s _site/qcds-cancer-lab/genome-funnel.js
test -s _site/qcds-cancer-lab/onco-navigation.js
test -s _site/qcds-cancer-lab/onco-examples.js
test -s _site/qcds-cancer-lab/tests/test_examples.js
test -s _site/qcds-cancer-lab/tests/test_swedish.js
test -s _site/qcds-oncology-lab/onco-navigation.js
test -s _site/qcds-cancer-lab/tests/test_funnel.js
test -s _site/qcds-cancer-lab/tests/test_funnel_visuals.js
test -s _site/qcds-cancer-lab/tests/test_calibration.js
test -s _site/qcds-cancer-lab/tests/test_cohort_sizes.js
test -s _site/qcds-cancer-lab/tests/test_ui_layout.js
test -s _site/qcds-cancer-lab/tests/test_genome.js
test -s _site/qcds-cancer-lab/tests/test_conclusion.js
test -s _site/qcds-cancer-lab/LICENSE.md
test -s _site/qcds-cancer-lab/README.md
test -s _site/qcds-cancer-lab/engine.py
test -s _site/qcds-cancer-lab/case_cancer.py
test -s _site/qcds-cancer-lab/run_demo.py
test -s _site/qcds-cancer-lab/tests/test_engine.py
test -s _site/qcds-cancer-lab/tests/test_core.js
test -s _site/qcds-cancer-lab/tests/test_clinical.js
grep -F 'Oncology Lab' _site/qcds-cancer-lab/index.html
grep -F 'Oncology Lab' _site/qcds-oncology-lab/index.html
grep -F '<h1 class="clinical-brand-title">Oncology Lab</h1>' _site/qcds-cancer-lab/index.html
! grep -F '· QCDS research' _site/qcds-cancer-lab/index.html
! grep -F 'Exploratory computational hypothesis workspace' _site/qcds-cancer-lab/index.html
grep -F '128 → 8 → 1' _site/qcds-cancer-lab/index.html
grep -F 'data-ref-tab="oracles"' _site/qcds-cancer-lab/index.html
grep -F 'id="clinicalOverlay"' _site/qcds-cancer-lab/index.html
grep -F 'id="runButton"' _site/qcds-cancer-lab/index.html
grep -F 'Endast beräkningsbaserad forskningsdemonstration.' _site/qcds-cancer-lab/index.html
grep -F 'PARALLEL_LANES = ROTATION_BANKS * LANES_PER_BANK' _site/qcds-cancer-lab/qcds-core.js
grep -F 'function runGrover' _site/qcds-cancer-lab/qcds-core.js
grep -F 'function parentGrover' _site/qcds-cancer-lab/qcds-core.js
grep -F 'function rotationOrder' _site/qcds-cancer-lab/qcds-core.js
grep -F 'Every rotated lane receives the SAME oracle bank.' _site/qcds-cancer-lab/qcds-core.js
if grep -F 'stableConsensus' _site/qcds-cancer-lab/app.js _site/qcds-cancer-lab/qcds-core.js; then
  echo 'Forbidden simplified consensus shortcut found'
  exit 1
fi
node --check _site/qcds-cancer-lab/qcds-core.js
node --check _site/qcds-cancer-lab/app.js
node --check _site/qcds-cancer-lab/clinical-knowledge.js
node --check _site/qcds-cancer-lab/clinical-ui.js
node --check _site/qcds-cancer-lab/qcds-conclusion.js
node --check _site/qcds-cancer-lab/genome-perspective.js
node --check _site/qcds-cancer-lab/genome-discovery.js
node --check _site/qcds-cancer-lab/genome-funnel.js
node --check _site/qcds-cancer-lab/onco-navigation.js
node --check _site/qcds-cancer-lab/onco-examples.js
node --check _site/qcds-cancer-lab/inference-room.js
node _site/qcds-cancer-lab/tests/test_core.js
node _site/qcds-cancer-lab/tests/test_clinical.js
node _site/qcds-cancer-lab/tests/test_conclusion.js
node _site/qcds-cancer-lab/tests/test_genome.js
node _site/qcds-cancer-lab/tests/test_funnel.js
node _site/qcds-cancer-lab/tests/test_funnel_visuals.js
node _site/qcds-cancer-lab/tests/test_calibration.js
node _site/qcds-cancer-lab/tests/test_cohort_sizes.js
node _site/qcds-cancer-lab/tests/test_ui_layout.js
node _site/qcds-cancer-lab/tests/test_navigation.js
node _site/qcds-cancer-lab/tests/test_examples.js
node _site/qcds-cancer-lab/tests/test_swedish.js
PYTHONPATH=qcds_fabric_4_2/src python qcds-cancer-lab/tests/test_engine.py
