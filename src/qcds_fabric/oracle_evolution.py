from __future__ import annotations

from dataclasses import dataclass, field, replace
from statistics import mean
from typing import Any, Mapping, Protocol, Sequence

from .benchmark import BenchmarkMetrics, evaluate_against_target
from .fabric import FabricLayer
from .models import BaseBundle, ChannelView, State, TruthDistribution
from .oracles import OracleStack


class OracleEvolutionError(ValueError):
    """Raised when oracle evolution cannot proceed without violating invariants."""


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


def _distribution_l1(left: TruthDistribution, right: TruthDistribution) -> float:
    left_map = dict(zip(left.support, left.probabilities))
    right_map = dict(zip(right.support, right.probabilities))
    keys = set(left_map) | set(right_map)
    return sum(abs(left_map.get(state, 0.0) - right_map.get(state, 0.0)) for state in keys)


@dataclass(frozen=True)
class OracleChallengeCase:
    """Externally checkable case used to challenge an oracle population.

    ``context_oracles`` are case-specific evidence/constraints. The evolving
    population is supplied separately so the same candidate oracle can be
    challenged under different evidence contexts without leaking targets into
    proposal generation.
    """

    case_id: str
    bundle: BaseBundle
    target_distribution: Mapping[State, float]
    role: str = "selection"
    context_oracles: tuple[Any, ...] = ()
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.case_id.strip():
            raise ValueError("challenge case requires case_id")
        if self.role not in {"selection", "holdout"}:
            raise ValueError("challenge case role must be selection or holdout")
        if not self.target_distribution:
            raise ValueError("challenge case requires an external target distribution")
        if any(probability < 0 for probability in self.target_distribution.values()):
            raise ValueError("challenge target probabilities cannot be negative")
        if sum(self.target_distribution.values()) <= 0:
            raise ValueError("challenge target must contain positive probability mass")
        for state in self.target_distribution:
            if len(state) != self.bundle.width:
                raise ValueError("challenge target state width must match bundle width")
            if any(value not in (0, 1) for value in state):
                raise ValueError("challenge target states must be binary")
        ids = [oracle.oracle_id for oracle in self.context_oracles]
        if len(set(ids)) != len(ids):
            raise ValueError("context oracle ids must be unique within a challenge case")


@dataclass(frozen=True)
class OracleChallengeSuite:
    suite_id: str
    cases: tuple[OracleChallengeCase, ...]
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.suite_id.strip():
            raise ValueError("challenge suite requires suite_id")
        if not self.cases:
            raise ValueError("challenge suite requires at least one case")
        case_ids = [case.case_id for case in self.cases]
        if len(set(case_ids)) != len(case_ids):
            raise ValueError("challenge case ids must be unique")

    @property
    def selection_cases(self) -> tuple[OracleChallengeCase, ...]:
        return tuple(case for case in self.cases if case.role == "selection")

    @property
    def holdout_cases(self) -> tuple[OracleChallengeCase, ...]:
        return tuple(case for case in self.cases if case.role == "holdout")


@dataclass(frozen=True)
class OracleHypothesis:
    """One auditable oracle mutation/addition/retirement proposal."""

    hypothesis_id: str
    oracle: Any | None
    replace_oracle_id: str | None = None
    generation: int = 1
    generator_id: str = "external"
    mutation: str = "proposal"
    rationale: str = ""
    parent_oracle_ids: tuple[str, ...] = ()
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.hypothesis_id.strip():
            raise ValueError("oracle hypothesis requires hypothesis_id")
        if self.generation <= 0:
            raise ValueError("oracle hypothesis generation must be positive")
        if not self.generator_id.strip():
            raise ValueError("oracle hypothesis requires generator_id")
        if self.oracle is None and self.replace_oracle_id is None:
            raise ValueError("retirement hypothesis requires replace_oracle_id")
        if self.oracle is not None:
            if not getattr(self.oracle, "oracle_id", ""):
                raise ValueError("candidate oracle requires oracle_id")
            if not callable(getattr(self.oracle, "is_applicable", None)):
                raise ValueError("candidate oracle must implement is_applicable(view)")
            if not callable(getattr(self.oracle, "score", None)):
                raise ValueError("candidate oracle must implement score(view, state)")

    @property
    def candidate_oracle_id(self) -> str | None:
        return None if self.oracle is None else self.oracle.oracle_id

    @property
    def is_retirement(self) -> bool:
        return self.oracle is None


class OracleProposalGenerator(Protocol):
    """Proposal-only interface.

    The challenge suite and external targets are intentionally absent from this
    method signature. A generator proposes hypotheses; a separate challenge
    layer decides whether any proposal survives.
    """

    generator_id: str

    def propose(self, oracle_stack: OracleStack, *, generation: int) -> tuple[OracleHypothesis, ...]: ...


@dataclass(frozen=True)
class SemanticRuleMutationGenerator:
    """Deterministic mutation operator for BUILD 10 SemanticRuleOracle objects.

    It can mutate rule topology and, optionally, confidence. EvidenceOracle
    source confidence is intentionally not mutated by this generator.
    """

    mutate_kinds: bool = True
    confidence_values: tuple[float, ...] = ()
    generator_id: str = "semantic_rule_mutation_v0"

    def __post_init__(self) -> None:
        if any(not 0.5 <= value <= 1.0 for value in self.confidence_values):
            raise ValueError("rule confidence mutation values must be in [0.5, 1.0]")

    def propose(self, oracle_stack: OracleStack, *, generation: int) -> tuple[OracleHypothesis, ...]:
        from .problem import SemanticRuleOracle

        proposals: list[OracleHypothesis] = []
        supported_kinds = ("implies", "excludes", "equivalent")
        for oracle in oracle_stack.oracles:
            if not isinstance(oracle, SemanticRuleOracle):
                continue
            if self.mutate_kinds:
                for kind in supported_kinds:
                    if kind == oracle.kind:
                        continue
                    candidate = SemanticRuleOracle(
                        oracle_id=f"evo:g{generation}:{_slug(oracle.oracle_id)}:kind:{kind}",
                        antecedent_dimension=oracle.antecedent_dimension,
                        consequent_dimension=oracle.consequent_dimension,
                        kind=kind,
                        relation_class=oracle.relation_class,
                        confidence=oracle.confidence,
                        source_id=oracle.source_id,
                    )
                    proposals.append(
                        OracleHypothesis(
                            hypothesis_id=f"g{generation}:{_slug(oracle.oracle_id)}:kind:{kind}",
                            oracle=candidate,
                            replace_oracle_id=oracle.oracle_id,
                            generation=generation,
                            generator_id=self.generator_id,
                            mutation=f"rule_kind:{oracle.kind}->{kind}",
                            rationale="challenge an existing semantic rule with an alternative explicit transform",
                            parent_oracle_ids=(oracle.oracle_id,),
                            provenance={
                                "rule_relation_class": oracle.relation_class,
                                "source_id": oracle.source_id,
                                "target_visible_to_generator": False,
                            },
                        )
                    )
            for confidence in self.confidence_values:
                if abs(confidence - oracle.confidence) <= 1e-12:
                    continue
                token = str(confidence).replace(".", "_")
                candidate = SemanticRuleOracle(
                    oracle_id=f"evo:g{generation}:{_slug(oracle.oracle_id)}:confidence:{token}",
                    antecedent_dimension=oracle.antecedent_dimension,
                    consequent_dimension=oracle.consequent_dimension,
                    kind=oracle.kind,
                    relation_class=oracle.relation_class,
                    confidence=confidence,
                    source_id=oracle.source_id,
                )
                proposals.append(
                    OracleHypothesis(
                        hypothesis_id=f"g{generation}:{_slug(oracle.oracle_id)}:confidence:{token}",
                        oracle=candidate,
                        replace_oracle_id=oracle.oracle_id,
                        generation=generation,
                        generator_id=self.generator_id,
                        mutation=f"rule_confidence:{oracle.confidence}->{confidence}",
                        rationale="challenge the strength of an existing semantic rule without changing its topology",
                        parent_oracle_ids=(oracle.oracle_id,),
                        provenance={
                            "rule_relation_class": oracle.relation_class,
                            "source_id": oracle.source_id,
                            "target_visible_to_generator": False,
                        },
                    )
                )
        return tuple(proposals)


@dataclass(frozen=True)
class OracleRetirementGenerator:
    """Explicit leave-one-out proposal generator for selected oracle ids."""

    eligible_oracle_ids: tuple[str, ...]
    generator_id: str = "oracle_retirement_v0"

    def propose(self, oracle_stack: OracleStack, *, generation: int) -> tuple[OracleHypothesis, ...]:
        active = set(oracle_stack.oracle_ids)
        proposals: list[OracleHypothesis] = []
        for oracle_id in self.eligible_oracle_ids:
            if oracle_id not in active:
                continue
            proposals.append(
                OracleHypothesis(
                    hypothesis_id=f"g{generation}:{_slug(oracle_id)}:retire",
                    oracle=None,
                    replace_oracle_id=oracle_id,
                    generation=generation,
                    generator_id=self.generator_id,
                    mutation="retire_oracle",
                    rationale="generalized BUILD 5 leave-one-out challenge",
                    parent_oracle_ids=(oracle_id,),
                    provenance={
                        "automatic_retirement": False,
                        "target_visible_to_generator": False,
                    },
                )
            )
        return tuple(proposals)


@dataclass(frozen=True)
class OracleEvolutionConfig:
    max_generations: int = 3
    max_promotions_per_generation: int = 1
    evaluation_mode: str = "stabilized"
    include_positional: bool = False
    include_oracle_exposure: bool = False
    include_crossed: bool = False
    min_selection_cases: int = 1
    min_holdout_cases: int = 1
    min_selection_mean_l1_improvement: float = 1e-6
    min_holdout_mean_l1_improvement: float = 0.0
    max_case_l1_regression: float = 0.0
    max_total_contradiction_increase: int = 0
    min_effect_cases: int = 1
    numerical_tolerance: float = 1e-12

    def __post_init__(self) -> None:
        if self.max_generations <= 0:
            raise ValueError("max_generations must be positive")
        if self.max_promotions_per_generation <= 0:
            raise ValueError("max_promotions_per_generation must be positive")
        if self.evaluation_mode not in {"baseline", "stabilized"}:
            raise ValueError("evaluation_mode must be baseline or stabilized")
        if self.min_selection_cases < 0 or self.min_holdout_cases < 0:
            raise ValueError("minimum challenge case counts cannot be negative")
        if self.max_case_l1_regression < 0:
            raise ValueError("max_case_l1_regression cannot be negative")
        if self.max_total_contradiction_increase < 0:
            raise ValueError("max_total_contradiction_increase cannot be negative")
        if self.min_effect_cases < 0:
            raise ValueError("min_effect_cases cannot be negative")
        if self.numerical_tolerance <= 0:
            raise ValueError("numerical_tolerance must be positive")


@dataclass(frozen=True)
class OracleCaseEvaluation:
    case_id: str
    role: str
    reference_metrics: BenchmarkMetrics
    candidate_metrics: BenchmarkMetrics
    reference_distribution: TruthDistribution
    candidate_distribution: TruthDistribution
    l1_improvement: float
    distribution_effect_l1: float
    contradiction_delta: int


@dataclass(frozen=True)
class OracleHypothesisEvaluation:
    hypothesis: OracleHypothesis
    cases: tuple[OracleCaseEvaluation, ...]
    selection_mean_l1_improvement: float
    holdout_mean_l1_improvement: float
    worst_case_l1_regression: float
    total_contradiction_increase: int
    effect_case_count: int
    promotable: bool
    rejection_reasons: tuple[str, ...]
    provenance: Mapping[str, Any]


@dataclass(frozen=True)
class OracleLineageRecord:
    generation: int
    hypothesis_id: str
    generator_id: str
    mutation: str
    replaced_oracle_id: str | None
    new_oracle_id: str | None
    resulting_stack_identity: str
    challenge_suite_id: str


@dataclass(frozen=True)
class OracleEvolutionGeneration:
    generation: int
    base_stack_identity: str
    proposal_count: int
    evaluations: tuple[OracleHypothesisEvaluation, ...]
    promoted_hypothesis_ids: tuple[str, ...]
    resulting_stack_identity: str
    stop_reason: str | None


@dataclass(frozen=True)
class OracleEvolutionResult:
    initial_stack_identity: str
    initial_oracle_ids: tuple[str, ...]
    final_stack: OracleStack
    generations: tuple[OracleEvolutionGeneration, ...]
    lineage: tuple[OracleLineageRecord, ...]
    stopped_reason: str
    challenge_suite_id: str
    provenance: Mapping[str, Any]

    @property
    def promotion_count(self) -> int:
        return len(self.lineage)


@dataclass(frozen=True)
class OraclePopulationSnapshot:
    population_id: str
    generation: int
    oracle_stack: OracleStack
    provenance: Mapping[str, Any] = field(default_factory=dict)


def _validate_population_stack(stack: OracleStack) -> None:
    ids = list(stack.oracle_ids)
    if len(ids) != len(set(ids)):
        raise OracleEvolutionError("oracle population ids must be unique")


def _mutated_population_stack(
    stack: OracleStack,
    hypothesis: OracleHypothesis,
    *,
    generation: int,
    ordinal: int = 1,
) -> OracleStack:
    _validate_population_stack(stack)
    retained = list(stack.oracles)
    if hypothesis.replace_oracle_id is not None:
        matches = [oracle for oracle in retained if oracle.oracle_id == hypothesis.replace_oracle_id]
        if not matches:
            raise OracleEvolutionError(
                f"hypothesis {hypothesis.hypothesis_id!r} replaces missing oracle {hypothesis.replace_oracle_id!r}"
            )
        retained = [oracle for oracle in retained if oracle.oracle_id != hypothesis.replace_oracle_id]
    if hypothesis.oracle is not None:
        if any(oracle.oracle_id == hypothesis.oracle.oracle_id for oracle in retained):
            raise OracleEvolutionError(
                f"candidate oracle id {hypothesis.oracle.oracle_id!r} collides with active population"
            )
        retained.append(hypothesis.oracle)
    return OracleStack(
        stack_id=stack.stack_id,
        version=f"{stack.version}+e{generation}.{ordinal}",
        oracles=tuple(retained),
    )


def _case_stack(population: OracleStack, case: OracleChallengeCase) -> OracleStack:
    population_ids = set(population.oracle_ids)
    collisions = population_ids & {oracle.oracle_id for oracle in case.context_oracles}
    if collisions:
        raise OracleEvolutionError(
            f"challenge context oracle ids collide with population ids: {sorted(collisions)}"
        )
    return OracleStack(
        stack_id=f"{population.stack_id}:challenge:{case.case_id}",
        version=population.version,
        oracles=tuple(population.oracles) + tuple(case.context_oracles),
    )


def _run_case_distribution(
    population: OracleStack,
    case: OracleChallengeCase,
    *,
    layer: FabricLayer,
    config: OracleEvolutionConfig,
) -> TruthDistribution:
    stack = _case_stack(population, case)
    if config.evaluation_mode == "baseline":
        view = ChannelView.baseline(
            case.bundle,
            oracle_stack_version=stack.identity,
            oracle_ids=stack.oracle_ids,
        )
        return layer.kernel.run(view, stack)
    suite = layer.run_stabilized_rotation_suite(
        case.bundle,
        stack,
        include_positional=config.include_positional,
        include_oracle_exposure=config.include_oracle_exposure,
        include_crossed=config.include_crossed,
    )
    return suite.stabilized_return.stabilized_distribution


def evaluate_oracle_hypothesis(
    population: OracleStack,
    hypothesis: OracleHypothesis,
    challenge_suite: OracleChallengeSuite,
    *,
    fabric_layer: FabricLayer | None = None,
    config: OracleEvolutionConfig | None = None,
) -> OracleHypothesisEvaluation:
    layer = fabric_layer or FabricLayer()
    resolved = config or OracleEvolutionConfig()
    candidate_population = _mutated_population_stack(
        population,
        hypothesis,
        generation=hypothesis.generation,
    )

    case_results: list[OracleCaseEvaluation] = []
    for case in challenge_suite.cases:
        reference_distribution = _run_case_distribution(population, case, layer=layer, config=resolved)
        candidate_distribution = _run_case_distribution(candidate_population, case, layer=layer, config=resolved)
        reference_metrics = evaluate_against_target(reference_distribution, case.target_distribution)
        candidate_metrics = evaluate_against_target(candidate_distribution, case.target_distribution)
        case_results.append(
            OracleCaseEvaluation(
                case_id=case.case_id,
                role=case.role,
                reference_metrics=reference_metrics,
                candidate_metrics=candidate_metrics,
                reference_distribution=reference_distribution,
                candidate_distribution=candidate_distribution,
                l1_improvement=reference_metrics.l1_to_target - candidate_metrics.l1_to_target,
                distribution_effect_l1=_distribution_l1(reference_distribution, candidate_distribution),
                contradiction_delta=(
                    candidate_metrics.contradiction_marker_count
                    - reference_metrics.contradiction_marker_count
                ),
            )
        )

    selection = tuple(result for result in case_results if result.role == "selection")
    holdout = tuple(result for result in case_results if result.role == "holdout")
    selection_mean = mean(result.l1_improvement for result in selection) if selection else 0.0
    holdout_mean = mean(result.l1_improvement for result in holdout) if holdout else 0.0
    regressions = [max(0.0, -result.l1_improvement) for result in case_results]
    worst_regression = max(regressions, default=0.0)
    contradiction_increase = sum(max(0, result.contradiction_delta) for result in case_results)
    effect_count = sum(
        result.distribution_effect_l1 > resolved.numerical_tolerance
        for result in case_results
    )

    reasons: list[str] = []
    tolerance = resolved.numerical_tolerance
    if len(selection) < resolved.min_selection_cases:
        reasons.append("insufficient_selection_cases")
    if len(holdout) < resolved.min_holdout_cases:
        reasons.append("insufficient_holdout_cases")
    if selection_mean + tolerance < resolved.min_selection_mean_l1_improvement:
        reasons.append("selection_improvement_below_threshold")
    if holdout_mean + tolerance < resolved.min_holdout_mean_l1_improvement:
        reasons.append("holdout_regression_or_insufficient_improvement")
    if worst_regression > resolved.max_case_l1_regression + tolerance:
        reasons.append("worst_case_regression_exceeds_limit")
    if contradiction_increase > resolved.max_total_contradiction_increase:
        reasons.append("contradiction_increase_exceeds_limit")
    if effect_count < resolved.min_effect_cases:
        reasons.append("candidate_has_insufficient_observable_effect")

    return OracleHypothesisEvaluation(
        hypothesis=hypothesis,
        cases=tuple(case_results),
        selection_mean_l1_improvement=selection_mean,
        holdout_mean_l1_improvement=holdout_mean,
        worst_case_l1_regression=worst_regression,
        total_contradiction_increase=contradiction_increase,
        effect_case_count=effect_count,
        promotable=not reasons,
        rejection_reasons=tuple(reasons),
        provenance={
            "challenge": "oracle_hypothesis_challenge_v0",
            "challenge_suite_id": challenge_suite.suite_id,
            "evaluation_mode": resolved.evaluation_mode,
            "external_targets_used_only_after_proposal": True,
            "targets_passed_to_generator": False,
            "build5_target_metrics_reused": True,
            "automatic_promotion_without_challenge": False,
            "canonical_spec_modified": False,
        },
    )


def _select_promotions(
    evaluations: Sequence[OracleHypothesisEvaluation],
    *,
    limit: int,
) -> tuple[OracleHypothesisEvaluation, ...]:
    eligible = [evaluation for evaluation in evaluations if evaluation.promotable]
    eligible.sort(
        key=lambda evaluation: (
            -evaluation.holdout_mean_l1_improvement,
            -evaluation.selection_mean_l1_improvement,
            evaluation.worst_case_l1_regression,
            evaluation.hypothesis.hypothesis_id,
        )
    )
    selected: list[OracleHypothesisEvaluation] = []
    touched_replacements: set[str] = set()
    candidate_ids: set[str] = set()
    for evaluation in eligible:
        hypothesis = evaluation.hypothesis
        replacement = hypothesis.replace_oracle_id
        candidate_id = hypothesis.candidate_oracle_id
        if replacement is not None and replacement in touched_replacements:
            continue
        if candidate_id is not None and candidate_id in candidate_ids:
            continue
        selected.append(evaluation)
        if replacement is not None:
            touched_replacements.add(replacement)
        if candidate_id is not None:
            candidate_ids.add(candidate_id)
        if len(selected) >= limit:
            break
    return tuple(selected)


def evolve_oracle_population(
    initial_population: OracleStack,
    challenge_suite: OracleChallengeSuite,
    generators: Sequence[OracleProposalGenerator],
    *,
    fabric_layer: FabricLayer | None = None,
    config: OracleEvolutionConfig | None = None,
) -> OracleEvolutionResult:
    _validate_population_stack(initial_population)
    resolved = config or OracleEvolutionConfig()
    generators = tuple(generators)
    if not generators:
        raise OracleEvolutionError("oracle evolution requires at least one proposal generator")
    if len({generator.generator_id for generator in generators}) != len(generators):
        raise OracleEvolutionError("oracle proposal generator ids must be unique")

    active = initial_population
    generations: list[OracleEvolutionGeneration] = []
    lineage: list[OracleLineageRecord] = []
    stopped_reason = "max_generations"

    for generation in range(1, resolved.max_generations + 1):
        proposals: list[OracleHypothesis] = []
        for generator in generators:
            generated = generator.propose(active, generation=generation)
            for hypothesis in generated:
                if hypothesis.generation != generation:
                    raise OracleEvolutionError("proposal generation metadata does not match active generation")
                if hypothesis.generator_id != generator.generator_id:
                    raise OracleEvolutionError("proposal generator_id does not match emitting generator")
                proposals.append(hypothesis)
        ids = [hypothesis.hypothesis_id for hypothesis in proposals]
        if len(ids) != len(set(ids)):
            raise OracleEvolutionError("oracle hypothesis ids must be unique within a generation")

        base_identity = active.identity
        if not proposals:
            stopped_reason = "no_proposals"
            generations.append(
                OracleEvolutionGeneration(
                    generation=generation,
                    base_stack_identity=base_identity,
                    proposal_count=0,
                    evaluations=(),
                    promoted_hypothesis_ids=(),
                    resulting_stack_identity=active.identity,
                    stop_reason=stopped_reason,
                )
            )
            break

        evaluations = tuple(
            evaluate_oracle_hypothesis(
                active,
                hypothesis,
                challenge_suite,
                fabric_layer=fabric_layer,
                config=resolved,
            )
            for hypothesis in proposals
        )
        selected = _select_promotions(
            evaluations,
            limit=resolved.max_promotions_per_generation,
        )
        if not selected:
            stopped_reason = "no_promotable_hypotheses"
            generations.append(
                OracleEvolutionGeneration(
                    generation=generation,
                    base_stack_identity=base_identity,
                    proposal_count=len(proposals),
                    evaluations=evaluations,
                    promoted_hypothesis_ids=(),
                    resulting_stack_identity=active.identity,
                    stop_reason=stopped_reason,
                )
            )
            break

        promoted_ids: list[str] = []
        for ordinal, evaluation in enumerate(selected, start=1):
            hypothesis = evaluation.hypothesis
            active = _mutated_population_stack(
                active,
                hypothesis,
                generation=generation,
                ordinal=ordinal,
            )
            promoted_ids.append(hypothesis.hypothesis_id)
            lineage.append(
                OracleLineageRecord(
                    generation=generation,
                    hypothesis_id=hypothesis.hypothesis_id,
                    generator_id=hypothesis.generator_id,
                    mutation=hypothesis.mutation,
                    replaced_oracle_id=hypothesis.replace_oracle_id,
                    new_oracle_id=hypothesis.candidate_oracle_id,
                    resulting_stack_identity=active.identity,
                    challenge_suite_id=challenge_suite.suite_id,
                )
            )

        generations.append(
            OracleEvolutionGeneration(
                generation=generation,
                base_stack_identity=base_identity,
                proposal_count=len(proposals),
                evaluations=evaluations,
                promoted_hypothesis_ids=tuple(promoted_ids),
                resulting_stack_identity=active.identity,
                stop_reason=None,
            )
        )
    else:
        stopped_reason = "max_generations"

    return OracleEvolutionResult(
        initial_stack_identity=initial_population.identity,
        initial_oracle_ids=initial_population.oracle_ids,
        final_stack=active,
        generations=tuple(generations),
        lineage=tuple(lineage),
        stopped_reason=stopped_reason,
        challenge_suite_id=challenge_suite.suite_id,
        provenance={
            "engine": "oracle_population_evolution_v0",
            "proposal_and_challenge_are_separate": True,
            "external_targets_passed_to_generators": False,
            "holdout_supported": True,
            "promotion_is_reversible_by_lineage": True,
            "automatic_canonical_rewrite": False,
            "canonical_spec_modified": False,
        },
    )


def extract_problem_rule_population(compilation: Any) -> OracleStack:
    """Extract only BUILD 10 SemanticRuleOracle objects as an evolvable population."""

    from .problem import SemanticRuleOracle

    if getattr(compilation, "oracle_stack", None) is None:
        raise OracleEvolutionError("problem compilation has no executable oracle stack")
    rules = tuple(
        oracle
        for oracle in compilation.oracle_stack.oracles
        if isinstance(oracle, SemanticRuleOracle)
    )
    mission_id = compilation.canonical_frame.mission_id
    return OracleStack(
        stack_id=f"evolvable-rules:{mission_id}",
        version="1",
        oracles=rules,
    )


def apply_evolved_oracle_population(compilation: Any, evolution: OracleEvolutionResult) -> Any:
    """Return a new ProblemCompilation with the evolved population re-injected.

    Fixed evidence/logic/context oracles remain untouched. Only the oracle ids
    that belonged to the initial evolvable population are replaced by the final
    population, making rollback possible from the evolution trace.
    """

    if getattr(compilation, "oracle_stack", None) is None:
        raise OracleEvolutionError("problem compilation has no executable oracle stack")
    initial_ids = set(evolution.initial_oracle_ids)
    retained = tuple(
        oracle for oracle in compilation.oracle_stack.oracles if oracle.oracle_id not in initial_ids
    )
    collisions = {oracle.oracle_id for oracle in retained} & set(evolution.final_stack.oracle_ids)
    if collisions:
        raise OracleEvolutionError(f"evolved oracle ids collide with fixed problem oracles: {sorted(collisions)}")
    new_stack = OracleStack(
        stack_id=compilation.oracle_stack.stack_id,
        version=f"{compilation.oracle_stack.version}+oracle-evolution",
        oracles=retained + tuple(evolution.final_stack.oracles),
    )
    provenance = {
        **dict(compilation.provenance),
        "oracle_evolution_applied": True,
        "oracle_evolution_initial_stack": evolution.initial_stack_identity,
        "oracle_evolution_final_stack": evolution.final_stack.identity,
        "oracle_evolution_promotion_count": evolution.promotion_count,
        "oracle_evolution_challenge_suite": evolution.challenge_suite_id,
        "canonical_spec_modified": False,
    }
    return replace(compilation, oracle_stack=new_stack, provenance=provenance)


def target_distribution_for_problem_assignments(
    compilation: Any,
    assignments: Mapping[str, str],
) -> Mapping[State, float]:
    """Create an explicit external target over a compiled joint problem space.

    ``assignments`` maps query ids to externally validated candidate values.
    Unassigned groups remain uniformly unconstrained subject to the same one-hot
    categorical structure used by the problem compiler. This helper does not
    infer an answer; callers supply the expected values.
    """

    if getattr(compilation, "bundle", None) is None:
        raise OracleEvolutionError("problem compilation has no executable bundle")
    bundle = compilation.bundle
    for query_id, value in assignments.items():
        if query_id not in compilation.executable_query_ids:
            raise OracleEvolutionError(f"assignment references non-executable query {query_id!r}")
        group_key = compilation.query_groups[query_id]
        if value not in compilation.group_values[group_key]:
            raise OracleEvolutionError(
                f"assignment value {value!r} is not a candidate for query {query_id!r}"
            )

    dummy = OracleStack("target-enumeration", "1", ())
    view = ChannelView.baseline(
        bundle,
        oracle_stack_version=dummy.identity,
        oracle_ids=dummy.oracle_ids,
    )
    eligible: list[State] = []
    for state in view.candidate_states():
        valid = True
        for group_key, dimension_ids in compilation.group_dimensions.items():
            if len(dimension_ids) < 2:
                continue
            indexes = [bundle.dimension_ids.index(dimension_id) for dimension_id in dimension_ids]
            if sum(state[index] for index in indexes) != 1:
                valid = False
                break
        if not valid:
            continue
        for query_id, value in assignments.items():
            group_key = compilation.query_groups[query_id]
            values = compilation.group_values[group_key]
            dims = compilation.group_dimensions[group_key]
            index = bundle.dimension_ids.index(dims[values.index(value)])
            if state[index] != 1:
                valid = False
                break
        if valid:
            eligible.append(state)
    if not eligible:
        raise OracleEvolutionError("external assignments produce no valid target states")
    mass = 1.0 / len(eligible)
    return {state: mass for state in eligible}


def challenge_case_from_problem(
    compilation: Any,
    *,
    population_oracle_ids: Sequence[str],
    expected_assignments: Mapping[str, str],
    case_id: str,
    role: str,
    provenance: Mapping[str, Any] | None = None,
) -> OracleChallengeCase:
    """Build a challenge case from a BUILD 10 problem compilation.

    Problem-specific evidence/logic stays in ``context_oracles`` while the named
    evolvable population is removed and supplied by the evolution engine.
    """

    if getattr(compilation, "bundle", None) is None or getattr(compilation, "oracle_stack", None) is None:
        raise OracleEvolutionError("problem compilation is not executable")
    population_ids = set(population_oracle_ids)
    missing = population_ids - set(compilation.oracle_stack.oracle_ids)
    if missing:
        raise OracleEvolutionError(f"problem compilation is missing population oracle ids: {sorted(missing)}")
    context = tuple(
        oracle
        for oracle in compilation.oracle_stack.oracles
        if oracle.oracle_id not in population_ids
    )
    return OracleChallengeCase(
        case_id=case_id,
        bundle=compilation.bundle,
        target_distribution=target_distribution_for_problem_assignments(
            compilation,
            expected_assignments,
        ),
        role=role,
        context_oracles=context,
        provenance={
            **dict(provenance or {}),
            "source_problem_mission_id": compilation.canonical_frame.mission_id,
            "external_assignments": dict(expected_assignments),
            "target_is_external_reference": True,
        },
    )
