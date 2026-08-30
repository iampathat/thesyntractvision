from __future__ import annotations

import pytest

from qcds_fabric.fabric import FabricLayer
from qcds_fabric.models import BaseBundle
from qcds_fabric.oracle_space import OracleSpace
from qcds_fabric.oracles import ExactOracle, OracleStack
from qcds_fabric.semantic import EvidenceOracle
from qcds_fabric.swarm_intelligence import (
    SwarmIntelligenceError,
    SwarmOraclePacket,
    compile_swarm_reentry,
    plan_swarm_frontier,
    run_swarm_reentry,
)


def _space() -> OracleSpace:
    bundle = BaseBundle("swarm-bundle", ("fact:a", "fact:b", "conclusion:c"), (1, "?", "?"))
    stack = OracleStack("swarm-base", "1", (ExactOracle("base:a", {"fact:a": 1}),))
    return OracleSpace("swarm-space", "reality:test", bundle, stack, host_kind="central")


def test_qcds_uncertainty_drives_swarm_frontier_not_agent_voting() -> None:
    space = _space()
    baseline = FabricLayer().run_stabilized_rotation_suite(space.bundle, space.oracle_stack)
    tasks = plan_swarm_frontier(space, baseline.stabilized_return.stabilized_distribution, max_tasks=2)

    assert len(tasks) == 2
    assert {task.dimension_id for task in tasks} == {"fact:b", "conclusion:c"}
    assert all(task.provenance["source"] == "qcds_truth_distribution" for task in tasks)
    assert all(task.provenance["majority_vote"] is False for task in tasks)


def test_swarm_packets_return_as_oracles_to_same_qcds_core() -> None:
    space = _space()
    packet = SwarmOraclePacket(
        packet_id="packet-1",
        universe_id=space.universe_id,
        source_robot_id="robot-evidence",
        work_type="evidence",
        oracle=EvidenceOracle(
            oracle_id="swarm:evidence:b",
            dimension_id="fact:b",
            expected_value=1,
            confidence=0.8,
            source_id="robot-evidence",
            claim_text="bounded swarm observation",
        ),
        provenance={"observation": "bounded-test"},
    )

    compiled = compile_swarm_reentry(space, (packet,))
    result = run_swarm_reentry(space, (packet,))

    assert compiled.majority_vote_used is False
    assert compiled.qcds_core_replaced is False
    assert compiled.oracle_stack.oracle_ids == ("base:a", "swarm:evidence:b")
    assert result.suite.stabilized_return.stabilized_distribution.support


def test_swarm_cross_universe_packet_fails_closed() -> None:
    space = _space()
    packet = SwarmOraclePacket(
        packet_id="alien",
        universe_id="other:universe",
        source_robot_id="robot-x",
        work_type="verification",
        oracle=ExactOracle("alien:o", {"fact:b": 1}),
    )
    with pytest.raises(SwarmIntelligenceError, match="universe mismatch"):
        compile_swarm_reentry(space, (packet,))
