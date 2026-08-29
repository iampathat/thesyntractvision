from __future__ import annotations

import json
import threading
from pathlib import Path
from urllib.request import Request, urlopen

from qcds_fabric.continuous_reality import run_continuous_reality_spec
from qcds_fabric.evidence_driven_reality import observation_pool_tool_from_spec
from qcds_fabric.first_logical_robot import WebDocument, WebReference
from qcds_fabric.logical_robot import LogicalObservation, LogicalRobotRequest, LogicalRobotToolResult
from qcds_fabric.logical_robot_observatory import LogicalRobotEventLog, create_observatory_server
from qcds_fabric.public_web_reality import ContextualPublicWebTool, run_public_web_reality_spec


def winged_spec(*, mission_id: str = "winged-growth", severity: float = 1.0) -> dict:
    return {
        "mission_id": mission_id,
        "probe_terms": ["flies"],
        "reality_bindings": [
            {"binding_id": f"{mission_id}-winged-{i}", "terms": [f"{mission_id}-creature-{i}", "winged"], "source_id": f"seed:{mission_id}:w:{i}"}
            for i in range(2)
        ] + [
            {"binding_id": f"{mission_id}-grounded-{i}", "terms": [f"{mission_id}-ground-{i}", "grounded"], "source_id": f"seed:{mission_id}:g:{i}"}
            for i in range(6)
        ],
        "problem": {
            "mission_id": f"problem-{mission_id}",
            "raw_text": "A winged creature has unresolved movement ability.",
            "analyzer_id": "build23-25-test",
            "queries": [
                {"query_id": "trait", "subject": "creature", "predicate": "trait", "candidate_values": ["winged", "grounded"]},
                {"query_id": "ability", "subject": "creature", "predicate": "ability", "candidate_values": ["flies", "walks", "swims"]},
            ],
            "claims": [
                {"subject": "creature", "predicate": "trait", "value": "winged", "source_id": f"claim:{mission_id}", "confidence": 1.0}
            ],
            "rules": [],
        },
        "failure_observations": [
            {"observation_id": f"fail:{mission_id}", "kind": "prediction_failure", "query_ids": ["ability"], "severity": severity, "description": "Ability unresolved."}
        ],
        "observation_pool": [
            {"observation_id": f"{mission_id}:wa", "query_id": "ability", "observed_value": "flies", "source_id": f"src:{mission_id}:wa", "context": {"trait": "winged"}, "capability": "search", "confidence": 1.0},
            {"observation_id": f"{mission_id}:wb", "query_id": "ability", "observed_value": "flies", "source_id": f"src:{mission_id}:wb", "context": {"trait": "winged"}, "capability": "search", "confidence": 1.0},
            {"observation_id": f"{mission_id}:ga", "query_id": "ability", "observed_value": "walks", "source_id": f"src:{mission_id}:ga", "context": {"trait": "grounded"}, "capability": "search", "confidence": 1.0},
        ],
        "generation": {"max_generations": 1, "max_promotions_per_generation": 1, "selection_independent_sources": 2, "holdout_independent_sources": 1},
    }


def aquatic_spec(*, mission_id: str = "aquatic-growth", severity: float = 0.4) -> dict:
    return {
        "mission_id": mission_id,
        "probe_terms": ["swims"],
        "reality_bindings": [
            {"binding_id": f"{mission_id}-aquatic-{i}", "terms": [f"{mission_id}-animal-{i}", "aquatic"], "source_id": f"seed:{mission_id}:a:{i}"}
            for i in range(2)
        ] + [
            {"binding_id": f"{mission_id}-terrestrial-{i}", "terms": [f"{mission_id}-land-{i}", "terrestrial"], "source_id": f"seed:{mission_id}:t:{i}"}
            for i in range(6)
        ],
        "problem": {
            "mission_id": f"problem-{mission_id}",
            "raw_text": "An aquatic animal has unresolved locomotion.",
            "analyzer_id": "build23-25-test",
            "queries": [
                {"query_id": "habitat", "subject": "animal", "predicate": "habitat", "candidate_values": ["aquatic", "terrestrial"]},
                {"query_id": "locomotion", "subject": "animal", "predicate": "locomotion", "candidate_values": ["swims", "walks", "flies"]},
            ],
            "claims": [
                {"subject": "animal", "predicate": "habitat", "value": "aquatic", "source_id": f"claim:{mission_id}", "confidence": 1.0}
            ],
            "rules": [],
        },
        "failure_observations": [
            {"observation_id": f"fail:{mission_id}", "kind": "prediction_failure", "query_ids": ["locomotion"], "severity": severity, "description": "Locomotion unresolved."}
        ],
        "observation_pool": [
            {"observation_id": f"{mission_id}:aa", "query_id": "locomotion", "observed_value": "swims", "source_id": f"src:{mission_id}:aa", "context": {"habitat": "aquatic"}, "capability": "search", "confidence": 1.0},
            {"observation_id": f"{mission_id}:ab", "query_id": "locomotion", "observed_value": "swims", "source_id": f"src:{mission_id}:ab", "context": {"habitat": "aquatic"}, "capability": "search", "confidence": 1.0},
            {"observation_id": f"{mission_id}:ta", "query_id": "locomotion", "observed_value": "walks", "source_id": f"src:{mission_id}:ta", "context": {"habitat": "terrestrial"}, "capability": "search", "confidence": 1.0},
        ],
        "generation": {"max_generations": 1, "max_promotions_per_generation": 1, "selection_independent_sources": 2, "holdout_independent_sources": 1},
    }


class FakeSearchBackend:
    backend_id = "fake-search"

    def __init__(self) -> None:
        self.queries: list[str] = []

    def search(self, query: str, *, limit: int):
        self.queries.append(query)
        if "france" in query:
            return (
                WebReference("doc:france", "France", "https://example.test/france"),
                WebReference("doc:paris", "Paris", "https://example.test/paris"),
            )
        return (WebReference("doc:germany", "Germany", "https://example.test/germany"),)


class FakeReadBackend:
    backend_id = "fake-read"

    def read(self, reference: WebReference, *, max_chars: int):
        text = {
            "doc:france": "France is a country in Europe. The capital of France is Paris.",
            "doc:paris": "Paris is the capital and largest city of France.",
            "doc:germany": "Germany is a country in Europe. Its capital is Berlin.",
        }[reference.reference_id]
        return WebDocument(reference, text)


class FrontierFixtureTool:
    tool_id = "frontier-fixture"
    capabilities = ("search",)

    def observe(self, request: LogicalRobotRequest) -> LogicalRobotToolResult:
        context = request.provenance.get("build22_context_assignments", {})
        if not isinstance(context, dict):
            return LogicalRobotToolResult(exhausted=True)
        if context == {"trait": "winged"}:
            query_id, value, sources = "ability", "flies", ("fixture:w1", "fixture:w2")
        elif context == {"trait": "grounded"}:
            query_id, value, sources = "ability", "walks", ("fixture:g1",)
        elif context == {"habitat": "aquatic"}:
            query_id, value, sources = "locomotion", "swims", ("fixture:a1", "fixture:a2")
        elif context == {"habitat": "terrestrial"}:
            query_id, value, sources = "locomotion", "walks", ("fixture:t1",)
        else:
            return LogicalRobotToolResult(exhausted=True)
        observations = tuple(
            LogicalObservation(
                observation_id=f"obs:{source}",
                query_id=query_id,
                observed_value=value,
                source_id=source,
                capability="search",
                confidence=1.0,
                polarity=True,
                provenance={"fixture": True, "target_visible": False},
            )
            for source in sources
        )
        return LogicalRobotToolResult(observations=observations, exhausted=False)


def test_build23_observatory_is_manifestation_and_io_only(tmp_path: Path):
    log = LogicalRobotEventLog(tmp_path)
    log.emit("oracle_gap_detected", {"count": 1}, mission_id="m1")
    item = log.enqueue_human_input("/status")
    assert item["input_id"] == 1
    state = log.state()
    assert state["provenance"]["web_page_is_not_the_intelligence"] is True
    assert state["provenance"]["qcds_core_modified"] is False
    assert state["io"]["human_inputs"] == 1
    assert len(log.events()) == 2
    assert not (tmp_path / "logical_rules.csv").exists()


def test_build23_http_manifestation_exposes_state_events_and_io(tmp_path: Path):
    server = create_observatory_server(store_root=tmp_path, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True)
    thread.start()
    host, port = server.server_address[:2]
    try:
        html = urlopen(f"http://{host}:{port}/", timeout=2).read().decode("utf-8")
        assert "The Logical Robot" in html
        state = json.loads(urlopen(f"http://{host}:{port}/api/state", timeout=2).read())
        assert state["manifestation"] == "logical_robot_observatory"
        req = Request(
            f"http://{host}:{port}/api/io",
            data=json.dumps({"text": "hello robot"}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        response = json.loads(urlopen(req, timeout=2).read())
        assert response["text"] == "hello robot"
        events = json.loads(urlopen(f"http://{host}:{port}/api/events?after=0", timeout=2).read())
        assert any(row["event_type"] == "human_input" for row in events["events"])
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def test_build24_contextual_web_body_uses_context_without_hidden_answer():
    search = FakeSearchBackend()
    tool = ContextualPublicWebTool(search_backend=search, read_backend=FakeReadBackend())
    request = LogicalRobotRequest(
        request_id="r1",
        plan_id="p1",
        evidence_action_id="france-context",
        capability="search",
        objective="Acquire an observation",
        query_ids=("capital",),
        dimension_ids=("problem::country::capital::paris",),
        candidate_values={"capital": ("Paris", "Lyon", "Berlin")},
        independent_source_required=True,
        attempt=1,
        provenance={"build22_context_assignments": {"country": "France"}},
    )
    search_result = tool.observe(request)
    assert search_result.discovered_references
    assert "france" in search.queries[0]
    read_request = LogicalRobotRequest(
        request_id="r2",
        plan_id="p1",
        evidence_action_id="france-context",
        capability="read",
        objective=request.objective,
        query_ids=request.query_ids,
        dimension_ids=request.dimension_ids,
        candidate_values=request.candidate_values,
        independent_source_required=True,
        attempt=2,
        provenance=request.provenance,
    )
    result = tool.observe(read_request)
    assert {obs.observed_value for obs in result.observations} == {"Paris"}
    assert len({obs.source_id for obs in result.observations}) == 2
    assert all(obs.provenance["target_visible_to_extractor"] is False for obs in result.observations)
    assert all(obs.provenance["publisher_independence_claim"] is False for obs in result.observations)


def test_build24_routes_observations_through_build22_and_emits_live_events(tmp_path: Path):
    spec = winged_spec()
    tool = observation_pool_tool_from_spec(spec)
    result = run_public_web_reality_spec(spec, store_root=tmp_path, tools=(tool,))
    assert result.status == "expanded"
    assert result.reality_result is not None
    assert result.reality_result.knowledge_gain == 2
    events = LogicalRobotEventLog(tmp_path).events()
    event_types = {event["event_type"] for event in events}
    assert "public_web_reality_cycle_started" in event_types
    assert "rival_hypotheses_generated" in event_types
    assert "challenge_generated_from_observations" in event_types
    assert "rule_promoted" in event_types
    assert "knowledge_change" in event_types


def test_build25_selects_next_gap_by_pressure_not_input_order_and_re_evaluates_frontier(tmp_path: Path):
    low = aquatic_spec(severity=0.4)
    high = winged_spec(severity=1.0)
    spec = {
        "run_id": "continuous-proof",
        "policy": {"max_cycles": 2},
        "missions": [low, high],
    }
    result = run_continuous_reality_spec(spec, store_root=tmp_path, tools=(FrontierFixtureTool(),))
    assert result.cycles == 2
    assert result.selected_missions == (high["mission_id"], low["mission_id"])
    assert result.cycle_statuses == ("expanded", "expanded")
    assert result.remaining_unresolved == ()
    assert result.active_reality_rule_count == 2
    assert result.provenance["execution_order_equals_input_order"] is False
    assert result.provenance["can_invent_unrepresented_missions"] is False
    event_types = [row["event_type"] for row in LogicalRobotEventLog(tmp_path).events()]
    assert event_types.count("frontier_scored") >= 2
    assert event_types.count("frontier_selected") == 2


def test_build25_human_io_can_prioritize_but_not_write_truth(tmp_path: Path):
    low = aquatic_spec(severity=0.2)
    high = winged_spec(severity=1.0)
    log = LogicalRobotEventLog(tmp_path)
    log.enqueue_human_input(f"/run {low['mission_id']}")
    result = run_continuous_reality_spec(
        {"run_id": "human-priority", "policy": {"max_cycles": 1}, "missions": [high, low]},
        store_root=tmp_path,
        tools=(FrontierFixtureTool(),),
    )
    assert result.selected_missions == (low["mission_id"],)
    assert result.cycle_statuses == ("expanded",)
    assert any(row["event_type"] == "frontier_human_priority" for row in log.events())


def test_build25_plain_human_text_is_transparent_input_with_zero_truth_effect(tmp_path: Path):
    log = LogicalRobotEventLog(tmp_path)
    log.enqueue_human_input("I think everything flies")
    result = run_continuous_reality_spec(
        {"run_id": "plain-input", "policy": {"max_cycles": 1}, "missions": [winged_spec()]},
        store_root=tmp_path,
        tools=(FrontierFixtureTool(),),
    )
    assert result.cycle_statuses == ("expanded",)
    events = log.events()
    uncompiled = [row for row in events if row["event_type"] == "human_input_received_uncompiled"]
    assert uncompiled and uncompiled[-1]["payload"]["truth_effect"] == 0
