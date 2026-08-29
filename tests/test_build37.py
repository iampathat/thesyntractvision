from __future__ import annotations

import json
import threading
from pathlib import Path
from urllib.request import urlopen

from qcds_fabric.living_robot_invite import living_robot_invite_html
from qcds_fabric.logical_robot_live37 import create_live_robot_server


def test_quick_start_is_prominent_but_advanced_lab_remains() -> None:
    html = living_robot_invite_html(static_mode=True)

    assert "TRY THE BLUEPRINT" in html
    assert "TRY BIOLOGY" in html
    assert "TRY ROBOTICS" in html
    assert "TRY MATERIALS" in html
    assert "TRY SOFTWARE" in html
    assert "SURPRISE ME" in html
    assert "OPEN ADVANCED LOGICAL SPACE LAB" in html

    # The complete BUILD 34/35 controls are still present below the invitation.
    assert 'id="custom-space-builder"' in html
    assert 'id="builder-observations"' in html
    assert 'id="session-subject"' in html
    assert 'id="session-evidence"' in html
    assert "PREVIEW PACK" in html
    assert "DOWNLOAD JSON" in html
    assert "RUN QCDS CORE" in html


def test_quick_start_prefills_the_same_advanced_fields_and_same_core_path() -> None:
    html = living_robot_invite_html(static_mode=True)

    assert "function seed37(seed)" in html
    assert "set37('builder-observations'" in html
    assert "set37('session-subject'" in html
    assert "set37('session-candidates'" in html
    assert "set37('session-evidence'" in html
    assert "payload=sessionRequest()" in html
    assert "await runWasmCore(payload)" in html
    assert "renderSessionResult(result)" in html

    # BUILD 37 is presentation/onboarding only. It must not introduce another
    # inference implementation in JavaScript.
    assert "problem_to_syntract" not in html.split("const BUILD37_SEEDS", 1)[1]
    assert "oracle" not in html.split("const BUILD37_SEEDS", 1)[1].lower()


def test_quick_start_keeps_session_only_boundary() -> None:
    html = living_robot_invite_html(static_mode=True)

    assert "sessionStorage" in html
    assert "localStorage" not in html
    assert "indexedDB" not in html
    assert "document.cookie" not in html
    assert "Reality effect = 0" in html
    assert "not a claim that the current reference implementation has achieved AGI or ASI" in html


def test_live_build37_is_only_a_presentation_wrapper(tmp_path: Path) -> None:
    server = create_live_robot_server(store_root=tmp_path, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    base = f"http://{host}:{port}"
    try:
        page = urlopen(base + "/", timeout=5).read().decode("utf-8")
        state = json.loads(urlopen(base + "/api/state", timeout=5).read())

        assert "TRY THE BLUEPRINT" in page
        assert "OPEN ADVANCED LOGICAL SPACE LAB" in page
        assert 35 in state["provenance"]["builds"]
        assert 37 in state["provenance"]["builds"]
        assert state["provenance"]["quick_start_invitation"] is True
        assert state["provenance"]["advanced_lab_preserved"] is True
        assert state["provenance"]["qcds_core_duplicated_in_client"] is False
    finally:
        service = getattr(server, "qcds_service")
        service.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
