from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Mapping, Sequence

from .rotation import RotationalIngressCell
from .types import CompiledOracle, ExclusionView, RotationalView

Predicate = Callable[[Mapping[str, int]], bool]


@dataclass(frozen=True)
class OracleClause:
    name: str
    requires: frozenset[str]
    predicate: Predicate


class SemanticOracle:
    """Oracle whose meaning follows semantic dimensions through rotation."""

    def __init__(self, clauses: Sequence[OracleClause], *, version: str = "oracle-v0") -> None:
        self.clauses = tuple(clauses)
        self.version = version

    def compile(self, view: RotationalView | ExclusionView) -> CompiledOracle:
        active_dims = frozenset(view.active_dimensions)
        active = tuple(c for c in self.clauses if c.requires <= active_dims)
        inactive = tuple(c for c in self.clauses if not c.requires <= active_dims)
        marked: set[int] = set()
        for state in range(view.state_count):
            assignment = RotationalIngressCell.decode_state(view.active_dimensions, state)
            # If exclusion removes every clause, all local possibilities remain open.
            if all(clause.predicate(assignment) for clause in active):
                marked.add(state)
        return CompiledOracle(
            marked_states=frozenset(marked),
            active_clause_names=tuple(c.name for c in active),
            inactive_clause_names=tuple(c.name for c in inactive),
            oracle_version=self.version,
        )
