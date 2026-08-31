from __future__ import annotations

import sys
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from .fabric import FabricLayer, StabilizedRotationSuiteResult
from .oracle_space import OracleSpace, OracleSpaceHost
from .oracle_space_transport import import_oracle_space
from .oracles import DistributionOracle, OracleStack


class CentralFabricError(ValueError):
    """Raised when central execution would alter QCDS semantics."""


@dataclass(frozen=True)
class CentralFabricRun:
    space_id: str
    universe_id: str
    suite: StabilizedRotationSuiteResult
    oracle_stack_identity: str
    reentered_from_space_id: str | None = None


@dataclass(frozen=True)
class HybridLaneResult:
    lane_id: str
    runs: tuple[CentralFabricRun, ...]


def _native_threads_available() -> bool:
    """Return whether this Python substrate can create ordinary OS threads.

    Standard Pyodide/WebAssembly runs with ``sys.platform == 'emscripten'`` and
    cannot start ``threading.Thread``/``ThreadPoolExecutor`` workers unless a
    specialised threaded build and browser headers are used. QCDS parallelism
    is semantic independence between Logical Spaces; it must not depend on that
    transport capability.
    """

    return sys.platform not in {"emscripten", "wasi"}


def _thread_start_failed(exc: RuntimeError) -> bool:
    message = str(exc).lower()
    return "start new thread" in message or "start a new thread" in message


class CentralQCDSFabric:
    """Central high-capacity host/router around the unchanged QCDS Fabric.

    Centralization changes execution capacity and enables many Logical Robots to
    share mounted oracle-space contracts. It does not create a second inference
    engine. Every run delegates to FabricLayer over a BaseBundle + OracleStack.

    Parallel/hybrid topology is semantic. A native substrate may execute
    independent branches concurrently; a threadless WASM/Pyodide substrate
    executes those same independent branch contracts deterministically in one
    thread. The Logical Spaces, QCDS runs and resulting distributions are not
    changed by that transport choice.
    """

    def __init__(self, host: OracleSpaceHost | None = None, fabric: FabricLayer | None = None) -> None:
        self.host = host or OracleSpaceHost("central-qcds-fabric", "central")
        if self.host.host_kind != "central":
            raise CentralFabricError("CentralQCDSFabric requires a central OracleSpaceHost")
        self.fabric = fabric or FabricLayer()

    def mount(self, space: OracleSpace, *, replace: bool = False) -> OracleSpace:
        return self.host.mount(space, replace=replace)

    def transfer_in(self, space: OracleSpace, *, space_id: str | None = None, note: str = "") -> OracleSpace:
        return self.host.transfer_in(space, space_id=space_id, note=note)

    def transfer_payload(self, payload: Mapping[str, Any], *, space_id: str | None = None, note: str = "") -> OracleSpace:
        """Accept a portable browser/lab/robot oracle-space envelope."""
        external = import_oracle_space(payload, host_kind="external")
        return self.transfer_in(external, space_id=space_id, note=note)

    def run(self, space_id: str, *, oracle_stack: OracleStack | None = None, reentered_from_space_id: str | None = None) -> CentralFabricRun:
        space = self.host.get(space_id)
        stack = oracle_stack or space.oracle_stack
        suite = self.fabric.run_stabilized_rotation_suite(space.bundle, stack)
        return CentralFabricRun(
            space_id=space.space_id,
            universe_id=space.universe_id,
            suite=suite,
            oracle_stack_identity=stack.identity,
            reentered_from_space_id=reentered_from_space_id,
        )

    def _run_parallel_serial_transport(self, resolved: Sequence[str]) -> Mapping[str, CentralFabricRun]:
        return {space_id: self.run(space_id) for space_id in resolved}

    def run_parallel(self, space_ids: Sequence[str], *, max_workers: int | None = None) -> Mapping[str, CentralFabricRun]:
        """Run independent mounted oracle spaces through the same QCDS core.

        Native Python uses concurrent workers. Threadless WebAssembly/Pyodide
        preserves the exact parallel topology and branch contracts while using
        deterministic single-thread transport.
        """

        resolved = tuple(space_ids)
        if len(set(resolved)) != len(resolved):
            raise CentralFabricError("parallel space ids must be unique")
        if not resolved:
            return {}
        if not _native_threads_available():
            return self._run_parallel_serial_transport(resolved)

        worker_count = max_workers or min(32, len(resolved))
        try:
            with ThreadPoolExecutor(max_workers=worker_count) as executor:
                futures = {space_id: executor.submit(self.run, space_id) for space_id in resolved}
                return {space_id: future.result() for space_id, future in futures.items()}
        except RuntimeError as exc:
            # Some constrained Python hosts report themselves as native but deny
            # thread creation at runtime. Falling back changes only scheduling,
            # never QCDS/OracleSpace semantics.
            if not _thread_start_failed(exc):
                raise
            return self._run_parallel_serial_transport(resolved)

    @staticmethod
    def _reentry_stack(previous: CentralFabricRun, previous_space: OracleSpace, next_space: OracleSpace) -> OracleStack:
        if previous_space.bundle.dimension_ids != next_space.bundle.dimension_ids:
            raise CentralFabricError(
                "sequential distribution re-entry requires identical canonical dimension ids; "
                "use an explicit semantic expansion/reentry mapping for different spaces"
            )
        distribution = previous.suite.stabilized_return.stabilized_distribution
        prior = DistributionOracle(
            oracle_id=f"central:reentry:{previous_space.space_id}:to:{next_space.space_id}",
            dimension_ids=previous_space.bundle.dimension_ids,
            probabilities={
                state: probability
                for state, probability in zip(distribution.support, distribution.probabilities)
            },
        )
        if prior.oracle_id in next_space.oracle_stack.oracle_ids:
            raise CentralFabricError("re-entry oracle identity collision")
        return OracleStack(
            stack_id=f"{next_space.oracle_stack.stack_id}:central-reentry",
            version=f"{next_space.oracle_stack.version}+reentry",
            oracles=tuple((*next_space.oracle_stack.oracles, prior)),
        )

    def run_sequence(self, space_ids: Sequence[str]) -> tuple[CentralFabricRun, ...]:
        """Run explicit QCDS distribution re-entry across compatible spaces."""
        resolved = tuple(space_ids)
        if not resolved:
            return ()
        runs: list[CentralFabricRun] = [self.run(resolved[0])]
        for previous_id, next_id in zip(resolved, resolved[1:]):
            previous_space = self.host.get(previous_id)
            next_space = self.host.get(next_id)
            if previous_space.universe_id != next_space.universe_id:
                raise CentralFabricError("sequential re-entry cannot silently cross Logical Universe identity")
            stack = self._reentry_stack(runs[-1], previous_space, next_space)
            runs.append(self.run(next_id, oracle_stack=stack, reentered_from_space_id=previous_id))
        return tuple(runs)

    def _run_hybrid_serial_transport(self, lanes: Mapping[str, Sequence[str]]) -> Mapping[str, HybridLaneResult]:
        return {
            lane_id: HybridLaneResult(lane_id=lane_id, runs=self.run_sequence(tuple(space_ids)))
            for lane_id, space_ids in lanes.items()
        }

    def run_hybrid(self, lanes: Mapping[str, Sequence[str]], *, max_workers: int | None = None) -> Mapping[str, HybridLaneResult]:
        """Execute sequential QCDS lanes with substrate-appropriate transport."""

        if not lanes:
            return {}
        if not _native_threads_available():
            return self._run_hybrid_serial_transport(lanes)

        worker_count = max_workers or min(32, len(lanes))
        try:
            with ThreadPoolExecutor(max_workers=worker_count) as executor:
                futures = {lane_id: executor.submit(self.run_sequence, tuple(space_ids)) for lane_id, space_ids in lanes.items()}
                return {
                    lane_id: HybridLaneResult(lane_id=lane_id, runs=future.result())
                    for lane_id, future in futures.items()
                }
        except RuntimeError as exc:
            if not _thread_start_failed(exc):
                raise
            return self._run_hybrid_serial_transport(lanes)

    def mounted_manifest(self) -> tuple[Mapping[str, object], ...]:
        return self.host.manifest()


__all__ = [
    "CentralFabricError",
    "CentralFabricRun",
    "HybridLaneResult",
    "CentralQCDSFabric",
]
