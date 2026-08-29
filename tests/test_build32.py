from __future__ import annotations

import threading
from pathlib import Path
from urllib.request import urlopen

from qcds_fabric.living_robot_clarity import living_robot_clarity_html
from qcds_fabric.logical_robot_live import create_live_robot_server


def test_static_header_explains_recorded_proof_without_implying_connection() -> None:
    html = living_robot_clarity_html(static_mode=True)

    assert "RECORDED VERIFIED PROOF" in html
    assert "This public page is not trying to connect anywhere." in html
    assert "Technical details" in html
    assert "Connect another live runtime" in html
    assert "Logical space" in html
    assert "Architecture" in html
    assert "QCDS / Syntract" in html
    assert "header .statusbar{display:none!important}" in html
    assert "header>#connectBox{display:none!important}" in html


def test_live_header_uses_human_readable_connection_language() -> None:
    html = living_robot_clarity_html(static_mode=False)

    assert "LIVE · LOGICAL ROBOT CONNECTED" in html
    assert "Showing the Reality store running in this environment." in html
    assert "STARTING LIVE LOGICAL ROBOT" in html
    assert "Waiting for the Logical Robot runtime in this environment to become ready." in html
    assert "LOGICAL ROBOT RUNTIME OFFLINE" in html


def test_advanced_runtime_connector_is_moved_out_of_primary_header() -> None:
    html = living_robot_clarity_html(static_mode=False)

    assert 'id="clarityConnectMount"' in html
    assert "mount.appendChild(box)" in html
    assert ".clarityAdvanced #connectBox{display:flex!important}" in html
    assert "Optional advanced control." in html


def test_build32_is_manifestation_only_and_keeps_existing_api_contract(tmp_path: Path) -> None:
    server = create_live_robot_server(store_root=tmp_path, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    try:
        page = urlopen(f"http://{host}:{port}/", timeout=3).read().decode("utf-8")
        health = urlopen(f"http://{host}:{port}/api/health", timeout=3).read().decode("utf-8")
        assert "Technical details" in page
        assert "LIVE · LOGICAL ROBOT CONNECTED" in page
        assert '"status": "ok"' in health
        service = getattr(server, "qcds_service")
        assert service.state()["provenance"]["builds"][-1] == 32
        assert "/api/promote" not in page
        assert "/api/rule/install" not in page
    finally:
        service = getattr(server, "qcds_service")
        service.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
