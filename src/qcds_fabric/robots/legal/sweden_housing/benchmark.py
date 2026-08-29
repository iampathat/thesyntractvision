from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence


@dataclass(frozen=True)
class LegalQCDSBenchmarkResult:
    case_id: str
    category: str
    exact_state_count: int
    exact_entropy: float
    exact_oracle_agreement: float
    grover_status: str
    grover_syntract_id: str | None
    total_variation_distance: float | None
    same_top_state: bool | None
    grover_entropy: float | None
    grover_oracle_agreement: float | None
    selected_grover_depths: Mapping[str, int]
    uncertainty_retained: float
    conflict_count: int

    def as_dict(self) -> dict[str, Any]:
        return {
            "case_id": self.case_id,
            "category": self.category,
            "exact_state_count": self.exact_state_count,
            "exact_entropy": self.exact_entropy,
            "exact_oracle_agreement": self.exact_oracle_agreement,
            "grover_status": self.grover_status,
            "grover_syntract_id": self.grover_syntract_id,
            "total_variation_distance": self.total_variation_distance,
            "same_top_state": self.same_top_state,
            "grover_entropy": self.grover_entropy,
            "grover_oracle_agreement": self.grover_oracle_agreement,
            "selected_grover_depths": dict(self.selected_grover_depths),
            "uncertainty_retained": self.uncertainty_retained,
            "conflict_count": self.conflict_count,
        }


def benchmark_result_payload(
    payload: Mapping[str, Any],
    *,
    category: str,
) -> LegalQCDSBenchmarkResult:
    qcds = payload.get("qcds_core", payload)
    if not isinstance(qcds, Mapping):
        raise ValueError("benchmark payload requires qcds_core mapping")
    dual = qcds.get("dual_substrate")
    if not isinstance(dual, Mapping):
        raise ValueError("benchmark payload requires dual_substrate output")
    exact = dual.get("classical_exact")
    grover = dual.get("grover_emulated")
    if not isinstance(exact, Mapping) or not isinstance(grover, Mapping):
        raise ValueError("benchmark payload requires both execution profiles")

    comparison = grover.get("comparison_to_classical_exact")
    comparison = comparison if isinstance(comparison, Mapping) else {}
    selected = grover.get("selected_grover_iterations")
    selected = selected if isinstance(selected, Mapping) else {}
    return LegalQCDSBenchmarkResult(
        case_id=str(payload.get("case_id", qcds.get("case_id", "unknown"))),
        category=category,
        exact_state_count=int(exact.get("state_count", qcds.get("candidate_state_count", 0))),
        exact_entropy=float(exact.get("entropy", qcds.get("entropy", 0.0))),
        exact_oracle_agreement=float(exact.get("oracle_agreement", qcds.get("oracle_agreement", 0.0))),
        grover_status=str(grover.get("status", "unknown")),
        grover_syntract_id=str(grover["syntract_id"]) if grover.get("syntract_id") else None,
        total_variation_distance=(
            float(comparison["total_variation_distance"])
            if "total_variation_distance" in comparison else None
        ),
        same_top_state=(bool(comparison["same_top_state"]) if "same_top_state" in comparison else None),
        grover_entropy=(float(grover["entropy"]) if "entropy" in grover else None),
        grover_oracle_agreement=(
            float(grover["oracle_agreement"])
            if "oracle_agreement" in grover else None
        ),
        selected_grover_depths={str(k): int(v) for k, v in selected.items()},
        uncertainty_retained=float(qcds.get("retained_uncertainty", 0.0)),
        conflict_count=len(qcds.get("conflict_markers", ())),
    )


def benchmark_suite_summary(
    results: Sequence[LegalQCDSBenchmarkResult],
) -> Mapping[str, Any]:
    rows = tuple(results)
    successful = tuple(row for row in rows if row.grover_status == "ok")
    comparable = tuple(row for row in successful if row.total_variation_distance is not None)
    tv = [float(row.total_variation_distance) for row in comparable if row.total_variation_distance is not None]
    top_matches = [row.same_top_state for row in comparable if row.same_top_state is not None]
    return {
        "case_count": len(rows),
        "grover_success_count": len(successful),
        "grover_nonmonolithic_count": len(rows) - len(successful),
        "mean_total_variation_distance": sum(tv) / len(tv) if tv else None,
        "max_total_variation_distance": max(tv) if tv else None,
        "top_state_agreement_fraction": (
            sum(1 for value in top_matches if value) / len(top_matches)
            if top_matches else None
        ),
        "categories": sorted({row.category for row in rows}),
        "boundary": {
            "grover_expected_to_equal_classical_weighting": False,
            "same_logical_contract_required": True,
            "qcds_allowed_to_lose_benchmark": True,
            "court_outcome_calibration_claimed": False,
            "native_quantum_advantage_claimed": False,
        },
        "results": [row.as_dict() for row in rows],
    }


__all__ = [
    "LegalQCDSBenchmarkResult",
    "benchmark_result_payload",
    "benchmark_suite_summary",
]
