from __future__ import annotations

import threading
from pathlib import Path
from urllib.request import urlopen

from qcds_fabric.living_robot_experience import export_static, living_robot_experience_html
from qcds_fabric.logical_robot_live import create_live_robot_server


def test_build30_static_explains_logic_growth_and_invites_extension_without_fake_live(tmp_path: Path) -> None:
    html = living_robot_experience_html(static_mode=True)

    assert "RECORDED VERIFIED PROOF" in html
    assert "Understand → inspect → build" in html
    assert "See the difference between finding information and building logic." in html
    assert "OBSERVATION" in html
    assert "CANDIDATE LOGIC" in html
    assert "PROMOTED LOGIC" in html
    assert "WHY THIS LOGIC?" in html
    assert "BUILD ON THIS" in html
    assert "ADD A ROBOT BODY / OBSERVER" in html
    assert "FALSIFY / BUILD AN ORACLE" in html
    assert "BUILD A LOGICAL UNIVERSE" in html
    assert "BREAK OR BENCHMARK IT" in html
    assert "The key test:" in html
    assert "qcds_core_modified" not in html  # UI does not fabricate a core-status claim banner.

    target = export_static(tmp_path / "index.html")
    exported = target.read_text(encoding="utf-8")
    assert "RECORDED VERIFIED PROOF" in exported
    assert "BUILD ON THIS" in exported


def test_build30_try_actions_remain_inputs_not_truth_installers() -> None:
    html = living_robot_experience_html(static_mode=False)

    assert "quickTry('dialogue'" in html
    assert "quickTry('explore_domain'" in html
    assert "quickTry('build_frontier'" in html
    assert "postJson('/api/input'" in html
    assert "No automatic truth effect" in html
    assert "/api/rule/install" not in html
    assert "/api/promote" not in html


def test_build30_live_server_serves_enhanced_experience_without_changing_api_contract(tmp_path: Path) -> None:
    server = create_live_robot_server(store_root=tmp_path, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    try:
        page = urlopen(f"http://{host}:{port}/", timeout=3).read().decode("utf-8")
        health = urlopen(f"http://{host}:{port}/api/health", timeout=3).read().decode("utf-8")
        assert "BUILD ON THIS" in page
        assert "WHY THIS LOGIC?" in page
        assert '"status": "ok"' in health
        service = getattr(server, "qcds_service")
        assert service.state()["provenance"]["builds"][-1] == 30
    finally:
        service = getattr(server, "qcds_service")
        service.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)


def test_build30_inspector_reads_existing_growth_data_only() -> None:
    html = living_robot_experience_html(static_mode=False)

    assert "growthData.latest_promotion" in html
    assert "resolved_bindings_changed" in html
    assert "new_resolved_term_instances" in html
    assert "provenance:p.provenance" in html
    assert "openLogicInspector" in html
