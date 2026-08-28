from __future__ import annotations

import argparse
import hashlib
import json
from copy import deepcopy
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Sequence

from .evidence_planning import (
    DisagreementEvidencePlanner,
    EvidencePlan,
    EvidencePlanningConfig,
)
from .fabric import FabricLayer
from .logical_robot import (
    LogicalObservation,
    LogicalRobotPolicy,
    LogicalRobotRequest,
    LogicalRobotTool,
    LogicalRobotToolResult,
    execute_logical_robot_plans,
)
from .logical_transform import LogicalSpaceResolver
from .logical_universe import CsvLogicalUniverseStore
from .oracle_evolution import OracleHypothesis, extract_problem_rule_population
from .oracle_genesis import (
    OracleFailureObservation,
    OracleGap,
    OracleGapDiscoveryConfig,
    PairwiseSemanticRuleGenesisGenerator,
    discover_oracle_gaps,
)
from .problem import ProblemCompilation, compile_problem_frame
from .self_expanding_reality import (
    RealityExpansionResult,
    SelfExpandingRealityError,
    _failure_from_spec,
    _frame_from_spec,
    _require_mapping,
    _require_sequence,
    _slug,
    _strings,
    run_reality_cycle_spec,
)


class EvidenceDrivenRealityError(ValueError):
    """Raised when BUILD 22 would need a hidden answer or insufficient evidence."""


_FORBIDDEN_OBSERVATION_KEYS = {
    "role",
    "expected_assignments",
    "challenge_target",
    "target_distribution",
    "target",
    "holdout_answer",
    "selection_answer",
}


@dataclass(frozen=True)
class ObservationPoolRecord:
    observation_id: str
    query_id: str
    observed_value: str
    source_id: str
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
        if not 0.5 <= self.confidence <= 1.0:
            raise ValueError("observation pool confidence must be in [0.5, 1.0]")
        if self.capability not in {"search", "read", "follow", "query", "compare", "compute"}:
            raise ValueError("observation pool capability is unsupported")


@dataclass(frozen=True)
class ObservationPoolTool:
    """Deterministic external-observation fixture for the BUILD 22 CLI proof.

    It is deliberately not an oracle or a truth source. It exposes source-attributed
    observations only after the Logical Robot asks for a represented query. The
    planner never receives the pool or any observed value.
    """

    records: tuple[ObservationPoolRecord, ...]
    tool_id: str = "build22-independent-observation-pool"
    capabilities: tuple[str, ...] = ("search", "read", "follow", "query", "compare")

    def observe(self, request: LogicalRobotRequest) -> LogicalRobotToolResult:
        query_ids = set(request.query_ids)
        observations: list[LogicalObservation] = []
        for record in self.records:
            if record.query_id not in query_ids or record.capability != request.capability:
                continue
            candidates = request.candidate_values.get(record.query_id, ())
            if candidates and record.observed_value.strip().lower() not in {
                value.strip().lower() for value in candidates
            }:
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
            retry_capabilities=() if observations else tuple(
                capability for capability in self.capabilities if capability != request.capability
            ),
            provenance={
                "tool": self.tool_id,
                "target_visible": False,
                "challenge_role_visible": False,
                "external_side_effects": False,
            },
        )


@dataclass(frozen=True)
class EvidenceDrivenRealityResult:
    mission_id: str
    status: str
    oracle_gap_count: int
    rival_hypothesis_count: int
    evidence_plan_count: int
    planned_query_ids: tuple[str, ...]
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
        confidence=float(raw.get("confidence", 1.0)),
        polarity=bool(raw.get("polarity", True)),
        capability=str(raw.get("capability", "search")).strip(),
        uri=str(raw.get("uri", "")).strip() or None,
        excerpt=str(raw.get("excerpt", "")).strip(),
        provenance=dict(_require_mapping(raw.get("provenance", {}), "observation_pool[].provenance")),
    )


def observation_pool_tool_from_spec(spec: Mapping[str, Any]) -> ObservationPoolTool:
    records = tuple(
        _observation_record(_require_mapping(item, "observation_pool[]"))
        for item in _require_sequence(spec.get("observation_pool", ()), "observation_pool")
    )
    return ObservationPoolTool(records=records)


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


def _plan_for_top_gap(
    compilation: ProblemCompilation,
    gaps: Sequence[OracleGap],
    generator: PairwiseSemanticRuleGenesisGenerator,
    *,
    generation_spec: Mapping[str, Any],
) -> tuple[EvidencePlan, ...]:
    if not gaps:
        return ()
    layer = FabricLayer()
    population = extract_problem_rule_population(compilation)
    gap = gaps[0]
    hypotheses = generator.propose_gap(gap, compilation, population, generation=1)
    planner = DisagreementEvidencePlanner()
    plan = planner.plan(
        compilation,
        gap,
        population,
        hypotheses,
        fabric_layer=layer,
        config=EvidencePlanningConfig(
            evaluation_mode=str(generation_spec.get("evaluation_mode", "baseline")),
            min_discrimination_l1=float(generation_spec.get("min_discrimination_l1", 1e-6)),
            max_hypotheses_per_gap=int(generation_spec.get("max_hypotheses_per_gap", 32)),
            max_actions_per_plan=int(generation_spec.get("max_actions_per_plan", 1)),
            max_plans=1,
            require_independent_source=True,
            physical_execution_authorized=False,
        ),
    )
    return () if plan is None else (plan,)


def _copy_challenge_frame(problem_spec: Mapping[str, Any], *, mission_id: str) -> dict[str, Any]:
    frame = deepcopy(dict(problem_spec))
    frame["mission_id"] = mission_id
    frame["rules"] = []
    frame["provenance"] = {
        **dict(_require_mapping(frame.get("provenance", {}), "problem.provenance")),
        "build22_generated_challenge_frame": True,
        "outcome_not_in_context_claims": True,
    }
    return frame


def _challenge_from_observations(
    mission_id: str,
    problem_spec: Mapping[str, Any],
    observations: Sequence[LogicalObservation],
) -> Mapping[str, Any] | None:
    independent: list[LogicalObservation] = []
    sources: set[str] = set()
    for observation in observations:
        if observation.source_id in sources:
            continue
        sources.add(observation.source_id)
        independent.append(observation)
    if len(independent) < 2:
        return None

    source_fingerprint = hashlib.sha256(
        "|".join(sorted(item.source_id for item in independent)).encode("utf-8")
    ).hexdigest()[:12]
    cases: list[dict[str, Any]] = []
    for index, observation in enumerate(independent):
        role = "selection" if index == 0 else "holdout"
        case_id = f"build22-{role}-{index + 1}-{_slug(observation.observation_id)}"
        cases.append(
            {
                "case_id": case_id,
                "role": role,
                "frame": _copy_challenge_frame(
                    problem_spec,
                    mission_id=f"{mission_id}-{role}-{index + 1}",
                ),
                "expected_assignments": {observation.query_id: observation.observed_value},
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
    """BUILD 22 overlay: hypotheses -> evidence question -> Logical Robot -> challenge -> BUILD 21."""

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
        plans: Sequence[EvidencePlan] = (),
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
            evidence_plan_count=len(plans),
            planned_query_ids=tuple(dict.fromkeys(
                query_id for plan in plans for action in plan.actions for query_id in action.query_ids
            )),
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
                "engine": "evidence_driven_reality_overlay_v0",
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
                "robot_received_challenge_roles": False,
                "robot_received_expected_answers": False,
                "challenge_built_only_after_observation": challenge_case_count > 0,
                "selection_holdout_roles_assigned_after_observation": challenge_case_count > 0,
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
        failures = tuple(
            _failure_from_spec(_require_mapping(item, "failure_observations[]"))
            for item in _require_sequence(spec.get("failure_observations", ()), "failure_observations")
        )
        generation_spec = _require_mapping(spec.get("generation", {}), "generation")

        # Reuse already learned Reality logic instead of repeating acquisition on restart.
        resolver = LogicalSpaceResolver(
            self.universes.space("reality"),
            self.universes.rules("reality"),
        )
        if resolver.query(*probe_terms):
            return self._result(
                mission_id=mission_id,
                status="already_resolved",
                robot_status="not_run",
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
            return self._result(
                mission_id=mission_id,
                status="no_oracle_gap",
                gap_count=0,
                hypothesis_count=0,
            )

        plans = _plan_for_top_gap(
            compilation,
            discovery.gaps,
            generator,
            generation_spec=generation_spec,
        )
        if not plans:
            return self._result(
                mission_id=mission_id,
                status="no_discriminating_evidence_plan",
                gap_count=len(discovery.gaps),
                hypothesis_count=len(hypotheses),
            )

        resolved_tools = tuple(tools) if tools is not None else (observation_pool_tool_from_spec(spec),)
        robot = execute_logical_robot_plans(
            compilation,
            plans,
            resolved_tools,
            policy=LogicalRobotPolicy(
                max_steps=int(generation_spec.get("robot_max_steps", 8)),
                max_attempts_per_action=int(generation_spec.get("robot_max_attempts_per_action", 4)),
                max_observations=int(generation_spec.get("robot_max_observations", 8)),
                require_source_provenance=True,
                require_independent_source_when_requested=True,
                allow_external_side_effects=False,
                terminal_on_exhaustion=False,
            ),
        )
        challenge = _challenge_from_observations(mission_id, problem_spec, robot.observations)
        if challenge is None:
            return self._result(
                mission_id=mission_id,
                status="awaiting_independent_evidence",
                gap_count=len(discovery.gaps),
                hypothesis_count=len(hypotheses),
                plans=plans,
                robot_status=robot.status,
                observations=robot.observations,
            )

        cases = tuple(_require_sequence(challenge["cases"], "generated challenge cases"))
        selection_count = sum(_require_mapping(case, "generated challenge case").get("role") == "selection" for case in cases)
        holdout_count = sum(_require_mapping(case, "generated challenge case").get("role") == "holdout" for case in cases)

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
            plans=plans,
            robot_status=robot.status,
            observations=robot.observations,
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
            "Run BUILD 22: target-blind rival hypotheses -> evidence question -> Logical Robot "
            "observation -> generated selection/holdout challenge -> BUILD 21 Reality governance."
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
    except (OSError, json.JSONDecodeError, EvidenceDrivenRealityError, ValueError) as exc:
        parser.error(str(exc))
        return 2

    print(json.dumps(result.as_dict(), ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
