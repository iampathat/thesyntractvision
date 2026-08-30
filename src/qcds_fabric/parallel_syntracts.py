from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence

from .central_fabric import CentralFabricRun, CentralQCDSFabric
from .fabric import FabricLayer, StabilizedRotationSuiteResult
from .models import BaseBundle, Syntract, TruthDistribution
from .oracle_space import OracleSpace
from .oracles import DistributionOracle, Oracle, OracleStack


class ParallelSyntractError(ValueError):
    """Raised when parallel Syntract composition would alter source semantics."""


@dataclass(frozen=True)
class ParallelSyntractInput:
    branch_id: str
    syntract: Syntract
    dimension_ids: tuple[str, ...]
    label: str = ""
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.branch_id.strip():
            raise ParallelSyntractError("parallel Syntract input requires branch_id")
        if not self.dimension_ids:
            raise ParallelSyntractError("parallel Syntract input requires dimension_ids")
        if len(set(self.dimension_ids)) != len(self.dimension_ids):
            raise ParallelSyntractError("source dimension ids must be unique")
        if any(len(state) != len(self.dimension_ids) for state in self.syntract.bound_distribution.support):
            raise ParallelSyntractError("source dimension ids do not match Syntract distribution width")


@dataclass(frozen=True)
class ParallelSyntractResult:
    composition_id: str
    inputs: tuple[ParallelSyntractInput, ...]
    branch_runs: Mapping[str, CentralFabricRun]
    joint_bundle: BaseBundle
    joint_oracle_stack: OracleStack
    suite: StabilizedRotationSuiteResult
    syntract: Syntract
    provenance: Mapping[str, Any]

    @property
    def truth_distribution(self) -> TruthDistribution:
        return self.syntract.bound_distribution


def _distribution_map(distribution: TruthDistribution) -> dict[tuple[int, ...], float]:
    return {
        state: probability
        for state, probability in zip(distribution.support, distribution.probabilities)
    }


def _namespace(branch_id: str, dimension_id: str) -> str:
    return f"{branch_id}::{dimension_id}"


def run_parallel_syntracts(
    inputs: Sequence[ParallelSyntractInput],
    *,
    composition_id: str,
    cross_oracles: Sequence[Oracle] = (),
    fabric_layer: FabricLayer | None = None,
    central_fabric: CentralQCDSFabric | None = None,
    max_joint_width: int = 20,
    syntract_id: str | None = None,
) -> ParallelSyntractResult:
    """Run complete Syntracts in parallel and re-enter them into one QCDS space.

    Each source Syntract remains a complete TruthDistribution. The first stage
    mounts one DistributionOracle-backed OracleSpace per source and executes the
    branches through the existing CentralQCDSFabric parallel path. The second
    stage places those branch TruthDistributions side-by-side as namespaced
    distribution-valued Conditions in one joint Logical Space. Only explicit
    ``cross_oracles`` may add logic between source branches.

    This is composition through existing QCDS semantics, not a fusion/scoring
    engine and not a hard collapse of any source Syntract.
    """
    resolved = tuple(inputs)
    if len(resolved) < 2:
        raise ParallelSyntractError("parallel Syntract composition requires at least two inputs")
    if not composition_id.strip():
        raise ParallelSyntractError("composition_id must be non-empty")
    branch_ids = [item.branch_id for item in resolved]
    if len(set(branch_ids)) != len(branch_ids):
        raise ParallelSyntractError("parallel Syntract branch ids must be unique")

    layer = fabric_layer or FabricLayer()
    central = central_fabric or CentralQCDSFabric(fabric=layer)

    branch_spaces: list[OracleSpace] = []
    namespaced_ids: dict[str, tuple[str, ...]] = {}
    for item in resolved:
        ids = tuple(_namespace(item.branch_id, dimension_id) for dimension_id in item.dimension_ids)
        namespaced_ids[item.branch_id] = ids
        prior = DistributionOracle(
            oracle_id=f"parallel-source:{composition_id}:{item.branch_id}",
            dimension_ids=ids,
            probabilities=_distribution_map(item.syntract.bound_distribution),
        )
        stack = OracleStack(
            stack_id=f"parallel-source:{composition_id}:{item.branch_id}",
            version="1",
            oracles=(prior,),
        )
        bundle = BaseBundle(
            bundle_id=f"parallel-source:{composition_id}:{item.branch_id}",
            dimension_ids=ids,
            values=("?",) * len(ids),
            provenance={
                "source_syntract_id": item.syntract.syntract_id,
                "source_branch_id": item.branch_id,
                "hard_collapse": False,
            },
            semantic_domain={"kind": "parallel_syntract_branch"},
        )
        branch_spaces.append(OracleSpace(
            space_id=f"parallel:{composition_id}:{item.branch_id}",
            universe_id=f"composition:{composition_id}",
            bundle=bundle,
            oracle_stack=stack,
            provenance={"source_syntract_id": item.syntract.syntract_id},
            syntract_ids=(item.syntract.syntract_id,),
        ))

    for space in branch_spaces:
        central.mount(space)
    branch_runs = central.run_parallel(tuple(space.space_id for space in branch_spaces))

    joint_ids = tuple(
        dimension_id
        for item in resolved
        for dimension_id in namespaced_ids[item.branch_id]
    )
    if len(joint_ids) > max_joint_width:
        raise ParallelSyntractError(
            f"joint logical width {len(joint_ids)} exceeds max_joint_width {max_joint_width}"
        )

    joint_oracles: list[Oracle] = []
    for item, space in zip(resolved, branch_spaces):
        run = branch_runs[space.space_id]
        distribution = run.suite.stabilized_return.stabilized_distribution
        joint_oracles.append(DistributionOracle(
            oracle_id=f"parallel-reentry:{composition_id}:{item.branch_id}",
            dimension_ids=namespaced_ids[item.branch_id],
            probabilities=_distribution_map(distribution),
        ))
    existing_ids = {oracle.oracle_id for oracle in joint_oracles}
    for oracle in cross_oracles:
        if oracle.oracle_id in existing_ids:
            raise ParallelSyntractError(f"cross oracle id collides with source oracle: {oracle.oracle_id!r}")
        existing_ids.add(oracle.oracle_id)
        joint_oracles.append(oracle)

    joint_bundle = BaseBundle(
        bundle_id=f"parallel-composition:{composition_id}",
        dimension_ids=joint_ids,
        values=("?",) * len(joint_ids),
        provenance={
            "source_syntract_ids": tuple(item.syntract.syntract_id for item in resolved),
            "branch_ids": tuple(branch_ids),
            "parallel_stage": True,
            "joint_reentry_stage": True,
            "hard_collapse": False,
        },
        semantic_domain={
            "kind": "parallel_syntract_composition",
            "source_count": len(resolved),
        },
    )
    joint_stack = OracleStack(
        stack_id=f"parallel-composition:{composition_id}",
        version="1",
        oracles=tuple(joint_oracles),
    )
    suite = layer.run_stabilized_rotation_suite(joint_bundle, joint_stack)
    bound = suite.stabilized_return.stabilized_distribution
    result_syntract = Syntract(
        syntract_id=syntract_id or f"syntract:parallel:{composition_id}",
        bound_distribution=bound,
        evidence_provenance={
            "source_syntract_ids": tuple(item.syntract.syntract_id for item in resolved),
            "source_labels": tuple(item.label or item.branch_id for item in resolved),
            "source_dimension_ids": {item.branch_id: item.dimension_ids for item in resolved},
            "namespaced_dimension_ids": namespaced_ids,
            "cross_oracle_ids": tuple(oracle.oracle_id for oracle in cross_oracles),
        },
        contradiction_provenance=bound.contradiction_markers,
        composition_provenance={
            "composition": "parallel_syntracts_to_qcds",
            "parallel_branch_count": len(resolved),
            "parallel_execution": True,
            "joint_qcds_reentry": True,
            "hard_collapse": False,
            "source_truth_distributions_preserved": True,
            "canonical_spec_modified": False,
        },
    )
    return ParallelSyntractResult(
        composition_id=composition_id,
        inputs=resolved,
        branch_runs=branch_runs,
        joint_bundle=joint_bundle,
        joint_oracle_stack=joint_stack,
        suite=suite,
        syntract=result_syntract,
        provenance={
            "engine": "existing_central_qcds_parallel_plus_distribution_reentry",
            "new_inference_engine": False,
            "cross_branch_logic_is_explicit_oracles_only": True,
            "canonical_spec_modified": False,
        },
    )


__all__ = [
    "ParallelSyntractError",
    "ParallelSyntractInput",
    "ParallelSyntractResult",
    "run_parallel_syntracts",
]
