from __future__ import annotations

from qcds_fabric.living_robot_public import living_robot_public_html


def test_stable_public_export_has_one_current_build_marker_and_expected_surfaces() -> None:
    html = living_robot_public_html(static_mode=True)

    assert '<span class="publicBuildMark">BUILD 50</span>' in html
    assert '<div class="publicAdvancedKicker">ADVANCED</div>' in html
    assert 'data-public-view="qcds"' in html
    assert 'data-public-view="legal"' in html
    assert 'data-public-view="advanced"' in html
    assert 'id="try-logical-robot"' in html
    assert 'id="public-legal-question"' in html
    assert 'id="public-advanced"' in html
    assert 'id="publicLegalInlineStatus"' in html
    assert 'id="publicLegalQuickResult"' in html


def test_stable_public_export_preserves_canonical_qcds_path_language() -> None:
    html = living_robot_public_html(static_mode=True)

    assert "question/material → translator → Logical Space → oracle filters → QCDS four phases → TruthDistribution → Syntract" in html
    assert "1 Condition Formation → 2 Conditional Evolution → 3 Recursive Inference → 4 Truth-Alignment / Syntract Binding" in html
    assert "QCDS four phases remain unchanged" in html
