from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Any, Mapping, Protocol, Sequence

from .fabric import FabricLayer
from .models import TruthDistribution
from .oracle_evolution import (
    OracleChallengeSuite,
    OracleEvolutionConfig,
    OracleEvolutionError,
    OracleEvolutionResult,
    OracleHypothesis,
    OracleProposalGenerator,
    apply_evolved_oracle_population,
    evolve_oracle_population,
    extract_problem_rule_population,
)
from .oracles import OracleStack
from .problem import (
    ProblemCompilation,
    ProblemInferenceResult,
    SemanticRuleOracle,
    bind_problem_result,
    run_problem_compilation,
)


class OracleGenesisError(ValueError):
    """Raised when oracle discovery/genesis would violate an explicit boundary."""


def _slug(value: str) -> str:
    out: list[str] = []
    prior_sep = False
    for char in value.strip().lower():
        if char.isalnum():
            out.append(char)
            prior_sep = False
        elif not prior_sep:
            out.append("_")
            prior_sep = True
    return "".join(out).strip("_") or "unknown"


@dataclass(frozen=True)
class OracleFailureObservation:
    """Target-blind external failure signal.

    The observation can identify *where* a prediction/expansion failed and how
    severe the failure was. It deliberately has no expected value, target state,
    answer, or ground-truth field. Correct outcomes remain in BUILD 11 challenge
    cases and are not passed to discovery or proposal generation.
    """

    observation_id: str
    kind: str
    query_ids: tuple[str, ...] = ()
    dimension_ids: tuple[str, ...] = ()
    severity: float = 1.0
    description: str = ""
    target_visible_to_discovery: bool = False
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.observation_id.strip():
            raise ValueError("oracle failure observation requires observation_id")
        if self.kind not in {"prediction_failure", "expansion_failure"}:
            raise ValueError("failure observation kind must be prediction_failure or expansion_failure")
        if not self.query_ids and not self.dimension_ids:
            raise ValueError("failure observation must identify at least one query or dimension")
        if self.severity <= 0:
            raise ValueError("failure observation severity must be positive")
        if self.target_visible_to_discovery:
            raise OracleGenesisError("oracle discovery may not receive target values")
        if len(set(self.query_ids)) != len(self.query_ids):
            raise ValueError("failure observation query ids must be unique")
        if len(set(self.dimension_ids)) != len(self.dimension_ids):
            raise ValueError("failure observation dimension ids must be unique")


@dataclass(frozen=True)
class OracleGapSignal:
    signal_id: str
    kind: str
    dimension_ids: tuple[str, ...]
    query_ids: tuple[str, ...]
    severity: float
    description: str
    provenance: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class OracleGap:
    gap_id: str
    query_ids: tuple[str, ...]
    affected_dimension_ids: tuple[str, ...]
    context_dimension_ids: tuple[str, ...]
    signal_ids: tuple[str, ...]
    signal_kinds: tuple[str, ...]
    score: float
    provenance: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class OracleGapDiscoveryConfig:
    include_contradiction_resolution: bool = True
    include_null_influence: bool = True
    min_abs_agreement_delta: float = 0.10
    min_abs_entropy_delta: float = 0.25
    min_failure_severity: float = 0.10
    max_context_dimensions: int = 12
    max_gaps: int = 8

    def __post_init__(self) -> None:
        if self.min_abs_agreement_delta < 0 or self.min_abs_entropy_delta < 0:
            raise ValueError("null-influence thresholds cannot be negative")
        if self.min_failure_severity < 0:
            raise ValueError("failure severity threshold cannot be negative")
        if self.max_context_dimensions <= 0 or self.max_gaps <= 0:
            raise ValueError("gap discovery bounds must be positive")


@dataclass(frozen=True)
class OracleGapDiscovery:
    signals: tuple[OracleGapSignal, ...]
    gaps: tuple[OracleGap, ...]
    baseline_distribution: TruthDistribution | None
    provenance: Mapping[str, Any]


class OracleGenesisGenerator(Protocol):
    """Generate candidate oracles from a discovered gap without challenge targets."""

    generator_id: str

    def propose_gap(
        self,
        gap: OracleGap,
        compilation: ProblemCompilation,
        oracle_stack: OracleStack,
        *,
        generation: int,
    ) -> tuple[OracleHypothesis, ...]: ...


def _dimension_query_map(compilation: ProblemCompilation) -> dict[str, tuple[str, ...]]:
    mapping: dict[str, list[str]] = {}
    for query_id in compilation.executable_query_ids:
        group = compilation.query_groups[query_id]
        for dimension_id in compilation.group_dimensions[group]:
            mapping.setdefault(dimension_id, []).append(query_id)
    return {dimension_id: tuple(query_ids) for dimension_id, query_ids in mapping.items()}


def _ordered_dimensions(compilation: ProblemCompilation, values: Sequence[str]) -> tuple[str, ...]:
    if compilation.bundle is None:
        return ()
    requested = set(values)
    return tuple(dimension_id for dimension_id in compilation.bundle.dimension_ids if dimension_id in requested)


def _resolve_observation_dimensions(
    compilation: ProblemCompilation,
    observation: OracleFailureObservation,
) -> tuple[tuple[str, ...], tuple[str, ...]]:
    if compilation.bundle is None:
        raise OracleGenesisError("problem compilation has no executable bundle")
    known_dimensions = set(compilation.bundle.dimension_ids)
    unknown_dimensions = set(observation.dimension_ids) - known_dimensions
    if unknown_dimensions:
        raise OracleGenesisError(
            f"failure observation references unknown dimensions: {sorted(unknown_dimensions)}"
        )
    unknown_queries = set(observation.query_ids) - set(compilation.executable_query_ids)
    if unknown_queries:
        raise OracleGenesisError(
            f"failure observation references non-executable queries: {sorted(unknown_queries)}"
        )

    dimensions = list(observation.dimension_ids)
    for query_id in observation.query_ids:
        group = compilation.query_groups[query_id]
        dimensions.extend(compilation.group_dimensions[group])
    ordered = _ordered_dimensions(compilation, tuple(dict.fromkeys(dimensions)))

    dimension_queries = _dimension_query_map(compilation)
    query_ids = list(observation.query_ids)
    for dimension_id in ordered:
        query_ids.extend(dimension_queries.get(dimension_id, ()))
    return ordered, tuple(dict.fromkeys(query_ids))


def discover_oracle_gaps(
    compilation: ProblemCompilation,
    *,
    observations: Sequence[OracleFailureObservation] = (),
    fabric_layer: FabricLayer | None = None,
    config: OracleGapDiscoveryConfig | None = None,
) -> OracleGapDiscovery:
    """Discover bounded oracle gaps without seeing external answer values."""

    if not compilation.executable or compilation.bundle is None or compilation.oracle_stack is None:
        raise OracleGenesisError("oracle gap discovery requires an executable ProblemCompilation")
    resolved = config or OracleGapDiscoveryConfig()
    layer = fabric_layer or FabricLayer()
    bundle = compilation.bundle
    dimension_queries = _dimension_query_map(compilation)
    signals: list[OracleGapSignal] = []
    baseline_distribution: TruthDistribution | None = None

    if resolved.include_contradiction_resolution or resolved.include_null_influence:
        null_bank = layer.run_null_bank(bundle, compilation.oracle_stack)
        baseline_distribution = null_bank.baseline_distribution
        influence = null_bank.stabilized_return.per_dimension_influence
        for index, (view, distribution) in enumerate(zip(null_bank.null_views, null_bank.null_distributions)):
            dimension_id = view.null_dimension_id
            if dimension_id is None:
                continue
            query_ids = dimension_queries.get(dimension_id, ())
            if (
                resolved.include_contradiction_resolution
                and baseline_distribution.contradiction_markers
                and not distribution.contradiction_markers
            ):
                signals.append(
                    OracleGapSignal(
                        signal_id=f"contradiction-null:{index}:{_slug(dimension_id)}",
                        kind="contradiction_resolution",
                        dimension_ids=(dimension_id,),
                        query_ids=query_ids,
                        severity=1.0 + max(0.0, distribution.oracle_agreement - baseline_distribution.oracle_agreement),
                        description="baseline contradiction clears when this dimension is logically absent",
                        provenance={
                            "diagnostic": "dimension_null",
                            "target_visible_to_discovery": False,
                        },
                    )
                )

            metrics = influence.get(dimension_id, {})
            agreement_delta = float(metrics.get("agreement_delta", 0.0))
            entropy_delta = float(metrics.get("entropy_delta", 0.0))
            if resolved.include_null_influence and (
                abs(agreement_delta) >= resolved.min_abs_agreement_delta
                or abs(entropy_delta) >= resolved.min_abs_entropy_delta
            ):
                severity = max(
                    abs(agreement_delta) / max(resolved.min_abs_agreement_delta, 1e-12),
                    abs(entropy_delta) / max(resolved.min_abs_entropy_delta, 1e-12),
                )
                signals.append(
                    OracleGapSignal(
                        signal_id=f"null-influence:{index}:{_slug(dimension_id)}",
                        kind="null_influence",
                        dimension_ids=(dimension_id,),
                        query_ids=query_ids,
                        severity=severity,
                        description="dimension-null diagnostic materially changes agreement or entropy",
                        provenance={
                            "agreement_delta": agreement_delta,
                            "entropy_delta": entropy_delta,
                            "target_visible_to_discovery": False,
                        },
                    )
                )

    for observation in observations:
        if observation.severity < resolved.min_failure_severity:
            continue
        dimensions, query_ids = _resolve_observation_dimensions(compilation, observation)
        signals.append(
            OracleGapSignal(
                signal_id=f"external:{_slug(observation.observation_id)}",
                kind=observation.kind,
                dimension_ids=dimensions,
                query_ids=query_ids,
                severity=observation.severity,
                description=observation.description or observation.kind.replace("_", " "),
                provenance={
                    **dict(observation.provenance),
                    "observation_id": observation.observation_id,
                    "target_visible_to_discovery": False,
                },
            )
        )

    # Aggregate signals by executable query group. A gap points to the affected
    # group while every other bounded problem dimension becomes candidate context.
    buckets: dict[str, list[OracleGapSignal]] = {}
    for signal in signals:
        keys = signal.query_ids or tuple(f"dimension:{dimension_id}" for dimension_id in signal.dimension_ids)
        for key in keys:
            buckets.setdefault(key, []).append(signal)

    gaps: list[OracleGap] = []
    for key, bucket in buckets.items():
        query_ids = tuple(
            query_id
            for query_id in compilation.executable_query_ids
            if any(query_id in signal.query_ids for signal in bucket)
        )
        affected: list[str] = []
        if query_ids:
            for query_id in query_ids:
                group = compilation.query_groups[query_id]
                affected.extend(compilation.group_dimensions[group])
        else:
            for signal in bucket:
                affected.extend(signal.dimension_ids)
        affected_ids = _ordered_dimensions(compilation, tuple(dict.fromkeys(affected)))
        affected_set = set(affected_ids)
        context_ids = tuple(
            dimension_id
            for dimension_id in bundle.dimension_ids
            if dimension_id not in affected_set
        )[: resolved.max_context_dimensions]
        signal_ids = tuple(dict.fromkeys(signal.signal_id for signal in bucket))
        kinds = tuple(dict.fromkeys(signal.kind for signal in bucket))
        score = sum(signal.severity for signal in bucket)
        gaps.append(
            OracleGap(
                gap_id=f"gap:{_slug(compilation.canonical_frame.mission_id)}:{_slug(key)}",
                query_ids=query_ids,
                affected_dimension_ids=affected_ids,
                context_dimension_ids=context_ids,
                signal_ids=signal_ids,
                signal_kinds=kinds,
                score=score,
                provenance={
                    "discovery": "oracle_gap_discovery_v0",
                    "mission_id": compilation.canonical_frame.mission_id,
                    "target_visible_to_discovery": False,
                    "holdout_visible_to_discovery": False,
                    "canonical_spec_modified": False,
                },
            )
        )

    gaps.sort(key=lambda gap: (-gap.score, gap.gap_id))
    gaps = gaps[: resolved.max_gaps]
    return OracleGapDiscovery(
        signals=tuple(signals),
        gaps=tuple(gaps),
        baseline_distribution=baseline_distribution,
        provenance={
            "engine": "oracle_gap_discovery_v0",
            "mission_id": compilation.canonical_frame.mission_id,
            "signal_count": len(signals),
            "gap_count": len(gaps),
            "external_target_values_visible": False,
            "holdout_visible": False,
            "canonical_spec_modified": False,
        },
    )


@dataclass(frozen=True)
class PairwiseSemanticRuleGenesisGenerator:
    """Generate a bounded rival field of explicit cross-group rule hypotheses."""

    kinds: tuple[str, ...] = ("implies", "excludes", "equivalent")
    confidence_values: tuple[float, ...] = (1.0,)
    bidirectional_candidates: bool = True
    max_proposals_per_gap: int = 96
    generator_id: str = "pairwise_semantic_rule_genesis_v0"

    def __post_init__(self) -> None:
        if not self.kinds or any(kind not in {"implies", "excludes", "equivalent"} for kind in self.kinds):
            raise ValueError("genesis rule kinds must be implies, excludes or equivalent")
        if not self.confidence_values or any(not 0.5 <= value <= 1.0 for value in self.confidence_values):
            raise ValueError("genesis confidence values must be in [0.5, 1.0]")
        if self.max_proposals_per_gap <= 0:
            raise ValueError("max_proposals_per_gap must be positive")

    def propose_gap(
        self,
        gap: OracleGap,
        compilation: ProblemCompilation,
        oracle_stack: OracleStack,
        *,
        generation: int,
    ) -> tuple[OracleHypothesis, ...]:
        if compilation.bundle is None:
            raise OracleGenesisError("genesis requires an executable problem bundle")

        dimension_group: dict[str, str] = {}
        for group, dimensions in compilation.group_dimensions.items():
            for dimension_id in dimensions:
                dimension_group[dimension_id] = group

        existing = {
            (
                oracle.antecedent_dimension,
                oracle.consequent_dimension,
                oracle.kind,
                round(float(oracle.confidence), 12),
            )
            for oracle in oracle_stack.oracles
            if isinstance(oracle, SemanticRuleOracle)
        }
        proposals: list[OracleHypothesis] = []
        semantic_seen: set[tuple[str, str, str, float]] = set()

        for affected in gap.affected_dimension_ids:
            for context in gap.context_dimension_ids:
                if dimension_group.get(affected) == dimension_group.get(context):
                    continue
                orientations = ((context, affected),)
                if self.bidirectional_candidates:
                    orientations += ((affected, context),)
                for antecedent, consequent in orientations:
                    for kind in self.kinds:
                        # Equivalence is symmetric; avoid emitting the same semantic
                        # relation twice merely because direction was reversed.
                        if kind == "equivalent" and antecedent > consequent:
                            pair = tuple(sorted((antecedent, consequent)))
                            antecedent, consequent = pair[0], pair[1]
                        for confidence in self.confidence_values:
                            signature = (antecedent, consequent, kind, round(float(confidence), 12))
                            if signature in existing or signature in semantic_seen:
                                continue
                            semantic_seen.add(signature)
                            token = str(confidence).replace(".", "_")
                            oracle_id = (
                                f"genesis:g{generation}:{_slug(gap.gap_id)}:"
                                f"{_slug(antecedent)}:{kind}:{_slug(consequent)}:{token}"
                            )
                            candidate = SemanticRuleOracle(
                                oracle_id=oracle_id,
                                antecedent_dimension=antecedent,
                                consequent_dimension=consequent,
                                kind=kind,
                                relation_class="logical",
                                confidence=confidence,
                                source_id=f"oracle-genesis:{gap.gap_id}",
                            )
                            proposals.append(
                                OracleHypothesis(
                                    hypothesis_id=f"hypothesis:{oracle_id}",
                                    oracle=candidate,
                                    replace_oracle_id=None,
                                    generation=generation,
                                    generator_id=self.generator_id,
                                    mutation="genesis:add_semantic_rule",
                                    rationale=(
                                        "discovered oracle gap: challenge a new explicit pairwise logical relation "
                                        "without using external answer values"
                                    ),
                                    parent_oracle_ids=(),
                                    provenance={
                                        "gap_id": gap.gap_id,
                                        "gap_signal_ids": gap.signal_ids,
                                        "gap_signal_kinds": gap.signal_kinds,
                                        "target_visible_to_generator": False,
                                        "holdout_visible_to_generator": False,
                                        "hypothesis_is_external_truth_claim": False,
                                        "canonical_spec_modified": False,
                                    },
                                )
                            )
                            if len(proposals) >= self.max_proposals_per_gap:
                                return tuple(proposals)
        return tuple(proposals)


@dataclass(frozen=True)
class DiscoveredGapProposalGenerator:
    """Bind one target-blind gap to a BUILD 11 OracleProposalGenerator interface."""

    gap: OracleGap
    compilation: ProblemCompilation
    genesis_generator: OracleGenesisGenerator

    @property
    def generator_id(self) -> str:
        return f"gap-bound:{_slug(self.gap.gap_id)}:{_slug(self.genesis_generator.generator_id)}"

    def propose(self, oracle_stack: OracleStack, *, generation: int) -> tuple[OracleHypothesis, ...]:
        raw = self.genesis_generator.propose_gap(
            self.gap,
            self.compilation,
            oracle_stack,
            generation=generation,
        )
        return tuple(
            replace(
                hypothesis,
                generator_id=self.generator_id,
                provenance={
                    **dict(hypothesis.provenance),
                    "gap_bound_generator": self.generator_id,
                    "target_visible_to_generator": False,
                    "holdout_visible_to_generator": False,
                },
            )
            for hypothesis in raw
        )


@dataclass(frozen=True)
class OracleGenesisResult:
    discovery: OracleGapDiscovery
    initial_population: OracleStack
    evolution: OracleEvolutionResult | None
    evolved_compilation: ProblemCompilation
    inference: ProblemInferenceResult
    syntract: Any
    newly_added_oracle_ids: tuple[str, ...]
    stopped_reason: str
    provenance: Mapping[str, Any]

    @property
    def promotion_count(self) -> int:
        return 0 if self.evolution is None else self.evolution.promotion_count


def run_oracle_genesis_cycle(
    compilation: ProblemCompilation,
    challenge_suite: OracleChallengeSuite,
    *,
    observations: Sequence[OracleFailureObservation] = (),
    genesis_generators: Sequence[OracleGenesisGenerator] = (PairwiseSemanticRuleGenesisGenerator(),),
    additional_evolution_generators: Sequence[OracleProposalGenerator] = (),
    fabric_layer: FabricLayer | None = None,
    discovery_config: OracleGapDiscoveryConfig | None = None,
    evolution_config: OracleEvolutionConfig | None = None,
) -> OracleGenesisResult:
    """Discover missing-oracle gaps, generate candidates, challenge, and re-inject survivors."""

    if not compilation.executable:
        raise OracleGenesisError("oracle genesis requires an executable ProblemCompilation")
    if not genesis_generators:
        raise OracleGenesisError("oracle genesis requires at least one genesis generator")
    generator_ids = [generator.generator_id for generator in genesis_generators]
    if len(set(generator_ids)) != len(generator_ids):
        raise OracleGenesisError("oracle genesis generator ids must be unique")

    layer = fabric_layer or FabricLayer()
    resolved_evolution = evolution_config or OracleEvolutionConfig()
    initial_population = extract_problem_rule_population(compilation)
    discovery = discover_oracle_gaps(
        compilation,
        observations=observations,
        fabric_layer=layer,
        config=discovery_config,
    )

    if not discovery.gaps:
        inference = run_problem_compilation(
            compilation,
            fabric_layer=layer,
            include_positional=resolved_evolution.include_positional,
            include_oracle_exposure=resolved_evolution.include_oracle_exposure,
            include_crossed=resolved_evolution.include_crossed,
        )
        return OracleGenesisResult(
            discovery=discovery,
            initial_population=initial_population,
            evolution=None,
            evolved_compilation=compilation,
            inference=inference,
            syntract=bind_problem_result(inference),
            newly_added_oracle_ids=(),
            stopped_reason="no_oracle_gaps",
            provenance={
                "engine": "oracle_genesis_cycle_v0",
                "target_values_visible_to_discovery": False,
                "holdout_visible_to_proposal": False,
                "automatic_canonical_rewrite": False,
                "canonical_spec_modified": False,
            },
        )

    bound_generators: list[OracleProposalGenerator] = []
    for gap in discovery.gaps:
        for generator in genesis_generators:
            bound_generators.append(DiscoveredGapProposalGenerator(gap, compilation, generator))
    bound_generators.extend(additional_evolution_generators)

    evolution = evolve_oracle_population(
        initial_population,
        challenge_suite,
        tuple(bound_generators),
        fabric_layer=layer,
        config=resolved_evolution,
    )
    evolved_compilation = apply_evolved_oracle_population(compilation, evolution)
    inference = run_problem_compilation(
        evolved_compilation,
        fabric_layer=layer,
        include_positional=resolved_evolution.include_positional,
        include_oracle_exposure=resolved_evolution.include_oracle_exposure,
        include_crossed=resolved_evolution.include_crossed,
    )
    initial_ids = set(initial_population.oracle_ids)
    added = tuple(oracle_id for oracle_id in evolution.final_stack.oracle_ids if oracle_id not in initial_ids)
    return OracleGenesisResult(
        discovery=discovery,
        initial_population=initial_population,
        evolution=evolution,
        evolved_compilation=evolved_compilation,
        inference=inference,
        syntract=bind_problem_result(inference),
        newly_added_oracle_ids=added,
        stopped_reason=evolution.stopped_reason,
        provenance={
            "engine": "oracle_genesis_cycle_v0",
            "gap_count": len(discovery.gaps),
            "promotion_count": evolution.promotion_count,
            "new_oracle_count": len(added),
            "target_values_visible_to_discovery": False,
            "holdout_visible_to_proposal": False,
            "build11_challenge_required": True,
            "lineage_reversible": True,
            "automatic_canonical_rewrite": False,
            "canonical_spec_modified": False,
        },
    )
