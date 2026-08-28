import pytest

from qcds_fabric import (
    ContinuationPolicy,
    DisagreementEvidencePlanner,
    EvidenceAcquisitionResult,
    EvidencePlanningConfig,
    EvidencePlanningError,
    FabricLayer,
    OracleChallengeSuite,
    OracleEvolutionConfig,
    OracleFailureObservation,
    OracleGapDiscoveryConfig,
    PairwiseSemanticRuleGenesisGenerator,
    ProblemQuery,
    SemanticClaim,
    SemanticProblemFrame,
    StatevectorGroverSubstrate,
    apply_evidence_results,
    challenge_case_from_problem,
    compile_problem_frame,
    resume_evidence_planning_cycle,
    run_evidence_planning_cycle,
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
    return OracleGapDiscoveryConfig(
        include_contradiction_resolution=False,
        include_null_influence=False,
    )


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


def driver_failure(kind="prediction_failure"):
    return OracleFailureObservation(
        f"driver-{kind}",
        kind,
        query_ids=("driver",),
        severity=1.0,
    )


def rejecting_evolution_config():
    return OracleEvolutionConfig(
        evaluation_mode="baseline",
        max_generations=1,
        min_selection_mean_l1_improvement=10.0,
    )


def test_evidence_planning_config_is_bounded():
    with pytest.raises(ValueError, match="bounds must be positive"):
        EvidencePlanningConfig(max_plans=0)
    with pytest.raises(ValueError, match="evaluation_mode"):
        EvidencePlanningConfig(evaluation_mode="oracle")


def test_no_gap_is_quiescent_but_not_terminal():
    compilation = compile_problem_frame(scene_frame(mission_id="quiet"))
    result = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    assert result.genesis.stopped_reason == "no_oracle_gaps"
    assert result.checkpoint.status == "quiescent"
    assert result.checkpoint.resumable is True
    assert result.checkpoint.terminal is False
    assert "new_evidence" in result.checkpoint.resume_triggers


def test_no_promotable_hypothesis_becomes_awaiting_evidence_not_dead_end():
    compilation = compile_problem_frame(scene_frame(mission_id="waiting"))
    result = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    assert result.genesis.stopped_reason == "no_promotable_hypotheses"
    assert result.genesis.promotion_count == 0
    assert result.plans
    assert result.checkpoint.status == "awaiting_evidence"
    assert result.checkpoint.resumable is True
    assert result.checkpoint.terminal is False


def test_evidence_plan_is_target_blind_and_does_not_execute_action():
    compilation = compile_problem_frame(scene_frame(mission_id="blind-plan"))
    result = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    plan = result.plans[0]
    assert plan.provenance["challenge_targets_used"] is False
    assert plan.provenance["holdout_used"] is False
    assert plan.provenance["physical_action_executed"] is False
    assert plan.actions[0].provenance["expected_answer_in_plan"] is False
    assert not hasattr(plan.actions[0], "expected_value")
    assert not hasattr(plan.actions[0], "target_distribution")


def test_prediction_failure_prefers_independent_observation_action():
    compilation = compile_problem_frame(scene_frame(mission_id="observe"))
    result = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure("prediction_failure"),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    assert result.plans[0].actions[0].action_kind == "independent_observation"
    assert result.plans[0].actions[0].independent_source_required is True


def test_expansion_failure_prefers_validation_experiment_action():
    compilation = compile_problem_frame(scene_frame(mission_id="experiment"))
    result = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure("expansion_failure"),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    assert result.plans[0].actions[0].action_kind == "validation_experiment"


def test_default_plan_requires_external_execution_authorization():
    compilation = compile_problem_frame(scene_frame(mission_id="auth"))
    result = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    assert all(action.execution_authorization_required for action in result.plans[0].actions)


def test_planner_can_record_pre_authorized_execution_without_executing_it():
    compilation = compile_problem_frame(scene_frame(mission_id="preauth"))
    result = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
        planning_config=EvidencePlanningConfig(physical_execution_authorized=True),
    )
    assert all(not action.execution_authorization_required for action in result.plans[0].actions)
    assert result.provenance["physical_actions_executed"] is False


def test_hypothesis_disagreement_produces_positive_discrimination_score():
    compilation = compile_problem_frame(scene_frame(mission_id="discriminate"))
    result = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    plan = result.plans[0]
    assert plan.expected_discrimination_score > 0
    assert "driver" in plan.need.query_ids
    assert plan.hypothesis_ids


def test_planning_threshold_can_leave_cycle_quiescent_but_resumable():
    compilation = compile_problem_frame(scene_frame(mission_id="high-threshold"))
    result = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
        planning_config=EvidencePlanningConfig(min_discrimination_l1=10.0),
    )
    assert result.plans == ()
    assert result.checkpoint.status == "quiescent"
    assert result.checkpoint.resumable is True


def test_explicit_terminal_is_the_only_non_resumable_checkpoint_path():
    compilation = compile_problem_frame(scene_frame(mission_id="terminal"))
    result = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
        explicit_terminal=True,
    )
    assert result.checkpoint.status == "terminal"
    assert result.checkpoint.terminal is True
    assert result.checkpoint.resumable is False
    assert result.checkpoint.reason == "explicit_terminal_request"


def test_apply_evidence_results_adds_source_attributed_claim_and_recompiles():
    compilation = compile_problem_frame(scene_frame(mission_id="ingest"))
    updated = apply_evidence_results(
        compilation,
        (EvidenceAcquisitionResult("obs-1", "driver", "alice", "independent-camera", 0.91),),
    )
    claims = updated.canonical_frame.claims
    assert any(claim.source_id == "independent-camera" and claim.value == "alice" for claim in claims)
    assert updated.canonical_frame.provenance["build13_evidence_results"] == ("obs-1",)
    assert updated.bundle.width == compilation.bundle.width


def test_evidence_ingestion_rejects_unknown_query():
    compilation = compile_problem_frame(scene_frame(mission_id="bad-query"))
    with pytest.raises(EvidencePlanningError, match="non-executable query"):
        apply_evidence_results(
            compilation,
            (EvidenceAcquisitionResult("obs", "missing", "alice", "sensor"),),
        )


def test_evidence_ingestion_rejects_unrepresented_value_instead_of_inventing_dimension():
    compilation = compile_problem_frame(scene_frame(mission_id="new-value"))
    with pytest.raises(EvidencePlanningError, match="outside represented candidates"):
        apply_evidence_results(
            compilation,
            (EvidenceAcquisitionResult("obs", "driver", "charlie", "sensor"),),
        )


def test_duplicate_evidence_result_ids_fail_closed():
    compilation = compile_problem_frame(scene_frame(mission_id="duplicate"))
    result = EvidenceAcquisitionResult("same", "driver", "alice", "sensor")
    with pytest.raises(EvidencePlanningError, match="ids must be unique"):
        apply_evidence_results(compilation, (result, result))


def test_resume_requires_new_information_or_explicit_replan_trigger():
    compilation = compile_problem_frame(scene_frame(mission_id="resume-guard"))
    previous = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    with pytest.raises(EvidencePlanningError, match="must not busy-loop"):
        resume_evidence_planning_cycle(previous, challenge_suite_for_scene())


def test_quiescent_checkpoint_resumes_when_new_failure_observation_arrives():
    compilation = compile_problem_frame(scene_frame(mission_id="wake-failure"))
    previous = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    resumed = resume_evidence_planning_cycle(
        previous,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    assert resumed.cycle_index == previous.cycle_index + 1
    assert resumed.checkpoint.status == "awaiting_evidence"
    assert resumed.checkpoint.resumable is True


def test_waiting_checkpoint_resumes_with_new_evidence_and_preserves_source():
    compilation = compile_problem_frame(scene_frame(mission_id="wake-evidence"))
    previous = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    resumed = resume_evidence_planning_cycle(
        previous,
        challenge_suite_for_scene(),
        evidence_results=(EvidenceAcquisitionResult("obs-new", "driver", "alice", "lab-2", 0.93),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    assert resumed.cycle_index == 1
    assert any(claim.source_id == "lab-2" for claim in resumed.genesis.evolved_compilation.canonical_frame.claims)
    assert resumed.checkpoint.resumable is True


def test_terminal_checkpoint_refuses_resume():
    compilation = compile_problem_frame(scene_frame(mission_id="cannot-wake"))
    previous = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
        explicit_terminal=True,
    )
    with pytest.raises(EvidencePlanningError, match="cannot be resumed"):
        resume_evidence_planning_cycle(
            previous,
            challenge_suite_for_scene(),
            force_replan=True,
        )


def test_force_replan_wakes_nonterminal_checkpoint_without_busy_looping_automatically():
    compilation = compile_problem_frame(scene_frame(mission_id="manual-replan"))
    previous = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    resumed = resume_evidence_planning_cycle(
        previous,
        challenge_suite_for_scene(),
        force_replan=True,
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    assert resumed.cycle_index == 1
    assert resumed.checkpoint.resumable is True


def test_successful_oracle_promotion_checkpoint_is_active_not_terminal():
    compilation = compile_problem_frame(scene_frame(mission_id="promote"))
    result = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=OracleEvolutionConfig(evaluation_mode="baseline", max_generations=1),
    )
    assert result.genesis.promotion_count == 1
    assert result.plans == ()
    assert result.checkpoint.status == "active"
    assert result.checkpoint.resumable is True


def test_build13_runs_with_statevector_substrate():
    compilation = compile_problem_frame(scene_frame(mission_id="statevector-plan"))
    layer = FabricLayer(kernel=StatevectorGroverSubstrate(iterations=1))
    result = run_evidence_planning_cycle(
        compilation,
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
        fabric_layer=layer,
    )
    assert result.plans
    assert result.genesis.inference.suite.baseline_view.substrate_target == "statevector_grover_simulator"
    assert result.provenance["canonical_spec_modified"] is False


def test_continuation_policy_keeps_multiple_external_wake_paths():
    policy = ContinuationPolicy()
    assert set(policy.resume_triggers) >= {
        "new_evidence",
        "new_failure_observation",
        "new_expansion_result",
        "oracle_population_change",
        "manual_resume",
    }
    assert policy.auto_retry_without_new_signal is False
