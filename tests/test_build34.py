from __future__ import annotations

import json
import threading
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import pytest

from qcds_fabric.domain_lab_builder import CustomDomainLabService, normalize_custom_domain_pack
from qcds_fabric.living_robot_builder import living_robot_builder_html
from qcds_fabric.logical_robot_live34 import create_live_robot_server
from qcds_fabric.logical_space import LogicalBinding
from qcds_fabric.logical_universe import CsvLogicalUniverseStore


def _pack() -> dict[str, object]:
    return {
        "domain_id": "battery-aging",
        "title": "Battery Aging",
        "tagline": "Cycles, chemistry, temperature and capacity in one open logical space.",
        "audience": "Battery researchers",
        "universe_mode": "simulation",
        "description": "Synthetic cell conditions and measured capacity coexist as terms.",
        "challenge": "Which conditions remain predictive of capacity loss on held-out cells?",
        "learning_target": "Resolve a held-out capacity outcome with a challenged reusable rule.",
        "explore_prompt": "Explore competing explanations for battery capacity loss.",
        "observations": [
            {
                "binding_id": "battery-aging-001",
                "terms": ["cell-001", "chemistry-a", "temperature-high", "capacity-low"],
                "source_id": "user:battery-aging:001",
                "confidence": 1.0,
            },
            {
                "binding_id": "battery-aging-002",
                "terms": ["cell-002", "chemistry-a", "temperature-low", "capacity-high"],
                "source_id": "user:battery-aging:002",
                "confidence": 1.0,
            },
        ],
        "starter_rules": [],
        "truth_boundary": {
            "external_truth_claim": False,
            "solution_rule_supplied": False,
            "starting_lab_modifies_reality": False,
        },
    }


def _post(url: str, payload: dict[str, object]) -> dict[str, object]:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )
    return json.loads(urlopen(request, timeout=3).read())


def test_build_your_own_button_opens_a_real_builder_on_public_and_live_pages() -> None:
    static_html = living_robot_builder_html(static_mode=True)
    live_html = living_robot_builder_html(static_mode=False)

    assert 'id="domainBuilderOpen"' in static_html
    assert 'onclick="openSpaceBuilder()"' in static_html
    assert 'id="spaceBuilder"' in static_html
    assert "PREVIEW PACK" in static_html
    assert "DOWNLOAD JSON" in static_html
    assert "0 SUPPLIED SOLUTION RULES" in static_html
    assert "REALITY EFFECT = 0" in static_html
    assert "function buildCustomPack()" in static_html
    assert "new Blob" in static_html
    assert 'id="builder-authority"' in static_html
    assert "/api/domain/custom-start" in live_html
    assert "/api/promote" not in live_html
    assert "/api/rule/install" not in live_html


def test_custom_pack_validation_forces_zero_solution_rules_and_safe_truth_boundary() -> None:
    normalized = normalize_custom_domain_pack(_pack())

    assert normalized["universe_id"] == "domain-lab-custom-battery-aging"
    assert normalized["starter_rules"] == []
    assert normalized["truth_boundary"]["external_truth_claim"] is False
    assert normalized["truth_boundary"]["solution_rule_supplied"] is False
    assert normalized["truth_boundary"]["starting_lab_modifies_reality"] is False
    assert len(normalized["observations"]) == 2

    unsafe = _pack()
    unsafe["starter_rules"] = [{"if": ["temperature-high"], "then": "capacity-low"}]
    with pytest.raises(ValueError, match="zero supplied solution rules"):
        normalize_custom_domain_pack(unsafe)

    unsafe_boundary = _pack()
    unsafe_boundary["truth_boundary"] = {"starting_lab_modifies_reality": True}
    with pytest.raises(ValueError, match="starting_lab_modifies_reality"):
        normalize_custom_domain_pack(unsafe_boundary)

    declared = _pack()
    declared["universe_mode"] = "declared"
    with pytest.raises(ValueError, match="authority"):
        normalize_custom_domain_pack(declared)
    declared["authority"] = "fictional-battery-rulebook"
    assert normalize_custom_domain_pack(declared)["authority"] == "fictional-battery-rulebook"


def test_custom_space_is_isolated_and_does_not_modify_observed_reality(tmp_path: Path) -> None:
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    universes.space("reality").append(
        [LogicalBinding("reality-001", ("keep", "reality", "unchanged"), "control:source", 1.0)]
    )
    reality_before = (tmp_path / "logical_space.csv").read_bytes()

    service = CustomDomainLabService(tmp_path)
    result = service.start(_pack())

    assert result["universe_id"] == "domain-lab-custom-battery-aging"
    assert result["created"] is True
    assert result["custom"] is True
    assert result["base_binding_count"] == 2
    assert result["active_rule_count"] == 0
    assert result["truth_effect_on_reality"] == 0
    assert result["solution_rule_supplied"] is False
    assert (tmp_path / "logical_space.csv").read_bytes() == reality_before
    assert len(universes.space("reality").bindings()) == 1


def test_custom_start_is_idempotent_for_same_pack(tmp_path: Path) -> None:
    first = CustomDomainLabService(tmp_path).start(_pack())
    second = CustomDomainLabService(tmp_path).start(_pack())

    assert first["created"] is True
    assert first["added_observations"] == 2
    assert second["created"] is False
    assert second["added_observations"] == 0
    assert second["base_binding_count"] == 2


def test_live_build34_endpoint_starts_custom_space_without_touching_reality(tmp_path: Path) -> None:
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    universes.space("reality").append(
        [LogicalBinding("reality-001", ("observed", "control"), "control:source", 1.0)]
    )
    reality_before = (tmp_path / "logical_space.csv").read_bytes()

    server = create_live_robot_server(store_root=tmp_path, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    base = f"http://{host}:{port}"
    try:
        page = urlopen(base + "/", timeout=3).read().decode("utf-8")
        started = _post(base + "/api/domain/custom-start", _pack())
        state = json.loads(urlopen(base + "/api/state", timeout=3).read())

        assert "BUILD YOUR OWN LOGICAL SPACE" in page
        assert 'id="spaceBuilder"' in page
        assert started["universe_id"] == "domain-lab-custom-battery-aging"
        assert started["base_binding_count"] == 2
        assert started["active_rule_count"] == 0
        assert started["truth_effect_on_reality"] == 0
        assert 34 in state["provenance"]["builds"]
        assert state["provenance"]["custom_logical_space_builder"] is True
        assert (tmp_path / "logical_space.csv").read_bytes() == reality_before

        bad = _pack()
        bad["starter_rules"] = [{"answer": "hidden"}]
        with pytest.raises(HTTPError) as excinfo:
            _post(base + "/api/domain/custom-start", bad)
        assert excinfo.value.code == 400
    finally:
        service = getattr(server, "qcds_service")
        service.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
