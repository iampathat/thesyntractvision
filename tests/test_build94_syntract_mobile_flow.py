from qcds_fabric.living_robot_public import living_robot_public_html


def test_syntract_mobile_result_follows_the_run_action() -> None:
    html = living_robot_public_html(static_mode=True)

    assert "BUILD 94: on touch/mobile" in html
    assert "function q94Mobile(){return window.matchMedia('(max-width:700px)').matches}" in html
    assert "publicSyntractMobileResultSlot" in html
    assert "q94ActiveRun" in html
    assert "button.insertAdjacentElement('afterend',slot)" in html
    assert "slot.append(status,result)" in html
    assert "COMPOSING SYNTRACTS… Binding the selected Syntracts through QCDS." in html
    assert "q94RevealMobileResult" in html
    assert "scrollIntoView({behavior:'smooth',block:'start'})" in html
    assert "scroll-margin-top:150px" in html


def test_syntract_mobile_flow_reuses_the_existing_qcds_result_elements() -> None:
    html = living_robot_public_html(static_mode=True)

    # One status/result surface is physically moved next to the tapped card;
    # there is no duplicate browser inference or alternate Syntract engine.
    assert html.count('id="publicSyntractStatus"') == 1
    assert html.count('id="publicSyntractResult"') == 1
    q94 = html.split("function q94Mobile()", 1)[1].split("function q63Render", 1)[0]
    assert "q63WorkerRun(" not in q94
    assert "syntract_demo_run" not in q94
    assert "slot.append(status,result)" in q94
