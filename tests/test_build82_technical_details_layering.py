from qcds_fabric.living_robot_public import living_robot_public_html


def test_technical_details_raise_header_above_public_menu() -> None:
    html = living_robot_public_html(static_mode=True)

    assert "BUILD 82" in html
    assert "header.publicTechnicalDetailsOpen{z-index:160!important}" in html
    assert "header.publicTechnicalDetailsOpen .clarityPanel{z-index:180!important}" in html
    assert "details.addEventListener('toggle',sync)" in html
    assert "publicTechnicalDetailsOpen" in html
    assert ".publicCompactBar{position:sticky;top:0;z-index:80" in html


def test_technical_details_are_visually_isolated_as_a_modal() -> None:
    html = living_robot_public_html(static_mode=True)

    assert 'class="clarityBackdrop" id="clarityBackdrop"' in html
    assert 'role="dialog" aria-modal="true" aria-labelledby="clarityPanelTitle"' in html
    assert 'class="clarityClose" id="clarityClose"' in html
    assert "Current logical space" in html
    assert "Advanced connection" in html
    assert ".clarityBackdrop{display:none;position:fixed;inset:0" in html
    assert "backdrop-filter:blur(5px)" in html
    assert ".clarityPanel{position:fixed!important" in html
    assert "max-height:calc(100dvh - 100px)" in html
    assert "backdrop?.addEventListener('click',closeDetails)" in html
    assert "event.key==='Escape'" in html
