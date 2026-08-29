from __future__ import annotations

from qcds_fabric.robots.legal.sweden_housing.full_qcds import run_full_legal_qcds


def _corpus() -> dict[str, object]:
    return {
        "corpus_id": "probabilistic-test-corpus",
        "primary_regime_candidates": ["regime_a", "regime_b"],
        "rules": [
            {
                "rule_id": "evidence-activated-rule",
                "source_id": "test-law",
                "section_id": "1 §",
                "match_terms": ["fact:uncertain"],
                "emit_terms": ["conclusion:outcome_x"],
            }
        ],
    }


def test_probabilistic_fact_activates_rule_but_remains_live_qcds_dimension() -> None:
    result = run_full_legal_qcds(
        case_id="probabilistic-case",
        case_terms=(),
        resolved_terms=(),
        unresolved_questions=(),
        corpus=_corpus(),
        applied_rule_ids=(),
        qcds_evidence=(
            {
                "term": "fact:uncertain",
                "confidence": 0.74,
                "polarity": True,
                "source_id": "witness-a",
                "note": "uncertain factual observation",
            },
        ),
        praxis=None,
        max_unknown_dimensions=8,
        grover_max_states=256,
        grover_max_iterations=4,
    )

    assert result["augmented_rule_ids_from_evidence"] == ["evidence-activated-rule"]
    assert result["probabilistic_evidence"]["input_count"] == 1
    assert result["probabilistic_evidence"]["attached_count"] == 1
    assert result["probabilistic_evidence"]["attached"][0]["confidence"] == 0.74

    marginals = {row["term"]: row for row in result["marginals"]}
    assert "fact:uncertain" in marginals
    assert "conclusion:outcome_x" in marginals
    assert 0.0 < marginals["fact:uncertain"]["probability_true"] < 1.0
    assert 0.0 < marginals["conclusion:outcome_x"]["probability_true"] < 1.0

    dual = result["dual_substrate"]
    assert dual["same_logical_contract"] is True
    assert dual["same_base_bundle"] is True
    assert dual["same_oracle_stack"] is True
    assert dual["grover_emulated"]["status"] == "ok"
    assert dual["grover_emulated"]["selected_grover_iterations"]

    modes = result["execution_modes"]
    assert set(modes) == {"classical_exact", "grover_emulated", "quantum_full_space"}
    assert modes["classical_exact"]["resource_bounded_emulation"] is True
    assert modes["classical_exact"]["semantic_projection_allowed"] is True
    assert modes["grover_emulated"]["resource_bounded_emulation"] is True
    quantum = modes["quantum_full_space"]
    assert quantum["status"] == "target_contract_only"
    assert quantum["semantic_projection_allowed"] is False
    assert quantum["requires_full_logical_universe"] is True
    assert quantum["native_qpu_connected"] is False
    assert quantum["full_universe_manifest"]["semantic_prefiltering"] is False
    assert quantum["full_universe_dimension_count"] >= result["logical_width"]
    assert result["quantum_full_space_semantic_prefiltering_forbidden"] is True
    assert result["native_qpu"] is False
    assert result["quantum_advantage_claim"] is False


def test_negative_evidence_is_pressure_not_hard_false() -> None:
    result = run_full_legal_qcds(
        case_id="negative-evidence-case",
        case_terms=(),
        resolved_terms=(),
        unresolved_questions=(),
        corpus=_corpus(),
        applied_rule_ids=(),
        qcds_evidence=(
            {
                "term": "fact:uncertain",
                "confidence": 0.85,
                "polarity": False,
                "source_id": "counter-source",
            },
        ),
        praxis=None,
        max_unknown_dimensions=8,
        grover_max_states=256,
        grover_max_iterations=4,
    )
    marginal = next(row for row in result["marginals"] if row["term"] == "fact:uncertain")
    assert 0.0 < marginal["probability_true"] < 0.5
    assert result["probabilistic_evidence"]["attached"][0]["polarity"] is False
