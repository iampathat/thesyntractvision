from __future__ import annotations

from pathlib import Path


def test_collapsed_overlap_never_scrolls_horizontally() -> None:
    css = Path('src/qcds_fabric/robots/cally_one/calendar_display.css').read_text(encoding='utf-8')
    section = css.split('/* Overlap containment v5:', 1)[1]
    assert '.callyOverlapCluster.dense:not(.expanded)' in section
    assert '.callyOverlapCluster.callyOverlapFan.rail:not(.expanded)' in section
    assert 'overflow-x:hidden!important;' in section
    assert 'scroll-snap-type:none!important;' in section
    assert '.callyOverlapCluster:not(.expanded) .callyOverlapTrack{' in section
    assert 'max-width:100%!important;' in section
    assert 'overflow:hidden!important;' in section


def test_first_overlap_detail_is_contained_card_rail_with_gutters() -> None:
    css = Path('src/qcds_fabric/robots/cally_one/calendar_display.css').read_text(encoding='utf-8')
    section = css.split('/* First detail: one contained card rail.', 1)[1]
    assert '.callyOverlapCluster.expanded{' in section
    assert 'height:auto!important;' in section
    assert 'overflow:hidden!important;' in section
    assert '.callyOverlapCluster.expanded .callyOverlapTrack{' in section
    assert 'flex-flow:row nowrap!important;' in section
    assert 'overflow-x:auto!important;' in section
    assert 'padding:8px 10px 12px!important;' in section
    assert 'scroll-padding-inline:10px!important;' in section
    assert '.callyOverlapCluster.expanded .event{' in section
    assert 'align-self:flex-start!important;' in section
    assert 'scroll-margin-inline:10px!important;' in section
