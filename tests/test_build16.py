from __future__ import annotations

import csv
import json
from pathlib import Path

import pytest

from qcds_fabric.evidence_planning import EvidenceAction, EvidenceNeed, EvidencePlan
from qcds_fabric.first_logical_robot import (
    CandidateMentionExtractor,
    FirstLogicalRobot,
    FirstLogicalRobotConfig,
    FirstLogicalRobotError,
    HttpWebReadBackend,
    PublicWebLogicalRobotTool,
    WebDocument,
    WebReference,
    WikipediaSearchBackend,
    _domain_allowed,
    _problem_frame_from_spec,
    _search_query,
    challenge_suite_from_spec,
    failure_observations_from_spec,
    html_to_text,
)
from qcds_fabric.intelligence_store import CsvIntelligenceStore
from qcds_fabric.logical_robot import LogicalRobotRequest
from qcds_fabric.oracle_evolution import OracleChallengeSuite, challenge_case_from_problem, extract_problem_rule_population
from qcds_fabric.oracle_genesis import OracleFailureObservation
from qcds_fabric.problem import ProblemQuery, SemanticProblemFrame
from qcds_fabric.runtime import SuperintelligenceRuntime


class FakeResponse:
    def __init__(self, body: bytes, content_type: str = "application/json; charset=utf-8") -> None:
        self.body = body
        self.headers = {"Content-Type": content_type}

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self, size: int = -1) -> bytes:
        return self.body if size < 0 else self.body[:size]


class FakeSearchBackend:
    backend_id = "fake_search"

    def __init__(self, references):
        self.references = tuple(references)
        self.queries = []

    def search(self, query: str, *, limit: int):
        self.queries.append((query, limit))
        return self.references[:limit]


class FakeReadBackend:
    backend_id = "fake_read"

    def __init__(self, documents):
        self.documents = {doc.reference.reference_id: doc for doc in documents}
        self.reads = []

    def read(self, reference: WebReference, *, max_chars: int):
        self.reads.append((reference.reference_id, max_chars))
        return self.documents[reference.reference_id]


def request(capability="read"):
    return LogicalRobotRequest(
        request_id=f"req:{capability}",
        plan_id="plan:1",
        evidence_action_id="action:1",
        capability=capability,
        objective="Acquire independent evidence for the capital of France",
        query_ids=("capital",),
        dimension_ids=("problem::france::capital::paris", "problem::france::capital::lyon"),
        candidate_values={"capital": ("paris", "lyon")},
        independent_source_required=True,
        attempt=1,
        provenance={"challenge_target_visible": False, "holdout_visible": False},
    )


def test_html_to_text_removes_script_and_style():
    value = "<html><style>.x{}</style><body>Hello <b>world</b><script>bad()</script></body></html>"
    assert html_to_text(value) == "Hello world"


def test_domain_allowlist_accepts_subdomain_and_rejects_private_ip():
    assert _domain_allowed("en.wikipedia.org", ("wikipedia.org",)) is True
    assert _domain_allowed("wikipedia.org", ("wikipedia.org",)) is True
    assert _domain_allowed("example.com", ("wikipedia.org",)) is False
    assert _domain_allowed("127.0.0.1", ("127.0.0.1",)) is False


def test_wikipedia_search_is_key_free_and_preserves_reference_provenance():
    payload = {
        "query": {
            "search": [
                {"pageid": 123, "title": "Paris", "snippet": "<span>Capital</span> of France"}
            ]
        }
    }
    seen = {}

    def opener(req, timeout):
        seen["url"] = req.full_url
        seen["timeout"] = timeout
        return FakeResponse(json.dumps(payload).encode())

    backend = WikipediaSearchBackend(language="en", opener=opener)
    refs = backend.search("France capital Paris Lyon", limit=3)
    assert len(refs) == 1
    assert refs[0].reference_id == "wikipedia:en:123"
    assert refs[0].url == "https://en.wikipedia.org/?curid=123"
    assert refs[0].snippet == "Capital of France"
    assert "srsearch=France+capital+Paris+Lyon" in seen["url"]
    assert refs[0].provenance["external_truth_claim"] is False


def test_http_reader_is_read_only_and_strips_html():
    reference = WebReference("wiki:1", "Paris", "https://en.wikipedia.org/?curid=1")

    def opener(req, timeout):
        return FakeResponse(
            b"<html><body>Paris is the capital of France.<script>ignore me</script></body></html>",
            "text/html; charset=utf-8",
        )

    backend = HttpWebReadBackend(opener=opener)
    doc = backend.read(reference, max_chars=1000)
    assert "Paris is the capital of France" in doc.text
    assert "ignore me" not in doc.text
    assert doc.provenance["read_only"] is True


def test_http_reader_blocks_unlisted_domain_before_fetch():
    called = False

    def opener(req, timeout):
        nonlocal called
        called = True
        raise AssertionError("must not fetch")

    backend = HttpWebReadBackend(opener=opener)
    with pytest.raises(FirstLogicalRobotError):
        backend.read(WebReference("x", "X", "https://example.com/x"), max_chars=100)
    assert called is False


def test_candidate_extractor_emits_unique_leader_only():
    reference = WebReference("source:paris", "Paris", "https://en.wikipedia.org/?curid=1")
    doc = WebDocument(reference, "Paris is the capital of France. Paris is widely described as France's capital.")
    observations = CandidateMentionExtractor().extract(request(), (doc,))
    assert len(observations) == 1
    assert observations[0].observed_value == "paris"
    assert observations[0].source_id == "source:paris"
    assert observations[0].confidence > 0.5
    assert observations[0].provenance["target_visible_to_extractor"] is False


def test_candidate_extractor_keeps_ambiguous_source_unresolved():
    reference = WebReference("source:mixed", "Mixed", "https://en.wikipedia.org/?curid=2")
    doc = WebDocument(reference, "Paris and Lyon are both French cities. Paris Lyon.")
    assert CandidateMentionExtractor().extract(request(), (doc,)) == ()


def test_candidate_extractor_preserves_conflicting_sources_separately():
    paris = WebDocument(
        WebReference("source:paris", "Paris", "https://en.wikipedia.org/?curid=1"),
        "Paris Paris is described as the capital.",
    )
    lyon = WebDocument(
        WebReference("source:lyon", "Lyon", "https://en.wikipedia.org/?curid=2"),
        "Lyon Lyon is claimed here to be the capital.",
    )
    observations = CandidateMentionExtractor().extract(request(), (paris, lyon))
    assert {item.observed_value for item in observations} == {"paris", "lyon"}
    assert {item.source_id for item in observations} == {"source:paris", "source:lyon"}


def test_search_query_uses_problem_dimension_semantics_not_expected_answer():
    query = _search_query(request("search"))
    assert "france" in query
    assert "capital" in query
    assert "paris" in query and "lyon" in query


def test_public_web_tool_search_then_read_returns_source_attributed_observation():
    reference = WebReference("source:paris", "Paris", "https://en.wikipedia.org/?curid=1")
    document = WebDocument(reference, "Paris is the capital of France. Paris Paris.")
    search = FakeSearchBackend((reference,))
    read = FakeReadBackend((document,))
    tool = PublicWebLogicalRobotTool(search_backend=search, read_backend=read)

    searched = tool.observe(request("search"))
    assert searched.observations == ()
    assert searched.retry_capabilities == ("read",)
    assert searched.discovered_references == (reference.url,)

    read_result = tool.observe(request("read"))
    assert len(read_result.observations) == 1
    assert read_result.observations[0].observed_value == "paris"
    assert read_result.provenance["external_truth_claim"] is False


def test_public_web_tool_can_read_without_prior_explicit_search():
    reference = WebReference("source:paris", "Paris", "https://en.wikipedia.org/?curid=1")
    document = WebDocument(reference, "Paris Paris capital France.")
    search = FakeSearchBackend((reference,))
    read = FakeReadBackend((document,))
    tool = PublicWebLogicalRobotTool(search_backend=search, read_backend=read)
    result = tool.observe(request("read"))
    assert result.observations[0].observed_value == "paris"
    assert len(search.queries) == 1


def test_public_web_tool_compare_does_not_invent_when_documents_are_ambiguous():
    reference = WebReference("source:mixed", "Mixed", "https://en.wikipedia.org/?curid=1")
    document = WebDocument(reference, "Paris Lyon Paris Lyon")
    tool = PublicWebLogicalRobotTool(
        search_backend=FakeSearchBackend((reference,)),
        read_backend=FakeReadBackend((document,)),
    )
    tool.observe(request("search"))
    tool.observe(request("read"))
    compared = tool.observe(request("compare"))
    assert compared.observations == ()
    assert compared.exhausted is True


def test_problem_spec_is_explicit_and_does_not_invent_candidates():
    spec = {
        "problem": {
            "mission_id": "demo",
            "queries": [
                {"query_id": "capital", "subject": "France", "predicate": "capital", "candidate_values": ["Paris", "Lyon"]}
            ],
        }
    }
    frame = _problem_frame_from_spec(spec)
    assert frame.mission_id == "demo"
    assert frame.queries[0].candidate_values == ("Paris", "Lyon")
    assert frame.provenance["semantic_invention"] is False


def test_failure_observation_spec_is_target_blind():
    spec = {
        "failure_observations": [
            {"observation_id": "f1", "kind": "prediction_failure", "query_ids": ["capital"]}
        ]
    }
    failures = failure_observations_from_spec(spec)
    assert failures[0].query_ids == ("capital",)
    assert failures[0].target_visible_to_discovery is False


def _frame(mission_id="robot-mvp"):
    return SemanticProblemFrame(
        mission_id=mission_id,
        raw_text="Find externally supported information about France.",
        queries=(
            ProblemQuery("capital", "france", "capital", ("paris", "lyon")),
            ProblemQuery("language", "france", "language", ("french", "german")),
        ),
        analyzer_id="test",
    )


def _challenge(runtime, mission_id="robot-mvp"):
    compilation = runtime.compilation(mission_id)
    population = extract_problem_rule_population(compilation)
    case = challenge_case_from_problem(
        compilation,
        population_oracle_ids=population.oracle_ids,
        expected_assignments={"capital": "paris", "language": "french"},
        case_id="selection-only",
        role="selection",
    )
    return OracleChallengeSuite("selection-only-suite", (case,))


def test_challenge_spec_uses_runtime_compilation_and_stays_external(tmp_path):
    store = CsvIntelligenceStore(tmp_path)
    runtime = SuperintelligenceRuntime(store)
    runtime.create_mission(_frame())
    spec = {
        "challenge": {
            "suite_id": "suite",
            "cases": [
                {"case_id": "c1", "role": "selection", "expected_assignments": {"capital": "paris"}}
            ],
        }
    }
    suite = challenge_suite_from_spec(runtime, "robot-mvp", spec)
    assert suite.suite_id == "suite"
    assert suite.cases[0].provenance["target_is_external_reference"] is True


def test_first_logical_robot_calls_runtime_then_observes_and_persists_csv(tmp_path):
    store = CsvIntelligenceStore(tmp_path)
    # BUILD 16 uses this read-only helper to avoid re-ingesting identical web evidence.
    store.evidence_ids = lambda mission_id: {
        row["result_id"]
        for row in store._read_rows(store._path(mission_id, "evidence.csv"))
    }
    runtime = SuperintelligenceRuntime(store)
    runtime.create_mission(_frame())
    challenge = _challenge(runtime)

    reference = WebReference("source:france", "France", "https://en.wikipedia.org/?curid=9")
    document = WebDocument(
        reference,
        "France has Paris as its capital. Paris Paris. French is the official language. French French.",
    )
    tool = PublicWebLogicalRobotTool(
        search_backend=FakeSearchBackend((reference,)),
        read_backend=FakeReadBackend((document,)),
    )
    robot = FirstLogicalRobot(
        runtime,
        (tool,),
        config=FirstLogicalRobotConfig(max_runtime_cycles=1),
    )
    result = robot.run(
        "robot-mvp",
        challenge,
        failure_observations=(OracleFailureObservation("failure-1", "prediction_failure", query_ids=("capital",)),),
    )
    assert result.status == "max_cycles"
    assert result.acquired_evidence_ids
    assert runtime.state("robot-mvp").evidence_count >= 1
    evidence_file = Path(runtime.state("robot-mvp").directory) / "evidence.csv"
    rows = list(csv.DictReader(evidence_file.open(encoding="utf-8")))
    assert rows
    assert rows[0]["source_id"] == "source:france"


def test_first_logical_robot_restart_keeps_build15_intelligence_store(tmp_path):
    store1 = CsvIntelligenceStore(tmp_path)
    runtime1 = SuperintelligenceRuntime(store1)
    runtime1.create_mission(_frame("restart-robot"))
    before = runtime1.state("restart-robot")

    del runtime1
    del store1

    runtime2 = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    after = runtime2.state("restart-robot")
    assert after.oracle_stack_identity == before.oracle_stack_identity
    assert after.directory == before.directory


def test_first_logical_robot_requires_tools(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    with pytest.raises(ValueError):
        FirstLogicalRobot(runtime, ())


def test_robot_policy_still_forbids_external_side_effects():
    from qcds_fabric.logical_robot import LogicalRobotError, LogicalRobotPolicy

    with pytest.raises(LogicalRobotError):
        LogicalRobotPolicy(allow_external_side_effects=True)


def test_web_observation_is_evidence_not_truth():
    reference = WebReference("source:paris", "Paris", "https://en.wikipedia.org/?curid=1")
    doc = WebDocument(reference, "Paris Paris capital.")
    observation = CandidateMentionExtractor().extract(request(), (doc,))[0]
    assert observation.provenance["source_is_external_truth_claim"] is False


def test_logical_robot_is_a_body_not_a_second_qcds_kernel(tmp_path):
    runtime = SuperintelligenceRuntime(CsvIntelligenceStore(tmp_path))
    robot = FirstLogicalRobot(runtime, (PublicWebLogicalRobotTool(
        search_backend=FakeSearchBackend(()), read_backend=FakeReadBackend(())
    ),))
    assert robot.runtime is runtime
    assert not hasattr(robot, "kernel")
    assert not hasattr(robot, "oracle_stack")


def test_evidence_plan_remains_explicit_input_to_logical_body():
    need = EvidenceNeed("need:1", "gap:1", ("capital",), ("d1",), ("h1",), 0.4, ("prediction_failure",), "planned")
    action = EvidenceAction("action:1", "independent_observation", ("capital",), ("d1",), "Find evidence", 0.4)
    plan = EvidencePlan("plan:1", need, (action,), ("h1",), 0.4)
    assert plan.actions[0].objective == "Find evidence"
    assert plan.provenance.get("expected_answer") is None
