from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

from .bind import RotationalSyntractBind
from .grover import run_grover
from .oracle import SemanticOracle
from .rotation import RotationalIngressCell
from .types import BindResult, LaneResult, RotationalView


class Fabric42CellEngine:
    """4.2A-C executable cell: rotate -> exclude -> parallel Grover -> bind."""

    def __init__(
        self,
        dimensions: tuple[str, ...],
        oracle: SemanticOracle,
        *,
        max_grover_iterations: int = 40,
        max_workers: int | None = None,
        seed: int = 0,
    ) -> None:
        self.cell = RotationalIngressCell(dimensions, seed=seed)
        self.oracle = oracle
        self.max_grover_iterations = max_grover_iterations
        self.max_workers = max_workers or len(dimensions)
        self.binder = RotationalSyntractBind()

    def _run_lane(self, view: RotationalView) -> LaneResult:
        compiled = self.oracle.compile(view)
        grover = run_grover(
            view.state_count,
            compiled.marked_states,
            max_iterations=self.max_grover_iterations,
        )
        return LaneResult(
            view=view,
            grover=grover,
            marked_states=compiled.marked_states,
            inactive_clause_names=compiled.inactive_clause_names,
            metadata={
                "active_clause_names": compiled.active_clause_names,
                "bank_id": view.bank_id,
                "oracle_version": compiled.oracle_version,
            },
        )

    def run(self, *, bank_id: int = 0) -> tuple[tuple[LaneResult, ...], BindResult]:
        views = self.cell.build_bank(bank_id=bank_id)
        # Views are independent until the explicit Syntract boundary.
        with ThreadPoolExecutor(max_workers=self.max_workers) as pool:
            lanes = tuple(pool.map(self._run_lane, views))
        return lanes, self.binder.bind(lanes)
