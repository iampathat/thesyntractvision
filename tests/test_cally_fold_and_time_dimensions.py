from qcds_fabric.robots.cally_one.dimensions import BUILTIN_DIMENSIONS, TIME_REFERENCE_VALUES
from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html


def test_time_is_not_reduced_to_earth_time_zones():
    codes = {item["code"] for item in TIME_REFERENCE_VALUES}
    assert {"utc", "tai", "gps", "tt", "ut1", "tcg", "tcb", "tdb"} <= codes
    assert {"met", "mrt", "sclk", "unix", "ltc"} <= codes
    assert BUILTIN_DIMENSIONS["time_zone"]["value_kind"] == "time-zone-state"
    assert BUILTIN_DIMENSIONS["time_reference"]["value_kind"] == "time-reference-state"
    assert BUILTIN_DIMENSIONS["time_epoch"]["value_kind"] == "temporal-epoch-state"
    assert BUILTIN_DIMENSIONS["reference_body"]["value_kind"] == "observer-body-state"
    assert BUILTIN_DIMENSIONS["reference_frame"]["value_kind"] == "reference-frame-state"
    assert BUILTIN_DIMENSIONS["clock_source"]["value_kind"] == "clock-source-state"


def test_lunar_time_is_marked_as_evolving_not_fake_final_standard():
    ltc = next(item for item in TIME_REFERENCE_VALUES if item["code"] == "ltc")
    assert ltc["status"] == "standardization-in-progress"
    assert ltc["traceable_to"] == "utc"


def test_foldable_compact_override_is_in_product_surface():
    html = cally_one_html(static_mode=True)
    assert "fold / compact-large-screen correction" in html
    assert "@media (min-width:560px) and (max-width:980px)" in html
    assert ".callyCalendarSettingsSheet" in html
