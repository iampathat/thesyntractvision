import csv
import json
from copy import deepcopy
from pathlib import Path

import pytest

from qcds_fabric.self_expanding_reality import (
    SelfExpandingRealityError,
    run_reality_cycle_spec,
)


def build21_spec(*, winged_bindings=2, grounded_bindings=6):
    bindings = [
        {
            "binding_id": f"winged-{index:03d}",
            "terms": [f"creature-winged-{index:03d}", "winged"],
            "source_id": f"observation:winged:{index:03d}",
        }
        for index in range(winged_bindings)
    ]
    bindings.extend(
        {
            "binding_id": f"grounded-{index:03d}",
            "terms": [f"creature-grounded-{index:03d}", "grounded"],
            "source_id": f"observation:grounded:{index:03d}",
        }
        for index in range(grounded_bindings)
    )

    queries = [
        {
            "query_id": "trait",
            "subject": "creature",
            "predicate": "trait",
            "candidate_values": ["winged", "grounded"],
        },
        {
            "query_id": "ability",
            "subject": "creature",
            "predicate": "ability",
            "candidate_values": ["flies", "walks"],
        },
    ]

    def frame(mission_id, trait, source_id):
        return {
            "mission_id": mission_id,
            "raw_text": f"Observed trait: {trait}.",
            "analyzer_id": "build21-test",
            "queries": deepcopy(queries),
            "claims": [
                {
                    "subject": "creature",
                    "predicate": "trait",
                    "value": trait,
                    "source_id": source_id,
                    "confidence": 1.0,
                }
            ],
            "rules": [],
        }

    return {
        "mission_id": "build21-test-cycle",
        "probe_terms": ["flies"],
        "reality_bindings": bindings,
        "genesis": {
            "problem": frame("live-winged", "winged", "live:evidence"),
            "failure_observations": [
                {
                    "observation_id": "ability-unresolved",
                    "kind": "prediction_failure",
                    "query_ids": ["ability"],
                    "severity": 1.0,
                }
            ],
            "challenge": {
                "suite_id": "winged-ability-challenge",
                "cases": [
                    {
                        "case_id": "selection-winged",
                        "role": "selection",
                        "frame": frame("selection-winged", "winged", "selection:evidence"),
                        "expected_assignments": {"trait": "winged", "ability": "flies"},
                    },
                    {
                        "case_id": "holdout-grounded",
                        "role": "holdout",
                        "frame": frame("holdout-grounded", "grounded", "holdout:evidence"),
                        "expected_assignments": {"trait": "grounded", "ability": "walks"},
                    },
                ],
            },
            "evaluation_mode": "baseline",
            "max_generations": 1,
            "max_promotions_per_generation": 1,
            "min_selection_cases": 1,
            "min_holdout_cases": 1,
        },
    }


def test_build21_discovers_challenges_governs_and_expands_reality(tmp_path):
    result = run_reality_cycle_spec(build21_spec(), store_root=tmp_path)

    assert result.status == "expanded"
    assert result.added_base_bindings == 8
    assert result.base_binding_count == 8
    assert result.before_probe_count == 0
    assert result.after_probe_count == 2
    assert result.knowledge_gain == 2
    assert result.oracle_gap_count == 1
    assert result.oracle_promoted_count == 1
    assert result.oracle_rejected_count > 0
    assert result.active_reality_rule_count == 1
    assert result.base_space_sha256_before_rules == result.base_space_sha256_after_cycle

    outcome = result.governed_rule_outcomes[0]
    assert outcome["antecedent"]["value"] == "winged"
    assert outcome["consequent"]["value"] == "flies"
    assert outcome["kind"] == "implies"
    assert outcome["status"] == "promoted_to_reality"
    assert outcome["active"] is True
    assert outcome["changed_bindings"] == 2
    assert outcome["changed_fraction"] == pytest.approx(0.25)
    assert outcome["blast_override"] is False


def test_build21_false_rival_is_challenged_but_never_becomes_global_logic(tmp_path):
    result = run_reality_cycle_spec(build21_spec(), store_root=tmp_path)

    rejected_signatures = {
        (item["antecedent"]["value"], item["consequent"]["value"])
        for item in result.rejected_oracle_examples
    }
    assert ("grounded", "flies") in rejected_signatures

    with (tmp_path / "logical_rules.csv").open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 1
    assert json.loads(rows[0]["match_terms"]) == ["winged"]
    assert json.loads(rows[0]["emit_terms"]) == ["flies"]


def test_build21_derived_knowledge_is_not_materialized_into_base_rows(tmp_path):
    result = run_reality_cycle_spec(build21_spec(), store_root=tmp_path)
    assert result.after_probe_count == 2

    with (tmp_path / "logical_space.csv").open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 8
    assert all("flies" not in json.loads(row["terms"]) for row in rows)


def test_build21_high_blast_rule_is_quarantined_even_after_oracle_challenge(tmp_path):
    result = run_reality_cycle_spec(
        build21_spec(winged_bindings=4, grounded_bindings=4),
        store_root=tmp_path,
    )

    assert result.oracle_promoted_count == 1
    assert result.status == "quarantined"
    assert result.before_probe_count == 0
    assert result.after_probe_count == 0
    assert result.active_reality_rule_count == 0
    outcome = result.governed_rule_outcomes[0]
    assert outcome["status"] == "quarantined_by_reality_governance"
    assert outcome["active"] is False
    assert outcome["changed_bindings"] == 4
    assert outcome["changed_fraction"] == pytest.approx(0.5)
    assert "changed_fraction_exceeds_policy" in outcome["drift_reasons"]


def test_build21_restart_reuses_promoted_rule_without_duplicate_base_logic(tmp_path):
    first = run_reality_cycle_spec(build21_spec(), store_root=tmp_path)
    second = run_reality_cycle_spec(build21_spec(), store_root=tmp_path)

    assert first.status == "expanded"
    assert second.added_base_bindings == 0
    assert second.base_binding_count == 8
    assert second.before_probe_count == 2
    assert second.after_probe_count == 2
    assert second.knowledge_gain == 0
    assert second.active_reality_rule_count == 1
    assert second.governed_rule_outcomes[0]["status"] == "already_active"


def test_build21_refuses_a_solution_rule_in_genesis_input(tmp_path):
    spec = build21_spec()
    spec["genesis"]["problem"]["rules"] = [
        {
            "rule_id": "answer-smuggling",
            "antecedent": ["creature", "trait", "winged"],
            "consequent": ["creature", "ability", "flies"],
        }
    ]
    with pytest.raises(SelfExpandingRealityError, match="must discover the missing rule"):
        run_reality_cycle_spec(spec, store_root=tmp_path)


def test_build21_challenge_frames_also_refuse_preloaded_rules(tmp_path):
    spec = build21_spec()
    spec["genesis"]["challenge"]["cases"][0]["frame"]["rules"] = [
        {"rule_id": "hidden-answer"}
    ]
    with pytest.raises(SelfExpandingRealityError, match="must discover the missing rule"):
        run_reality_cycle_spec(spec, store_root=tmp_path)


def test_build21_output_provenance_keeps_overlay_and_target_boundaries_explicit(tmp_path):
    result = run_reality_cycle_spec(build21_spec(), store_root=tmp_path)
    provenance = result.provenance

    assert provenance["overlay_only"] is True
    assert provenance["qcds_core_modified"] is False
    assert provenance["fabric_core_modified"] is False
    assert provenance["oracle_core_modified"] is False
    assert provenance["logical_universe_core_modified"] is False
    assert provenance["canonical_spec_modified"] is False
    assert provenance["solution_rule_supplied_to_genesis"] is False
    assert provenance["external_targets_visible_only_after_proposal"] is True
    assert provenance["holdout_visible_to_generator"] is False
    assert provenance["reality_rule_requires_oracle_challenge"] is True
    assert provenance["reality_rule_requires_drift_governance"] is True
    assert provenance["automatic_blast_override"] is False
