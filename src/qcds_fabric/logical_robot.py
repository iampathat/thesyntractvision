from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol, Sequence

from .evidence_planning import (
    EvidenceAcquisitionResult,
    EvidenceAction,
    EvidencePlan,
    EvidencePlanningCycleResult,
    apply_evidence_results,
    resume_evidence_planning_cycle,
)
from .fabric import FabricLayer
from .oracle_evolution import OracleChallengeSuite, OracleEvolutionConfig
from .oracle_genesis import (
    OracleGapDiscoveryConfig,
    OracleGenesisGenerator,
    PairwiseSemanticRuleGenesisGenerator,
)
from .problem import ProblemCompilation


class LogicalRobotError(ValueError):
    """Raised when BUILD 14 logical-robot execution violates an explicit boundary."""


LOGICAL_CAPABILITIES = ("search", "read", "follow", "query", "compare", "compute")


@dataclass(frozen=True)
class LogicalRobotPolicy:
    allowed_capabilities: tuple[str, ...] = LOGICAL_CAPABILITIES
    max_steps: int = 12
    max_attempts_per_action: int = 4
    max_observations: int = 16
    require_source_provenance: bool = True
    require_independent_source_when_requested: bool = True
    allow_external_side_effects: bool = False
    terminal_on_exhaustion: bool = False

    def __post_init__(self) -> None:
        if not self.allowed_capabilities:
            raise ValueError("logical robot requires at least one allowed capability")
        unknown = set(self.allowed_capabilities) - set(LOGICAL_CAPABILITIES)
        if unknown:
            raise ValueError(f"unsupported logical robot capabilities: {sorted(unknown)}")
        if self.max_steps <= 0 or self.max_attempts_per_action <= 0 or self.max_observations <= 0:
            raise ValueError("logical robot bounds must be positive")
        if self.allow_external_side_effects:
            raise LogicalRobotError("BUILD 14 logical robot does not authorize external side effects")
        if self.terminal_on_exhaustion:
            raise LogicalRobotError("capability exhaustion must remain resumable in BUILD 14")


@dataclass(frozen=True)
class LogicalRobotRequest:
    request_id: str
    plan_id: str
    evidence_action_id: str
    capability: str
    objective: str
    query_ids: tuple[str, ...]
    dimension_ids: tuple[str, ...]
    candidate_values: Mapping[str, tuple[str, ...]]
    independent_source_required: bool
    attempt: int
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.request_id.strip() or not self.plan_id.strip() or not self.evidence_action_id.strip():
            raise ValueError("logical robot request requires ids")
        if self.capability not in LOGICAL_CAPABILITIES:
            raise ValueError("unsupported logical robot request capability")
        if self.attempt <= 0:
            raise ValueError("logical robot request attempt must be positive")
        if not self.query_ids and not self.dimension_ids:
            raise ValueError("logical robot request must identify query or dimension")
        if self.provenance.get("challenge_target_visible") is True or self.provenance.get("holdout_visible") is True:
            raise LogicalRobotError("logical robot may not receive challenge targets or holdout answers")


@dataclass(frozen=True)
class LogicalObservation:
    observation_id: str
    query_id: str
    observed_value: str
    source_id: str
    capability: str
    confidence: float = 0.75
    polarity: bool = True
    uri: str | None = None
    excerpt: str = ""
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.observation_id.strip() or not self.query_id.strip() or not self.observed_value.strip():
            raise ValueError("logical observation requires observation_id, query_id and observed_value")
        if not self.source_id.strip():
            raise ValueError("logical observation requires source_id")
        if self.capability not in LOGICAL_CAPABILITIES:
            raise ValueError("logical observation capability is unsupported")
        if not 0.5 <= self.confidence <= 1.0:
            raise ValueError("logical observation confidence must be in [0.5, 1.0]")


@dataclass(frozen=True)
class LogicalRobotToolResult:
    observations: tuple[LogicalObservation, ...] = ()
    discovered_references: tuple[str, ...] = ()
    retry_capabilities: tuple[str, ...] = ()
    exhausted: bool = False
    notes: tuple[str, ...] = ()
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        unknown = set(self.retry_capabilities) - set(LOGICAL_CAPABILITIES)
        if unknown:
            raise ValueError(f"unsupported retry capabilities: {sorted(unknown)}")


class LogicalRobotTool(Protocol):
    tool_id: str
    capabilities: tuple[str, ...]

    def observe(self, request: LogicalRobotRequest) -> LogicalRobotToolResult: ...


@dataclass(frozen=True)
class LogicalRobotAttempt:
    request: LogicalRobotRequest
    tool_id: str
    observation_ids: tuple[str, ...]
    discovered_references: tuple[str, ...]
    exhausted: bool
    notes: tuple[str, ...]
    provenance: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class LogicalRobotRunResult:
    plan_ids: tuple[str, ...]
    attempts: tuple[LogicalRobotAttempt, ...]
    observations: tuple[LogicalObservation, ...]
    evidence_results: tuple[EvidenceAcquisitionResult, ...]
    unresolved_action_ids: tuple[str, ...]
    status: str
    resumable: bool
    wake_triggers: tuple[str, ...]
    provenance: Mapping[str, Any]

    def __post_init__(self) -> None:
        if self.status not in {"evidence_acquired", "partially_observed", "awaiting_sources", "quiescent"}:
            raise ValueError("invalid logical robot run status")
        if not self.resumable:
            raise LogicalRobotError("BUILD 14 logical robot run must remain resumable")


@dataclass(frozen=True)
class LogicalRobotCycleResult:
    robot: LogicalRobotRunResult
    updated_compilation: ProblemCompilation
    resumed_cycle: EvidencePlanningCycleResult | None
    provenance: Mapping[str, Any]


def _candidate_values(compilation: ProblemCompilation, query_ids: Sequence[str]) -> dict[str, tuple[str, ...]]:
    values: dict[str, tuple[str, ...]] = {}
    for query_id in query_ids:
        group = compilation.query_groups.get(query_id)
        if group is None or query_id in compilation.blocked_queries:
            continue
        values[query_id] = compilation.group_values[group]
    return values


def capability_sequence(action: EvidenceAction) -> tuple[str, ...]:
    """Translate BUILD 13 evidence intent into bounded logical-body strategies."""
    if action.action_kind == "targeted_query":
        return ("query", "search", "read", "compare")
    if action.action_kind == "independent_observation":
        return ("search", "read", "follow", "compare")
    if action.action_kind == "replicate_measurement":
        return ("query", "search", "compare", "compute")
    if action.action_kind == "validation_experiment":
        return ("query", "compute", "search", "read")
    if action.action_kind == "dimension_probe":
        return ("query", "search", "read", "compare")
    raise LogicalRobotError(f"unsupported BUILD 13 evidence action {action.action_kind!r}")


def _tool_for_capability(tools: Sequence[LogicalRobotTool], capability: str) -> LogicalRobotTool | None:
    return next((tool for tool in tools if capability in tool.capabilities), None)


def _validate_tools(tools: Sequence[LogicalRobotTool]) -> tuple[LogicalRobotTool, ...]:
    resolved = tuple(tools)
    ids = [tool.tool_id for tool in resolved]
    if len(ids) != len(set(ids)):
        raise LogicalRobotError("logical robot tool ids must be unique")
    for tool in resolved:
        if not tool.tool_id.strip() or not tool.capabilities:
            raise LogicalRobotError("logical robot tools require id and capabilities")
        unknown = set(tool.capabilities) - set(LOGICAL_CAPABILITIES)
        if unknown:
            raise LogicalRobotError(f"tool {tool.tool_id!r} exposes unsupported capabilities: {sorted(unknown)}")
    return resolved


def observation_to_evidence(observation: LogicalObservation, compilation: ProblemCompilation) -> EvidenceAcquisitionResult:
    if observation.query_id not in compilation.executable_query_ids:
        raise LogicalRobotError(f"logical observation references non-executable query {observation.query_id!r}")
    group = compilation.query_groups[observation.query_id]
    canonical = compilation.canonical_frame.ontology.value(observation.observed_value)
    if canonical not in compilation.group_values[group]:
        raise LogicalRobotError(
            f"logical observation value {observation.observed_value!r} is outside represented candidates "
            f"for query {observation.query_id!r}; use semantic/expansion handling instead"
        )
    return EvidenceAcquisitionResult(
        result_id=f"logical-robot:{observation.observation_id}",
        query_id=observation.query_id,
        observed_value=canonical,
        source_id=observation.source_id,
        confidence=observation.confidence,
        polarity=observation.polarity,
        provenance={
            **dict(observation.provenance),
            "logical_robot_observation_id": observation.observation_id,
            "logical_robot_capability": observation.capability,
            "source_uri": observation.uri,
            "excerpt_present": bool(observation.excerpt),
            "external_truth_claim": False,
            "canonical_spec_modified": False,
        },
    )


def execute_logical_robot_plans(
    compilation: ProblemCompilation,
    plans: Sequence[EvidencePlan],
    tools: Sequence[LogicalRobotTool],
    *,
    policy: LogicalRobotPolicy | None = None,
) -> LogicalRobotRunResult:
    """Execute bounded logical observation plans through explicit provider adapters."""
    if not compilation.executable:
        raise LogicalRobotError("logical robot requires executable ProblemCompilation")
    resolved_policy = policy or LogicalRobotPolicy()
    resolved_tools = _validate_tools(tools)
    plan_list = tuple(plans)
    if not plan_list:
        return LogicalRobotRunResult(
            plan_ids=(), attempts=(), observations=(), evidence_results=(), unresolved_action_ids=(),
            status="quiescent", resumable=True,
            wake_triggers=("new_evidence_plan", "new_source_available", "manual_resume"),
            provenance={
                "engine": "logical_robot_runtime_v0", "build": 14,
                "external_side_effects_authorized": False, "challenge_targets_visible": False,
                "canonical_spec_modified": False,
            },
        )

    attempts: list[LogicalRobotAttempt] = []
    observations: list[LogicalObservation] = []
    unresolved: list[str] = []
    source_ids: set[str] = set()
    step_count = 0

    for plan in plan_list:
        for action in plan.actions:
            action_observed = False
            queued = [c for c in capability_sequence(action) if c in resolved_policy.allowed_capabilities]
            attempt_number = 0
            while queued and attempt_number < resolved_policy.max_attempts_per_action:
                if step_count >= resolved_policy.max_steps or len(observations) >= resolved_policy.max_observations:
                    break
                capability = queued.pop(0)
                tool = _tool_for_capability(resolved_tools, capability)
                if tool is None:
                    continue
                attempt_number += 1
                step_count += 1
                request = LogicalRobotRequest(
                    request_id=f"request:{plan.plan_id}:{action.action_id}:{attempt_number}:{capability}",
                    plan_id=plan.plan_id,
                    evidence_action_id=action.action_id,
                    capability=capability,
                    objective=action.objective,
                    query_ids=action.query_ids,
                    dimension_ids=action.dimension_ids,
                    candidate_values=_candidate_values(compilation, action.query_ids),
                    independent_source_required=(action.independent_source_required and resolved_policy.require_independent_source_when_requested),
                    attempt=attempt_number,
                    provenance={
                        "logical_robot": "logical_robot_runtime_v0",
                        "challenge_target_visible": False,
                        "holdout_visible": False,
                        "expected_answer_visible": False,
                        "external_side_effects_authorized": False,
                        "canonical_spec_modified": False,
                    },
                )
                result = tool.observe(request)
                accepted: list[LogicalObservation] = []
                for observation in result.observations:
                    if request.independent_source_required and observation.source_id in source_ids:
                        continue
                    observation_to_evidence(observation, compilation)
                    source_ids.add(observation.source_id)
                    accepted.append(observation)
                    observations.append(observation)
                    if len(observations) >= resolved_policy.max_observations:
                        break
                attempts.append(LogicalRobotAttempt(
                    request=request,
                    tool_id=tool.tool_id,
                    observation_ids=tuple(item.observation_id for item in accepted),
                    discovered_references=result.discovered_references,
                    exhausted=result.exhausted,
                    notes=result.notes,
                    provenance={**dict(result.provenance), "accepted_observation_count": len(accepted), "external_side_effects_authorized": False},
                ))
                if accepted:
                    action_observed = True
                    break
                for retry in result.retry_capabilities:
                    if retry in resolved_policy.allowed_capabilities and retry not in queued:
                        queued.append(retry)
            if not action_observed:
                unresolved.append(action.action_id)
            if step_count >= resolved_policy.max_steps or len(observations) >= resolved_policy.max_observations:
                break
        if step_count >= resolved_policy.max_steps or len(observations) >= resolved_policy.max_observations:
            break

    evidence = tuple(observation_to_evidence(observation, compilation) for observation in observations)
    status = "evidence_acquired" if evidence and not unresolved else "partially_observed" if evidence else "awaiting_sources"
    return LogicalRobotRunResult(
        plan_ids=tuple(plan.plan_id for plan in plan_list),
        attempts=tuple(attempts), observations=tuple(observations), evidence_results=evidence,
        unresolved_action_ids=tuple(dict.fromkeys(unresolved)), status=status, resumable=True,
        wake_triggers=("new_source_available", "logical_environment_change", "new_evidence_plan", "oracle_population_change", "manual_resume"),
        provenance={
            "engine": "logical_robot_runtime_v0", "build": 14,
            "plan_count": len(plan_list), "attempt_count": len(attempts), "observation_count": len(observations),
            "external_side_effects_authorized": False, "physical_actuation": False,
            "challenge_targets_visible": False, "holdout_visible": False,
            "observations_are_external_truth_claims": False, "stalled_run_is_terminal": False,
            "canonical_spec_modified": False,
        },
    )


def run_logical_robot_cycle(
    previous: EvidencePlanningCycleResult,
    challenge_suite: OracleChallengeSuite,
    tools: Sequence[LogicalRobotTool],
    *,
    policy: LogicalRobotPolicy | None = None,
    genesis_generators: Sequence[OracleGenesisGenerator] = (PairwiseSemanticRuleGenesisGenerator(),),
    fabric_layer: FabricLayer | None = None,
    discovery_config: OracleGapDiscoveryConfig | None = None,
    evolution_config: OracleEvolutionConfig | None = None,
) -> LogicalRobotCycleResult:
    """Execute BUILD 13 plans and resume the existing QCDS loop when evidence arrives."""
    if previous.checkpoint.terminal:
        raise LogicalRobotError("terminal BUILD 13 checkpoint cannot drive logical robot execution")
    compilation = previous.genesis.evolved_compilation
    robot = execute_logical_robot_plans(compilation, previous.plans, tools, policy=policy)
    if not robot.evidence_results:
        return LogicalRobotCycleResult(
            robot=robot, updated_compilation=compilation, resumed_cycle=None,
            provenance={
                "engine": "logical_robot_cycle_v0", "resumed_qcds": False,
                "reason": "no_new_evidence", "resumable": True,
                "all_prior_builds_retained": True, "canonical_spec_modified": False,
            },
        )

    updated = apply_evidence_results(compilation, robot.evidence_results)
    resumed = resume_evidence_planning_cycle(
        previous,
        challenge_suite,
        evidence_results=robot.evidence_results,
        genesis_generators=genesis_generators,
        fabric_layer=fabric_layer,
        discovery_config=discovery_config,
        evolution_config=evolution_config,
    )
    return LogicalRobotCycleResult(
        robot=robot, updated_compilation=updated, resumed_cycle=resumed,
        provenance={
            "engine": "logical_robot_cycle_v0", "resumed_qcds": True,
            "evidence_result_ids": tuple(item.result_id for item in robot.evidence_results),
            "all_prior_builds_retained": True, "canonical_spec_modified": False,
        },
    )
