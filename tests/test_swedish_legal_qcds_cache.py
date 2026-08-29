from __future__ import annotations

from qcds_fabric.robots.legal.sweden_housing.cached_full_qcds import (
    cache_info,
    clear_cache,
    run_cached_full_legal_qcds,
)


def _kwargs() -> dict[str, object]:
    return {
        "case_id": "cache-test",
        "case_terms": (),
        "resolved_terms": (),
        "unresolved_questions": (),
        "corpus": {
            "corpus_id": "cache-test",
            "primary_regime_candidates": ["a", "b"],
            "rules": [],
        },
        "applied_rule_ids": (),
        "praxis": None,
        "qcds_evidence": None,
        "max_unknown_dimensions": 4,
        "grover_max_states": 16,
        "grover_max_iterations": 2,
    }


def test_identical_full_qcds_run_is_cached_without_mutating_return_value() -> None:
    clear_cache()
    first = run_cached_full_legal_qcds(**_kwargs())
    after_first = cache_info()
    first["cache_mutation_probe"] = True

    second = run_cached_full_legal_qcds(**_kwargs())
    after_second = cache_info()

    assert after_first["misses"] == 1
    assert after_second["hits"] == 1
    assert "cache_mutation_probe" not in second
    assert second["candidate_state_count"] == first["candidate_state_count"]
    assert second["canonical_final_syntract"] == first["canonical_final_syntract"]
