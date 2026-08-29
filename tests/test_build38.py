from __future__ import annotations

from qcds_fabric.living_robot_invite38 import living_robot_invite38_html
from qcds_fabric.session_sandbox_core import run_session


def _four_candidate_request() -> dict[str, object]:
    return {
        "space": {
            "domain_id": "cell-response",
            "title": "Cell Response",
            "tagline": "Competing response states.",
            "audience": "Biology researchers",
            "universe_mode": "simulation",
            "description": "Four plausible response states coexist without a supplied answer.",
            "challenge": "Which response state remains best supported after robustness testing?",
            "learning_target": "Observe evidence pull and stabilized return.",
            "explore_prompt": "Compare all candidate states and preserve uncertainty.",
            "observations": [
                {
                    "binding_id": "cell-response-001",
                    "terms": ["cell-001", "signal-high", "pathway-a"],
                    "source_id": "user:cell-response:001",
                    "confidence": 1.0,
                },
                {
                    "binding_id": "cell-response-002",
                    "terms": ["cell-001", "stress-marker-low", "nutrient-rich"],
                    "source_id": "user:cell-response:002",
                    "confidence": 1.0,
                },
            ],
            "starter_rules": [],
            "truth_boundary": {
                "external_truth_claim": False,
                "solution_rule_supplied": False,
                "starting_lab_modifies_reality": False,
            },
        },
        "probe": {
            "subject": "cell-001",
            "predicate": "response",
            "candidate_values": ["adaptive", "stressed", "dormant", "apoptotic"],
        },
        "evidence": [
            {"subject": "cell-001", "predicate": "response", "value": "adaptive", "source_id": "seed:1", "confidence": 0.95, "polarity": True},
            {"subject": "cell-001", "predicate": "response", "value": "stressed", "source_id": "seed:2", "confidence": 0.70, "polarity": True},
            {"subject": "cell-001", "predicate": "response", "value": "dormant", "source_id": "seed:3", "confidence": 0.60, "polarity": True},
            {"subject": "cell-001", "predicate": "response", "value": "apoptotic", "source_id": "seed:4", "confidence": 0.52, "polarity": True},
        ],
        "max_width": 20,
    }


def test_four_candidate_quick_space_has_visible_nonuniform_stabilized_result() -> None:
    result = run_session(_four_candidate_request())

    assert result["logical_width"] == 4
    assert result["candidate_binary_space"] == "2^4"
    assert len(result["baseline"]) == 4
    assert len(result["stabilized"]) == 4
    assert result["leading_candidates"] == ["adaptive"]

    baseline = {row["value"]: row["probability"] for row in result["baseline"]}
    stabilized = {row["value"]: row["probability"] for row in result["stabilized"]}

    assert baseline["adaptive"] > 0.70
    assert stabilized["adaptive"] > 0.40
    assert max(stabilized.values()) - min(stabilized.values()) > 0.20
    assert baseline != stabilized


def test_quick_ui_explains_inference_journey_without_replacing_advanced_lab() -> None:
    html = living_robot_invite38_html(static_mode=True)

    assert "BUILD38_SEEDS" in html
    assert "adaptive | stressed | dormant | apoptotic" in html
    assert "evidence pull" in html
    assert "STABILIZED LEADER" in html
    assert "NULL CHALLENGE" in html
    assert "OPEN ADVANCED LOGICAL SPACE LAB" in html
    assert "RUN QCDS CORE" in html
    assert "Reality effect" in html
    assert "qcds_fabric.zip" in html
