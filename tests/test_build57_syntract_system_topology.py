from qcds_fabric.oracles import ExactOracle
from qcds_fabric.problem import ProblemQuery, SemanticProblemFrame
from qcds_fabric.semantic import SemanticClaim
from qcds_fabric.swarm_intelligence import SwarmOraclePacket
from qcds_fabric.syntract_system import SyntractSystem


def _frame(mission_id: str) -> SemanticProblemFrame:
    return SemanticProblemFrame(
        mission_id=mission_id,
        raw_text="Which represented state remains coherent?",
        queries=(ProblemQuery("q", "device", "state", ("ready", "blocked")),),
        claims=(SemanticClaim("device", "state", "ready", f"seed:{mission_id}", 0.75, True, "Observed ready"),),
        analyzer_id="build57-test",
    )


def test_parallel_and_sequence_are_execution_topologies_of_same_system() -> None:
    system = SyntractSystem(max_width=8, default_universe_id="shared-universe")
    a = system.run_frame(_frame("build57-a"), space_id="space:a")
    b = system.run_frame(_frame("build57-b"), space_id="space:b")

    parallel = system.run_parallel((a, b), max_workers=2)
    assert set(parallel) == {"space:a", "space:b"}
    assert all(run.universe_id == "shared-universe" for run in parallel.values())

    sequence = system.run_sequence((a, b))
    assert len(sequence) == 2
    assert sequence[1].reentered_from_space_id == "space:a"


def test_swarm_frontier_and_packets_return_to_same_qcds_fabric() -> None:
    system = SyntractSystem(max_width=8, default_universe_id="shared-universe")
    execution = system.run_frame(_frame("build57-swarm"), space_id="space:swarm")

    frontier = system.plan_swarm(execution, max_tasks=2)
    assert frontier
    assert all(task.universe_id == execution.universe_id for task in frontier)

    dimension_id = execution.compilation.bundle.dimension_ids[0]
    packet = SwarmOraclePacket(
        packet_id="packet:1",
        universe_id=execution.universe_id,
        source_robot_id="robot:1",
        work_type="verification",
        oracle=ExactOracle("robot:verification:1", {dimension_id: 1}, weight=0.9),
    )
    reentry = system.reenter_swarm(execution, (packet,))
    assert reentry.compilation.majority_vote_used is False
    assert reentry.compilation.qcds_core_replaced is False
    assert reentry.compilation.accepted_packet_ids == ("packet:1",)
    assert reentry.suite.stabilized_return.stabilized_distribution.support
