from qcds_fabric.robots.cally_one.dimensions import BUILTIN_DIMENSIONS, TERMINOLOGY_MODE_VALUES
from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html


def test_terminology_mode_is_a_real_dimension():
    spec = BUILTIN_DIMENSIONS["terminology_mode"]
    assert spec["value_kind"] == "terminology-projection-state"
    assert spec["preferred"] is True
    assert [item["code"] for item in TERMINOLOGY_MODE_VALUES] == ["simple", "standard", "technical"]
    assert spec["values"] == TERMINOLOGY_MODE_VALUES


def test_terminology_projection_is_loaded_into_product_surface():
    html = cally_one_html(static_mode=True)
    assert "window.__callyTerminologyMode" in html
    assert "window.__callySetTerminologyMode" in html
    assert "terminology_mode_is_dimension:true" in html
    assert "terminology_projection_preserves_domain_semantics:true" in html
    assert "data-terminology-settings" in html
    assert "Hitta bästa tiden" in html
    assert "QCDS Resolve" in html
    assert "callyTerminologyOverlay" in html


def test_simple_mode_hides_technical_dimension_metadata_but_not_model():
    html = cally_one_html(static_mode=True)
    assert 'html[data-cally-terminology="simple"] .callyDimensionBadges' in html
    assert "State, dimensioner, orakel, QCDS och Syntract" in html
    assert "Samma Calendar Space" in html
