from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from .qcds_space import _active_precedents


class EmulationProjectionError(ValueError):
    """Raised when a software profile cannot form a bounded active room safely."""


@dataclass(frozen=True)
class EmulationProjection:
    status: str
    max_unknown_dimensions: int
    statutory_unknown_dimensions: int
    precedent_dimension_budget: int
    represented_active_precedent_ids: tuple[str, ...]
    executed_active_precedent_ids: tuple[str, ...]
    projected_out_active_precedent_ids: tuple[str, ...]
    selection_policy: str

    def as_dict(self) -> Mapping[str, object]:
        return {
            "status": self.status,
            "max_unknown_dimensions": self.max_unknown_dimensions,
            "statutory_unknown_dimensions": self.statutory_unknown_dimensions,
            "precedent_dimension_budget": self.precedent_dimension_budget,
            "represented_active_precedent_ids": list(self.represented_active_precedent_ids),
            "executed_active_precedent_ids": list(self.executed_active_precedent_ids),
            "projected_out_active_precedent_ids": list(self.projected_out_active_precedent_ids),
            "selection_policy": self.selection_policy,
            "truth_promoted_by_projection": False,
            "qcds_semantics_changed_by_projection": False,
            "quantum_full_space_affected": False,
        }


def _authority_weight(row: Mapping[str, Any]) -> float:
    try:
        return float(row.get("authority_weight", 0.0))
    except (TypeError, ValueError):
        return 0.0


def _projection_rank(row: Mapping[str, Any]) -> tuple[int, float, str]:
    factor_count = len(tuple(row.get("matched_similarity_factors", ()))) + len(
        tuple(row.get("matched_counter_factors", ()))
    )
    return (-factor_count, -_authority_weight(row), str(row.get("precedent_id", "")))


def project_praxis_for_emulation(
    praxis: Mapping[str, Any] | None,
    *,
    represented_terms: Sequence[str],
    statutory_unknown_dimensions: int,
    max_unknown_dimensions: int,
) -> tuple[Mapping[str, Any] | None, EmulationProjection]:
    """Project only the software-active praxis dimensions needed to fit capacity.

    The original praxis mapping remains the represented source universe and must
    still be used for Quantum Full Space compilation. This function only forms
    a bounded software execution view. Selection is deterministic and disclosed;
    it is never treated as a legal outcome or truth ranking.
    """
    if max_unknown_dimensions < 0:
        raise EmulationProjectionError("max_unknown_dimensions must be non-negative")
    if statutory_unknown_dimensions > max_unknown_dimensions:
        raise EmulationProjectionError(
            "the statutory active room alone exceeds this software resource profile; "
            "a semantics-preserving QCDS decomposition or a larger profile is required"
        )

    budget = max_unknown_dimensions - statutory_unknown_dimensions
    policy = (
        "software capacity projection only: retain active precedents with the most represented "
        "case-factor matches first, use source authority only as a deterministic secondary "
        "capacity tie-breaker, and never interpret the projection as a legal outcome ranking"
    )

    if praxis is None:
        return None, EmulationProjection(
            status="no_praxis",
            max_unknown_dimensions=max_unknown_dimensions,
            statutory_unknown_dimensions=statutory_unknown_dimensions,
            precedent_dimension_budget=budget,
            represented_active_precedent_ids=(),
            executed_active_precedent_ids=(),
            projected_out_active_precedent_ids=(),
            selection_policy=policy,
        )

    active = tuple(_active_precedents(praxis, represented_terms))
    represented_ids = tuple(str(row.get("precedent_id", "")) for row in active)
    if len(active) <= budget:
        return praxis, EmulationProjection(
            status="full_active_praxis_fits_profile",
            max_unknown_dimensions=max_unknown_dimensions,
            statutory_unknown_dimensions=statutory_unknown_dimensions,
            precedent_dimension_budget=budget,
            represented_active_precedent_ids=represented_ids,
            executed_active_precedent_ids=represented_ids,
            projected_out_active_precedent_ids=(),
            selection_policy=policy,
        )

    ranked = tuple(sorted(active, key=_projection_rank))
    selected = ranked[:budget]
    selected_ids = {str(row.get("precedent_id", "")) for row in selected}
    active_ids = {str(row.get("precedent_id", "")) for row in active}
    projected_out = tuple(
        str(row.get("precedent_id", ""))
        for row in ranked[budget:]
    )

    projected = dict(praxis)
    projected["precedents"] = [
        dict(row)
        for row in praxis.get("precedents", ())
        if str(row.get("precedent_id", "")) not in active_ids
        or str(row.get("precedent_id", "")) in selected_ids
    ]
    projected["emulation_projection"] = {
        "status": "projected_for_resource_profile",
        "executed_active_precedent_ids": sorted(selected_ids),
        "projected_out_active_precedent_ids": list(projected_out),
        "quantum_full_space_affected": False,
    }

    return projected, EmulationProjection(
        status="projected_for_resource_profile",
        max_unknown_dimensions=max_unknown_dimensions,
        statutory_unknown_dimensions=statutory_unknown_dimensions,
        precedent_dimension_budget=budget,
        represented_active_precedent_ids=represented_ids,
        executed_active_precedent_ids=tuple(str(row.get("precedent_id", "")) for row in selected),
        projected_out_active_precedent_ids=projected_out,
        selection_policy=policy,
    )


__all__ = [
    "EmulationProjection",
    "EmulationProjectionError",
    "project_praxis_for_emulation",
]
