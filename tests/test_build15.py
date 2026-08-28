import csv

import pytest

from qcds_fabric.evidence_planning import EvidenceAcquisitionResult, EvidencePlanningConfig
from qcds_fabric.intelligence_store import CsvIntelligenceStore, IntelligenceStoreError
from qcds_fabric.logical_robot import LogicalObservation, LogicalRobotToolResult
from qcds_fabric.oracle_evolution import OracleEvolutionConfig, challenge_case_from_problem
from qcds_fabric.oracle_genesis import OracleFailureObservation, OracleGapDiscoveryConfig
from qcds_fabric.problem import (
    OntologyMap,
    ProblemQuery,
    SemanticAtom,
    SemanticEntity,
    SemanticProblemFrame,
    SemanticRelation,
    SemanticRule,
    compile_problem_frame,
)
from qcds_fabric.runtime import SuperintelligenceRuntime, SuperintelligenceRuntimeError
from qcds_fabric.semantic import SemanticClaim
from qcds_fabric.oracle_evolution import OracleChallengeSuite


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


def external_only_config():
    return OracleGapDiscoveryConfig(include_contradiction_resolution=False, include_null_influence=False)


def driver_failure():
    return OracleFailureObservation("driver-failure", "prediction_failure", query_ids=("driver",), severity=1.0)


def rejecting_evolution_config():
    return OracleEvolutionConfig(
        evaluation_mode="baseline",
        max_generations=1,
        min_selection_mean_l1_improvement=10.0,
    )


class AliceSearchTool:
    tool_id = "alice-search"
    capabilities = ("search",)

    def observe(self, request):
        if "driver" not in request.query_ids:
            return LogicalRobotToolResult(exhausted=True)
        return LogicalRobotToolResult(observations=(LogicalObservation(
            observation_id="web-driver-alice",
            query_id="driver",
            observed_value="alice",
            source_id="source:web:example",
            capability="search",
            confidence=0.91,
            uri="https://example.test/driver",
            excerpt="Independent source identifies Alice.",
        ),))


class EmptySearchTool:
    tool_id = "empty-search"
    capabilities = ("search", "read", "follow", "compare")

    def observe(self, request):
        return LogicalRobotToolResult(exhausted=True)


def read_csv(path):
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def test_csv_store_creates_simple_human_readable_oracle_file(tmp_path):
    store = CsvIntelligenceStore(tmp_path)
    runtime = SuperintelligenceRuntime(store)
    runtime.create_mission(scene_frame(mission_id="visible"))
    path = tmp_path / "visible" / "current_oracles.csv"
    text = path.read_text(encoding="utf-8")
    assert "oracle_id,oracle_type,status" in text
    assert "pickle" not in text.lower()
    assert "base64" not in text.lower()
    rows = read_csv(path)
    assert rows[0]["row_kind"] == "population"


def test_rich_semantic_frame_roundtrips_through_one_readable_mission_csv(tmp_path):
    frame = SemanticProblemFrame(
        mission_id="rich",
        raw_text="rich problem",
        queries=(ProblemQuery("q", "vehicle", "status", ("moving", "stopped")),),
        claims=(SemanticClaim("vehicle", "status", "moving", "sensor", 0.9),),
        entities=(SemanticEntity("vehicle", "Vehicle", "object", ("car",)),),
        relations=(SemanticRelation("vehicle", "near", "station", "map", 0.8, True, "relational", "t0"),),
        rules=(SemanticRule(
            "r1", SemanticAtom("vehicle", "status", "moving"),
            SemanticAtom("vehicle", "status", "stopped"), "excludes", "logical", 0.95, "rulebook",
        ),),
        ontology=OntologyMap(values={"halted": "stopped"}, ontology_id="demo"),
        unresolved=("unknown clause",),
        analyzer_id="adapter:test",
        provenance={"case": "roundtrip"},
    )
    store = CsvIntelligenceStore(tmp_path)
    store.save_frame(frame)
    loaded = store.load_frame("rich")
    assert loaded.mission_id == frame.mission_id
    assert loaded.queries == frame.queries
    assert loaded.claims == frame.claims
    assert loaded.rules == frame.rules
    assert loaded.relations == frame.relations
    assert loaded.entities[0].aliases == ("car",)
    assert loaded.ontology.value("halted") == "stopped"
    assert loaded.unresolved == ("unknown clause",)


def test_runtime_create_mission_persists_empty_evolvable_population_and_history(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    state = runtime.create_mission(scene_frame(mission_id="create"))
    assert state.oracle_count == 0
    history = read_csv(tmp_path / "create" / "oracle_history.csv")
    assert history[0]["event_type"] == "POPULATION_INITIALIZED"
    assert state.cycle_index == -1


def test_runtime_step_promotes_genesis_oracle_and_writes_current_population(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(scene_frame(mission_id="promote"))
    step = runtime.step(
        "promote",
        challenge_suite_for_scene(),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=OracleEvolutionConfig(evaluation_mode="baseline", max_generations=1),
    )
    assert step.cycle.genesis.promotion_count == 1
    assert step.state.oracle_count == 1
    rows = [row for row in read_csv(tmp_path / "promote" / "current_oracles.csv") if row["row_kind"] == "oracle"]
    assert len(rows) == 1
    assert rows[0]["oracle_type"] == "SemanticRuleOracle"
    assert rows[0]["logic"] in {"implies", "excludes", "equivalent"}
    assert rows[0]["antecedent_dimension"]
    assert rows[0]["consequent_dimension"]


def test_oracle_history_is_append_only_and_records_promoted_genesis(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(scene_frame(mission_id="history"))
    runtime.step(
        "history", challenge_suite_for_scene(), observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=OracleEvolutionConfig(evaluation_mode="baseline", max_generations=1),
    )
    before = read_csv(tmp_path / "history" / "oracle_history.csv")
    assert any(row["event_type"] == "GENESIS_PROMOTED" for row in before)
    runtime.step(
        "history", challenge_suite_for_scene(),
        discovery_config=external_only_config(), evolution_config=rejecting_evolution_config(),
    )
    after = read_csv(tmp_path / "history" / "oracle_history.csv")
    assert after[:len(before)] == before


def test_restart_reconstructs_same_active_oracle_population(tmp_path):
    store = CsvIntelligenceStore(tmp_path)
    runtime = SuperintelligenceRuntime(store)
    runtime.create_mission(scene_frame(mission_id="restart"))
    first = runtime.step(
        "restart", challenge_suite_for_scene(), observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=OracleEvolutionConfig(evaluation_mode="baseline", max_generations=1),
    )
    identity = first.state.oracle_stack_identity
    oracle_ids = store.load_oracle_population("restart").oracle_ids

    restarted = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    state = restarted.state("restart")
    compilation = restarted.compilation("restart")
    assert state.oracle_stack_identity == identity
    assert tuple(oracle.oracle_id for oracle in compilation.oracle_stack.oracles if oracle.oracle_id in oracle_ids) == oracle_ids
    assert compilation.provenance["intelligence_store_loaded"] is True


def test_restart_keeps_cycle_counter_and_checkpoint_status(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(scene_frame(mission_id="cycles"))
    first = runtime.step(
        "cycles", challenge_suite_for_scene(),
        discovery_config=external_only_config(), evolution_config=rejecting_evolution_config(),
    )
    assert first.state.cycle_index == 0
    restarted = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    second = restarted.step(
        "cycles", challenge_suite_for_scene(),
        discovery_config=external_only_config(), evolution_config=rejecting_evolution_config(),
    )
    assert second.state.cycle_index == 1
    checkpoints = read_csv(tmp_path / "cycles" / "checkpoints.csv")
    assert [int(row["cycle_index"]) for row in checkpoints] == [0, 1]


def test_observe_persists_evidence_and_updates_frame_for_restart(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(scene_frame(mission_id="evidence"))
    result = EvidenceAcquisitionResult("obs-1", "driver", "alice", "independent-source", 0.92)
    state = runtime.observe("evidence", (result,))
    assert state.evidence_count == 1
    restarted = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    compilation = restarted.compilation("evidence")
    assert any(claim.source_id == "independent-source" and claim.value == "alice" for claim in compilation.canonical_frame.claims)
    evidence = read_csv(tmp_path / "evidence" / "evidence.csv")
    assert evidence[0]["result_id"] == "obs-1"


def test_duplicate_evidence_id_fails_closed(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(scene_frame(mission_id="dup-evidence"))
    result = EvidenceAcquisitionResult("obs", "driver", "alice", "source", 0.9)
    runtime.observe("dup-evidence", (result,))
    with pytest.raises(IntelligenceStoreError, match="duplicate persisted evidence"):
        runtime.observe("dup-evidence", (result,))


def test_observe_rejects_empty_call(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(scene_frame(mission_id="empty-observe"))
    with pytest.raises(SuperintelligenceRuntimeError, match="at least one"):
        runtime.observe("empty-observe", ())


def test_current_oracles_is_snapshot_not_duplicate_append_log(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(scene_frame(mission_id="snapshot"))
    runtime.step(
        "snapshot", challenge_suite_for_scene(), observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=OracleEvolutionConfig(evaluation_mode="baseline", max_generations=1),
    )
    count1 = len(read_csv(tmp_path / "snapshot" / "current_oracles.csv"))
    runtime.step(
        "snapshot", challenge_suite_for_scene(),
        discovery_config=external_only_config(), evolution_config=rejecting_evolution_config(),
    )
    count2 = len(read_csv(tmp_path / "snapshot" / "current_oracles.csv"))
    assert count2 == count1


def test_loaded_compilation_replaces_original_frame_rules_with_persisted_population(tmp_path):
    frame = scene_frame(mission_id="replace-rules")
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(frame)
    runtime.step(
        "replace-rules", challenge_suite_for_scene(), observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=OracleEvolutionConfig(evaluation_mode="baseline", max_generations=1),
    )
    population = runtime.store.load_oracle_population("replace-rules")
    loaded = runtime.compilation("replace-rules")
    loaded_rule_ids = tuple(oracle.oracle_id for oracle in loaded.oracle_stack.oracles if oracle.__class__.__name__ == "SemanticRuleOracle")
    assert loaded_rule_ids == population.oracle_ids


def test_runtime_files_are_ordinary_csv_and_openable_without_python(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(scene_frame(mission_id="ordinary"))
    runtime.observe("ordinary", (EvidenceAcquisitionResult("e", "driver", "alice", "source", 0.9),))
    for name in ("mission.csv", "current_oracles.csv", "oracle_history.csv", "evidence.csv"):
        text = (tmp_path / "ordinary" / name).read_text(encoding="utf-8")
        assert text.splitlines()[0]
        assert "\x00" not in text


def test_mission_id_path_traversal_fails_closed(tmp_path):
    store = CsvIntelligenceStore(tmp_path)
    with pytest.raises(IntelligenceStoreError, match="directory-safe"):
        store.mission_dir("../escape")


def test_logical_robot_can_call_runtime_boundary_and_feed_evidence_back(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(scene_frame(mission_id="robot-call"))
    result = runtime.run_logical_robot_once(
        "robot-call",
        challenge_suite_for_scene(),
        (AliceSearchTool(),),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    assert result.initial_step.cycle.plans
    assert result.robot is not None
    assert result.robot.evidence_results
    assert result.followup_step is not None
    assert result.state.evidence_count == 1
    restarted = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    assert any(claim.source_id == "source:web:example" for claim in restarted.compilation("robot-call").canonical_frame.claims)


def test_logical_robot_source_exhaustion_does_not_force_qcds_rerun(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(scene_frame(mission_id="robot-empty"))
    result = runtime.run_logical_robot_once(
        "robot-empty",
        challenge_suite_for_scene(),
        (EmptySearchTool(),),
        observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=rejecting_evolution_config(),
    )
    assert result.robot is not None
    assert result.robot.status == "awaiting_sources"
    assert result.followup_step is None
    assert result.state.evidence_count == 0


def test_runtime_state_exposes_oracle_identity_counts_and_readable_directory(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    state = runtime.create_mission(scene_frame(mission_id="state"))
    assert state.mission_id == "state"
    assert "evolvable-rules:state@" in state.oracle_stack_identity
    assert state.provenance["human_readable"] is True
    assert state.provenance["pickle_used"] is False
    assert state.directory.endswith("state")


def test_current_oracle_csv_has_no_opaque_parameter_blob(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(scene_frame(mission_id="flat"))
    runtime.step(
        "flat", challenge_suite_for_scene(), observations=(driver_failure(),),
        discovery_config=external_only_config(),
        evolution_config=OracleEvolutionConfig(evaluation_mode="baseline", max_generations=1),
    )
    rows = [row for row in read_csv(tmp_path / "flat" / "current_oracles.csv") if row["row_kind"] == "oracle"]
    assert rows
    row = rows[0]
    for key in ("antecedent_dimension", "consequent_dimension", "logic", "confidence", "source_id"):
        assert row[key]
    assert "parameters" not in row


def test_store_rejects_unsupported_evolvable_oracle_type_instead_of_pickling(tmp_path):
    from qcds_fabric.oracles import ExactOracle, OracleStack

    store = CsvIntelligenceStore(tmp_path)
    store.mission_dir("unsupported")
    with pytest.raises(IntelligenceStoreError, match="supports SemanticRuleOracle"):
        store.save_oracle_population(
            "unsupported", OracleStack("stack", "1", (ExactOracle("x", {"d": 1}),)), generation=0
        )


def test_runtime_max_width_guard_is_preserved(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path), max_width=1)
    with pytest.raises(Exception):
        runtime.create_mission(scene_frame(mission_id="too-wide"))


def test_build15_persistence_does_not_mark_canon_modified(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    runtime.create_mission(scene_frame(mission_id="canon"))
    compilation = runtime.compilation("canon")
    assert compilation.provenance["canonical_spec_modified"] is False
    assert runtime.state("canon").provenance["canonical_spec_modified"] is False
