from __future__ import annotations

import json
import threading
from pathlib import Path
from urllib.request import Request, urlopen

from qcds_fabric.domain_lab import DomainLabService, builtin_domain_packs
from qcds_fabric.living_robot_domains import living_robot_domains_html
from qcds_fabric.logical_robot_live import create_live_robot_server
from qcds_fabric.logical_space import LogicalBinding
from qcds_fabric.logical_universe import CsvLogicalUniverseStore


def _post(url: str, payload: dict[str, object]) -> dict[str, object]:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )
    return json.loads(urlopen(request, timeout=3).read())


def test_builtin_domain_catalog_covers_expert_spaces_without_solution_rules() -> None:
    packs = builtin_domain_packs()

    assert [pack.domain_id for pack in packs] == [
        "materials", "biology", "robotics", "software", "physics", "law"
    ]
    assert len({pack.universe_id for pack in packs}) == 6
    assert all(len(pack.observations) == 6 for pack in packs)
    assert all(pack.as_dict()["starter_rule_count"] == 0 for pack in packs)
    assert all(pack.provenance["fixed_ontology_required"] is False for pack in packs)
    assert all(pack.provenance["solution_rule_supplied"] is False for pack in packs)
    assert next(pack for pack in packs if pack.domain_id == "law").universe_mode == "declared"
    assert next(pack for pack in packs if pack.domain_id == "law").authority == "fictional-domain-lab-rulebook"


def test_starting_every_domain_lab_is_isolated_from_observed_reality(tmp_path: Path) -> None:
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    universes.space("reality").append([
        LogicalBinding("reality-001", ("reality-control", "observed"), "control:source", 1.0)
    ])
    base_before = (tmp_path / "logical_space.csv").read_bytes()
    service = DomainLabService(tmp_path)

    for pack in service.packs():
        result = service.start(pack.domain_id)
        assert result["universe_id"] == pack.universe_id
        assert result["base_binding_count"] == 6
        assert result["active_rule_count"] == 0
        assert result["truth_effect_on_reality"] == 0
        assert result["solution_rule_supplied"] is False
        assert service.universes.get(pack.universe_id) is not None
        assert len(service.universes.space(pack.universe_id).bindings()) == 6
        assert len(service.universes.rules(pack.universe_id).rules(active_only=True)) == 0

    assert (tmp_path / "logical_space.csv").read_bytes() == base_before
    assert len(universes.space("reality").bindings()) == 1


def test_starting_a_domain_lab_is_restart_idempotent(tmp_path: Path) -> None:
    service = DomainLabService(tmp_path)

    first = service.start("materials")
    second = DomainLabService(tmp_path).start("materials")

    assert first["created"] is True
    assert first["added_observations"] == 6
    assert second["created"] is False
    assert second["added_observations"] == 0
    assert second["base_binding_count"] == 6
    assert second["active_rule_count"] == 0


def test_domain_gallery_explains_experiment_and_never_claims_separate_intelligences() -> None:
    static_html = living_robot_domains_html(static_mode=True)
    live_html = living_robot_domains_html(static_mode=False)

    for title in ("Materials", "Biology", "Robotics", "Software", "Physics / Quantum", "Law / Rules"):
        assert title in static_html
    assert "Same Logical Robot · different expert spaces" in static_html
    assert "EXPLORE A LOGICAL SPACE" in static_html
    assert "zero solution rules" in static_html.lower()
    assert "BUILD YOUR OWN LOGICAL SPACE" in static_html
    assert "START ISOLATED SPACE" in live_html
    assert "EXPLORE WITH ROBOT" in live_html
    assert "/api/domain/start" in live_html
    assert "kind:'explore_domain'" in live_html
    assert "/api/promote" not in live_html
    assert "/api/rule/install" not in live_html


def test_live_domain_api_starts_isolated_space_and_exploration_uses_normal_input_path(tmp_path: Path) -> None:
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    universes.space("reality").append([
        LogicalBinding("reality-001", ("keep", "reality", "unchanged"), "control:source", 1.0)
    ])
    reality_before = (tmp_path / "logical_space.csv").read_bytes()
    server = create_live_robot_server(store_root=tmp_path, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    base = f"http://{host}:{port}"
    try:
        page = urlopen(base + "/", timeout=3).read().decode("utf-8")
        catalog = json.loads(urlopen(base + "/api/domains", timeout=3).read())
        started = _post(base + "/api/domain/start", {"domain_id": "software"})
        frontier = _post(base + "/api/input", {
            "kind": "explore_domain",
            "payload": {"text": "Explore software failures and invariants", "priority": 8},
        })

        assert len(catalog["packs"]) == 6
        assert catalog["truth_boundary"]["starter_rules_supplied"] == 0
        assert started["universe_id"] == "domain-lab-software"
        assert started["base_binding_count"] == 6
        assert started["active_rule_count"] == 0
        assert started["truth_effect_on_reality"] == 0
        assert frontier["kind"] == "explore_domain"
        assert frontier["source"] == "human"
        assert (tmp_path / "logical_space.csv").read_bytes() == reality_before
        assert 33 in getattr(server, "qcds_service").state()["provenance"]["builds"]
        assert "EXPLORE A LOGICAL SPACE" in page
    finally:
        service = getattr(server, "qcds_service")
        service.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
