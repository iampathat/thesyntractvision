from __future__ import annotations

from qcds_fabric.session_sandbox_core import run_session


def demo_request() -> dict[str, object]:
    """Smallest useful Logical Robot -> QCDS Core example.

    Change the observations, probe, candidates or explicit evidence and run the
    file again. Generic Logical Space observations stay context only; they are
    never silently promoted to semantic evidence.
    """

    return {
        "space": {
            "domain_id": "hello-logic",
            "title": "Hello Logical Space",
            "tagline": "A tiny editable QCDS example.",
            "audience": "New builders",
            "universe_mode": "simulation",
            "description": "A deliberately small Logical Space for learning the architecture.",
            "challenge": "Which represented state is better supported?",
            "learning_target": "Understand the Logical Robot -> QCDS Core boundary.",
            "explore_prompt": "Inspect what remains unresolved and what evidence would distinguish the candidates.",
            "observations": [
                {
                    "binding_id": "hello-001",
                    "terms": ["sample-001", "sensor-a", "warm"],
                    "source_id": "hello:observation:001",
                    "confidence": 1.0,
                },
                {
                    "binding_id": "hello-002",
                    "terms": ["sample-002", "sensor-a", "cold"],
                    "source_id": "hello:observation:002",
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
            "subject": "sample-001",
            "predicate": "state",
            "candidate_values": ["stable", "unstable"],
        },
        "evidence": [
            {
                "subject": "sample-001",
                "predicate": "state",
                "value": "stable",
                "source_id": "hello:explicit:evidence:001",
                "confidence": 0.90,
                "polarity": True,
            }
        ],
        "max_width": 20,
    }


def main() -> int:
    result = run_session(demo_request())

    print("HELLO LOGICAL SPACE")
    print("-------------------")
    print(f"core: {result['core_execution']}")
    print(f"candidate space: {result['candidate_binary_space']}")
    print(f"leading candidates: {', '.join(result['leading_candidates']) or 'unresolved'}")
    print(f"Reality effect: {result['truth_effect_on_reality']}")
    print(f"generic bindings promoted to evidence: {result['generic_bindings_promoted_to_semantic_evidence']}")
    print("\nstabilized distribution:")
    for row in result["stabilized"]:
        print(f"  {row['value']:<12} {row['probability']:.6f}")

    print("\nNow edit this file and run it again.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
