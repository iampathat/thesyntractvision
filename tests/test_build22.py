import csv
import json
from copy import deepcopy

import pytest

from qcds_fabric.evidence_driven_reality import (
    EvidenceDrivenRealityError,
    run_evidence_driven_reality_spec,
)


def build22_spec(*, winged_bindings=2, grounded_bindings=6, observations=None):
    bindings = [
        {
            "binding_id": f"winged-{index:03d}",
            "terms": [f"creature-winged-{index:03d}", "winged"],
            "source_id": f"reality:winged:{index:03d}",
        }
        for index in range(winged_bindings)
    ]
    bindings.extend(
        {
            "binding_id": f"grounded-{index:03d}",
            "terms": [f"creature-grounded-{index:03d}", "grounded"],
            "source_id": f"reality:grounded:{index:03d}",
        }
        for index in range(grounded_bindings)
    )
    if observations is None:
        observations = [
            {
                "observation_id": "independent-a",
                "query_id": "ability",
                "observed_value": "flies",
                "source_id": "source:independent:a",
                "capability": "search",
                "confidence": 1.0,
                "excerpt": "Independent observation A reports the represented ability as flies.",
            },
            {
                "observation_id": "independent-b",
                "query_id": "ability",
                "observed_value": "flies",
                "source_id": "source:independent:b",
                "capability": "search",
                "confidence": 1.0,
                "excerpt": "Independent observation B reports the represented ability as flies.",
            },
        ]
    return {
        "mission_id": "build22-test-cycle",
        "probe_terms": ["flies"],
        "reality_bindings": bindings,
        "problem": {
            "mission_id": "build22-live-winged",
            "raw_text": "An observed creature is winged; its represented movement ability remains unresolved.",
            "analyzer_id": "build22-test",
            "queries": [
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
                    "candidate_values": ["flies", "walks", "swims"],
                },
            ],
            "claims": [
                {
                    "subject": "creature",
                    "predicate": "trait",
                    "value": "winged",
                    "source_id": "live:trait:evidence",
                    "confidence": 1.0,
                }
            ],
            "rules": [],
        },
        "failure_observations": [
            {
                "observation_id": "ability-unresolved",
                "kind": "prediction_failure",
                "query_ids": ["ability"],
                "severity": 1.0,
                "description": "The ability remains unresolved; determine what observation discriminates rival rules.",
            }
        ],
        "observation_pool": observations,
        "generation": {
            "evaluation_mode": "baseline",
            "max_generations": 1,
            "max_promotions_per_generation": 1,
            "min_selection_cases": 1,
            "min_holdout_cases": 1,
            "max_actions_per_plan": 1,
        },
    }


def test_build22_closes_gap_by_planning_observing_and_building_its_own_challenge(tmp_path):
    spec = build22_spec()
    assert "challenge" not in spec
    result = run_evidence_driven_reality_spec(spec, store_root=tmp_path)

    assert result.status == "expanded"
    assert result.oracle_gap_count == 1
    assert result.rival_hypothesis_count == 12
    assert result.evidence_plan_count == 1
    assert result.planned_query_ids == ("ability",)
    assert result.robot_status == "evidence_acquired"
    assert result.robot_observation_count == 2
    assert set(result.robot_source_ids) == {"source:independent:a", "source:independent:b"}
    assert result.challenge_case_count == 2
    assert result.selection_case_count == 1
    assert result.holdout_case_count == 1

    reality = result.reality_result
    assert reality is not None
    assert reality.before_probe_count == 0
    assert reality.after_probe_count == 2
    assert reality.knowledge_gain == 2
    assert reality.oracle_promoted_count == 1
    assert reality.active_reality_rule_count == 1
    outcome = reality.governed_rule_outcomes[0]
    assert outcome["antecedent"]["value"] == "winged"
    assert outcome["consequent"]["value"] == "flies"
    assert outcome["status"] == "promoted_to_reality"
    assert outcome["blast_override"] is False


def test_build22_requires_no_manual_expected_answer_or_challenge_input(tmp_path):
    spec = build22_spec()
    spec["challenge"] = {"cases": []}
    with pytest.raises(EvidenceDrivenRealityError, match="does not accept a manual challenge"):
        run_evidence_driven_reality_spec(spec, store_root=tmp_path)

    spec = build22_spec()
    spec["expected_assignments"] = {"ability": "flies"}
    with pytest.raises(EvidenceDrivenRealityError, match="does not accept expected_assignments"):
        run_evidence_driven_reality_spec(spec, store_root=tmp_path)


def test_build22_observation_pool_cannot_prelabel_selection_holdout_or_targets(tmp_path):
    for forbidden_key, forbidden_value in [
        ("role", "holdout"),
        ("expected_assignments", {"ability": "flies"}),
        ("target", "flies"),
        ("challenge_target", "flies"),
    ]:
        spec = build22_spec()
        spec["observation_pool"][0][forbidden_key] = forbidden_value
        with pytest.raises(EvidenceDrivenRealityError, match="observations, not challenge"):
            run_evidence_driven_reality_spec(spec, store_root=tmp_path / forbidden_key)


def test_build22_one_independent_source_stays_unresolved_and_creates_no_rule(tmp_path):
    spec = build22_spec(observations=[
        {
            "observation_id": "only-source",
            "query_id": "ability",
            "observed_value": "flies",
            "source_id": "source:only",
            "capability": "search",
        }
    ])
    result = run_evidence_driven_reality_spec(spec, store_root=tmp_path)

    assert result.status == "awaiting_independent_evidence"
    assert result.robot_observation_count == 1
    assert result.challenge_case_count == 0
    assert result.reality_result is None
    assert result.active_reality_rule_count == 0
    assert not (tmp_path / "logical_rules.csv").exists()


def test_build22_duplicate_source_does_not_fake_holdout_independence(tmp_path):
    spec = build22_spec(observations=[
        {
            "observation_id": "same-source-a",
            "query_id": "ability",
            "observed_value": "flies",
            "source_id": "source:same",
            "capability": "search",
        },
        {
            "observation_id": "same-source-b",
            "query_id": "ability",
            "observed_value": "flies",
            "source_id": "source:same",
            "capability": "search",
        },
    ])
    result = run_evidence_driven_reality_spec(spec, store_root=tmp_path)

    assert result.status == "awaiting_independent_evidence"
    assert result.robot_observation_count == 1
    assert result.robot_source_ids == ("source:same",)
    assert result.active_reality_rule_count == 0


def test_build22_conflicting_independent_observations_do_not_become_reality_rule(tmp_path):
    spec = build22_spec(observations=[
        {
            "observation_id": "conflict-a",
            "query_id": "ability",
            "observed_value": "flies",
            "source_id": "source:conflict:a",
            "capability": "search",
        },
        {
            "observation_id": "conflict-b",
            "query_id": "ability",
            "observed_value": "walks",
            "source_id": "source:conflict:b",
            "capability": "search",
        },
    ])
    result = run_evidence_driven_reality_spec(spec, store_root=tmp_path)

    assert result.challenge_case_count == 2
    assert result.reality_result is not None
    assert result.reality_result.oracle_promoted_count == 0
    assert result.status == "no_challenged_oracle_survived"
    assert result.active_reality_rule_count == 0
    assert not (tmp_path / "logical_rules.csv").exists()


def test_build22_challenged_rule_still_cannot_bypass_reality_blast_governance(tmp_path):
    result = run_evidence_driven_reality_spec(
        build22_spec(winged_bindings=4, grounded_bindings=4),
        store_root=tmp_path,
    )

    assert result.status == "quarantined"
    assert result.reality_result is not None
    assert result.reality_result.oracle_promoted_count == 1
    assert result.active_reality_rule_count == 0
    outcome = result.reality_result.governed_rule_outcomes[0]
    assert outcome["antecedent"]["value"] == "winged"
    assert outcome["consequent"]["value"] == "flies"
    assert outcome["changed_bindings"] == 4
    assert outcome["changed_fraction"] == pytest.approx(0.5)
    assert "changed_fraction_exceeds_policy" in outcome["drift_reasons"]


def test_build22_restart_uses_learned_reality_without_reobserving(tmp_path):
    spec = build22_spec()
    first = run_evidence_driven_reality_spec(spec, store_root=tmp_path)
    second = run_evidence_driven_reality_spec(spec, store_root=tmp_path)

    assert first.status == "expanded"
    assert second.status == "already_resolved"
    assert second.evidence_plan_count == 0
    assert second.robot_status == "not_run"
    assert second.robot_observation_count == 0
    assert second.active_reality_rule_count == 1

    with (tmp_path / "logical_rules.csv").open(encoding="utf-8", newline="") as handle:
        rules = list(csv.DictReader(handle))
    assert len(rules) == 1
    assert json.loads(rules[0]["match_terms"]) == ["winged"]
    assert json.loads(rules[0]["emit_terms"]) == ["flies"]


def test_build22_audit_retains_plans_sources_and_fail_closed_boundaries(tmp_path):
    result = run_evidence_driven_reality_spec(build22_spec(), store_root=tmp_path)
    audit = tmp_path / "reality_discovery_history.jsonl"
    assert audit.exists()
    rows = [json.loads(line) for line in audit.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(rows) == 1
    row = rows[0]
    assert row["planned_query_ids"] == ["ability"]
    assert set(row["robot_source_ids"]) == {"source:independent:a", "source:independent:b"}
    assert row["selection_case_count"] == 1
    assert row["holdout_case_count"] == 1
    assert row["provenance"]["manual_challenge_supplied"] is False
    assert row["provenance"]["planner_received_observation_values"] is False
    assert row["provenance"]["robot_received_expected_answers"] is False
    assert row["provenance"]["challenge_built_only_after_observation"] is True
    assert row["provenance"]["reality_promotion_delegated_to_build21"] is True
    assert result.audit_path == str(audit)


def test_build22_keeps_solution_rule_out_of_problem_input(tmp_path):
    spec = build22_spec()
    spec["problem"]["rules"] = [
        {
            "rule_id": "answer-smuggling",
            "antecedent": ["creature", "trait", "winged"],
            "consequent": ["creature", "ability", "flies"],
        }
    ]
    with pytest.raises(SelfExpandingRealityError, match="must discover the missing rule"):
        # BUILD 22 reuses BUILD 21's parser boundary before any planning happens.
        run_evidence_driven_reality_spec(spec, store_root=tmp_path)
