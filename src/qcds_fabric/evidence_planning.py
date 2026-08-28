from __future__ import annotations

from dataclasses import dataclass, field, replace
from itertools import combinations
from typing import Any, Mapping, Protocol, Sequence

from .fabric import FabricLayer
from .models import ChannelView, TruthDistribution
from .oracle_evolution import OracleChallengeSuite, OracleEvolutionConfig, OracleHypothesis, extract_problem_rule_population
from .oracle_genesis import (
    OracleFailureObservation,
    OracleGap,
    OracleGapDiscoveryConfig,
    OracleGenesisGenerator,
    OracleGenesisResult,
    PairwiseSemanticRuleGenesisGenerator,
    discover_oracle_gaps,
    run_oracle_genesis_cycle,
)
from .oracles import OracleStack
from .problem import ProblemCompilation, SemanticProblemFrame, compile_problem_frame
from .semantic import SemanticClaim


class EvidencePlanningError(ValueError):
    """Raised when evidence planning/resume would violate a BUILD 13 boundary."""


@dataclass(frozen=True)
class EvidencePlanningConfig:
    evaluation_mode: str = "baseline"
    min_discrimination_l1: float = 1e-6
    max_hypotheses_per_gap: int = 32
    max_actions_per_plan: int = 3
    max_plans: int = 8
    require_independent_source: bool = True
    physical_execution_authorized: bool = False

    def __post_init__(self) -> None:
        if self.evaluation_mode not in {"baseline", "stabilized"}:
            raise ValueError("evidence planning evaluation_mode must be baseline or stabilized")
        if self.min_discrimination_l1 < 0:
            raise ValueError("min_discrimination_l1 cannot be negative")
        if self.max_hypotheses_per_gap <= 0 or self.max_actions_per_plan <= 0 or self.max_plans <= 0:
            raise ValueError("evidence planning bounds must be positive")


@dataclass(frozen=True)
class EvidenceNeed:
    need_id: str
    gap_id: str
    query_ids: tuple[str, ...]
    dimension_ids: tuple[str, ...]
    hypothesis_ids: tuple[str, ...]
    discrimination_score: float
    signal_kinds: tuple[str, ...]
    status: str = "open"
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.need_id.strip() or not self.gap_id.strip():
            raise ValueError("evidence need requires need_id and gap_id")
        if self.status not in {"open", "planned", "satisfied", "superseded"}:
            raise ValueError("invalid evidence need status")
        if self.discrimination_score < 0:
            raise ValueError("evidence discrimination score cannot be negative")


@dataclass(frozen=True)
class EvidenceAction:
    action_id: str
    action_kind: str
    query_ids: tuple[str, ...]
    dimension_ids: tuple[str, ...]
    objective: str
    expected_discrimination_score: float
    independent_source_required: bool = True
    execution_authorization_required: bool = True
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        allowed = {
            "independent_observation",
            "replicate_measurement",
            "validation_experiment",
            "dimension_probe",
            "targeted_query",
        }
        if not self.action_id.strip():
            raise ValueError("evidence action requires action_id")
        if self.action_kind not in allowed:
            raise ValueError("unsupported evidence action kind")
        if not self.query_ids and not self.dimension_ids:
            raise ValueError("evidence action must identify a query or dimension")
        if self.expected_discrimination_score < 0:
            raise ValueError("expected discrimination score cannot be negative")


@dataclass(frozen=True)
class EvidencePlan:
    plan_id: str
    need: EvidenceNeed
    actions: tuple[EvidenceAction, ...]
    hypothesis_ids: tuple[str, ...]
    expected_discrimination_score: float
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.plan_id.strip():
            raise ValueError("evidence plan requires plan_id")
        if not self.actions:
            raise ValueError("evidence plan requires at least one action")
        if self.expected_discrimination_score < 0:
            raise ValueError("expected discrimination score cannot be negative")


class EvidenceAcquisitionPlanner(Protocol):
    planner_id: str

    def plan(
        self,
        compilation: ProblemCompilation,
        gap: OracleGap,
        initial_population: OracleStack,
        hypotheses: Sequence[OracleHypothesis],
        *,
        fabric_layer: FabricLayer,
        config: EvidencePlanningConfig,
    ) -> EvidencePlan | None: ...


def _population_after_hypothesis(population: OracleStack, hypothesis: OracleHypothesis) -> OracleStack:
    retained = list(population.oracles)
    if hypothesis.replace_oracle_id is not None:
        if hypothesis.replace_oracle_id not in population.oracle_ids:
            raise EvidencePlanningError(
                f"hypothesis {hypothesis.hypothesis_id!r} replaces missing oracle {hypothesis.replace_oracle_id!r}"
            )
        retained = [oracle for oracle in retained if oracle.oracle_id != hypothesis.replace_oracle_id]
    if hypothesis.oracle is not None:
        if any(oracle.oracle_id == hypothesis.oracle.oracle_id for oracle in retained):
            raise EvidencePlanningError(
                f"candidate oracle id {hypothesis.oracle.oracle_id!r} collides with active population"
            )
        retained.append(hypothesis.oracle)
    return OracleStack(population.stack_id, f"{population.version}+plan", tuple(retained))


def _full_problem_stack(
    compilation: ProblemCompilation,
    initial_population: OracleStack,
    candidate_population: OracleStack,
) -> OracleStack:
    if compilation.oracle_stack is None:
        raise EvidencePlanningError("evidence planning requires executable problem oracle stack")
    evolving_ids = set(initial_population.oracle_ids)
    fixed = tuple(oracle for oracle in compilation.oracle_stack.oracles if oracle.oracle_id not in evolving_ids)
    fixed_ids = {oracle.oracle_id for oracle in fixed}
    collisions = fixed_ids & set(candidate_population.oracle_ids)
    if collisions:
        raise EvidencePlanningError(f"candidate population collides with fixed problem oracles: {sorted(collisions)}")
    return OracleStack(
        stack_id=f"evidence-plan:{compilation.canonical_frame.mission_id}",
        version=candidate_population.version,
        oracles=fixed + tuple(candidate_population.oracles),
    )


def _run_distribution(
    compilation: ProblemCompilation,
    stack: OracleStack,
    *,
    fabric_layer: FabricLayer,
    config: EvidencePlanningConfig,
) -> TruthDistribution:
    if compilation.bundle is None:
        raise EvidencePlanningError("evidence planning requires executable problem bundle")
    if config.evaluation_mode == "baseline":
        view = ChannelView.baseline(
            compilation.bundle,
            oracle_stack_version=stack.identity,
            oracle_ids=stack.oracle_ids,
        )
        return fabric_layer.kernel.run(fabric_layer._view_for_substrate(view), stack)
    suite = fabric_layer.run_stabilized_rotation_suite(
        compilation.bundle,
        stack,
        include_positional=False,
        include_oracle_exposure=False,
        include_crossed=False,
    )
    return suite.stabilized_return.stabilized_distribution


def _query_vector(compilation: ProblemCompilation, distribution: TruthDistribution, query_id: str) -> tuple[float, ...]:
    if compilation.bundle is None:
        return ()
    group = compilation.query_groups.get(query_id)
    if group is None or query_id in compilation.blocked_queries:
        return ()
    dims = compilation.group_dimensions[group]
    indexes = tuple(compilation.bundle.dimension_ids.index(dimension_id) for dimension_id in dims)
    raw = tuple(
        sum(
            probability
            for state, probability in zip(distribution.support, distribution.probabilities)
            if state[index] == 1
        )
        for index in indexes
    )
    total = sum(raw)
    return tuple(value / total for value in raw) if total > 0 else tuple(0.0 for _ in raw)


def _mean_pairwise_l1(vectors: Sequence[tuple[float, ...]]) -> float:
    pairs = list(combinations(tuple(vectors), 2))
    if not pairs:
        return 0.0
    values = [sum(abs(a - b) for a, b in zip(left, right)) for left, right in pairs]
    return sum(values) / len(values)


def _action_kind(gap: OracleGap) -> str:
    kinds = set(gap.signal_kinds)
    if "expansion_failure" in kinds:
        return "validation_experiment"
    if "prediction_failure" in kinds:
        return "independent_observation"
    if "contradiction_resolution" in kinds:
        return "replicate_measurement"
    if "null_influence" in kinds:
        return "dimension_probe"
    return "targeted_query"


@dataclass(frozen=True)
class DisagreementEvidencePlanner:
    """Target-blind planner that asks for evidence where hypotheses disagree most.

    It compares the predictions produced by the current population and candidate
    oracle populations under the *current* evidence. It never receives challenge
    target distributions and never executes the planned action itself.
    """

    planner_id: str = "hypothesis_disagreement_evidence_planner_v0"

    def plan(
        self,
        compilation: ProblemCompilation,
        gap: OracleGap,
        initial_population: OracleStack,
        hypotheses: Sequence[OracleHypothesis],
        *,
        fabric_layer: FabricLayer,
        config: EvidencePlanningConfig,
    ) -> EvidencePlan | None:
        if compilation.bundle is None or compilation.oracle_stack is None:
            raise EvidencePlanningError("evidence planning requires executable problem compilation")
        candidates = tuple(hypotheses)[: config.max_hypotheses_per_gap]
        if not candidates:
            return None

        profiles: list[tuple[str, TruthDistribution]] = []
        current_stack = _full_problem_stack(compilation, initial_population, initial_population)
        profiles.append(("current_population", _run_distribution(
            compilation, current_stack, fabric_layer=fabric_layer, config=config
        )))
        for hypothesis in candidates:
            population = _population_after_hypothesis(initial_population, hypothesis)
            stack = _full_problem_stack(compilation, initial_population, population)
            profiles.append((hypothesis.hypothesis_id, _run_distribution(
                compilation, stack, fabric_layer=fabric_layer, config=config
            )))

        query_ids = gap.query_ids
        if not query_ids:
            affected = set(gap.affected_dimension_ids)
            query_ids = tuple(
                query_id
                for query_id in compilation.executable_query_ids
                if affected & set(compilation.group_dimensions[compilation.query_groups[query_id]])
            )
        if not query_ids:
            return None

        ranked: list[tuple[float, str]] = []
        for query_id in query_ids:
            vectors = tuple(_query_vector(compilation, distribution, query_id) for _, distribution in profiles)
            vectors = tuple(vector for vector in vectors if vector)
            score = _mean_pairwise_l1(vectors)
            ranked.append((score, query_id))
        ranked.sort(key=lambda item: (-item[0], item[1]))
        if not ranked or ranked[0][0] + 1e-15 < config.min_discrimination_l1:
            return None

        actions: list[EvidenceAction] = []
        for ordinal, (score, query_id) in enumerate(ranked[: config.max_actions_per_plan], start=1):
            if score + 1e-15 < config.min_discrimination_l1:
                continue
            group = compilation.query_groups[query_id]
            dimensions = compilation.group_dimensions[group]
            actions.append(
                EvidenceAction(
                    action_id=f"action:{gap.gap_id}:{ordinal}:{query_id}",
                    action_kind=_action_kind(gap),
                    query_ids=(query_id,),
                    dimension_ids=dimensions,
                    objective=(
                        f"Acquire independent evidence for query {query_id!r} because active oracle "
                        "hypotheses predict materially different distributions there."
                    ),
                    expected_discrimination_score=score,
                    independent_source_required=config.require_independent_source,
                    execution_authorization_required=not config.physical_execution_authorized,
                    provenance={
                        "planner": self.planner_id,
                        "gap_id": gap.gap_id,
                        "target_visible_to_planner": False,
                        "holdout_visible_to_planner": False,
                        "expected_answer_in_plan": False,
                        "action_is_plan_not_execution": True,
                    },
                )
            )
        if not actions:
            return None

        hypothesis_ids = tuple(hypothesis.hypothesis_id for hypothesis in candidates)
        need = EvidenceNeed(
            need_id=f"need:{gap.gap_id}",
            gap_id=gap.gap_id,
            query_ids=tuple(query_id for _, query_id in ranked if query_id in {a.query_ids[0] for a in actions}),
            dimension_ids=tuple(dict.fromkeys(d for action in actions for d in action.dimension_ids)),
            hypothesis_ids=hypothesis_ids,
            discrimination_score=max(action.expected_discrimination_score for action in actions),
            signal_kinds=gap.signal_kinds,
            status="planned",
            provenance={
                "planner": self.planner_id,
                "target_visible_to_planner": False,
                "holdout_visible_to_planner": False,
                "current_population_used_as_reference_profile": True,
            },
        )
        return EvidencePlan(
            plan_id=f"plan:{gap.gap_id}",
            need=need,
            actions=tuple(actions),
            hypothesis_ids=hypothesis_ids,
            expected_discrimination_score=need.discrimination_score,
            provenance={
                "planner": self.planner_id,
                "profile_count": len(profiles),
                "challenge_targets_used": False,
                "holdout_used": False,
                "physical_action_executed": False,
                "canonical_spec_modified": False,
            },
        )


@dataclass(frozen=True)
class ContinuationPolicy:
    """Reference policy for bounded loops that must not confuse stall with terminality."""

    terminal_requires_explicit_request: bool = True
    auto_retry_without_new_signal: bool = False
    resume_triggers: tuple[str, ...] = (
        "new_evidence",
        "new_failure_observation",
        "new_expansion_result",
        "oracle_population_change",
        "manual_resume",
    )

    def __post_init__(self) -> None:
        if not self.resume_triggers:
            raise ValueError("continuation policy requires at least one resume trigger")


@dataclass(frozen=True)
class IntelligenceCheckpoint:
    checkpoint_id: str
    cycle_index: int
    status: str
    reason: str
    resumable: bool
    terminal: bool
    resume_triggers: tuple[str, ...]
    plan_ids: tuple[str, ...]
    oracle_stack_identity: str
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.cycle_index < 0:
            raise ValueError("checkpoint cycle_index cannot be negative")
        if self.status not in {"active", "awaiting_evidence", "quiescent", "terminal"}:
            raise ValueError("invalid intelligence checkpoint status")
        if self.terminal and self.resumable:
            raise ValueError("terminal checkpoint cannot be resumable")
        if not self.terminal and not self.resumable:
            raise ValueError("non-terminal checkpoint must remain resumable")


@dataclass(frozen=True)
class EvidenceAcquisitionResult:
    result_id: str
    query_id: str
    observed_value: str
    source_id: str
    confidence: float = 0.75
    polarity: bool = True
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.result_id.strip() or not self.query_id.strip() or not self.source_id.strip():
            raise ValueError("evidence result requires result_id, query_id and source_id")
        if not self.observed_value.strip():
            raise ValueError("evidence result requires observed_value")
        if not 0.5 <= self.confidence <= 1.0:
            raise ValueError("evidence result confidence must be in [0.5, 1.0]")


@dataclass(frozen=True)
class EvidencePlanningCycleResult:
    genesis: OracleGenesisResult
    plans: tuple[EvidencePlan, ...]
    checkpoint: IntelligenceCheckpoint
    cycle_index: int
    provenance: Mapping[str, Any]



def _gap_hypotheses(
    compilation: ProblemCompilation,
    gap: OracleGap,
    initial_population: OracleStack,
    generators: Sequence[OracleGenesisGenerator],
) -> tuple[OracleHypothesis, ...]:
    hypotheses: list[OracleHypothesis] = []
    for generator in generators:
        hypotheses.extend(generator.propose_gap(gap, compilation, initial_population, generation=1))
    unique: dict[str, OracleHypothesis] = {}
    for hypothesis in hypotheses:
        unique.setdefault(hypothesis.hypothesis_id, hypothesis)
    return tuple(unique.values())


def _checkpoint(
    genesis: OracleGenesisResult,
    plans: Sequence[EvidencePlan],
    *,
    cycle_index: int,
    policy: ContinuationPolicy,
    explicit_terminal: bool,
) -> IntelligenceCheckpoint:
    if explicit_terminal:
        status = "terminal"
        reason = "explicit_terminal_request"
        terminal = True
        resumable = False
        triggers: tuple[str, ...] = ()
    elif genesis.promotion_count > 0:
        status = "active"
        reason = "oracle_population_changed"
        terminal = False
        resumable = True
        triggers = policy.resume_triggers
    elif plans:
        status = "awaiting_evidence"
        reason = "discriminating_evidence_planned"
        terminal = False
        resumable = True
        triggers = policy.resume_triggers
    else:
        status = "quiescent"
        reason = genesis.stopped_reason
        terminal = False
        resumable = True
        triggers = policy.resume_triggers

    stack = genesis.evolved_compilation.oracle_stack
    identity = "unavailable" if stack is None else stack.identity
    return IntelligenceCheckpoint(
        checkpoint_id=f"checkpoint:{genesis.evolved_compilation.canonical_frame.mission_id}:{cycle_index}",
        cycle_index=cycle_index,
        status=status,
        reason=reason,
        resumable=resumable,
        terminal=terminal,
        resume_triggers=triggers,
        plan_ids=tuple(plan.plan_id for plan in plans),
        oracle_stack_identity=identity,
        provenance={
            "engine": "resumable_intelligence_checkpoint_v0",
            "stall_is_terminal": False,
            "terminal_requires_explicit_request": policy.terminal_requires_explicit_request,
            "auto_retry_without_new_signal": policy.auto_retry_without_new_signal,
            "canonical_spec_modified": False,
        },
    )


def run_evidence_planning_cycle(
    compilation: ProblemCompilation,
    challenge_suite: OracleChallengeSuite,
    *,
    observations: Sequence[OracleFailureObservation] = (),
    genesis_generators: Sequence[OracleGenesisGenerator] = (PairwiseSemanticRuleGenesisGenerator(),),
    planner: EvidenceAcquisitionPlanner = DisagreementEvidencePlanner(),
    fabric_layer: FabricLayer | None = None,
    discovery_config: OracleGapDiscoveryConfig | None = None,
    evolution_config: OracleEvolutionConfig | None = None,
    planning_config: EvidencePlanningConfig | None = None,
    continuation_policy: ContinuationPolicy | None = None,
    cycle_index: int = 0,
    explicit_terminal: bool = False,
) -> EvidencePlanningCycleResult:
    """Run BUILD 12 then plan discriminating evidence without executing it.

    A stall is checkpointed as ``awaiting_evidence`` or ``quiescent`` and remains
    resumable. ``terminal`` can only be requested explicitly by the caller.
    """

    if cycle_index < 0:
        raise EvidencePlanningError("cycle_index cannot be negative")
    layer = fabric_layer or FabricLayer()
    resolved_planning = planning_config or EvidencePlanningConfig()
    policy = continuation_policy or ContinuationPolicy()
    generators = tuple(genesis_generators)
    if not generators:
        raise EvidencePlanningError("evidence planning requires at least one genesis generator")
    if explicit_terminal and policy.terminal_requires_explicit_request is False:
        # Explicit termination is still allowed; this branch only records that
        # the caller chose it rather than a stall doing so automatically.
        pass

    genesis = run_oracle_genesis_cycle(
        compilation,
        challenge_suite,
        observations=observations,
        genesis_generators=generators,
        fabric_layer=layer,
        discovery_config=discovery_config,
        evolution_config=evolution_config,
    )

    plans: list[EvidencePlan] = []
    # If an oracle was promoted, ordinary re-inference has changed the state.
    # Give the next cycle a chance to discover a fresh gap before acquiring
    # external evidence. If nothing was promoted, ask what evidence would best
    # discriminate the still-open candidates.
    if genesis.promotion_count == 0 and genesis.discovery.gaps:
        initial_population = extract_problem_rule_population(compilation)
        for gap in genesis.discovery.gaps:
            hypotheses = _gap_hypotheses(compilation, gap, initial_population, generators)
            plan = planner.plan(
                compilation,
                gap,
                initial_population,
                hypotheses,
                fabric_layer=layer,
                config=resolved_planning,
            )
            if plan is not None:
                plans.append(plan)
            if len(plans) >= resolved_planning.max_plans:
                break

    checkpoint = _checkpoint(
        genesis,
        plans,
        cycle_index=cycle_index,
        policy=policy,
        explicit_terminal=explicit_terminal,
    )
    return EvidencePlanningCycleResult(
        genesis=genesis,
        plans=tuple(plans),
        checkpoint=checkpoint,
        cycle_index=cycle_index,
        provenance={
            "engine": "autonomous_evidence_planning_cycle_v0",
            "oracle_genesis_build": 12,
            "evidence_planning_build": 13,
            "challenge_targets_visible_to_planner": False,
            "holdout_visible_to_planner": False,
            "physical_actions_executed": False,
            "stalled_cycles_are_resumable": not explicit_terminal,
            "canonical_spec_modified": False,
        },
    )


def apply_evidence_results(
    compilation: ProblemCompilation,
    results: Sequence[EvidenceAcquisitionResult],
) -> ProblemCompilation:
    """Append externally acquired evidence and compile a fresh problem instance.

    BUILD 13 only accepts evidence for already represented candidate values.
    A genuinely new value requires semantic/expansion handling instead of being
    silently smuggled into the current logical space.
    """

    if not compilation.executable or compilation.bundle is None:
        raise EvidencePlanningError("evidence ingestion requires executable problem compilation")
    resolved = tuple(results)
    ids = [result.result_id for result in resolved]
    if len(ids) != len(set(ids)):
        raise EvidencePlanningError("evidence result ids must be unique")

    frame = compilation.canonical_frame
    query_by_id = {query.query_id: query for query in frame.queries}
    new_claims: list[SemanticClaim] = []
    for result in resolved:
        if result.query_id not in compilation.executable_query_ids:
            raise EvidencePlanningError(f"evidence result references non-executable query {result.query_id!r}")
        query = query_by_id[result.query_id]
        canonical_value = frame.ontology.value(result.observed_value)
        group = compilation.query_groups[result.query_id]
        if canonical_value not in compilation.group_values[group]:
            raise EvidencePlanningError(
                f"observed value {result.observed_value!r} is outside represented candidates for query {result.query_id!r}"
            )
        new_claims.append(
            SemanticClaim(
                subject=query.subject,
                predicate=query.predicate,
                value=canonical_value,
                source_id=result.source_id,
                confidence=result.confidence,
                polarity=result.polarity,
                original_text=f"BUILD13 evidence result {result.result_id}",
            )
        )

    updated_frame = replace(
        frame,
        claims=tuple(frame.claims) + tuple(new_claims),
        provenance={
            **dict(frame.provenance),
            "build13_evidence_results": tuple(result.result_id for result in resolved),
            "build13_evidence_sources": tuple(result.source_id for result in resolved),
        },
    )
    return compile_problem_frame(updated_frame, max_width=max(1, compilation.bundle.width))


def resume_evidence_planning_cycle(
    previous: EvidencePlanningCycleResult,
    challenge_suite: OracleChallengeSuite,
    *,
    evidence_results: Sequence[EvidenceAcquisitionResult] = (),
    observations: Sequence[OracleFailureObservation] = (),
    force_replan: bool = False,
    genesis_generators: Sequence[OracleGenesisGenerator] = (PairwiseSemanticRuleGenesisGenerator(),),
    planner: EvidenceAcquisitionPlanner = DisagreementEvidencePlanner(),
    fabric_layer: FabricLayer | None = None,
    discovery_config: OracleGapDiscoveryConfig | None = None,
    evolution_config: OracleEvolutionConfig | None = None,
    planning_config: EvidencePlanningConfig | None = None,
    continuation_policy: ContinuationPolicy | None = None,
    explicit_terminal: bool = False,
) -> EvidencePlanningCycleResult:
    """Resume a non-terminal checkpoint when new information or an explicit trigger arrives."""

    if previous.checkpoint.terminal or not previous.checkpoint.resumable:
        raise EvidencePlanningError("terminal intelligence checkpoint cannot be resumed")
    if not evidence_results and not observations and not force_replan:
        raise EvidencePlanningError(
            "resume requires new evidence, a new failure observation, or force_replan=True; "
            "bounded intelligence must not busy-loop on an unchanged state"
        )

    compilation = previous.genesis.evolved_compilation
    if evidence_results:
        compilation = apply_evidence_results(compilation, evidence_results)
    return run_evidence_planning_cycle(
        compilation,
        challenge_suite,
        observations=observations,
        genesis_generators=genesis_generators,
        planner=planner,
        fabric_layer=fabric_layer,
        discovery_config=discovery_config,
        evolution_config=evolution_config,
        planning_config=planning_config,
        continuation_policy=continuation_policy,
        cycle_index=previous.cycle_index + 1,
        explicit_terminal=explicit_terminal,
    )
