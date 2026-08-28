from qcds_fabric import (
    CsvIntelligenceStore,
    OracleChallengeSuite,
    OracleEvolutionConfig,
    OracleFailureObservation,
    OracleGapDiscoveryConfig,
    ProblemQuery,
    SemanticClaim,
    SemanticProblemFrame,
    SuperintelligenceRuntime,
    challenge_case_from_problem,
    compile_problem_frame,
)


def frame(color="red", mission_id="persistent-version"):
    return SemanticProblemFrame(
        mission_id=mission_id,
        raw_text="scene",
        queries=(
            ProblemQuery("car-color", "car", "color", ("red", "blue")),
            ProblemQuery("driver", "driver", "identity", ("alice", "bob")),
        ),
        claims=(SemanticClaim("car", "color", color, f"camera-{color}", 0.95),),
        analyzer_id="test",
    )


def suite():
    red = compile_problem_frame(frame("red", "pv-red"))
    blue = compile_problem_frame(frame("blue", "pv-blue"))
    return OracleChallengeSuite("pv-suite", (
        challenge_case_from_problem(
            red, population_oracle_ids=(), expected_assignments={"car-color": "red", "driver": "alice"},
            case_id="red", role="selection",
        ),
        challenge_case_from_problem(
            blue, population_oracle_ids=(), expected_assignments={"car-color": "blue", "driver": "bob"},
            case_id="blue", role="holdout",
        ),
    ))


def discovery():
    return OracleGapDiscoveryConfig(include_contradiction_resolution=False, include_null_influence=False)


def test_persistent_population_version_extends_on_promotion_and_survives_no_change_cycle(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(frame())
    failure = OracleFailureObservation("f", "prediction_failure", query_ids=("driver",))
    promoted = runtime.step(
        "persistent-version", suite(), observations=(failure,), discovery_config=discovery(),
        evolution_config=OracleEvolutionConfig(evaluation_mode="baseline", max_generations=1),
    )
    promoted_identity = promoted.state.oracle_stack_identity
    assert "+c0.1" in promoted_identity

    restarted = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    quiet = restarted.step(
        "persistent-version", suite(), discovery_config=discovery(),
        evolution_config=OracleEvolutionConfig(
            evaluation_mode="baseline", max_generations=1, min_selection_mean_l1_improvement=10.0
        ),
    )
    assert quiet.state.oracle_stack_identity == promoted_identity
