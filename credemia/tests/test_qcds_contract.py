"""CREDEMIA smoke test: canonical QCDS Fabric must execute, not a UI surrogate."""
from __future__ import annotations

from qcds_fabric.session_sandbox_core import run_session

DIMENSIONS = ("prior", "overlap", "access", "credit", "independent", "primary", "conflict")


def request(dimension: str, decision: str = "?") -> dict:
    evidence = []
    if decision != "?":
        evidence.append({
            "subject": "research-comparison",
            "predicate": dimension,
            "value": "supported" if decision == "1" else "contradicted",
            "source_id": "user-assertion:" + dimension,
            "confidence": 0.75,
            "polarity": True,
        })
    return {
        "space": {
            "domain_id": "credemia-" + dimension,
            "title": "CREDEMIA " + dimension,
            "tagline": "Scientific priority inference",
            "audience": "Research reviewers",
            "universe_mode": "simulation",
            "description": "Evidence-led QCDS workbench",
            "challenge": "Is the explicit condition supported?",
            "learning_target": "Preserve uncertainty",
            "explore_prompt": "Look for falsification evidence",
            "observations": [],
            "starter_rules": [],
            "truth_boundary": {
                "external_truth_claim": False,
                "solution_rule_supplied": False,
                "starting_lab_modifies_reality": False,
            },
        },
        "probe": {
            "subject": "research-comparison",
            "predicate": dimension,
            "candidate_values": ["supported", "contradicted"],
        },
        "evidence": evidence,
        "max_width": 12,
    }


def main() -> None:
    for dimension in DIMENSIONS:
        for decision in ("?", "1", "0"):
            output = run_session(request(dimension, decision))
            assert output["core_execution"] == "qcds_fabric.problem.problem_to_syntract"
            assert output["answer_is_external_truth_claim"] is False
            assert output["generic_bindings_promoted_to_semantic_evidence"] == 0
            assert output["explicit_evidence_count"] == (0 if decision == "?" else 1)
            stabilized = output["stabilized"]
            assert {row["value"] for row in stabilized} == {"supported", "contradicted"}
            assert abs(sum(row["probability"] for row in stabilized) - 1) < 1e-8
    print("CREDEMIA PASS: 7 oracles × 3 masks execute on canonical QCDS Core")


if __name__ == "__main__":
    main()
