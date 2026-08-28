import csv
import json
from dataclasses import dataclass

import pytest

from qcds_fabric.evidence_driven_reality import (
    EvidenceDrivenRealityError,
    run_evidence_driven_reality_spec,
)
from qcds_fabric.logical_robot import LogicalObservation, LogicalRobotRequest, LogicalRobotToolResult
from qcds_fabric.self_expanding_reality import SelfExpandingRealityError


def _observation(observation_id, value, source_id, context):
    return {
        "observation_id": observation_id,
        "query_id": "ability",
        "observed_value": value,
        "source_id": source_id,
        "context": context,
        "capability": "search",
        "confidence": 1.0,
        "excerpt": f"Independent observation reports the represented ability as {value}.",
    }


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
            _observation("winged-a", "flies", "source:winged:a", {"trait": "winged"}),
            _observation("winged-b", "flies", "source:winged:b", {"trait": "winged"}),
            _observation("grounded-a", "walks", "source:grounded:a", {"trait": "grounded"}),
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
            "selection_independent_sources": 2,
            "holdout_independent_sources": 1,
        },
    }


def test_build22_closes_gap_using_current_and_target_blind_contrast_context(tmp_path):
    spec = build22_spec()
    assert "challenge" not in spec
    assert "expected_assignments" not in spec

    result = run_evidence_driven_reality_spec(spec, store_root=tmp_path)

    assert result.status == "expanded"
    assert result.oracle_gap_count == 1
    assert result.rival_hypothesis_count == 12
    assert result.evidence_plan_count == 2
    assert result.planned_query_ids == ("ability",)
    assert len(result.planned_contexts) == 2
    assert result.planned_contexts[0]["purpose"] == "selection"
    assert result.planned_contexts[0]["context_assignments"] == {"trait": "winged"}
    assert result.planned_contexts[0]["required_sources"] == 2
    assert result.planned_contexts[1]["purpose"] == "holdout"
    assert result.planned_contexts[1]["context_assignments"] == {"trait": "grounded"}
    assert result.planned_contexts[1]["required_sources"] == 1

    assert result.robot_status == "evidence_acquired"
    assert result.robot_observation_count == 3
    assert set(result.robot_source_ids) == {
        "source:winged:a",
        "source:winged:b",
        "source:grounded:a",
    }
    assert result.challenge_case_count == 3
    assert result.selection_case_count == 2
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


def test_build22_missing_second_selection_source_stays_unresolved(tmp_path):
    spec = build22_spec(observations=[
        _observation("winged-only", "flies", "source:winged:only", {"trait": "winged"}),
        _observation("grounded-a", "walks", "source:grounded:a", {"trait": "grounded"}),
    ])
    result = run_evidence_driven_reality_spec(spec, store_root=tmp_path)

    assert result.status == "awaiting_identifying_evidence"
    assert result.robot_observation_count == 2
    assert result.challenge_case_count == 0
    assert result.reality_result is None
    assert result.active_reality_rule_count == 0
    assert not (tmp_path / "logical_rules.csv").exists()
    assert (tmp_path / "logical_space.csv").exists()


def test_build22_missing_contrast_source_stays_unresolved(tmp_path):
    spec = build22_spec(observations=[
        _observation("winged-a", "flies", "source:winged:a", {"trait": "winged"}),
        _observation("winged-b", "flies", "source:winged:b", {"trait": "winged"}),
    ])
    result = run_evidence_driven_reality_spec(spec, store_root=tmp_path)

    assert result.status == "awaiting_identifying_evidence"
    assert result.robot_observation_count == 2
    assert result.challenge_case_count == 0
    assert result.active_reality_rule_count == 0


def test_build22_duplicate_source_does_not_fake_selection_independence(tmp_path):
    spec = build22_spec(observations=[
        _observation("winged-a", "flies", "source:same", {"trait": "winged"}),
        _observation("winged-b", "flies", "source:same", {"trait": "winged"}),
        _observation("grounded-a", "walks", "source:grounded:a", {"trait": "grounded"}),
    ])
    result = run_evidence_driven_reality_spec(spec, store_root=tmp_path)

    assert result.status == "awaiting_identifying_evidence"
    assert set(result.robot_source_ids) == {"source:same", "source:grounded:a"}
    assert result.active_reality_rule_count == 0


def test_build22_conflicting_selection_evidence_does_not_become_reality_rule(tmp_path):
    spec = build22_spec(observations=[
        _observation("winged-a", "flies", "source:winged:a", {"trait": "winged"}),
        _observation("winged-b", "walks", "source:winged:b", {"trait": "winged"}),
        _observation("grounded-a", "walks", "source:grounded:a", {"trait": "grounded"}),
    ])
    result = run_evidence_driven_reality_spec(spec, store_root=tmp_path)

    assert result.challenge_case_count == 3
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


def test_build22_audit_retains_context_plans_sources_and_boundaries(tmp_path):
    result = run_evidence_driven_reality_spec(build22_spec(), store_root=tmp_path)
    audit = tmp_path / "reality_discovery_history.jsonl"
    rows = [json.loads(line) for line in audit.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(rows) == 1
    row = rows[0]
    assert row["planned_query_ids"] == ["ability"]
    assert row["planned_contexts"][0]["context_assignments"] == {"trait": "winged"}
    assert row["planned_contexts"][1]["context_assignments"] == {"trait": "grounded"}
    assert set(row["robot_source_ids"]) == {
        "source:winged:a",
        "source:winged:b",
        "source:grounded:a",
    }
    assert row["selection_case_count"] == 2
    assert row["holdout_case_count"] == 1
    provenance = row["provenance"]
    assert provenance["manual_challenge_supplied"] is False
    assert provenance["planner_received_observation_values"] is False
    assert provenance["planner_received_challenge_targets"] is False
    assert provenance["contrast_context_selected_target_blind"] is True
    assert provenance["selection_holdout_roles_fixed_before_observation"] is True
    assert provenance["role_assignment_depends_on_observed_value"] is False
    assert provenance["robot_received_challenge_roles"] is False
    assert provenance["robot_received_expected_answers"] is False
    assert provenance["robot_received_hypothesis_ids"] is False
    assert provenance["challenge_built_only_after_observation"] is True
    assert provenance["reality_promotion_delegated_to_build21"] is True
    assert result.audit_path == str(audit)


@dataclass
class SpyContextTool:
    tool_id: str = "spy-context-tool"
    capabilities: tuple[str, ...] = ("search",)

    def __post_init__(self):
        self.seen = []

    def observe(self, request: LogicalRobotRequest) -> LogicalRobotToolResult:
        serialized = json.dumps(dict(request.provenance), sort_keys=True).lower()
        assert "selection" not in serialized
        assert "holdout" not in serialized
        assert "expected_assignments" not in serialized
        assert "hypothesis" not in serialized
        context = dict(request.provenance["build22_context_assignments"])
        self.seen.append(context)
        if context == {"trait": "winged"}:
            rows = (
                LogicalObservation("spy-winged-a", "ability", "flies", "spy:a", "search", 1.0),
                LogicalObservation("spy-winged-b", "ability", "flies", "spy:b", "search", 1.0),
            )
        elif context == {"trait": "grounded"}:
            rows = (LogicalObservation("spy-grounded-a", "ability", "walks", "spy:c", "search", 1.0),)
        else:
            rows = ()
        return LogicalRobotToolResult(observations=rows, exhausted=not rows)


def test_build22_robot_sees_context_but_never_challenge_role_or_expected_answer(tmp_path):
    tool = SpyContextTool()
    spec = build22_spec(observations=[])
    result = run_evidence_driven_reality_spec(spec, store_root=tmp_path, tools=(tool,))

    assert result.status == "expanded"
    assert tool.seen == [{"trait": "winged"}, {"trait": "grounded"}]


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
        run_evidence_driven_reality_spec(spec, store_root=tmp_path)
