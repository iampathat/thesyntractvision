from pathlib import Path

from qcds_fabric.living_robot_public import PUBLIC_BUILD, living_robot_public_html


def test_public_surface_exposes_three_parallel_syntract_demos():
    html = living_robot_public_html(static_mode=True)
    assert int(PUBLIC_BUILD) >= 63
    assert 'data-public-view="syntract"' in html
    assert "SYNTRACT COMPOSITION · PARALLEL QCDS" in html
    assert html.count('data-syntract-demo="') == 3
    assert "DNA + protein + cell + patient + drug" in html
    assert "person + phone data + car + camera + timeline + witness" in html
    assert "robot + environment + mission + safety rules + people" in html
    assert "No voting. No hard collapse. No separate fusion engine." in html
    assert html.count('id="public-syntracts"') == 1
    assert html.count('id="publicSyntractStatus"') == 1
    assert html.count('id="publicSyntractResult"') == 1


def test_public_syntract_view_is_real_view_switching_not_always_visible():
    html = living_robot_public_html(static_mode=True)
    assert "publicViewSyntract" in html
    assert "body.publicCompact:not(.publicViewSyntract) #public-syntracts" in html
    assert "else if(view==='syntract')document.body.classList.add('publicViewSyntract')" in html


def test_worker_routes_syntract_demo_to_python_core():
    worker = Path("web/session_core_worker.js").read_text(encoding="utf-8")
    assert "syntract_demo_run" in worker
    assert "run_syntract_demo_json" in worker
    assert 'worker.postMessage({type:\'syntract_demo_run\'' in living_robot_public_html(static_mode=True)
