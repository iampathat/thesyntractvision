from __future__ import annotations

from dataclasses import dataclass
from math import floor, log2
from typing import Any, Mapping, Sequence

from qcds_fabric.models import BaseBundle
from qcds_fabric.oracles import OracleStack

from .execution import grover_emulated_profile, profile_payload, run_profile


def _oracle_dimensions(oracle: Any) -> tuple[str, ...]:
    if hasattr(oracle, "dimensions"):
        return tuple(str(value) for value in getattr(oracle, "dimensions"))
    if hasattr(oracle, "dimension_ids"):
        return tuple(str(value) for value in getattr(oracle, "dimension_ids"))
    if hasattr(oracle, "dimension_id"):
        return (str(getattr(oracle, "dimension_id")),)
    return ()


@dataclass(frozen=True)
class LegalPartition:
    partition_id: str
    unknown_dimension_ids: tuple[str, ...]
    oracle_ids: tuple[str, ...]
    state_count: int


@dataclass(frozen=True)
class LegalScalingPlan:
    full_unknown_count: int
    full_state_count: int
    max_states_per_partition: int
    max_unknown_per_partition: int
    components: tuple[LegalPartition, ...]
    oversized_components: tuple[LegalPartition, ...]
    exact_parallel_partitioning_available: bool
    monolithic_grover_available: bool

    def as_dict(self) -> dict[str, Any]:
        return {
            "full_unknown_count": self.full_unknown_count,
            "full_state_count": self.full_state_count,
            "max_states_per_partition": self.max_states_per_partition,
            "max_unknown_per_partition": self.max_unknown_per_partition,
            "monolithic_grover_available": self.monolithic_grover_available,
            "exact_parallel_partitioning_available": self.exact_parallel_partitioning_available,
            "components": [
                {
                    "partition_id": part.partition_id,
                    "unknown_dimension_ids": list(part.unknown_dimension_ids),
                    "unknown_count": len(part.unknown_dimension_ids),
                    "oracle_ids": list(part.oracle_ids),
                    "state_count": part.state_count,
                }
                for part in self.components
            ],
            "oversized_components": [part.partition_id for part in self.oversized_components],
            "boundary": {
                "arbitrary_chunking_claimed_equivalent_to_global_grover": False,
                "silent_state_truncation": False,
                "separable_components_may_run_in_parallel": True,
                "coupled_oversized_component_requires_larger_substrate_or_explicit_domain_decomposition": True,
                "sequential_syntract_reentry_is_allowed_only_when_the_decomposition_has_declared_semantics": True,
                "hybrid_execution_may_mix_exact_classical_and_grover_emulated_components": True,
            },
        }


def plan_legal_scaling(
    bundle: BaseBundle,
    oracle_stack: OracleStack,
    *,
    max_states: int = 4096,
) -> LegalScalingPlan:
    if max_states < 2:
        raise ValueError("max_states must be at least 2")
    max_unknown = floor(log2(max_states))
    unknown = tuple(
        dimension_id
        for dimension_id, value in zip(bundle.dimension_ids, bundle.values)
        if value == "?"
    )
    unknown_set = set(unknown)
    adjacency: dict[str, set[str]] = {dimension_id: set() for dimension_id in unknown}
    oracle_unknowns: dict[str, tuple[str, ...]] = {}
    for oracle in oracle_stack.oracles:
        dims = tuple(d for d in _oracle_dimensions(oracle) if d in unknown_set)
        oracle_unknowns[oracle.oracle_id] = dims
        for source in dims:
            adjacency[source].update(target for target in dims if target != source)

    components: list[tuple[str, ...]] = []
    seen: set[str] = set()
    for root in unknown:
        if root in seen:
            continue
        stack = [root]
        group: list[str] = []
        seen.add(root)
        while stack:
            current = stack.pop()
            group.append(current)
            for neighbor in adjacency[current]:
                if neighbor not in seen:
                    seen.add(neighbor)
                    stack.append(neighbor)
        components.append(tuple(d for d in unknown if d in set(group)))

    partitions: list[LegalPartition] = []
    for index, dims in enumerate(components):
        dim_set = set(dims)
        oracle_ids = tuple(
            oracle_id
            for oracle_id, referenced in oracle_unknowns.items()
            if referenced and set(referenced).issubset(dim_set)
        )
        partitions.append(LegalPartition(
            partition_id=f"component-{index + 1}",
            unknown_dimension_ids=dims,
            oracle_ids=oracle_ids,
            state_count=1 << len(dims),
        ))

    oversized = tuple(part for part in partitions if len(part.unknown_dimension_ids) > max_unknown)
    full_count = 1 << len(unknown)
    return LegalScalingPlan(
        full_unknown_count=len(unknown),
        full_state_count=full_count,
        max_states_per_partition=max_states,
        max_unknown_per_partition=max_unknown,
        components=tuple(partitions),
        oversized_components=oversized,
        exact_parallel_partitioning_available=not oversized and len(partitions) > 1,
        monolithic_grover_available=full_count <= max_states,
    )


def execute_separable_grover_partitions(
    bundle: BaseBundle,
    oracle_stack: OracleStack,
    *,
    max_states: int = 4096,
    max_iterations: int = 8,
) -> Mapping[str, Any]:
    plan = plan_legal_scaling(bundle, oracle_stack, max_states=max_states)
    if plan.monolithic_grover_available:
        return {
            "status": "monolithic_preferred",
            "plan": plan.as_dict(),
            "partitions": [],
        }
    if not plan.exact_parallel_partitioning_available:
        return {
            "status": "coupled_component_exceeds_bound",
            "plan": plan.as_dict(),
            "partitions": [],
        }

    fixed = {
        dimension_id: value
        for dimension_id, value in zip(bundle.dimension_ids, bundle.values)
        if value != "?"
    }
    results: list[dict[str, Any]] = []
    by_oracle = {oracle.oracle_id: oracle for oracle in oracle_stack.oracles}
    for partition in plan.components:
        dim_set = set(partition.unknown_dimension_ids)
        relevant_oracles = tuple(by_oracle[oracle_id] for oracle_id in partition.oracle_ids)
        fixed_needed: set[str] = set()
        for oracle in relevant_oracles:
            fixed_needed.update(
                dimension_id
                for dimension_id in _oracle_dimensions(oracle)
                if dimension_id in fixed
            )
        ordered_dimensions = tuple(
            dimension_id
            for dimension_id in bundle.dimension_ids
            if dimension_id in fixed_needed or dimension_id in dim_set
        )
        projected = BaseBundle(
            bundle_id=f"{bundle.bundle_id}:{partition.partition_id}",
            dimension_ids=ordered_dimensions,
            values=tuple(
                fixed[dimension_id] if dimension_id in fixed else "?"
                for dimension_id in ordered_dimensions
            ),
            provenance={
                **dict(bundle.provenance),
                "partition_id": partition.partition_id,
                "partition_execution": "exact_separable_component",
            },
            semantic_domain={
                **dict(bundle.semantic_domain),
                "partition_id": partition.partition_id,
            },
        )
        projected_stack = OracleStack(
            stack_id=f"{oracle_stack.stack_id}:{partition.partition_id}",
            version=oracle_stack.version,
            oracles=relevant_oracles,
        )
        profile, fabric = grover_emulated_profile(
            max_states=max_states,
            max_iterations=max_iterations,
        )
        suite = run_profile(profile, fabric, projected, projected_stack)
        results.append({
            "partition_id": partition.partition_id,
            "unknown_dimension_ids": list(partition.unknown_dimension_ids),
            "oracle_ids": list(partition.oracle_ids),
            "execution": dict(profile_payload(profile, suite)),
        })
    return {
        "status": "parallel_separable_components_executed",
        "plan": plan.as_dict(),
        "partitions": results,
        "composition": {
            "mode": "parallel",
            "components_are_oracle-disconnected_conditioned_on_fixed_structure": True,
            "single_monolithic_distribution_materialized": False,
            "reason": "avoid recreating the full classical 2^N tensor product merely to display the partitioned emulator",
        },
    }


__all__ = [
    "LegalPartition",
    "LegalScalingPlan",
    "execute_separable_grover_partitions",
    "plan_legal_scaling",
]
