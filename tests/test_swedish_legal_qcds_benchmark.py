from __future__ import annotations

from qcds_fabric.robots.legal.sweden_housing.benchmark import (
    benchmark_result_payload,
    benchmark_suite_summary,
)
from qcds_fabric.robots.legal.sweden_housing.full_qcds import run_full_legal_qcds


def _run(confidence: float) -> dict[str, object]:
    corpus = {
        "corpus_id": "benchmark-test",
        "primary_regime_candidates": ["a", "b"],
        "rules": [
            {
                "rule_id": "r",
                "source_id": "law",
                "section_id": "1",
                "match_terms": ["fact:x"],
                "emit_terms": ["conclusion:y"],
            }
        ],
    }
    return dict(run_full_legal_qcds(
        case_id=f"benchmark-{confidence}",
        case_terms=(),
        resolved_terms=(),
        unresolved_questions=(),
        corpus=corpus,
        applied_rule_ids=(),
        qcds_evidence=({"term": "fact:x", "confidence": confidence, "source_id": "s"},),
        max_unknown_dimensions=8,
        grover_max_states=256,
        grover_max_iterations=4,
    ))


def test_benchmark_reports_exact_vs_grover_without_claiming_identity() -> None:
    result = _run(0.8)
    row = benchmark_result_payload(result, category="ambiguous")

    assert row.grover_status == "ok"
    assert row.exact_state_count > 1
    assert row.total_variation_distance is not None
    assert row.total_variation_distance >= 0.0
    assert row.grover_syntract_id is not None
    assert row.selected_grover_depths


def test_benchmark_suite_explicitly_allows_qcds_to_lose() -> None:
    rows = (
        benchmark_result_payload(_run(0.99), category="near-hard"),
        benchmark_result_payload(_run(0.6), category="ambiguous"),
    )
    summary = benchmark_suite_summary(rows)

    assert summary["case_count"] == 2
    assert summary["grover_success_count"] == 2
    assert summary["boundary"]["qcds_allowed_to_lose_benchmark"] is True
    assert summary["boundary"]["grover_expected_to_equal_classical_weighting"] is False
    assert summary["boundary"]["court_outcome_calibration_claimed"] is False
