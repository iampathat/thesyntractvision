from dataclasses import dataclass

import pytest

from qcds_fabric import (
    EvidenceAction,
    EvidenceNeed,
    EvidencePlan,
    LogicalObservation,
    LogicalRobotError,
    LogicalRobotPolicy,
    LogicalRobotRequest,
    LogicalRobotToolResult,
    OracleChallengeSuite,
    OracleEvolutionConfig,
    OracleFailureObservation,
    OracleGapDiscoveryConfig,
    ProblemQuery,
    SemanticClaim,
    SemanticProblemFrame,
    capability_sequence,
    challenge_case_from_problem,
    compile_problem_frame,
    execute_logical_robot_plans,
    observation_to_evidence,
    run_evidence_planning_cycle,
    run_logical_robot_cycle,
)


def scene_frame(color="red", *, mission_id="scene"):
    return SemanticProblemFrame(
        mission_id=mission_id,
        raw_text="structured scene",
        queries=(
            ProblemQuery("car-color", "car", "color", ("red", "blue")),
            ProblemQuery("driver", "driver", "identity", ("alice", "bob")),
        ),
        claims=(SemanticClaim("car", "color", color, f"camera-{color}", 0.95),),
        analyzer_id="external:test",
    )


def external_only_config():
    return OracleGapDiscoveryConfig(include_contradiction_resolution=False, include_null_influence=False)


def rejecting_evolution_config():
    return OracleEvolutionConfig(
        evaluation_mode="baseline",
        max_generations=1,
        min_selection_mean_l1_improvement=10.0,
    )


def driver_failure():
    return OracleFailureObservation("driver-failed", "prediction_failure", query_ids=("driver",), severity=1.0)


def challenge_suite_for_scene():
    red = compile_problem_frame(scene_frame("red", mission_id="red-case"))
    blue = compile_problem_frame(scene_frame("blue", mission_id="blue-case"))
    selection = challenge_case_from_problem(
        red,
        population_oracle_ids=(),
        expected_assignments={"car-color": "red", "driver": "alice"},
        case_id="red-implies-alice",
        role="selection",
    )
    holdout = challenge_case_from_problem(
        blue,
        population_oracle_ids=(),
        expected_assignments={"car-color": "blue", "driver": "bob"},
        case_id="blue-implies-bob",
        role="holdout",
    )
    return OracleChallengeSuite("scene-generalization", (selection, holdout))


def waiting_cycle(mission_id="logical-robot"):
    compilation = compile_problem_frame(scene_frame(mission_id=mission_id))
    return run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )


@dataclass
class StaticTool:
    tool_id: str
    capabilities: tuple[str, ...]
    value: str = "alice"
    source_id: str = "source-a"
    confidence: float = 0.91

    def observe(self, request):
        if request.capability not in self.capabilities:
            return LogicalRobotToolResult(exhausted=True)
        query_id = request.query_ids[0]
        return LogicalRobotToolResult(
            observations=(LogicalObservation(
                observation_id=f"obs:{self.tool_id}:{request.attempt}",
                query_id=query_id,
                observed_value=self.value,
                source_id=self.source_id,
                capability=request.capability,
                confidence=self.confidence,
                uri=f"logical://{self.source_id}",
                excerpt="structured observation",
                provenance={"provider": self.tool_id},
            ),),
            provenance={"tool": self.tool_id},
        )


@dataclass
class EmptySearchTool:
    tool_id: str = "search-empty"
    capabilities: tuple[str, ...] = ("search",)

    def observe(self, request):
        return LogicalRobotToolResult(
            observations=(),
            discovered_references=("ref:1",),
            retry_capabilities=("read",),
            notes=("search found a reference but no direct observation",),
        )


@dataclass
class EmptyTool:
    tool_id: str = "empty"
    capabilities: tuple[str, ...] = ("search", "read", "follow", "query", "compare", "compute")

    def observe(self, request):
        return LogicalRobotToolResult(exhausted=True, notes=("no usable evidence",))


def manual_plan(action_kind="independent_observation"):
    need = EvidenceNeed(
        "need:test", "gap:test", ("driver",), ("driver::identity::alice", "driver::identity::bob"),
        ("h1", "h2"), 0.5, ("prediction_failure",), status="planned",
    )
    action = EvidenceAction(
        "action:test", action_kind, ("driver",), need.dimension_ids,
        "Find discriminating evidence for the driver identity.", 0.5,
    )
    return EvidencePlan("plan:test", need, (action,), need.hypothesis_ids, 0.5)


def test_logical_robot_policy_rejects_external_side_effect_authority():
    with pytest.raises(LogicalRobotError, match="does not authorize external side effects"):
        LogicalRobotPolicy(allow_external_side_effects=True)


def test_logical_robot_policy_rejects_terminal_on_exhaustion():
    with pytest.raises(LogicalRobotError, match="must remain resumable"):
        LogicalRobotPolicy(terminal_on_exhaustion=True)


def test_capability_mapping_preserves_build13_action_intent():
    assert capability_sequence(manual_plan("independent_observation").actions[0])[0] == "search"
    assert capability_sequence(manual_plan("targeted_query").actions[0])[0] == "query"
    assert "compute" in capability_sequence(manual_plan("validation_experiment").actions[0])


def test_logical_request_has_no_target_or_holdout_answer_fields():
    request = LogicalRobotRequest(
        "r", "p", "a", "search", "observe", ("driver",), ("d1",),
        {"driver": ("alice", "bob")}, True, 1,
        provenance={"challenge_target_visible": False, "holdout_visible": False},
    )
    assert not hasattr(request, "expected_answer")
    assert not hasattr(request, "target_distribution")


def test_logical_request_rejects_target_visibility():
    with pytest.raises(LogicalRobotError, match="may not receive challenge targets"):
        LogicalRobotRequest(
            "r", "p", "a", "search", "observe", ("driver",), ("d1",),
            {"driver": ("alice", "bob")}, True, 1,
            provenance={"challenge_target_visible": True},
        )


def test_logical_observation_becomes_source_attributed_build13_evidence():
    compilation = compile_problem_frame(scene_frame(mission_id="convert"))
    evidence = observation_to_evidence(
        LogicalObservation("obs-1", "driver", "alice", "paper-1", "read", 0.93, uri="https://example.test/paper"),
        compilation,
    )
    assert evidence.query_id == "driver"
    assert evidence.observed_value == "alice"
    assert evidence.source_id == "paper-1"
    assert evidence.provenance["external_truth_claim"] is False


def test_logical_observation_outside_candidate_space_fails_closed():
    compilation = compile_problem_frame(scene_frame(mission_id="outside"))
    with pytest.raises(LogicalRobotError, match="outside represented candidates"):
        observation_to_evidence(LogicalObservation("obs", "driver", "charlie", "source", "read"), compilation)


def test_logical_robot_executes_build13_plan_through_provider_protocol():
    previous = waiting_cycle("execute")
    compilation = previous.genesis.evolved_compilation
    result = execute_logical_robot_plans(compilation, previous.plans, (StaticTool("web", ("search",)),))
    assert result.status == "evidence_acquired"
    assert result.evidence_results[0].observed_value == "alice"
    assert result.attempts[0].request.provenance["expected_answer_visible"] is False
    assert result.provenance["physical_actuation"] is False


def test_logical_robot_can_change_strategy_search_to_read():
    previous = waiting_cycle("fallback")
    compilation = previous.genesis.evolved_compilation
    result = execute_logical_robot_plans(
        compilation,
        previous.plans,
        (EmptySearchTool(), StaticTool("reader", ("read",), source_id="paper-2")),
    )
    capabilities = [attempt.request.capability for attempt in result.attempts]
    assert capabilities[:2] == ["search", "read"]
    assert result.evidence_results


def test_logical_robot_exhaustion_is_resumable_not_terminal():
    previous = waiting_cycle("exhaust")
    result = execute_logical_robot_plans(previous.genesis.evolved_compilation, previous.plans, (EmptyTool(),))
    assert result.status == "awaiting_sources"
    assert result.resumable is True
    assert "new_source_available" in result.wake_triggers
    assert result.provenance["stalled_run_is_terminal"] is False


def test_empty_plan_is_quiescent_but_resumable():
    compilation = compile_problem_frame(scene_frame(mission_id="empty-plan"))
    result = execute_logical_robot_plans(compilation, (), ())
    assert result.status == "quiescent"
    assert result.resumable is True


def test_step_bound_prevents_unbounded_logical_navigation():
    previous = waiting_cycle("bound")
    result = execute_logical_robot_plans(
        previous.genesis.evolved_compilation,
        previous.plans,
        (EmptyTool(),),
        policy=LogicalRobotPolicy(max_steps=1),
    )
    assert len(result.attempts) <= 1
    assert result.resumable is True


def test_duplicate_tool_ids_fail_closed():
    compilation = compile_problem_frame(scene_frame(mission_id="tools"))
    tool = StaticTool("same", ("search",))
    with pytest.raises(LogicalRobotError, match="tool ids must be unique"):
        execute_logical_robot_plans(compilation, (manual_plan(),), (tool, tool))


def test_unknown_tool_capability_fails_closed():
    @dataclass
    class BadTool:
        tool_id: str = "bad"
        capabilities: tuple[str, ...] = ("delete-world",)
        def observe(self, request):
            return LogicalRobotToolResult()

    compilation = compile_problem_frame(scene_frame(mission_id="bad-cap"))
    with pytest.raises(LogicalRobotError, match="unsupported capabilities"):
        execute_logical_robot_plans(compilation, (manual_plan(),), (BadTool(),))


def test_full_logical_robot_cycle_returns_evidence_to_qcds_resume_loop():
    previous = waiting_cycle("full-cycle")
    result = run_logical_robot_cycle(
        previous,
        challenge_suite_for_scene(),
        (StaticTool("web", ("search",), source_id="independent-web"),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    assert result.robot.evidence_results
    assert result.resumed_cycle is not None
    assert result.resumed_cycle.cycle_index == previous.cycle_index + 1
    assert any(
        claim.source_id == "independent-web"
        for claim in result.resumed_cycle.genesis.evolved_compilation.canonical_frame.claims
    )
    assert result.provenance["all_prior_builds_retained"] is True


def test_no_new_logical_evidence_does_not_busy_loop_qcds():
    previous = waiting_cycle("no-evidence")
    result = run_logical_robot_cycle(previous, challenge_suite_for_scene(), (EmptyTool(),))
    assert result.resumed_cycle is None
    assert result.robot.resumable is True
    assert result.provenance["reason"] == "no_new_evidence"


def test_terminal_build13_checkpoint_cannot_drive_robot():
    compilation = compile_problem_frame(scene_frame(mission_id="terminal"))
    terminal = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
        explicit_terminal=True,
    )
    with pytest.raises(LogicalRobotError, match="terminal BUILD 13 checkpoint"):
        run_logical_robot_cycle(terminal, challenge_suite_for_scene(), (StaticTool("web", ("search",)),))


def test_logical_robot_never_marks_observation_as_external_truth():
    previous = waiting_cycle("truth-boundary")
    result = execute_logical_robot_plans(
        previous.genesis.evolved_compilation,
        previous.plans,
        (StaticTool("web", ("search",), source_id="source-truth-test"),),
    )
    assert result.provenance["observations_are_external_truth_claims"] is False
    assert result.evidence_results[0].provenance["external_truth_claim"] is False


def test_logical_robot_runtime_does_not_modify_canonical_spec():
    previous = waiting_cycle("canon")
    result = execute_logical_robot_plans(
        previous.genesis.evolved_compilation,
        previous.plans,
        (StaticTool("web", ("search",), source_id="source-canon"),),
    )
    assert result.provenance["canonical_spec_modified"] is False
