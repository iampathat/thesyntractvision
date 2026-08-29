from __future__ import annotations

from qcds_fabric.models import BaseBundle
from qcds_fabric.oracles import OracleStack
from qcds_fabric.robots.legal.sweden_housing.scaling import (
    execute_separable_grover_partitions,
    plan_legal_scaling,
)
from qcds_fabric.semantic import EvidenceOracle, OneHotOracle


def test_separable_large_room_can_execute_as_parallel_grover_components() -> None:
    bundle = BaseBundle(
        bundle_id="parallel-scaling",
        dimension_ids=("a", "b", "c", "d"),
        values=("?", "?", "?", "?"),
    )
    stack = OracleStack(
        stack_id="parallel-scaling",
        version="1",
        oracles=(
            EvidenceOracle("ea", "a", 1, 0.9, "s1"),
            EvidenceOracle("eb", "b", 1, 0.8, "s2"),
            EvidenceOracle("ec", "c", 1, 0.7, "s3"),
            EvidenceOracle("ed", "d", 1, 0.6, "s4"),
        ),
    )

    plan = plan_legal_scaling(bundle, stack, max_states=4)
    assert plan.full_state_count == 16
    assert plan.monolithic_grover_available is False
    assert plan.exact_parallel_partitioning_available is True
    assert all(part.state_count <= 4 for part in plan.components)

    result = execute_separable_grover_partitions(
        bundle,
        stack,
        max_states=4,
        max_iterations=3,
    )
    assert result["status"] == "parallel_separable_components_executed"
    assert len(result["partitions"]) == 4
    assert all(row["execution"]["grover_emulated"] is True for row in result["partitions"])
    assert result["composition"]["single_monolithic_distribution_materialized"] is False


def test_coupled_oversized_component_is_not_fake_partitioned() -> None:
    bundle = BaseBundle(
        bundle_id="coupled-scaling",
        dimension_ids=("a", "b", "c"),
        values=("?", "?", "?"),
    )
    stack = OracleStack(
        stack_id="coupled-scaling",
        version="1",
        oracles=(OneHotOracle("onehot", ("a", "b", "c")),),
    )

    plan = plan_legal_scaling(bundle, stack, max_states=4)
    assert plan.monolithic_grover_available is False
    assert plan.exact_parallel_partitioning_available is False
    assert len(plan.oversized_components) == 1

    result = execute_separable_grover_partitions(bundle, stack, max_states=4)
    assert result["status"] == "coupled_component_exceeds_bound"
    boundary = result["plan"]["boundary"]
    assert boundary["arbitrary_chunking_claimed_equivalent_to_global_grover"] is False
    assert boundary["silent_state_truncation"] is False
