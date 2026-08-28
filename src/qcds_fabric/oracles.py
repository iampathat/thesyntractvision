from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Protocol

from .models import ChannelView, State


class Oracle(Protocol):
    oracle_id: str

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

    def score(self, view: ChannelView, state: State) -> float:
        active = view.state_as_mapping(state)
        compared = [(k, expected) for k, expected in self.target.items() if k in active]
        # A null dimension is absent, so it cannot contribute to scoring or normalization.
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

    def score(self, view: ChannelView, state: State) -> tuple[float, float]:
        if not self.oracles:
            return 1.0, 1.0
        scores = [oracle.score(view, state) for oracle in self.oracles]
        # Product semantics makes a hard contradiction observable while remaining
        # substrate-neutral. A later kernel may replace this with phase semantics.
        combined = 1.0
        for score in scores:
            combined *= score
        agreement = sum(1.0 for score in scores if score > 0.0) / len(scores)
        return combined, agreement
