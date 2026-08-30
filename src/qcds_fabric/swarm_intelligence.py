from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence

from .fabric import FabricLayer, StabilizedRotationSuiteResult
from .models import BaseBundle, TruthDistribution
from .oracle_space import OracleSpace
from .oracles import OracleStack


class SwarmIntelligenceError(ValueError):
    """Raised when swarm coordination would violate QCDS epistemic boundaries."""


@dataclass(frozen=True)
class SwarmFrontierTask:
    task_id: str
    universe_id: str
    dimension_id: str
    probability_true: float
    uncertainty: float
    requested_work: tuple[str, ...] = (
        "seek_discriminating_evidence",
        "attempt_falsification",
        "independent_verification",
        "propose_alternative_oracle",
    )
    provenance: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SwarmOraclePacket:
    """One bounded epistemic contribution from a Logical Robot.

    A packet never becomes truth by vote or arrival. Its oracle is added to the
    active OracleStack and must survive the same QCDS inference/challenge path.
    """

    packet_id: str
    universe_id: str
    source_robot_id: str
    work_type: str
    oracle: Any
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.packet_id or not self.universe_id or not self.source_robot_id:
            raise SwarmIntelligenceError("swarm packet requires packet, universe and robot identities")
        if self.work_type not in {
            "evidence",
            "falsification",
            "verification",
            "alternative_oracle",
            "contradiction",
        }:
            raise SwarmIntelligenceError("unsupported swarm work_type")
        if not getattr(self.oracle, "oracle_id", ""):
            raise SwarmIntelligenceError("swarm packet must carry an oracle manifestation")


@dataclass(frozen=True)
class SwarmReentryCompilation:
    universe_id: str
    oracle_stack: OracleStack
    accepted_packet_ids: tuple[str, ...]
    source_robot_ids: tuple[str, ...]
    majority_vote_used: bool = False
    qcds_core_replaced: bool = False


@dataclass(frozen=True)
class SwarmReentryResult:
    compilation: SwarmReentryCompilation
    suite: StabilizedRotationSuiteResult


def _marginal_true(distribution: TruthDistribution, dimension_index: int) -> float:
    return sum(
        probability
        for state, probability in zip(distribution.support, distribution.probabilities)
        if state[dimension_index] == 1
    )


def plan_swarm_frontier(
    space: OracleSpace,
    distribution: TruthDistribution,
    *,
    max_tasks: int = 4,
) -> tuple[SwarmFrontierTask, ...]:
    """Let QCDS uncertainty select the most discriminating swarm frontier.

    Only currently live (`?`) dimensions are eligible. Uncertainty is maximal at
    p=0.5 and falls to zero at p=0 or p=1. This is coordination around a QCDS
    TruthDistribution, not a second inference algorithm.
    """
    if max_tasks <= 0:
        raise SwarmIntelligenceError("max_tasks must be positive")
    if distribution.support and len(distribution.support[0]) != space.bundle.width:
        raise SwarmIntelligenceError("distribution width does not match oracle space")

    candidates: list[SwarmFrontierTask] = []
    for index, (dimension_id, value) in enumerate(zip(space.bundle.dimension_ids, space.bundle.values)):
        if value != "?":
            continue
        probability_true = _marginal_true(distribution, index)
        uncertainty = 1.0 - abs((2.0 * probability_true) - 1.0)
        candidates.append(SwarmFrontierTask(
            task_id=f"swarm:{space.space_id}:{dimension_id}",
            universe_id=space.universe_id,
            dimension_id=dimension_id,
            probability_true=probability_true,
            uncertainty=uncertainty,
            provenance={
                "source": "qcds_truth_distribution",
                "selection_policy": "highest_live_dimension_uncertainty",
                "majority_vote": False,
            },
        ))

    candidates.sort(key=lambda task: (-task.uncertainty, task.dimension_id))
    return tuple(candidates[:max_tasks])


def compile_swarm_reentry(
    space: OracleSpace,
    packets: Sequence[SwarmOraclePacket],
) -> SwarmReentryCompilation:
    """Compile bounded robot contributions back into the same QCDS OracleStack."""
    existing_ids = set(space.oracle_stack.oracle_ids)
    accepted: list[SwarmOraclePacket] = []
    seen_packet_ids: set[str] = set()
    seen_oracle_ids: set[str] = set()

    for packet in packets:
        if packet.universe_id != space.universe_id:
            raise SwarmIntelligenceError("swarm packet universe mismatch")
        if packet.packet_id in seen_packet_ids:
            raise SwarmIntelligenceError("duplicate swarm packet id")
        seen_packet_ids.add(packet.packet_id)
        oracle_id = str(packet.oracle.oracle_id)
        if oracle_id in existing_ids or oracle_id in seen_oracle_ids:
            raise SwarmIntelligenceError(f"duplicate oracle identity {oracle_id!r}")
        seen_oracle_ids.add(oracle_id)
        accepted.append(packet)

    stack = OracleStack(
        stack_id=f"{space.oracle_stack.stack_id}:swarm-reentry",
        version=f"{space.oracle_stack.version}+swarm",
        oracles=tuple((*space.oracle_stack.oracles, *(packet.oracle for packet in accepted))),
    )
    return SwarmReentryCompilation(
        universe_id=space.universe_id,
        oracle_stack=stack,
        accepted_packet_ids=tuple(packet.packet_id for packet in accepted),
        source_robot_ids=tuple(dict.fromkeys(packet.source_robot_id for packet in accepted)),
    )


def run_swarm_reentry(
    space: OracleSpace,
    packets: Sequence[SwarmOraclePacket],
    *,
    fabric: FabricLayer | None = None,
) -> SwarmReentryResult:
    """Run swarm contributions through the unchanged QCDS Fabric."""
    compilation = compile_swarm_reentry(space, packets)
    executor = fabric or FabricLayer()
    suite = executor.run_stabilized_rotation_suite(space.bundle, compilation.oracle_stack)
    return SwarmReentryResult(compilation=compilation, suite=suite)


__all__ = [
    "SwarmIntelligenceError",
    "SwarmFrontierTask",
    "SwarmOraclePacket",
    "SwarmReentryCompilation",
    "SwarmReentryResult",
    "plan_swarm_frontier",
    "compile_swarm_reentry",
    "run_swarm_reentry",
]
