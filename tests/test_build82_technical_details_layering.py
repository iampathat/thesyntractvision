from qcds_fabric.living_robot_public import living_robot_public_html


def test_technical_details_raise_header_above_public_menu() -> None:
    html = living_robot_public_html(static_mode=True)

    assert "BUILD 82" in html
    assert "header.publicTechnicalDetailsOpen{z-index:160!important}" in html
    assert "header.publicTechnicalDetailsOpen .clarityPanel{z-index:180!important}" in html
    assert "details.addEventListener('toggle',sync)" in html
    assert "publicTechnicalDetailsOpen" in html
    assert ".publicCompactBar{position:sticky;top:0;z-index:80" in html
