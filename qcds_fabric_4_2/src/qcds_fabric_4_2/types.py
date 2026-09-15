from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping


@dataclass(frozen=True)
class RotationalView:
    """One first-order complementary semantic view.

    The excluded dimension is actually absent from ``active_dimensions`` and
    from the local state space. It is never represented as a wildcard bit.
    """

    lane_id: int
    bank_id: int
    canonical_dimensions: tuple[str, ...]
    ordered_dimensions: tuple[str, ...]
    active_dimensions: tuple[str, ...]
    excluded_dimension: str
    position_to_semantic: Mapping[int, str]
    semantic_to_position: Mapping[str, int]

    @property
    def state_count(self) -> int:
        return 1 << len(self.active_dimensions)


@dataclass(frozen=True)
class ExclusionView:
    """A targeted higher-order exclusion view used by adaptive rotation."""

    view_id: str
    bank_id: int
    canonical_dimensions: tuple[str, ...]
    ordered_dimensions: tuple[str, ...]
    active_dimensions: tuple[str, ...]
    excluded_dimensions: tuple[str, ...]
    position_to_semantic: Mapping[int, str]
    semantic_to_position: Mapping[str, int]

    @property
    def state_count(self) -> int:
        return 1 << len(self.active_dimensions)


@dataclass(frozen=True)
class CompiledOracle:
    marked_states: frozenset[int]
    active_clause_names: tuple[str, ...] = ()
    inactive_clause_names: tuple[str, ...] = ()
    oracle_version: str = "oracle-v0"


@dataclass(frozen=True)
class GroverRun:
    state_count: int
    marked_count: int
    iterations: int
    probabilities: tuple[float, ...]
    marked_mass: float
    entropy_bits: float
    top_state: int
    top_probability: float
    max_iterations: int


@dataclass(frozen=True)
class LaneResult:
    view: RotationalView
    grover: GroverRun
    marked_states: frozenset[int]
    inactive_clause_names: tuple[str, ...] = ()
    metadata: Mapping[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class BindResult:
    canonical_probabilities: tuple[float, ...]
    top_state: int
    top_probability: float
    dimension_influence: Mapping[str, float]
    dimensional_necessity: Mapping[str, float]
    lane_top_states: Mapping[int, int]
    stable_core: tuple[int, ...]
    sensitive_shell: tuple[int, ...]
    sensitive_dimensions: tuple[str, ...]
    contradictions: tuple[str, ...]
    provenance: Mapping[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class ParentResult:
    candidate_states: tuple[int, ...]
    candidate_scores: tuple[float, ...]
    state_index_to_canonical: Mapping[int, int]
    marked_parent_states: frozenset[int]
    grover: GroverRun
    source_top_state: int
    provenance: Mapping[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class StabilityReport:
    stable: bool
    comparisons: int
    distribution_tvd_max: float
    entropy_delta_max: float
    top_identity_stable: bool
    topk_jaccard_min: float
    influence_delta_max: float
    contradiction_count_stable: bool
    reasons: tuple[str, ...]


@dataclass(frozen=True)
class RecursiveCycleResult:
    cycle: int
    bank_id: int
    oracle_version: str
    bind: BindResult
    parent: ParentResult
    stability: StabilityReport | None


@dataclass(frozen=True)
class MappingObservation:
    semantic_dimension: str
    physical_slot: str
    drift: float


@dataclass(frozen=True)
class BiasAttribution:
    semantic_explanatory_range: float
    physical_explanatory_range: float
    attribution: str
