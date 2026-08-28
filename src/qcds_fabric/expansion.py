from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from .fabric import FabricLayer, StabilizedRotationSuiteResult
from .models import BaseBundle, State, Syntract, TruthDistribution
from .oracles import DistributionOracle, OracleStack


@dataclass(frozen=True)
class ExpansionSpec:
    """Bounded BUILD 8 compile policy for the canonical 1 -> N direction.

    The bound Syntract is retained as a distribution-valued condition. New
    binary expansion dimensions are opened as wildcards and are constrained by
    explicit proposal/test oracles. This module does not generate domain
    semantics or unrestricted hypotheses by itself.
    """

    expansion_id: str
    dimension_ids: tuple[str, ...]
    max_total_width: int = 16
    include_positional: bool = False
    include_oracle_exposure: bool = False
    include_crossed: bool = False

    def __post_init__(self) -> None:
        if not self.expansion_id:
            raise ValueError("expansion_id must be non-empty")
        if not self.dimension_ids:
            raise ValueError("expansion requires at least one new dimension")
        if len(set(self.dimension_ids)) != len(self.dimension_ids):
            raise ValueError("expansion dimension ids must be unique")
        if self.max_total_width <= 0:
            raise ValueError("max_total_width must be positive")


@dataclass(frozen=True)
class ExpansionCompilation:
    source_syntract_id: str
    spec: ExpansionSpec
    bundle: BaseBundle
    oracle_stack: OracleStack
    source_dimension_ids: tuple[str, ...]
    expansion_dimension_ids: tuple[str, ...]
    provenance: Mapping[str, Any]


@dataclass(frozen=True)
class ExpansionResult:
    compilation: ExpansionCompilation
    suite: StabilizedRotationSuiteResult
    baseline_projection: TruthDistribution
    stabilized_projection: TruthDistribution

    @property
    def projected_distribution(self) -> TruthDistribution:
        return self.stabilized_projection

    @property
    def candidate_branch_count(self) -> int:
        return len(self.stabilized_projection.support)


@dataclass(frozen=True)
class ExpansionContractionResult:
    expansion: ExpansionResult
    bundle: BaseBundle
    oracle_stack: OracleStack
    suite: StabilizedRotationSuiteResult
    syntract: Syntract
    provenance: Mapping[str, Any]


@dataclass(frozen=True)
class ExpansionCycleResult:
    expansion: ExpansionResult
    contraction: ExpansionContractionResult


def _coerce_dimension_ids(raw: Any) -> tuple[str, ...] | None:
    if raw is None or isinstance(raw, (str, bytes)):
        return None
    try:
        resolved = tuple(str(item) for item in raw)
    except TypeError:
        return None
    return resolved or None


def _resolve_source_dimension_ids(
    syntract: Syntract,
    explicit: Sequence[str] | None,
) -> tuple[str, ...]:
    if explicit is not None:
        resolved = tuple(str(item) for item in explicit)
    else:
        resolved = ()
        evidence = syntract.evidence_provenance
        for key in ("final_dimension_ids", "bound_dimension_ids", "dimension_ids"):
            candidate = _coerce_dimension_ids(evidence.get(key))
            if candidate:
                resolved = candidate
                break
        if not resolved:
            raw_slices = evidence.get("final_source_slices")
            if isinstance(raw_slices, Mapping):
                flattened: list[str] = []
                for values in raw_slices.values():
                    candidate = _coerce_dimension_ids(values)
                    if candidate:
                        flattened.extend(candidate)
                resolved = tuple(flattened)

    if not resolved:
        raise ValueError(
            "source dimension ids are unavailable; pass source_dimension_ids explicitly "
            "or expand a Syntract with dimension provenance"
        )
    if len(set(resolved)) != len(resolved):
        raise ValueError("source dimension ids must be unique")

    distribution = syntract.bound_distribution
    if any(len(state) != len(resolved) for state in distribution.support):
        raise ValueError("source dimension ids do not match bound Syntract support width")
    if any(any(value not in (0, 1) for value in state) for state in distribution.support):
        raise ValueError("expansion requires canonical binary source support")
    return resolved


def _distribution_map(distribution: TruthDistribution) -> dict[State, float]:
    return {
        state: probability
        for state, probability in zip(distribution.support, distribution.probabilities)
    }


def _compose_oracle_stack(
    *,
    stack_id: str,
    source_oracle: DistributionOracle,
    external: OracleStack,
) -> OracleStack:
    if source_oracle.oracle_id in external.oracle_ids:
        raise ValueError("external oracle id collides with the bound-distribution oracle id")
    return OracleStack(
        stack_id=stack_id,
        version=external.version,
        oracles=(source_oracle, *external.oracles),
    )


def compile_syntract_expansion(
    syntract: Syntract,
    spec: ExpansionSpec,
    proposal_oracles: OracleStack,
    *,
    source_dimension_ids: Sequence[str] | None = None,
) -> ExpansionCompilation:
    """Compile one bound Syntract into a larger open Condition space.

    `1` in the canonical 1 -> N direction denotes one bound structure, not one
    forced binary state. Its complete TruthDistribution remains active as a
    DistributionOracle while new dimensions are opened as `?`.
    """
    source_ids = _resolve_source_dimension_ids(syntract, source_dimension_ids)
    expansion_ids = tuple(spec.dimension_ids)
    overlap = set(source_ids) & set(expansion_ids)
    if overlap:
        raise ValueError(f"expansion dimension ids collide with source dimensions: {sorted(overlap)}")

    combined_ids = source_ids + expansion_ids
    if len(combined_ids) > spec.max_total_width:
        raise ValueError(
            f"compiled expansion width {len(combined_ids)} exceeds max_total_width "
            f"{spec.max_total_width}"
        )

    source_oracle = DistributionOracle(
        oracle_id=f"bound-source:{syntract.syntract_id}",
        dimension_ids=source_ids,
        probabilities=_distribution_map(syntract.bound_distribution),
    )
    compiled_stack = _compose_oracle_stack(
        stack_id=f"expansion:{spec.expansion_id}",
        source_oracle=source_oracle,
        external=proposal_oracles,
    )
    bundle = BaseBundle(
        bundle_id=f"expansion:{spec.expansion_id}",
        dimension_ids=combined_ids,
        values=("?",) * len(combined_ids),
        provenance={
            "source_syntract_id": syntract.syntract_id,
            "source_dimension_ids": source_ids,
            "expansion_dimension_ids": expansion_ids,
            "compiler": "syntract_expansion_v0",
            "source_hold_mode": "distribution_oracle_no_hard_collapse",
        },
        semantic_domain={
            "kind": "qcds_expansion",
            "direction": "1_to_N",
            "source_is_bound_structure": True,
        },
    )
    return ExpansionCompilation(
        source_syntract_id=syntract.syntract_id,
        spec=spec,
        bundle=bundle,
        oracle_stack=compiled_stack,
        source_dimension_ids=source_ids,
        expansion_dimension_ids=expansion_ids,
        provenance={
            "compiler": "syntract_expansion_v0",
            "direction": "1_to_N",
            "source_syntract_id": syntract.syntract_id,
            "source_dimension_count": len(source_ids),
            "expansion_dimension_count": len(expansion_ids),
            "logical_width": len(combined_ids),
            "candidate_binary_space": f"2^{len(combined_ids)}",
            "projected_expansion_space": f"2^{len(expansion_ids)}",
            "proposal_oracle_stack": proposal_oracles.identity,
            "hard_collapse": False,
            "unrestricted_hypothesis_generation": False,
            "canonical_spec_modified": False,
        },
    )


def project_truth_distribution(
    distribution: TruthDistribution,
    *,
    indexes: Sequence[int],
    dimension_ids: Sequence[str],
    projection_kind: str,
) -> TruthDistribution:
    resolved_indexes = tuple(indexes)
    resolved_ids = tuple(str(item) for item in dimension_ids)
    if not resolved_indexes:
        raise ValueError("projection requires at least one coordinate")
    if len(resolved_indexes) != len(resolved_ids):
        raise ValueError("projection indexes and dimension ids must align")
    if len(set(resolved_indexes)) != len(resolved_indexes):
        raise ValueError("projection indexes must be unique")

    aggregate: dict[State, float] = {}
    for state, probability in zip(distribution.support, distribution.probabilities):
        if any(index < 0 or index >= len(state) for index in resolved_indexes):
            raise ValueError("projection index out of bounds")
        projected = tuple(state[index] for index in resolved_indexes)
        if any(value not in (0, 1) for value in projected):
            raise ValueError("projection requires canonical binary coordinates")
        aggregate[projected] = aggregate.get(projected, 0.0) + probability

    support = tuple(sorted(aggregate))
    probabilities = tuple(aggregate[state] for state in support)
    total = sum(probabilities)
    if total <= 0.0:
        raise ValueError("projected distribution has no probability mass")
    probabilities = tuple(value / total for value in probabilities)
    ordering = sorted(
        range(len(support)),
        key=lambda index: (-probabilities[index], support[index]),
    )
    top = tuple(support[index] for index in ordering[: min(8, len(support))])
    return TruthDistribution(
        support=support,
        probabilities=probabilities,
        raw_scores=probabilities,
        top_k=top,
        entropy=TruthDistribution.shannon_entropy(probabilities),
        oracle_agreement=distribution.oracle_agreement,
        contradiction_markers=distribution.contradiction_markers,
        normalization="marginal_projection",
        provenance={
            **dict(distribution.provenance),
            "projection_kind": projection_kind,
            "projection_dimension_ids": resolved_ids,
            "projection_indexes": resolved_indexes,
            "hard_collapse": False,
        },
    )


def _expansion_projection(
    compilation: ExpansionCompilation,
    distribution: TruthDistribution,
    *,
    projection_kind: str,
) -> TruthDistribution:
    offset = len(compilation.source_dimension_ids)
    indexes = tuple(range(offset, offset + len(compilation.expansion_dimension_ids)))
    return project_truth_distribution(
        distribution,
        indexes=indexes,
        dimension_ids=compilation.expansion_dimension_ids,
        projection_kind=projection_kind,
    )


def run_syntract_expansion(
    syntract: Syntract,
    spec: ExpansionSpec,
    proposal_oracles: OracleStack,
    *,
    source_dimension_ids: Sequence[str] | None = None,
    fabric_layer: FabricLayer | None = None,
) -> ExpansionResult:
    compilation = compile_syntract_expansion(
        syntract,
        spec,
        proposal_oracles,
        source_dimension_ids=source_dimension_ids,
    )
    layer = fabric_layer or FabricLayer()
    suite = layer.run_stabilized_rotation_suite(
        compilation.bundle,
        compilation.oracle_stack,
        include_positional=spec.include_positional,
        include_oracle_exposure=spec.include_oracle_exposure,
        include_crossed=spec.include_crossed,
    )
    baseline_projection = _expansion_projection(
        compilation,
        suite.baseline_distribution,
        projection_kind="expansion_baseline",
    )
    stabilized_projection = _expansion_projection(
        compilation,
        suite.stabilized_return.stabilized_distribution,
        projection_kind="expansion_stabilized",
    )
    return ExpansionResult(
        compilation=compilation,
        suite=suite,
        baseline_projection=baseline_projection,
        stabilized_projection=stabilized_projection,
    )


def contract_expansion(
    expansion: ExpansionResult,
    validation_oracles: OracleStack,
    *,
    fabric_layer: FabricLayer | None = None,
    syntract_id: str | None = None,
) -> ExpansionContractionResult:
    """Test and contract an N-branch expansion back into a bound distribution."""
    dimension_ids = expansion.compilation.expansion_dimension_ids
    prior = DistributionOracle(
        oracle_id=f"expansion-prior:{expansion.compilation.spec.expansion_id}",
        dimension_ids=dimension_ids,
        probabilities=_distribution_map(expansion.stabilized_projection),
    )
    compiled_stack = _compose_oracle_stack(
        stack_id=f"expansion-contract:{expansion.compilation.spec.expansion_id}",
        source_oracle=prior,
        external=validation_oracles,
    )
    bundle = BaseBundle(
        bundle_id=f"expansion-contract:{expansion.compilation.spec.expansion_id}",
        dimension_ids=dimension_ids,
        values=("?",) * len(dimension_ids),
        provenance={
            "source_syntract_id": expansion.compilation.source_syntract_id,
            "source_expansion_id": expansion.compilation.spec.expansion_id,
            "compiler": "expansion_contraction_v0",
        },
        semantic_domain={
            "kind": "qcds_expansion_contraction",
            "direction": "N_to_1",
        },
    )
    layer = fabric_layer or FabricLayer()
    spec = expansion.compilation.spec
    suite = layer.run_stabilized_rotation_suite(
        bundle,
        compiled_stack,
        include_positional=spec.include_positional,
        include_oracle_exposure=spec.include_oracle_exposure,
        include_crossed=spec.include_crossed,
    )
    bound = suite.stabilized_return.stabilized_distribution
    result_syntract = Syntract(
        syntract_id=syntract_id or f"syntract:expansion:{spec.expansion_id}",
        bound_distribution=bound,
        evidence_provenance={
            "source_syntract_id": expansion.compilation.source_syntract_id,
            "source_expansion_id": spec.expansion_id,
            "expansion_dimension_ids": dimension_ids,
            "proposal_oracle_stack": expansion.compilation.provenance["proposal_oracle_stack"],
            "validation_oracle_stack": validation_oracles.identity,
            "pre_contraction_projection": dict(expansion.stabilized_projection.provenance),
        },
        contradiction_provenance=bound.contradiction_markers,
        composition_provenance={
            "cycle": "expand_test_contract_bind",
            "prior_direction": "1_to_N",
            "direction": "N_to_1",
            "candidate_branch_count": expansion.candidate_branch_count,
            "hard_collapse": False,
            "recursive_expansion_supported": True,
        },
    )
    return ExpansionContractionResult(
        expansion=expansion,
        bundle=bundle,
        oracle_stack=compiled_stack,
        suite=suite,
        syntract=result_syntract,
        provenance={
            "contraction": "expansion_contraction_v0",
            "source_syntract_id": expansion.compilation.source_syntract_id,
            "expansion_id": spec.expansion_id,
            "validation_oracle_stack": validation_oracles.identity,
            "hard_collapse": False,
            "canonical_spec_modified": False,
        },
    )


def run_expansion_cycle(
    syntract: Syntract,
    spec: ExpansionSpec,
    proposal_oracles: OracleStack,
    validation_oracles: OracleStack,
    *,
    source_dimension_ids: Sequence[str] | None = None,
    fabric_layer: FabricLayer | None = None,
    syntract_id: str | None = None,
) -> ExpansionCycleResult:
    layer = fabric_layer or FabricLayer()
    expansion = run_syntract_expansion(
        syntract,
        spec,
        proposal_oracles,
        source_dimension_ids=source_dimension_ids,
        fabric_layer=layer,
    )
    contraction = contract_expansion(
        expansion,
        validation_oracles,
        fabric_layer=layer,
        syntract_id=syntract_id,
    )
    return ExpansionCycleResult(expansion=expansion, contraction=contraction)
