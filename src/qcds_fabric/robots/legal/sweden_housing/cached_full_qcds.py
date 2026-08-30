from __future__ import annotations

import copy
import json
from functools import lru_cache
from typing import Any, Mapping, Sequence

from .profiled_full_qcds import run_profiled_full_legal_qcds as _run_profiled_full_legal_qcds_uncached


def _mapping(value: Any, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise ValueError(f"{label} must be an object")
    return value


@lru_cache(maxsize=128)
def _cached(serialized: str) -> Mapping[str, Any]:
    payload = _mapping(json.loads(serialized), "cached full QCDS payload")
    praxis_raw = payload.get("praxis")
    evidence_raw = payload.get("qcds_evidence")
    return _run_profiled_full_legal_qcds_uncached(
        case_id=str(payload["case_id"]),
        case_terms=tuple(str(value) for value in payload["case_terms"]),
        resolved_terms=tuple(str(value) for value in payload["resolved_terms"]),
        unresolved_questions=tuple(str(value) for value in payload["unresolved_questions"]),
        corpus=_mapping(payload["corpus"], "corpus"),
        applied_rule_ids=tuple(str(value) for value in payload["applied_rule_ids"]),
        praxis=_mapping(praxis_raw, "praxis") if praxis_raw is not None else None,
        qcds_evidence=(
            tuple(_mapping(value, "qcds_evidence[]") for value in evidence_raw)
            if evidence_raw is not None else None
        ),
        resource_profile_id=str(payload["resource_profile_id"]),
        max_unknown_dimensions=int(payload["max_unknown_dimensions"]),
        grover_max_states=int(payload["grover_max_states"]),
        grover_max_iterations=int(payload["grover_max_iterations"]),
    )


def run_cached_full_legal_qcds(
    *,
    case_id: str,
    case_terms: Sequence[str],
    resolved_terms: Sequence[str],
    unresolved_questions: Sequence[str],
    corpus: Mapping[str, Any],
    applied_rule_ids: Sequence[str],
    praxis: Mapping[str, Any] | None = None,
    qcds_evidence: Sequence[Mapping[str, Any]] | None = None,
    resource_profile_id: str = "browser_session",
    max_unknown_dimensions: int = 18,
    grover_max_states: int = 4096,
    grover_max_iterations: int = 8,
) -> Mapping[str, Any]:
    payload = {
        "case_id": case_id,
        "case_terms": list(case_terms),
        "resolved_terms": list(resolved_terms),
        "unresolved_questions": list(unresolved_questions),
        "corpus": dict(corpus),
        "applied_rule_ids": list(applied_rule_ids),
        "praxis": dict(praxis) if praxis is not None else None,
        "qcds_evidence": [dict(value) for value in qcds_evidence] if qcds_evidence is not None else None,
        "resource_profile_id": str(resource_profile_id),
        "max_unknown_dimensions": int(max_unknown_dimensions),
        "grover_max_states": int(grover_max_states),
        "grover_max_iterations": int(grover_max_iterations),
    }
    serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return copy.deepcopy(_cached(serialized))


def cache_info() -> Mapping[str, int]:
    info = _cached.cache_info()
    return {
        "hits": info.hits,
        "misses": info.misses,
        "maxsize": int(info.maxsize or 0),
        "currsize": info.currsize,
    }


def clear_cache() -> None:
    _cached.cache_clear()


__all__ = ["cache_info", "clear_cache", "run_cached_full_legal_qcds"]
