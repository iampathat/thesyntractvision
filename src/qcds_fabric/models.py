from __future__ import annotations

from dataclasses import dataclass, field
from math import log2
from typing import Any, Mapping, Sequence

ConditionValue = int | str  # canonical values are 0, 1, or "?"
State = tuple[int, ...]


def _validate_condition(value: ConditionValue) -> None:
    if value not in (0, 1, "?"):
        raise ValueError(f"condition value must be 0, 1, or '?', got {value!r}")


@dataclass(frozen=True)
class BaseBundle:
    """Bounded set of independent binary dimensions.

    ``values`` represents present Conditions.  ``?`` is a present but
    unconstrained dimension.  Logical absence (∅) is represented only by a
    ChannelView presence mask and is therefore structurally distinct.
    """

    bundle_id: str
    dimension_ids: tuple[str, ...]
    values: tuple[ConditionValue, ...]
    provenance: Mapping[str, Any] = field(default_factory=dict)
    semantic_domain: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.bundle_id:
            raise ValueError("bundle_id must be non-empty")
        if not self.dimension_ids:
            raise ValueError("a BaseBundle must contain at least one dimension")
        if len(set(self.dimension_ids)) != len(self.dimension_ids):
            raise ValueError("dimension identities must be unique within a bundle")
        if len(self.values) != len(self.dimension_ids):
            raise ValueError("values and dimension_ids must have equal length")
        for value in self.values:
            _validate_condition(value)

    @property
    def width(self) -> int:
        return len(self.dimension_ids)


@dataclass(frozen=True)
class ChannelView:
    base_bundle: BaseBundle
    present: tuple[bool, ...]
    null_dimension_id: str | None
    position_map: tuple[int, ...]
    oracle_map: tuple[str, ...]
    active_oracle_stack_version: str
    substrate_target: str = "classical"
    transformation_provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        b = self.base_bundle.width
        if len(self.present) != b:
            raise ValueError("presence mask width must match base bundle width")
        if len(self.position_map) != b:
            raise ValueError("position map width must match base bundle width")
        if sorted(self.position_map) != list(range(b)):
            raise ValueError("position_map must be a permutation of canonical indices")
        absent = [i for i, flag in enumerate(self.present) if not flag]
        if self.null_dimension_id is None:
            if absent:
                raise ValueError("non-null ChannelView cannot contain absent dimensions")
        else:
            if len(absent) != 1:
                raise ValueError("a core null ChannelView must contain exactly one absent dimension")
            expected = self.base_bundle.dimension_ids[absent[0]]
            if self.null_dimension_id != expected:
                raise ValueError("null_dimension_id must identify the absent dimension")

    @classmethod
    def baseline(cls, bundle: BaseBundle, *, oracle_stack_version: str, oracle_ids: Sequence[str]) -> "ChannelView":
        return cls(
            base_bundle=bundle,
            present=(True,) * bundle.width,
            null_dimension_id=None,
            position_map=tuple(range(bundle.width)),
            oracle_map=tuple(oracle_ids),
            active_oracle_stack_version=oracle_stack_version,
            transformation_provenance={"rotation": "none"},
        )

    @classmethod
    def null_dimension(
        cls,
        bundle: BaseBundle,
        index: int,
        *,
        oracle_stack_version: str,
        oracle_ids: Sequence[str],
    ) -> "ChannelView":
        if not 0 <= index < bundle.width:
            raise IndexError(index)
        present = [True] * bundle.width
        present[index] = False
        return cls(
            base_bundle=bundle,
            present=tuple(present),
            null_dimension_id=bundle.dimension_ids[index],
            position_map=tuple(range(bundle.width)),
            oracle_map=tuple(oracle_ids),
            active_oracle_stack_version=oracle_stack_version,
            transformation_provenance={"rotation": "dimension_null", "null_index": index},
        )

    def active_dimension_ids(self) -> tuple[str, ...]:
        return tuple(d for d, flag in zip(self.base_bundle.dimension_ids, self.present) if flag)

    def candidate_states(self) -> tuple[State, ...]:
        """Enumerate bounded classical states in canonical coordinates.

        An absent dimension is encoded as -1 internally.  It is never exposed
        as logical 0 or wildcard '?'.
        """
        candidates: list[list[int]] = [[]]
        for value, is_present in zip(self.base_bundle.values, self.present):
            if not is_present:
                options = (-1,)
            elif value == "?":
                options = (0, 1)
            else:
                options = (int(value),)
            candidates = [prefix + [option] for prefix in candidates for option in options]
        return tuple(tuple(x) for x in candidates)

    def state_as_mapping(self, state: State) -> dict[str, int]:
        if len(state) != self.base_bundle.width:
            raise ValueError("state width mismatch")
        return {
            dimension_id: value
            for dimension_id, value, is_present in zip(self.base_bundle.dimension_ids, state, self.present)
            if is_present
        }


@dataclass(frozen=True)
class TruthDistribution:
    support: tuple[State, ...]
    probabilities: tuple[float, ...]
    raw_scores: tuple[float, ...]
    top_k: tuple[State, ...]
    entropy: float
    oracle_agreement: float
    contradiction_markers: tuple[str, ...]
    normalization: str
    provenance: Mapping[str, Any]

    def __post_init__(self) -> None:
        if not (len(self.support) == len(self.probabilities) == len(self.raw_scores)):
            raise ValueError("support, probabilities, and raw_scores must align")
        if self.probabilities and abs(sum(self.probabilities) - 1.0) > 1e-9:
            raise ValueError("probabilities must sum to 1")
        if any(p < 0 for p in self.probabilities):
            raise ValueError("probabilities cannot be negative")

    @staticmethod
    def shannon_entropy(probabilities: Sequence[float]) -> float:
        return -sum(p * log2(p) for p in probabilities if p > 0)


@dataclass(frozen=True)
class StabilizedReturn:
    stabilized_distribution: TruthDistribution
    per_dimension_influence: Mapping[str, Mapping[str, float]]
    rotation_sensitivity: Mapping[str, float]
    retained_uncertainty: float
    comparison_metrics: Mapping[str, float]
    pruning_actions: tuple[str, ...]
    provenance: Mapping[str, Any]


@dataclass(frozen=True)
class Syntract:
    syntract_id: str
    bound_distribution: TruthDistribution
    evidence_provenance: Mapping[str, Any]
    contradiction_provenance: tuple[str, ...]
    composition_provenance: Mapping[str, Any]
