from __future__ import annotations

import argparse
import hashlib
import json
from copy import deepcopy
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Any, Mapping, Sequence

from .evidence_planning import DisagreementEvidencePlanner, EvidencePlan, EvidencePlanningConfig
from .fabric import FabricLayer
from .logical_robot import (
    LogicalObservation,
    LogicalRobotRequest,
    LogicalRobotTool,
    LogicalRobotToolResult,
    observation_to_evidence,
)
from .logical_transform import LogicalSpaceResolver
from .logical_universe import CsvLogicalUniverseStore
from .oracle_evolution import OracleHypothesis, extract_problem_rule_population
from .oracle_genesis import (
    OracleGap,
    OracleGapDiscoveryConfig,
    PairwiseSemanticRuleGenesisGenerator,
    discover_oracle_gaps,
)
from .problem import ProblemCompilation, ProblemQuery, SemanticClaim, compile_problem_frame
from .self_expanding_reality import (
    RealityExpansionResult,
    SelfExpandingRealityError,
    _binding_from_spec,
    _failure_from_spec,
    _frame_from_spec,
    _require_mapping,
    _require_sequence,
    _slug,
    _strings,
    run_reality_cycle_spec,
)


class EvidenceDrivenRealityError(ValueError):
    """Raised when BUILD 22 would need hidden answers or insufficient evidence."""


_FORBIDDEN_OBSERVATION_KEYS = {
    "role",
    "expected_assignments",
    "challenge_target",
    "target_distribution",
    "target",
    "holdout_answer",
    "selection_answer",
}
_CAPABILITY_ORDER = ("search", "read", "follow", "query", "compare")


def _norm(value: str) -> str:
    return " ".join(value.strip().lower().split()).strip(" .?!")


def _norm_context(values: Mapping[str, str]) -> dict[str, str]:
    return {_norm(str(key)): _norm(str(value)) for key, value in values.items() if _norm(str(key)) and _norm(str(value))}


@dataclass(frozen=True)
class ObservationPoolRecord:
    observation_id: str
    query_id: str
    observed_value: str
    source_id: str
    context: Mapping[str, str]
    confidence: float = 1.0
    polarity: bool = True
    capability: str = "search"
    uri: str | None = None
    excerpt: str = ""
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.observation_id.strip() or not self.query_id.strip():
            raise ValueError("observation pool record requires observation_id and query_id")
        if not self.observed_value.strip() or not self.source_id.strip():
            raise ValueError("observation pool record requires observed_value and source_id")
        if not self.context:
            raise ValueError("observation pool record requires a non-empty context")
        if not 0.5 <= self.confidence <= 1.0:
            raise ValueError("observation pool confidence must be in [0.5, 1.0]")
        if self.capability not in _CAPABILITY_ORDER:
            raise ValueError("observation pool capability is unsupported")


@dataclass(frozen=True)
class ObservationPoolTool:
    """Deterministic source fixture for the BUILD 22 CLI proof.

    The pool is not an oracle and does not assign challenge roles. Records are
    returned only when the Logical Robot asks about the represented target query
    under the same target-blind context chosen by the BUILD 22 planner.
    """

    records: tuple[ObservationPoolRecord, ...]
    tool_id: str = "build22-independent-observation-pool"
    capabilities: tuple[str, ...] = _CAPABILITY_ORDER

    def observe(self, request: LogicalRobotRequest) -> LogicalRobotToolResult:
        requested_context = _norm_context(
            _require_mapping(
                request.provenance.get("build22_context_assignments", {}),
                "logical robot request context",
            )
        )
        query_ids = set(request.query_ids)
        observations: list[LogicalObservation] = []
        for record in self.records:
            if record.query_id not in query_ids or record.capability != request.capability:
                continue
            if _norm_context(record.context) != requested_context:
                continue
            candidates = request.candidate_values.get(record.query_id, ())
            if candidates and _norm(record.observed_value) not in {_norm(value) for value in candidates}:
                continue
            observations.append(
                LogicalObservation(
                    observation_id=record.observation_id,
                    query_id=record.query_id,
                    observed_value=record.observed_value,
                    source_id=record.source_id,
                    capability=request.capability,
                    confidence=record.confidence,
                    polarity=record.polarity,
                    uri=record.uri,
                    excerpt=record.excerpt,
                    provenance={
                        **dict(record.provenance),
                        "build22_observation_pool": True,
                        "challenge_role_known_to_tool": False,
                        "challenge_target_visible": False,
                        "holdout_visible": False,
                        "hypothesis_ids_visible": False,
                        "external_truth_claim": False,
                    },
                )
            )
        return LogicalRobotToolResult(
            observations=tuple(observations),
            exhausted=not observations,
            retry_capabilities=(),
            provenance={
                "tool": self.tool_id,
                "target_visible": False,
                "challenge_role_visible": False,
                "external_side_effects": False,
            },
        )


@dataclass(frozen=True)
class ContextualEvidenceRequest:
    request_id: str
    target_query_id: str
    context_assignments: Mapping[str, str]
    internal_role: str
    required_sources: int
    discrimination_score: float
    planner_plan_id: str

    def __post_init__(self) -> None:
        if not self.request_id.strip() or not self.target_query_id.strip():
            raise ValueError("contextual evidence request requires ids")
        if self.internal_role not in {"selection", "holdout"}:
            raise ValueError("contextual evidence request has invalid internal role")
        if self.required_sources <= 0:
            raise ValueError("contextual evidence request required_sources must be positive")
        if not self.context_assignments:
            raise ValueError("contextual evidence request requires context assignments")
        if self.discrimination_score < 0:
            raise ValueError("contextual evidence request discrimination score cannot be negative")


@dataclass(frozen=True)
class EvidenceDrivenRealityResult:
    mission_id: str
    status: str
    oracle_gap_count: int
    rival_hypothesis_count: int
    evidence_plan_count: int
    planned_query_ids: tuple[str, ...]
    planned_contexts: tuple[Mapping[str, Any], ...]
    robot_status: str
    robot_observation_count: int
    robot_source_ids: tuple[str, ...]
    challenge_case_count: int
    selection_case_count: int
    holdout_case_count: int
    reality_result: RealityExpansionResult | None
    active_reality_rule_count: int
    audit_path: str
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "mission_id": self.mission_id,
            "status": self.status,
            "oracle_gap_count": self.oracle_gap_count,
            "rival_hypothesis_count": self.rival_hypothesis_count,
            "evidence_plan_count": self.evidence_plan_count,
            "planned_query_ids": list(self.planned_query_ids),
            "planned_contexts": [dict(item) for item in self.planned_contexts],
            "robot_status": self.robot_status,
            "robot_observation_count": self.robot_observation_count,
            "robot_source_ids": list(self.robot_source_ids),
            "challenge_case_count": self.challenge_case_count,
            "selection_case_count": self.selection_case_count,
            "holdout_case_count": self.holdout_case_count,
            "active_reality_rule_count": self.active_reality_rule_count,
            "audit_path": self.audit_path,
            "reality_result": None if self.reality_result is None else self.reality_result.as_dict(),
            "provenance": dict(self.provenance),
        }


def _observation_record(raw: Mapping[str, Any]) -> ObservationPoolRecord:
    forbidden = sorted(_FORBIDDEN_OBSERVATION_KEYS & set(raw))
    if forbidden:
        raise EvidenceDrivenRealityError(
            "observation_pool may contain observations, not challenge answers/roles: " + ", ".join(forbidden)
        )
    return ObservationPoolRecord(
        observation_id=str(raw.get("observation_id", "")).strip(),
        query_id=str(raw.get("query_id", "")).strip(),
        observed_value=str(raw.get("observed_value", "")).strip(),
        source_id=str(raw.get("source_id", "")).strip(),
        context=_norm_context(_require_mapping(raw.get("context", {}), "observation_pool[].context")),
        confidence=float(raw.get("confidence", 1.0)),
        polarity=bool(raw.get("polarity", True)),
        capability=str(raw.get("capability", "search")).strip(),
        uri=str(raw.get("uri", "")).strip() or None,
        excerpt=str(raw.get("excerpt", "")).strip(),
        provenance=dict(_require_mapping(raw.get("provenance", {}), "observation_pool[].provenance")),
    )


def observation_pool_tool_from_spec(spec: Mapping[str, Any]) -> ObservationPoolTool:
    return ObservationPoolTool(
        records=tuple(
            _observation_record(_require_mapping(item, "observation_pool[]"))
            for item in _require_sequence(spec.get("observation_pool", ()), "observation_pool")
        )
    )


def _all_hypotheses(
    compilation: ProblemCompilation,
    gaps: Sequence[OracleGap],
    generator: PairwiseSemanticRuleGenesisGenerator,
) -> tuple[OracleHypothesis, ...]:
    population = extract_problem_rule_population(compilation)
    hypotheses: list[OracleHypothesis] = []
    seen: set[str] = set()
    for gap in gaps:
        for hypothesis in generator.propose_gap(gap, compilation, population, generation=1):
            if hypothesis.hypothesis_id in seen:
                continue
            seen.add(hypothesis.hypothesis_id)
            hypotheses.append(hypothesis)
    return tuple(hypotheses)


def _planner_plan(
    compilation: ProblemCompilation,
    gap: OracleGap,
    generator: PairwiseSemanticRuleGenesisGenerator,
    generation_spec: Mapping[str, Any],
) -> EvidencePlan | None:
    population = extract_problem_rule_population(compilation)
    hypotheses = generator.propose_gap(gap, compilation, population, generation=1)
    return DisagreementEvidencePlanner().plan(
        compilation,
        gap,
        population,
        hypotheses,
        fabric_layer=FabricLayer(),
        config=EvidencePlanningConfig(
            evaluation_mode=str(generation_spec.get("evaluation_mode", "baseline")),
            min_discrimination_l1=float(generation_spec.get("min_discrimination_l1", 1e-6)),
            max_hypotheses_per_gap=int(generation_spec.get("max_hypotheses_per_gap", 32)),
            max_actions_per_plan=1,
            max_plans=1,
            require_independent_source=True,
            physical_execution_authorized=False,
        ),
    )


def _query_by_id(compilation: ProblemCompilation) -> dict[str, ProblemQuery]:
    return {query.query_id: query for query in compilation.canonical_frame.queries}


def _current_context(compilation: ProblemCompilation, target_query_id: str) -> dict[str, str]:
    queries = _query_by_id(compilation)
    target_group = compilation.query_groups[target_query_id]
    by_group: dict[str, list[SemanticClaim]] = {}
    for claim in compilation.canonical_frame.claims:
        if not claim.polarity:
            continue
        by_group.setdefault(claim.group_key, []).append(claim)

    context: dict[str, str] = {}
    for query_id in compilation.executable_query_ids:
        if query_id == target_query_id or compilation.query_groups[query_id] == target_group:
            continue
        claims = by_group.get(compilation.query_groups[query_id], [])
        values = tuple(dict.fromkeys(_norm(claim.value) for claim in claims))
        if len(values) == 1:
            context[query_id] = values[0]
    return context


def _context_compilation(
    compilation: ProblemCompilation,
    assignments: Mapping[str, str],
    *,
    label: str,
) -> ProblemCompilation:
    frame = compilation.canonical_frame
    queries = _query_by_id(compilation)
    assigned_groups: set[str] = set()
    new_claims: list[SemanticClaim] = []
    for query_id, value in assignments.items():
        query = queries.get(query_id)
        if query is None or query_id not in compilation.executable_query_ids:
            raise EvidenceDrivenRealityError(f"context references non-executable query {query_id!r}")
        group = compilation.query_groups[query_id]
        canonical_value = frame.ontology.value(value)
        if canonical_value not in compilation.group_values[group]:
            raise EvidenceDrivenRealityError(
                f"context value {value!r} is outside represented candidates for query {query_id!r}"
            )
        assigned_groups.add(group)
        new_claims.append(
            SemanticClaim(
                subject=query.subject,
                predicate=query.predicate,
                value=canonical_value,
                source_id=f"build22:planning-context:{query_id}:{_slug(canonical_value)}",
                confidence=1.0,
                polarity=True,
                original_text="BUILD 22 target-blind planning context",
            )
        )
    retained = tuple(claim for claim in frame.claims if claim.group_key not in assigned_groups)
    contextual_frame = replace(
        frame,
        mission_id=f"{frame.mission_id}-{_slug(label)}",
        claims=retained + tuple(new_claims),
        provenance={
            **dict(frame.provenance),
            "build22_contextual_planning": True,
            "build22_context_assignments": dict(assignments),
            "target_visible_to_context_selection": False,
            "observed_outcome_visible_to_context_selection": False,
            "external_truth_claim": False,
        },
    )
    width = compilation.bundle.width if compilation.bundle is not None else 16
    return compile_problem_frame(contextual_frame, max_width=max(1, width))


def _context_variants(
    compilation: ProblemCompilation,
    target_query_id: str,
    current: Mapping[str, str],
) -> tuple[dict[str, str], ...]:
    variants: list[dict[str, str]] = []
    for query_id, current_value in current.items():
        group = compilation.query_groups[query_id]
        for value in compilation.group_values[group]:
            if _norm(value) == _norm(current_value):
                continue
            variant = dict(current)
            variant[query_id] = value
            variants.append(variant)
    unique: dict[tuple[tuple[str, str], ...], dict[str, str]] = {}
    for variant in variants:
        key = tuple(sorted(_norm_context(variant).items()))
        unique.setdefault(key, variant)
    return tuple(unique[key] for key in sorted(unique))


def _contextual_requests(
    compilation: ProblemCompilation,
    gap: OracleGap,
    generator: PairwiseSemanticRuleGenesisGenerator,
    generation_spec: Mapping[str, Any],
) -> tuple[ContextualEvidenceRequest, ...]:
    if len(gap.query_ids) != 1:
        raise EvidenceDrivenRealityError("BUILD 22 MVP requires one unresolved target query per active gap")
    target_query_id = gap.query_ids[0]
    current = _current_context(compilation, target_query_id)
    if not current:
        raise EvidenceDrivenRealityError(
            "BUILD 22 cannot form an identifying challenge without represented positive context evidence"
        )

    current_compilation = _context_compilation(compilation, current, label="current-context")
    current_plan = _planner_plan(current_compilation, gap, generator, generation_spec)
    if current_plan is None:
        return ()

    ranked: list[tuple[float, tuple[tuple[str, str], ...], dict[str, str], EvidencePlan]] = []
    for ordinal, variant in enumerate(_context_variants(compilation, target_query_id, current), start=1):
        contextual = _context_compilation(compilation, variant, label=f"contrast-{ordinal}")
        plan = _planner_plan(contextual, gap, generator, generation_spec)
        if plan is None:
            continue
        key = tuple(sorted(_norm_context(variant).items()))
        ranked.append((plan.expected_discrimination_score, key, variant, plan))
    ranked.sort(key=lambda item: (-item[0], item[1]))
    if not ranked:
        return ()

    _, _, contrast, contrast_plan = ranked[0]
    return (
        ContextualEvidenceRequest(
            request_id=f"context:{_slug(compilation.canonical_frame.mission_id)}:a",
            target_query_id=target_query_id,
            context_assignments=dict(current),
            internal_role="selection",
            required_sources=max(2, int(generation_spec.get("selection_independent_sources", 2))),
            discrimination_score=current_plan.expected_discrimination_score,
            planner_plan_id=current_plan.plan_id,
        ),
        ContextualEvidenceRequest(
            request_id=f"context:{_slug(compilation.canonical_frame.mission_id)}:b",
            target_query_id=target_query_id,
            context_assignments=dict(contrast),
            internal_role="holdout",
            required_sources=max(1, int(generation_spec.get("holdout_independent_sources", 1))),
            discrimination_score=contrast_plan.expected_discrimination_score,
            planner_plan_id=contrast_plan.plan_id,
        ),
    )


def _request_dimensions(compilation: ProblemCompilation, query_id: str) -> tuple[str, ...]:
    group = compilation.query_groups[query_id]
    return compilation.group_dimensions[group]


def _request_candidates(compilation: ProblemCompilation, query_id: str) -> Mapping[str, tuple[str, ...]]:
    group = compilation.query_groups[query_id]
    return {query_id: compilation.group_values[group]}


def _execute_contextual_requests(
    compilation: ProblemCompilation,
    requests: Sequence[ContextualEvidenceRequest],
    tools: Sequence[LogicalRobotTool],
    *,
    max_steps: int,
) -> tuple[str, tuple[LogicalObservation, ...]]:
    if max_steps <= 0:
        raise EvidenceDrivenRealityError("robot_max_steps must be positive")
    tool_ids = [tool.tool_id for tool in tools]
    if len(tool_ids) != len(set(tool_ids)):
        raise EvidenceDrivenRealityError("logical robot tool ids must be unique")

    observations: list[LogicalObservation] = []
    used_sources: set[str] = set()
    steps = 0
    complete = True

    for contextual in requests:
        accepted_for_request = 0
        for capability in _CAPABILITY_ORDER:
            if accepted_for_request >= contextual.required_sources or steps >= max_steps:
                break
            tool = next((item for item in tools if capability in item.capabilities), None)
            if tool is None:
                continue
            steps += 1
            request = LogicalRobotRequest(
                request_id=f"request:{_slug(contextual.request_id)}:{steps}:{capability}",
                plan_id=contextual.planner_plan_id,
                evidence_action_id=contextual.request_id,
                capability=capability,
                objective=(
                    f"Acquire independent observation for represented query {contextual.target_query_id!r} "
                    "under the supplied logical context because rival oracle hypotheses diverge there."
                ),
                query_ids=(contextual.target_query_id,),
                dimension_ids=_request_dimensions(compilation, contextual.target_query_id),
                candidate_values=_request_candidates(compilation, contextual.target_query_id),
                independent_source_required=True,
                attempt=steps,
                provenance={
                    "build22_context_assignments": dict(contextual.context_assignments),
                    "build22_context_request_id": contextual.request_id,
                    "challenge_target_visible": False,
                    "holdout_visible": False,
                    "expected_answer_visible": False,
                    "challenge_role_visible": False,
                    "hypothesis_ids_visible": False,
                    "external_side_effects_authorized": False,
                    "canonical_spec_modified": False,
                },
            )
            result = tool.observe(request)
            for observation in result.observations:
                if observation.source_id in used_sources:
                    continue
                observation_to_evidence(observation, compilation)
                used_sources.add(observation.source_id)
                enriched = replace(
                    observation,
                    provenance={
                        **dict(observation.provenance),
                        "build22_context_request_id": contextual.request_id,
                        "build22_context_assignments": dict(contextual.context_assignments),
                        "challenge_role_visible_at_observation": False,
                        "expected_answer_visible_at_observation": False,
                    },
                )
                observations.append(enriched)
                accepted_for_request += 1
                if accepted_for_request >= contextual.required_sources:
                    break
        if accepted_for_request < contextual.required_sources:
            complete = False

    if not observations:
        return "awaiting_sources", ()
    if complete:
        return "evidence_acquired", tuple(observations)
    return "partially_observed", tuple(observations)


def _copy_challenge_frame_for_context(
    problem_spec: Mapping[str, Any],
    assignments: Mapping[str, str],
    *,
    mission_id: str,
) -> dict[str, Any]:
    frame = deepcopy(dict(problem_spec))
    frame["mission_id"] = mission_id
    frame["rules"] = []
    queries = {
        str(item.get("query_id", "")).strip(): _require_mapping(item, "problem.queries[]")
        for item in _require_sequence(frame.get("queries", ()), "problem.queries")
    }
    assigned_axes = {
        (_norm(str(queries[qid].get("subject", ""))), _norm(str(queries[qid].get("predicate", ""))))
        for qid in assignments
        if qid in queries
    }
    claims = []
    for raw in _require_sequence(frame.get("claims", ()), "problem.claims"):
        claim = _require_mapping(raw, "problem.claims[]")
        axis = (_norm(str(claim.get("subject", ""))), _norm(str(claim.get("predicate", ""))))
        if axis not in assigned_axes:
            claims.append(deepcopy(dict(claim)))
    for query_id, value in assignments.items():
        query = queries.get(query_id)
        if query is None:
            raise EvidenceDrivenRealityError(f"challenge context references unknown query {query_id!r}")
        claims.append(
            {
                "subject": str(query.get("subject", "")).strip(),
                "predicate": str(query.get("predicate", "")).strip(),
                "value": value,
                "source_id": f"build22:controlled-context:{query_id}:{_slug(value)}",
                "confidence": 1.0,
                "polarity": True,
                "original_text": "BUILD 22 context selected before target observation",
            }
        )
    frame["claims"] = claims
    frame["provenance"] = {
        **dict(_require_mapping(frame.get("provenance", {}), "problem.provenance")),
        "build22_generated_challenge_frame": True,
        "context_selected_before_outcome": True,
        "outcome_not_in_context_claims": True,
    }
    return frame


def _challenge_from_context_observations(
    mission_id: str,
    problem_spec: Mapping[str, Any],
    requests: Sequence[ContextualEvidenceRequest],
    observations: Sequence[LogicalObservation],
) -> Mapping[str, Any] | None:
    by_request: dict[str, list[LogicalObservation]] = {request.request_id: [] for request in requests}
    for observation in observations:
        request_id = str(observation.provenance.get("build22_context_request_id", ""))
        if request_id in by_request:
            by_request[request_id].append(observation)

    for request in requests:
        independent_sources = {item.source_id for item in by_request[request.request_id]}
        if len(independent_sources) < request.required_sources:
            return None

    source_fingerprint = hashlib.sha256(
        "|".join(sorted(item.source_id for item in observations)).encode("utf-8")
    ).hexdigest()[:12]
    cases: list[dict[str, Any]] = []
    ordinal = 0
    for request in requests:
        for observation in by_request[request.request_id]:
            ordinal += 1
            expected = dict(request.context_assignments)
            expected[request.target_query_id] = observation.observed_value
            cases.append(
                {
                    "case_id": f"build22-case-{ordinal}-{_slug(observation.observation_id)}",
                    "role": request.internal_role,
                    "frame": _copy_challenge_frame_for_context(
                        problem_spec,
                        request.context_assignments,
                        mission_id=f"{mission_id}-case-{ordinal}",
                    ),
                    "expected_assignments": expected,
                }
            )
    return {
        "suite_id": f"build22-observed-{_slug(mission_id)}-{source_fingerprint}",
        "cases": cases,
    }


def _append_audit(root: Path, result: EvidenceDrivenRealityResult) -> None:
    path = root / "reality_discovery_history.jsonl"
    payload = result.as_dict()
    payload["provenance"] = {
        **dict(payload["provenance"]),
        "audit_format": "jsonl",
        "append_only_intent": True,
    }
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False, sort_keys=True) + "\n")


@dataclass
class EvidenceDrivenRealityRunner:
    """BUILD 22: target-blind context selection -> observation -> challenge -> BUILD 21."""

    store_root: str | Path

    def __post_init__(self) -> None:
        self.store_root = Path(self.store_root)
        self.store_root.mkdir(parents=True, exist_ok=True)
        self.universes = CsvLogicalUniverseStore(self.store_root)
        self.universes.ensure_reality()

    @property
    def audit_path(self) -> Path:
        return self.store_root / "reality_discovery_history.jsonl"

    def _result(
        self,
        *,
        mission_id: str,
        status: str,
        gap_count: int = 0,
        hypothesis_count: int = 0,
        requests: Sequence[ContextualEvidenceRequest] = (),
        robot_status: str = "not_run",
        observations: Sequence[LogicalObservation] = (),
        challenge_case_count: int = 0,
        selection_case_count: int = 0,
        holdout_case_count: int = 0,
        reality_result: RealityExpansionResult | None = None,
    ) -> EvidenceDrivenRealityResult:
        active_rules = len(self.universes.rules("reality").rules(active_only=True))
        result = EvidenceDrivenRealityResult(
            mission_id=mission_id,
            status=status,
            oracle_gap_count=gap_count,
            rival_hypothesis_count=hypothesis_count,
            evidence_plan_count=len(requests),
            planned_query_ids=tuple(dict.fromkeys(request.target_query_id for request in requests)),
            planned_contexts=tuple(
                {
                    "request_id": request.request_id,
                    "context_assignments": dict(request.context_assignments),
                    "purpose": request.internal_role,
                    "required_sources": request.required_sources,
                    "discrimination_score": request.discrimination_score,
                }
                for request in requests
            ),
            robot_status=robot_status,
            robot_observation_count=len(observations),
            robot_source_ids=tuple(dict.fromkeys(item.source_id for item in observations)),
            challenge_case_count=challenge_case_count,
            selection_case_count=selection_case_count,
            holdout_case_count=holdout_case_count,
            reality_result=reality_result,
            active_reality_rule_count=active_rules,
            audit_path=str(self.audit_path),
            provenance={
                "engine": "evidence_driven_reality_overlay_v1",
                "build": 22,
                "overlay_only": True,
                "qcds_core_modified": False,
                "fabric_core_modified": False,
                "oracle_core_modified": False,
                "evidence_planning_core_modified": False,
                "logical_robot_core_modified": False,
                "logical_universe_core_modified": False,
                "build21_core_modified": False,
                "canonical_spec_modified": False,
                "manual_challenge_supplied": False,
                "planner_received_observation_values": False,
                "planner_received_challenge_targets": False,
                "contrast_context_selected_target_blind": bool(requests),
                "selection_holdout_roles_fixed_before_observation": bool(requests),
                "role_assignment_depends_on_observed_value": False,
                "robot_received_challenge_roles": False,
                "robot_received_expected_answers": False,
                "robot_received_hypothesis_ids": False,
                "challenge_built_only_after_observation": challenge_case_count > 0,
                "reality_promotion_delegated_to_build21": reality_result is not None,
                "insufficient_evidence_fails_closed": True,
            },
        )
        _append_audit(self.store_root, result)
        return result

    def run(
        self,
        spec: Mapping[str, Any],
        *,
        tools: Sequence[LogicalRobotTool] | None = None,
    ) -> EvidenceDrivenRealityResult:
        if "challenge" in spec:
            raise EvidenceDrivenRealityError(
                "BUILD 22 does not accept a manual challenge suite; challenge cases must come from observations"
            )
        if "expected_assignments" in spec:
            raise EvidenceDrivenRealityError("BUILD 22 does not accept expected_assignments in its input")

        mission_id = str(spec.get("mission_id", "build22-reality-discovery")).strip()
        if not mission_id:
            raise EvidenceDrivenRealityError("mission_id must be non-empty")
        probe_terms = _strings(spec.get("probe_terms", ()), "probe_terms")
        problem_spec = _require_mapping(spec.get("problem"), "problem")
        frame = _frame_from_spec(problem_spec, "problem")
        compilation = compile_problem_frame(frame)
        generation_spec = _require_mapping(spec.get("generation", {}), "generation")

        # Persist source-attributed Reality observations before attempting derived logic.
        space = self.universes.space("reality")
        base_bindings = tuple(
            _binding_from_spec(_require_mapping(item, "reality_bindings[]"))
            for item in _require_sequence(spec.get("reality_bindings", ()), "reality_bindings")
        )
        space.append(base_bindings)
        resolver = LogicalSpaceResolver(space, self.universes.rules("reality"))
        if resolver.query(*probe_terms):
            return self._result(mission_id=mission_id, status="already_resolved")

        failures = tuple(
            _failure_from_spec(_require_mapping(item, "failure_observations[]"))
            for item in _require_sequence(spec.get("failure_observations", ()), "failure_observations")
        )
        discovery = discover_oracle_gaps(
            compilation,
            observations=failures,
            fabric_layer=FabricLayer(),
            config=OracleGapDiscoveryConfig(
                include_contradiction_resolution=False,
                include_null_influence=False,
                min_failure_severity=float(generation_spec.get("min_failure_severity", 0.1)),
                max_gaps=int(generation_spec.get("max_gaps", 8)),
            ),
        )
        generator = PairwiseSemanticRuleGenesisGenerator(
            kinds=("implies",),
            confidence_values=(1.0,),
            bidirectional_candidates=True,
            max_proposals_per_gap=int(generation_spec.get("max_proposals_per_gap", 96)),
        )
        hypotheses = _all_hypotheses(compilation, discovery.gaps, generator)
        if not discovery.gaps:
            return self._result(mission_id=mission_id, status="no_oracle_gap")

        requests = _contextual_requests(
            compilation,
            discovery.gaps[0],
            generator,
            generation_spec,
        )
        if len(requests) < 2:
            return self._result(
                mission_id=mission_id,
                status="no_identifying_holdout_plan",
                gap_count=len(discovery.gaps),
                hypothesis_count=len(hypotheses),
                requests=requests,
            )

        resolved_tools = tuple(tools) if tools is not None else (observation_pool_tool_from_spec(spec),)
        robot_status, observations = _execute_contextual_requests(
            compilation,
            requests,
            resolved_tools,
            max_steps=int(generation_spec.get("robot_max_steps", 10)),
        )
        challenge = _challenge_from_context_observations(
            mission_id,
            problem_spec,
            requests,
            observations,
        )
        if challenge is None:
            return self._result(
                mission_id=mission_id,
                status="awaiting_identifying_evidence",
                gap_count=len(discovery.gaps),
                hypothesis_count=len(hypotheses),
                requests=requests,
                robot_status=robot_status,
                observations=observations,
            )

        cases = tuple(_require_sequence(challenge["cases"], "generated challenge cases"))
        selection_count = sum(
            _require_mapping(case, "generated challenge case").get("role") == "selection" for case in cases
        )
        holdout_count = sum(
            _require_mapping(case, "generated challenge case").get("role") == "holdout" for case in cases
        )
        build21_spec = {
            "mission_id": mission_id,
            "probe_terms": list(probe_terms),
            "reality_bindings": deepcopy(list(_require_sequence(spec.get("reality_bindings", ()), "reality_bindings"))),
            "genesis": {
                "problem": deepcopy(dict(problem_spec)),
                "failure_observations": deepcopy(list(_require_sequence(
                    spec.get("failure_observations", ()), "failure_observations"
                ))),
                "challenge": challenge,
                "evaluation_mode": str(generation_spec.get("evaluation_mode", "baseline")),
                "max_generations": int(generation_spec.get("max_generations", 1)),
                "max_promotions_per_generation": int(generation_spec.get("max_promotions_per_generation", 1)),
                "min_selection_cases": max(1, int(generation_spec.get("min_selection_cases", 1))),
                "min_holdout_cases": max(1, int(generation_spec.get("min_holdout_cases", 1))),
                "min_selection_mean_l1_improvement": float(
                    generation_spec.get("min_selection_mean_l1_improvement", 1e-6)
                ),
                "min_holdout_mean_l1_improvement": float(
                    generation_spec.get("min_holdout_mean_l1_improvement", 0.0)
                ),
                "max_case_l1_regression": float(generation_spec.get("max_case_l1_regression", 0.0)),
                "max_total_contradiction_increase": int(
                    generation_spec.get("max_total_contradiction_increase", 0)
                ),
                "min_effect_cases": int(generation_spec.get("min_effect_cases", 1)),
                "max_proposals_per_gap": int(generation_spec.get("max_proposals_per_gap", 96)),
            },
        }
        try:
            reality = run_reality_cycle_spec(build21_spec, store_root=self.store_root)
        except SelfExpandingRealityError as exc:
            raise EvidenceDrivenRealityError(str(exc)) from exc

        return self._result(
            mission_id=mission_id,
            status=reality.status,
            gap_count=len(discovery.gaps),
            hypothesis_count=len(hypotheses),
            requests=requests,
            robot_status=robot_status,
            observations=observations,
            challenge_case_count=len(cases),
            selection_case_count=selection_count,
            holdout_case_count=holdout_count,
            reality_result=reality,
        )


def load_evidence_driven_reality_spec(path: str | Path) -> Mapping[str, Any]:
    with Path(path).open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return _require_mapping(payload, "root spec")


def run_evidence_driven_reality_spec(
    spec: Mapping[str, Any],
    *,
    store_root: str | Path = "./intelligence_store",
    tools: Sequence[LogicalRobotTool] | None = None,
) -> EvidenceDrivenRealityResult:
    return EvidenceDrivenRealityRunner(store_root).run(spec, tools=tools)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Run BUILD 22: target-blind rival hypotheses -> current + contrast evidence planning -> "
            "Logical Robot observation -> generated selection/holdout challenge -> BUILD 21 Reality governance."
        )
    )
    parser.add_argument("spec", help="Path to a BUILD 22 JSON spec")
    parser.add_argument("--store", default="./intelligence_store", help="Persistent intelligence-store root")
    args = parser.parse_args(argv)

    try:
        result = run_evidence_driven_reality_spec(
            load_evidence_driven_reality_spec(args.spec),
            store_root=args.store,
        )
    except (OSError, json.JSONDecodeError, EvidenceDrivenRealityError, SelfExpandingRealityError, ValueError) as exc:
        parser.error(str(exc))
        return 2

    print(json.dumps(result.as_dict(), ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
