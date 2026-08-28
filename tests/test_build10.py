import math

import pytest

from qcds_fabric import (
    ExpansionSpec,
    FabricLayer,
    OntologyMap,
    OracleStack,
    ProblemQuery,
    SemanticAtom,
    SemanticClaim,
    SemanticCompileError,
    SemanticEntity,
    SemanticProblemFrame,
    SemanticRelation,
    SemanticRule,
    StatevectorGroverSubstrate,
    compile_problem_frame,
    problem_to_syntract,
    run_problem_compilation,
    run_problem_text,
    run_syntract_expansion,
)


def candidate_map(items):
    return {item.value: item.probability for item in items}


def two_query_frame(*, rules=(), ontology=None, unresolved=()):
    return SemanticProblemFrame(
        mission_id="scene",
        raw_text="structured scene",
        queries=(
            ProblemQuery("car-color", "car", "color", ("red", "blue")),
            ProblemQuery("driver", "driver", "identity", ("alice", "bob")),
        ),
        claims=(SemanticClaim("car", "color", "red", "camera", 0.95),),
        rules=tuple(rules),
        ontology=ontology or OntologyMap(),
        unresolved=tuple(unresolved),
        analyzer_id="external:test",
    )


def test_multiple_queries_share_one_joint_problem_space():
    compilation = compile_problem_frame(two_query_frame())
    assert compilation.executable
    assert set(compilation.executable_query_ids) == {"car-color", "driver"}
    assert compilation.provenance["logical_width"] == 4
    assert compilation.provenance["candidate_binary_space"] == "2^4"
    assert compilation.query_groups["car-color"] == "car::color"
    assert compilation.query_groups["driver"] == "driver::identity"


def test_cross_query_causal_rule_changes_second_query_distribution():
    rule = SemanticRule(
        "red-implies-alice",
        SemanticAtom("car", "color", "red"),
        SemanticAtom("driver", "identity", "alice"),
        kind="implies",
        relation_class="causal",
        source_id="case-model",
    )
    result = problem_to_syntract(two_query_frame(rules=(rule,)))
    driver = candidate_map(result.inference.baseline_queries["driver"])
    assert driver["alice"] > driver["bob"]
    assert result.compilation.provenance["causal_rule_count"] == 1
    assert result.inference.provenance["cross_query_rules_active"] is True


def test_temporal_rule_is_explicit_logic_not_hidden_world_model():
    frame = SemanticProblemFrame(
        mission_id="temporal",
        raw_text="structured temporal case",
        queries=(
            ProblemQuery("door", "door", "state", ("open", "closed")),
            ProblemQuery("alarm", "alarm", "state", ("on", "off")),
        ),
        claims=(SemanticClaim("door", "state", "open", "sensor", 0.95),),
        rules=(
            SemanticRule(
                "open-before-alarm-off-invalid",
                SemanticAtom("door", "state", "open"),
                SemanticAtom("alarm", "state", "off"),
                kind="excludes",
                relation_class="temporal",
                source_id="timeline",
            ),
        ),
        analyzer_id="external:test",
    )
    result = problem_to_syntract(frame)
    alarm = candidate_map(result.inference.baseline_queries["alarm"])
    assert alarm["on"] > alarm["off"]
    assert result.compilation.provenance["temporal_rule_count"] == 1
    assert any(oracle_id.startswith("rule:temporal:") for oracle_id in result.compilation.oracle_stack.oracle_ids)


def test_equivalence_rule_can_link_independent_groups():
    frame = SemanticProblemFrame(
        mission_id="equivalence",
        raw_text="structured",
        queries=(
            ProblemQuery("a", "sensor-a", "state", ("active", "inactive")),
            ProblemQuery("b", "sensor-b", "state", ("active", "inactive")),
        ),
        claims=(SemanticClaim("sensor-a", "state", "active", "a", 0.9),),
        rules=(
            SemanticRule(
                "same-state",
                SemanticAtom("sensor-a", "state", "active"),
                SemanticAtom("sensor-b", "state", "active"),
                kind="equivalent",
                source_id="wiring",
            ),
        ),
        analyzer_id="external:test",
    )
    result = problem_to_syntract(frame)
    b = candidate_map(result.inference.baseline_queries["b"])
    assert b["active"] > b["inactive"]


def test_ontology_mapping_canonicalizes_subject_predicate_and_value():
    ontology = OntologyMap(
        subjects={"automobile": "car"},
        predicates={"colour": "color"},
        values={"scarlet": "red"},
        ontology_id="vehicle-v1",
    )
    frame = SemanticProblemFrame(
        mission_id="ontology",
        raw_text="structured",
        queries=(ProblemQuery("q", "automobile", "colour", ("scarlet", "blue")),),
        claims=(SemanticClaim("automobile", "colour", "scarlet", "camera", 0.9),),
        ontology=ontology,
        analyzer_id="external:test",
    )
    compilation = compile_problem_frame(frame)
    assert compilation.query_groups["q"] == "car::color"
    assert compilation.group_values["car::color"] == ("red", "blue")
    assert set(compilation.ontology_applications) == {
        "subject:automobile->car",
        "predicate:colour->color",
        "value:scarlet->red",
    }


def test_declared_entity_registry_and_ontology_targets_are_audited():
    frame = SemanticProblemFrame(
        mission_id="entities",
        raw_text="structured",
        entities=(SemanticEntity("car-1", "Car 1", "vehicle", aliases=("the car",)),),
        queries=(ProblemQuery("q", "the car", "color", ("red", "blue")),),
        claims=(SemanticClaim("the car", "color", "red", "camera", 0.9),),
        ontology=OntologyMap(subjects={"the car": "car-1"}, ontology_id="scene-entities"),
        analyzer_id="external:test",
    )
    result = problem_to_syntract(frame)
    assert result.compilation.query_groups["q"] == "car-1::color"
    assert result.syntract.evidence_provenance["entities"][0]["entity_id"] == "car-1"


def test_ontology_target_must_match_declared_entity_when_registry_is_used():
    frame = SemanticProblemFrame(
        mission_id="bad-entity-map",
        raw_text="structured",
        entities=(SemanticEntity("car-1", "Car 1"),),
        queries=(ProblemQuery("q", "the car", "color", ("red", "blue")),),
        ontology=OntologyMap(subjects={"the car": "car-2"}),
        analyzer_id="external:test",
    )
    with pytest.raises(SemanticCompileError, match="not declared entity ids"):
        compile_problem_frame(frame)


def test_relations_compile_as_source_attributed_propositions():
    frame = SemanticProblemFrame(
        mission_id="relations",
        raw_text="structured",
        queries=(ProblemQuery("where", "car", "location", ("warehouse", "street")),),
        relations=(
            SemanticRelation(
                "car",
                "location",
                "warehouse",
                "gps",
                confidence=0.9,
                relation_class="relational",
            ),
        ),
        analyzer_id="external:test",
    )
    result = problem_to_syntract(frame)
    where = candidate_map(result.inference.baseline_queries["where"])
    assert where["warehouse"] > where["street"]
    assert any(oracle_id.startswith("relation:") for oracle_id in result.compilation.oracle_stack.oracle_ids)
    assert result.syntract.evidence_provenance["relations"][0]["source_id"] == "gps"


def test_relation_temporal_context_survives_binding():
    frame = SemanticProblemFrame(
        mission_id="relation-time",
        raw_text="structured",
        queries=(ProblemQuery("q", "car", "location", ("garage", "road")),),
        relations=(
            SemanticRelation(
                "car",
                "location",
                "garage",
                "camera",
                relation_class="temporal",
                temporal_context="2026-08-28T12:00:00Z",
            ),
        ),
        analyzer_id="external:test",
    )
    result = problem_to_syntract(frame)
    relation = result.syntract.evidence_provenance["relations"][0]
    assert relation["relation_class"] == "temporal"
    assert relation["temporal_context"] == "2026-08-28T12:00:00Z"


def test_blocked_query_does_not_force_invention_for_other_queries():
    frame = SemanticProblemFrame(
        mission_id="partial",
        raw_text="structured",
        queries=(
            ProblemQuery("answerable", "car", "color", ("red", "blue")),
            ProblemQuery("unknown", "engine", "failure-mode", ()),
        ),
        claims=(SemanticClaim("car", "color", "red", "camera", 0.9),),
        analyzer_id="external:test",
    )
    compilation = compile_problem_frame(frame)
    assert compilation.executable
    assert compilation.executable_query_ids == ("answerable",)
    assert "unknown" in compilation.blocked_queries
    result = run_problem_compilation(compilation)
    assert "answerable" in result.stabilized_queries
    assert "unknown" not in result.stabilized_queries


def test_problem_with_only_blocked_queries_fails_closed():
    frame = SemanticProblemFrame(
        mission_id="blocked",
        raw_text="structured",
        queries=(ProblemQuery("q", "unknown", "property", ()),),
        analyzer_id="external:test",
    )
    compilation = compile_problem_frame(frame)
    assert compilation.executable is False
    with pytest.raises(SemanticCompileError, match="not executable"):
        run_problem_compilation(compilation)


def test_rule_referenced_candidate_is_explicit_not_semantic_invention():
    frame = SemanticProblemFrame(
        mission_id="rule-candidate",
        raw_text="structured",
        queries=(ProblemQuery("q", "system", "state", ("safe",)),),
        rules=(
            SemanticRule(
                "safe-implies-stable",
                SemanticAtom("system", "state", "safe"),
                SemanticAtom("system", "state", "stable"),
            ),
        ),
        analyzer_id="external:test",
    )
    compilation = compile_problem_frame(frame)
    assert compilation.group_values["system::state"] == ("safe", "stable")
    assert compilation.provenance["semantic_invention"] is False


def test_problem_adapter_boundary_accepts_external_model_output_without_becoming_core():
    class Adapter:
        adapter_id = "mock-llm-v1"

        def analyze_problem(self, text, *, mission_id):
            return SemanticProblemFrame(
                mission_id=mission_id,
                raw_text=text,
                queries=(ProblemQuery("q", "sample", "status", ("safe", "unsafe")),),
                claims=(SemanticClaim("sample", "status", "safe", "lab", 0.95),),
                analyzer_id=self.adapter_id,
                provenance={"model_output": True},
            )

    result = run_problem_text("Analyze sample", mission_id="adapter", adapter=Adapter())
    assert result.compilation.canonical_frame.analyzer_id == "mock-llm-v1"
    assert result.compilation.provenance["trained_model_required"] is False
    assert result.inference.provenance["answer_is_external_truth_claim"] is False


def test_adapter_returning_wrong_type_fails_closed():
    class BadAdapter:
        adapter_id = "bad"

        def analyze_problem(self, text, *, mission_id):
            return {"mission_id": mission_id}

    with pytest.raises(SemanticCompileError, match="must return SemanticProblemFrame"):
        run_problem_text("x", mission_id="bad", adapter=BadAdapter())


def test_unresolved_content_survives_problem_binding():
    result = problem_to_syntract(two_query_frame(unresolved=("ambiguous pronoun: it",)))
    assert "ambiguous pronoun: it" in result.compilation.unresolved
    assert "ambiguous pronoun: it" in result.syntract.evidence_provenance["unresolved"]


def test_problem_compilation_runs_on_statevector_substrate_without_topology_change():
    layer = FabricLayer(kernel=StatevectorGroverSubstrate(iterations=1))
    result = problem_to_syntract(two_query_frame(), fabric_layer=layer)
    assert result.inference.suite.baseline_view.substrate_target == "statevector_grover_simulator"
    assert math.isclose(sum(result.inference.suite.baseline_distribution.probabilities), 1.0, abs_tol=1e-12)


def test_problem_syntract_can_feed_build8_expansion_directly():
    problem = problem_to_syntract(two_query_frame())
    expansion = run_syntract_expansion(
        problem.syntract,
        ExpansionSpec("investigate", ("inspect_camera",), max_total_width=8),
        OracleStack("proposal", "1", ()),
    )
    assert expansion.compilation.source_syntract_id == problem.syntract.syntract_id
    assert expansion.compilation.provenance["hard_collapse"] is False


def test_width_guard_applies_to_joint_multi_query_space():
    frame = SemanticProblemFrame(
        mission_id="wide",
        raw_text="structured",
        queries=(
            ProblemQuery("a", "a", "state", ("0", "1", "2")),
            ProblemQuery("b", "b", "state", ("0", "1", "2")),
        ),
        analyzer_id="external:test",
    )
    with pytest.raises(SemanticCompileError, match="exceeds max_width"):
        compile_problem_frame(frame, max_width=5)


def test_positive_and_negative_same_proposition_get_explicit_conflict_marker():
    frame = SemanticProblemFrame(
        mission_id="polarity",
        raw_text="structured",
        queries=(ProblemQuery("q", "sample", "status", ("safe", "unsafe")),),
        claims=(
            SemanticClaim("sample", "status", "safe", "a", 0.8, polarity=True),
            SemanticClaim("sample", "status", "safe", "b", 0.8, polarity=False),
        ),
        analyzer_id="external:test",
    )
    compilation = compile_problem_frame(frame)
    assert "semantic_polarity_conflict:sample::status:safe" in compilation.semantic_conflicts


def test_rule_kinds_and_classes_are_fail_closed():
    with pytest.raises(ValueError, match="rule kind"):
        SemanticRule(
            "bad",
            SemanticAtom("a", "x", "1"),
            SemanticAtom("b", "y", "1"),
            kind="magical",
        )
    with pytest.raises(ValueError, match="relation_class"):
        SemanticRule(
            "bad-class",
            SemanticAtom("a", "x", "1"),
            SemanticAtom("b", "y", "1"),
            relation_class="mystical",
        )
