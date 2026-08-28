import math

import pytest

from qcds_fabric import (
    ControlledEnglishAnalyzer,
    ExpansionSpec,
    FabricLayer,
    OracleStack,
    SemanticClaim,
    SemanticCompileError,
    SemanticFrame,
    SemanticQuery,
    StatevectorGroverSubstrate,
    bind_semantic_result,
    compile_semantic_frame,
    human_to_logic,
    run_human_problem,
    run_semantic_compilation,
    run_syntract_expansion,
)


WITNESS_CASE = (
    "Witness A says the car was red. "
    "Witness B says the car was blue. "
    "What color was the car?"
)


def candidate_map(items):
    return {item.value: item.probability for item in items}


def test_controlled_english_compiles_witness_contradiction_into_logic():
    compilation = human_to_logic(WITNESS_CASE, mission_id="witness")
    assert compilation.executable
    assert compilation.query_group_key == "car::color"
    assert compilation.group_values["car::color"] == ("red", "blue")
    assert len(compilation.group_dimensions["car::color"]) == 2
    assert len(compilation.frame.claims) == 2
    assert compilation.unresolved == ()
    assert any(marker.startswith("semantic_disagreement:car::color") for marker in compilation.semantic_conflicts)


def test_equal_witnesses_remain_tied_instead_of_fake_resolution():
    result = run_human_problem(WITNESS_CASE, mission_id="tie")
    baseline = candidate_map(result.inference.baseline_candidates)
    stabilized = candidate_map(result.inference.stabilized_candidates)
    assert math.isclose(baseline["red"], baseline["blue"], abs_tol=1e-12)
    assert math.isclose(stabilized["red"], stabilized["blue"], abs_tol=1e-12)
    assert set(result.inference.leading_candidates) == {"red", "blue"}
    assert result.syntract.composition_provenance["hard_collapse"] is False


def test_source_confidence_syntax_is_parsed_before_fabric_execution():
    analyzer = ControlledEnglishAnalyzer()
    frame = analyzer.analyze(
        "Witness A [0.90] says the car was red. Witness B [0.60] says the car was blue. What color was the car?",
        mission_id="confidence-parse",
    )
    assert [claim.source_id for claim in frame.claims] == ["Witness A", "Witness B"]
    assert [claim.confidence for claim in frame.claims] == [0.90, 0.60]


def test_source_confidence_changes_baseline_evidence_without_becoming_truth():
    text = (
        "Witness A [0.90] says the car was red. "
        "Witness B [0.60] says the car was blue. "
        "What color was the car?"
    )
    result = run_human_problem(text, mission_id="confidence")
    baseline = candidate_map(result.inference.baseline_candidates)
    assert baseline["red"] > baseline["blue"]
    assert result.inference.provenance["answer_is_external_truth_claim"] is False


def test_unrecognized_language_is_preserved_not_silently_dropped():
    text = (
        "Witness A says the car was red. "
        "The moon whispers algebraically. "
        "What color was the car?"
    )
    compilation = human_to_logic(text, mission_id="unresolved")
    assert compilation.executable
    assert "The moon whispers algebraically." in compilation.unresolved
    assert compilation.provenance["semantic_invention"] is False


def test_problem_without_bounded_query_fails_closed():
    compilation = human_to_logic("Build a mysterious machine from intuition.", mission_id="unknown")
    assert compilation.executable is False
    assert compilation.unresolved
    with pytest.raises(SemanticCompileError, match="not executable"):
        run_semantic_compilation(compilation)


def test_compiler_does_not_invent_unstated_candidate_values():
    compilation = human_to_logic(WITNESS_CASE, mission_id="no-invention")
    assert set(compilation.group_values["car::color"]) == {"red", "blue"}
    assert "green" not in compilation.group_values["car::color"]


def test_structured_frame_can_explicitly_add_candidate_not_present_in_evidence():
    frame = SemanticFrame(
        mission_id="structured-candidates",
        raw_text="external semantic parser output",
        query=SemanticQuery("car", "color", ("red", "blue", "green")),
        claims=(SemanticClaim("car", "color", "red", "sensor-a", 0.8),),
        analyzer_id="external:test",
    )
    compilation = compile_semantic_frame(frame)
    assert compilation.executable
    assert compilation.group_values["car::color"] == ("red", "blue", "green")
    assert compilation.provenance["external_semantic_parser_allowed"] is True


def test_negative_claim_compiles_as_evidence_against_candidate():
    frame = SemanticFrame(
        mission_id="negative",
        raw_text="structured",
        query=SemanticQuery("car", "color", ("red", "blue")),
        claims=(
            SemanticClaim("car", "color", "red", "a", 0.9, polarity=False),
            SemanticClaim("car", "color", "blue", "b", 0.7, polarity=True),
        ),
        analyzer_id="external:test",
    )
    result = run_semantic_compilation(compile_semantic_frame(frame))
    baseline = candidate_map(result.baseline_candidates)
    assert baseline["blue"] > baseline["red"]


def test_one_hot_logic_removes_multi_selected_categorical_states_in_baseline():
    result = run_human_problem(WITNESS_CASE, mission_id="onehot")
    positive_states = [
        state
        for state, probability in zip(result.inference.suite.baseline_distribution.support, result.inference.suite.baseline_distribution.probabilities)
        if probability > 0
    ]
    assert positive_states
    assert all(sum(state) == 1 for state in positive_states)


def test_semantic_oracle_regime_is_replicated_into_null_views():
    result = run_human_problem(WITNESS_CASE, mission_id="oracle-replication")
    expected = result.compilation.oracle_stack.identity
    assert result.inference.suite.baseline_view.active_oracle_stack_version == expected
    null_views = result.inference.suite.families["dimension_null"].views
    assert all(view.active_oracle_stack_version == expected for view in null_views)


def test_structured_semantic_frame_is_model_independent_contract():
    frame = SemanticFrame(
        mission_id="external-frame",
        raw_text="generated elsewhere",
        query=SemanticQuery("sample", "status", ("safe", "unsafe")),
        claims=(SemanticClaim("sample", "status", "safe", "lab", 0.95),),
        unresolved=("parser kept this uncertain phrase",),
        analyzer_id="llm-or-other-parser-v1",
        provenance={"external": True},
    )
    compilation = compile_semantic_frame(frame)
    assert compilation.executable
    assert compilation.frame.analyzer_id == "llm-or-other-parser-v1"
    assert "parser kept this uncertain phrase" in compilation.unresolved


def test_semantic_ingress_can_run_on_statevector_substrate():
    layer = FabricLayer(kernel=StatevectorGroverSubstrate(iterations=1))
    result = run_human_problem(WITNESS_CASE, mission_id="statevector", fabric_layer=layer)
    assert result.inference.suite.baseline_view.substrate_target == "statevector_grover_simulator"
    assert math.isclose(sum(result.inference.suite.baseline_distribution.probabilities), 1.0)


def test_width_guard_blocks_unbounded_semantic_compile():
    frame = SemanticFrame(
        mission_id="wide",
        raw_text="structured",
        query=SemanticQuery("x", "choice", tuple(f"v{i}" for i in range(5))),
        claims=(),
        analyzer_id="external:test",
    )
    with pytest.raises(SemanticCompileError, match="exceeds max_width"):
        compile_semantic_frame(frame, max_width=4)


def test_semantic_syntract_can_feed_build8_expansion_without_retranslation():
    human = run_human_problem(WITNESS_CASE, mission_id="to-expansion")
    expansion = run_syntract_expansion(
        human.syntract,
        ExpansionSpec("next-step", ("inspect_paint",)),
        OracleStack("proposal", "1", ()),
    )
    assert expansion.compilation.source_syntract_id == human.syntract.syntract_id
    assert expansion.compilation.provenance["hard_collapse"] is False
    assert expansion.candidate_branch_count == 2


def test_binding_preserves_semantic_and_unresolved_provenance():
    text = (
        "Witness A says the car was red. "
        "Opaque phrase without grammar. "
        "What color was the car?"
    )
    analyzer = ControlledEnglishAnalyzer()
    frame = analyzer.analyze(text, mission_id="bind")
    inference = run_semantic_compilation(compile_semantic_frame(frame))
    syntract = bind_semantic_result(inference)
    assert syntract.evidence_provenance["final_dimension_ids"] == inference.compilation.bundle.dimension_ids
    assert syntract.evidence_provenance["unresolved"]
    assert syntract.composition_provenance["can_expand"] is True
