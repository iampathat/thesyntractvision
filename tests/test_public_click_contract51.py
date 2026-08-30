from __future__ import annotations

import re

from qcds_fabric.living_robot_public import living_robot_public_html


def _inline_scripts(html: str) -> str:
    return "\n".join(re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", html, flags=re.IGNORECASE | re.DOTALL))


def _onclick_handlers(html: str) -> list[str]:
    return re.findall(r'onclick="([^"]+)"', html, flags=re.IGNORECASE)


def _defined_callable(script: str, name: str) -> bool:
    patterns = (
        rf"(?:async\s+)?function\s+{re.escape(name)}\s*\(",
        rf"window\.{re.escape(name)}\s*=",
        rf"\b{re.escape(name)}\s*=\s*(?:async\s+)?function\s*\(",
    )
    return any(re.search(pattern, script) for pattern in patterns)


def test_every_inline_click_references_a_defined_callable_in_deployed_javascript() -> None:
    html = living_robot_public_html(static_mode=True)
    script = _inline_scripts(html)
    handlers = _onclick_handlers(html)

    assert handlers
    called: set[str] = set()
    for handler in handlers:
        called.update(re.findall(r"\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(", handler))

    missing = sorted(name for name in called if not _defined_callable(script, name))
    assert not missing, f"onclick handlers reference undefined callables: {missing}"


def test_primary_navigation_and_subnavigation_are_wired_to_real_targets() -> None:
    html = living_robot_public_html(static_mode=True)

    for view, target in (
        ("qcds", "try-logical-robot"),
        ("legal", "public-legal-question"),
        ("advanced", "public-advanced"),
    ):
        assert f'data-public-view="{view}"' in html
        assert f"publicSelectView('{view}')" in html
        assert f'id="{target}"' in html

    for mode in ("ask", "examples", "details"):
        assert f'data-legal-mode="{mode}"' in html
        assert f"publicSelectLegalMode('{mode}')" in html

    for mode in ("summary", "manual", "raw"):
        assert f'data-advanced-mode="{mode}"' in html
        assert f"publicAdvancedMode('{mode}')" in html


def test_run_controls_have_visible_feedback_and_result_targets() -> None:
    html = living_robot_public_html(static_mode=True)

    assert 'id="publicLegalRun" onclick="publicRunLegalQuestion()"' in html
    assert 'id="publicLegalInlineStatus"' in html
    assert 'id="publicLegalQuickResult"' in html
    assert 'onclick="publicToggleRunDetails()"' in html

    assert "trySeed('robot')" in html
    assert "trySeed('biology')" in html
    assert "trySeed('material')" in html
    assert "trySeed('software')" in html
    assert 'id="quickResult"' in html
    assert 'id="quickResultText"' in html
    assert 'id="quickResultBars"' in html


def test_critical_public_ids_are_unique() -> None:
    html = living_robot_public_html(static_mode=True)
    for element_id in (
        "public-overview",
        "try-logical-robot",
        "public-legal-question",
        "public-advanced",
        "publicLegalQuestionText",
        "publicLegalContext",
        "publicLegalRun",
        "publicLegalInlineStatus",
        "publicLegalQuickResult",
        "quickResult",
        "swedish-legal-robot",
    ):
        assert len(re.findall(rf'id="{re.escape(element_id)}"', html)) == 1, element_id


def test_advanced_defaults_to_compact_summary_not_the_legacy_wall() -> None:
    html = living_robot_public_html(static_mode=True)

    assert "body.publicCompact.publicViewAdvanced>.hero{display:none!important}" in html
    assert "body.publicCompact.publicViewAdvanced>.layout" in html
    assert "publicAdvancedMode('summary')" in html
    assert "publicAdvancedManual" in html
    assert "publicAdvancedRaw" in html
