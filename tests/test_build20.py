from __future__ import annotations

import json
from pathlib import Path

import pytest

from qcds_fabric.logical_universe_runner import (
    LogicalUniverseMvpRunner,
    LogicalUniverseRunnerError,
    main,
)


def _lawbook_spec() -> dict:
    return {
        "universe": {
            "universe_id": "lawbook-test",
            "mode": "declared",
            "description": "isolated declared test universe",
            "authority": "test-legislature",
        },
        "seed_bindings": [
            {"binding_id": "alice-human", "terms": ["alice", "human"], "source_id": "seed"},
            {"binding_id": "bob-human", "terms": ["bob", "human"], "source_id": "seed"},
            {"binding_id": "fido-dog", "terms": ["fido", "dog"], "source_id": "seed"},
        ],
        "rules": [
            {
                "candidate_id": "legal-person-v1",
                "rule_id": "legal-person",
                "match_terms": ["human"],
                "emit_terms": ["legal_person"],
                "source_id": "law:1",
                "promote": True,
                "approval_source": "test-legislature",
                "override_blast": True,
            }
        ],
        "queries": [
            {"query_id": "human", "terms": ["human"]},
            {"query_id": "legal", "terms": ["legal_person"]},
            {"query_id": "dog", "terms": ["dog"]},
        ],
    }


def test_declared_universe_runs_end_to_end_without_materializing_derived_logic(tmp_path: Path) -> None:
    runner = LogicalUniverseMvpRunner(tmp_path)
    result = runner.run(_lawbook_spec())

    assert result.universe_id == "lawbook-test"
    assert result.universe_mode == "declared"
    assert result.base_binding_count == 3
    assert result.active_rule_count == 1
    assert result.added_bindings == 3

    results = {item["query_id"]: item for item in result.syntractfilter_results}
    assert results["human"]["match_count"] == 2
    assert results["legal"]["match_count"] == 2
    assert results["dog"]["match_count"] == 1

    space = runner.universes.space("lawbook-test")
    assert all("legal_person" not in binding.terms for binding in space.bindings())
    assert result.as_dict()["mvp_boundary"]["derived_logic_materialized_into_base_space"] is False


def test_runner_is_restart_idempotent_for_seed_and_identical_active_rule(tmp_path: Path) -> None:
    runner = LogicalUniverseMvpRunner(tmp_path)
    first = runner.run(_lawbook_spec())
    second = LogicalUniverseMvpRunner(tmp_path).run(_lawbook_spec())

    assert first.added_bindings == 3
    assert second.added_bindings == 0
    assert second.base_binding_count == 3
    assert second.active_rule_count == 1
    assert second.rule_outcomes[0]["status"] == "already_active"
    assert second.rule_outcomes[0]["idempotent_reuse"] is True


def test_declared_universe_rejects_wrong_approval_authority(tmp_path: Path) -> None:
    spec = _lawbook_spec()
    spec["rules"][0]["approval_source"] = "someone-else"

    with pytest.raises(LogicalUniverseRunnerError, match="must equal universe authority"):
        LogicalUniverseMvpRunner(tmp_path).run(spec)


def test_reality_candidate_can_be_measured_without_activation(tmp_path: Path) -> None:
    spec = {
        "universe": {"universe_id": "reality", "mode": "observed"},
        "seed_bindings": [
            {"binding_id": f"p:{index}", "terms": [f"person_{index}", "human"], "source_id": "seed"}
            for index in range(20)
        ],
        "rules": [
            {
                "candidate_id": "wide-happy",
                "rule_id": "human-state",
                "match_terms": ["human"],
                "emit_terms": ["happy"],
                "source_id": "oracle:genesis",
                "promote": False,
            }
        ],
        "queries": [{"query_id": "happy", "terms": ["happy"]}],
    }

    result = LogicalUniverseMvpRunner(tmp_path).run(spec)
    assert result.rule_outcomes[0]["status"] == "quarantined"
    assert result.rule_outcomes[0]["changed_bindings"] == 20
    assert result.syntractfilter_results[0]["match_count"] == 0
    assert result.active_rule_count == 0


def test_universe_isolation_survives_runner_execution(tmp_path: Path) -> None:
    law = LogicalUniverseMvpRunner(tmp_path).run(_lawbook_spec())
    assert law.syntractfilter_results[1]["match_count"] == 2

    reality_spec = {
        "universe": {"universe_id": "reality", "mode": "observed"},
        "seed_bindings": [
            {"binding_id": "alice-reality", "terms": ["alice", "human"], "source_id": "observation"}
        ],
        "queries": [{"query_id": "legal", "terms": ["legal_person"]}],
    }
    reality = LogicalUniverseMvpRunner(tmp_path).run(reality_spec)

    assert reality.syntractfilter_results[0]["match_count"] == 0
    assert reality.active_rule_count == 0


def test_cli_prints_machine_readable_result(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    spec_path = tmp_path / "universe.json"
    spec_path.write_text(json.dumps(_lawbook_spec()), encoding="utf-8")
    store = tmp_path / "store"

    assert main([str(spec_path), "--store", str(store)]) == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["universe_id"] == "lawbook-test"
    assert payload["mvp_boundary"]["overlay_only"] is True
    assert payload["syntractfilter_results"][1]["match_count"] == 2


def test_runner_rejects_existing_universe_mode_change(tmp_path: Path) -> None:
    runner = LogicalUniverseMvpRunner(tmp_path)
    runner.run(_lawbook_spec())
    changed = _lawbook_spec()
    changed["universe"]["mode"] = "simulation"
    changed["universe"].pop("authority", None)

    with pytest.raises(LogicalUniverseRunnerError, match="mode does not match"):
        LogicalUniverseMvpRunner(tmp_path).run(changed)
