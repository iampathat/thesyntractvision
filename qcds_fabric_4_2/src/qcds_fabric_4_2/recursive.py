from __future__ import annotations

from collections.abc import Callable

from .engine import Fabric42CellEngine
from .oracle import SemanticOracle
from .parent import ParentInferenceEngine
from .stability import StabilityEngine
from .types import BindResult, RecursiveCycleResult

OracleFactory = Callable[[int, BindResult | None], SemanticOracle]


class RecursiveFabric42:
    """4.2E recursion with explicit oracle-version evolution and re-entry."""

    def __init__(
        self,
        dimensions: tuple[str, ...],
        oracle_factory: OracleFactory,
        *,
        max_cycles: int = 8,
        min_cycles: int = 2,
        seed: int = 0,
        max_workers: int | None = None,
        max_grover_iterations: int = 40,
        stability: StabilityEngine | None = None,
    ) -> None:
        if min_cycles < 2:
            raise ValueError("min_cycles must be >= 2 for recursive validation")
        if max_cycles < min_cycles:
            raise ValueError("max_cycles must be >= min_cycles")
        self.dimensions = dimensions
        self.oracle_factory = oracle_factory
        self.max_cycles = max_cycles
        self.min_cycles = min_cycles
        self.seed = seed
        self.max_workers = max_workers
        self.max_grover_iterations = max_grover_iterations
        self.stability = stability or StabilityEngine(window=3)
        self.parent_engine = ParentInferenceEngine(max_iterations=max_grover_iterations)

    def run(self) -> tuple[RecursiveCycleResult, ...]:
        history: list[BindResult] = []
        cycles: list[RecursiveCycleResult] = []
        previous: BindResult | None = None
        for cycle in range(self.max_cycles):
            oracle = self.oracle_factory(cycle, previous)
            engine = Fabric42CellEngine(
                self.dimensions,
                oracle,
                max_grover_iterations=self.max_grover_iterations,
                max_workers=self.max_workers,
                seed=self.seed,
            )
            _, bound = engine.run(bank_id=cycle)
            parent = self.parent_engine.run(bound)
            history.append(bound)
            report = self.stability.evaluate(history)
            cycles.append(
                RecursiveCycleResult(
                    cycle=cycle,
                    bank_id=cycle,
                    oracle_version=oracle.version,
                    bind=bound,
                    parent=parent,
                    stability=report,
                )
            )
            previous = bound
            if len(cycles) >= self.min_cycles and report.stable:
                break
        return tuple(cycles)
