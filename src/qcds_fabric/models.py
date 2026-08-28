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

    ``values`` represents present Conditions. ``?`` is a present but
    unconstrained dimension. Logical absence (∅) is represented only by a
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
    """One execution view of a canonical BaseBundle.

    ``position_map[canonical_index]`` gives the execution slot occupied by that
    canonical dimension. Candidate states remain in canonical coordinates so a
    positional rotation can never silently rename a fact.
    """

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
            raise ValueError("position_map must be a permutation of execution slots")
        if len(set(self.oracle_map)) != len(self.oracle_map):
            raise ValueError("oracle_map cannot contain duplicate oracle identities")

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
    def transformed(
        cls,
        bundle: BaseBundle,
        *,
        oracle_stack_version: str,
        oracle_ids: Sequence[str],
        null_index: int | None = None,
        position_map: Sequence[int] | None = None,
        oracle_map: Sequence[str] | None = None,
        substrate_target: str = "classical",
        transformation_provenance: Mapping[str, Any] | None = None,
    ) -> "ChannelView":
        if null_index is not None and not 0 <= null_index < bundle.width:
            raise IndexError(null_index)

        present = [True] * bundle.width
        null_dimension_id = None
        if null_index is not None:
            present[null_index] = False
            null_dimension_id = bundle.dimension_ids[null_index]

        canonical_positions = tuple(range(bundle.width))
        resolved_position_map = tuple(position_map) if position_map is not None else canonical_positions
        canonical_oracles = tuple(oracle_ids)
        resolved_oracle_map = tuple(oracle_map) if oracle_map is not None else canonical_oracles

        if transformation_provenance is None:
            axes: list[str] = []
            if null_index is not None:
                axes.append("dimension_null")
            if resolved_position_map != canonical_positions:
                axes.append("position")
            if resolved_oracle_map != canonical_oracles:
                axes.append("oracle_exposure")
            rotation = "none" if not axes else axes[0] if len(axes) == 1 else "crossed"
            transformation_provenance = {
                "rotation": rotation,
                "axes": tuple(axes),
                "null_index": null_index,
                "position_map": resolved_position_map,
                "oracle_map": resolved_oracle_map,
            }

        return cls(
            base_bundle=bundle,
            present=tuple(present),
            null_dimension_id=null_dimension_id,
            position_map=resolved_position_map,
            oracle_map=resolved_oracle_map,
            active_oracle_stack_version=oracle_stack_version,
            substrate_target=substrate_target,
            transformation_provenance=transformation_provenance,
        )

    @classmethod
    def baseline(cls, bundle: BaseBundle, *, oracle_stack_version: str, oracle_ids: Sequence[str]) -> "ChannelView":
        return cls.transformed(
            bundle,
            oracle_stack_version=oracle_stack_version,
            oracle_ids=oracle_ids,
            transformation_provenance={"rotation": "none", "axes": ()},
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
        return cls.transformed(
            bundle,
            oracle_stack_version=oracle_stack_version,
            oracle_ids=oracle_ids,
            null_index=index,
            transformation_provenance={
                "rotation": "dimension_null",
                "axes": ("dimension_null",),
                "null_index": index,
                "position_map": tuple(range(bundle.width)),
                "oracle_map": tuple(oracle_ids),
            },
        )

    def active_dimension_ids(self) -> tuple[str, ...]:
        return tuple(d for d, flag in zip(self.base_bundle.dimension_ids, self.present) if flag)

    def execution_slot_for_dimension(self, canonical_index: int) -> int:
        if not 0 <= canonical_index < self.base_bundle.width:
            raise IndexError(canonical_index)
        return self.position_map[canonical_index]

    def canonical_index_at_slot(self, execution_slot: int) -> int:
        if not 0 <= execution_slot < self.base_bundle.width:
            raise IndexError(execution_slot)
        return self.position_map.index(execution_slot)

    def candidate_states(self) -> tuple[State, ...]:
        """Enumerate bounded classical states in canonical coordinates.

        An absent dimension is encoded as -1 internally. It is never exposed as
        logical 0 or wildcard '?'. Positional rotation does not move this
        sentinel because absence belongs to a canonical logical dimension, not
        to a physical slot.
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
