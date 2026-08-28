from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Protocol

from .models import ChannelView, State


class Oracle(Protocol):
    oracle_id: str

    def is_applicable(self, view: ChannelView) -> bool: ...
    def score(self, view: ChannelView, state: State) -> float: ...


@dataclass(frozen=True)
class ExactOracle:
    oracle_id: str
    target: Mapping[str, int]
    weight: float = 1.0

    def __post_init__(self) -> None:
        if not self.oracle_id:
            raise ValueError("oracle_id must be non-empty")
        if self.weight < 0:
            raise ValueError("weight must be non-negative")
        if any(v not in (0, 1) for v in self.target.values()):
            raise ValueError("ExactOracle target values must be binary")

    def is_applicable(self, view: ChannelView) -> bool:
        active = set(view.active_dimension_ids())
        return any(key in active for key in self.target)

    def score(self, view: ChannelView, state: State) -> float:
        active = view.state_as_mapping(state)
        compared = [(k, expected) for k, expected in self.target.items() if k in active]
        if not compared:
            return 1.0
        return self.weight if all(active[k] == expected for k, expected in compared) else 0.0


@dataclass(frozen=True)
class MaskOracle:
    oracle_id: str
    mask: Mapping[str, int | str]
    weight: float = 1.0

    def __post_init__(self) -> None:
        if not self.oracle_id:
            raise ValueError("oracle_id must be non-empty")
        if self.weight < 0:
            raise ValueError("weight must be non-negative")
        if any(v not in (0, 1, "?") for v in self.mask.values()):
            raise ValueError("MaskOracle values must be 0, 1, or '?'")

    def is_applicable(self, view: ChannelView) -> bool:
        active = set(view.active_dimension_ids())
        return any(key in active and expected != "?" for key, expected in self.mask.items())

    def score(self, view: ChannelView, state: State) -> float:
        active = view.state_as_mapping(state)
        constrained = [(k, expected) for k, expected in self.mask.items() if k in active and expected != "?"]
        if not constrained:
            return 1.0
        return self.weight if all(active[k] == expected for k, expected in constrained) else 0.0


@dataclass(frozen=True)
class OracleStack:
    stack_id: str
    version: str
    oracles: tuple[Oracle, ...]

    def __post_init__(self) -> None:
        if not self.stack_id or not self.version:
            raise ValueError("oracle stack identity and version are required")
        ids = [oracle.oracle_id for oracle in self.oracles]
        if len(set(ids)) != len(ids):
            raise ValueError("oracle ids must be unique within a stack")

    @property
    def oracle_ids(self) -> tuple[str, ...]:
        return tuple(oracle.oracle_id for oracle in self.oracles)

    @property
    def identity(self) -> str:
        return f"{self.stack_id}@{self.version}"

    def _ordered_oracles_for_view(self, view: ChannelView) -> tuple[Oracle, ...]:
        if view.active_oracle_stack_version != self.identity:
            raise ValueError(
                f"view declares oracle stack {view.active_oracle_stack_version!r}, expected {self.identity!r}"
            )
        if len(view.oracle_map) != len(self.oracles) or set(view.oracle_map) != set(self.oracle_ids):
            raise ValueError("oracle_map must be an exact permutation of the active oracle stack")
        by_id = {oracle.oracle_id: oracle for oracle in self.oracles}
        return tuple(by_id[oracle_id] for oracle_id in view.oracle_map)

    def score(self, view: ChannelView, state: State) -> tuple[float, float]:
        ordered = self._ordered_oracles_for_view(view)
        applicable = [oracle for oracle in ordered if oracle.is_applicable(view)]
        if not applicable:
            return 1.0, 1.0

        scores = [oracle.score(view, state) for oracle in applicable]
        combined = 1.0
        for score in scores:
            combined *= score
        agreement = sum(1.0 for score in scores if score > 0.0) / len(scores)
        return combined, agreement
