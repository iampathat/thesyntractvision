from __future__ import annotations

import csv
from pathlib import Path

from qcds_fabric.first_logical_robot import WebDocument, WebReference
from qcds_fabric.logical_robot import LogicalRobotRequest
from qcds_fabric.logical_space import (
    CsvLogicalSpace,
    LogicalBinding,
    LogicalSpaceExtractor,
    LogicalSpaceWebRobotTool,
    PersistentLogicalSpaceTool,
    bindings_from_run,
    run_logical_space_robot_spec,
)


class FakeSearchBackend:
    backend_id = "fake_search"

    def __init__(self, references):
        self.references = tuple(references)
        self.queries = []

    def search(self, query: str, *, limit: int):
        self.queries.append(query)
        return self.references[:limit]


class FakeReadBackend:
    backend_id = "fake_read"

    def __init__(self, documents):
        self.documents = {doc.reference.reference_id: doc for doc in documents}

    def read(self, reference: WebReference, *, max_chars: int):
        return self.documents[reference.reference_id]


def request(query_id="capital", capability="read"):
    values = {
        "capital": ("paris", "lyon"),
        "language": ("french", "german"),
    }
    dimensions = {
        "capital": ("problem::france::capital::paris", "problem::france::capital::lyon"),
        "language": ("problem::france::language::french", "problem::france::language::german"),
    }
    return LogicalRobotRequest(
        request_id=f"req:{query_id}:{capability}",
        plan_id="plan:1",
        evidence_action_id=f"action:{query_id}",
        capability=capability,
        objective="Acquire discriminating logical evidence",
        query_ids=(query_id,),
        dimension_ids=dimensions[query_id],
        candidate_values={query_id: values[query_id]},
        independent_source_required=True,
        attempt=1,
        provenance={"challenge_target_visible": False, "holdout_visible": False},
    )


def test_logical_extractor_rejects_page_level_mention_voting():
    ref = WebReference("lyon-page", "Lyon", "https://en.wikipedia.org/?curid=1")
    doc = WebDocument(
        ref,
        "Lyon is a major city in France. Lyon Lyon Lyon Lyon Lyon. Paris is the capital of France.",
    )
    observations = LogicalSpaceExtractor().extract(request(), (doc,))
    assert [item.observed_value for item in observations] == ["paris"]
    assert observations[0].provenance["page_level_mention_voting"] is False


def test_logical_extractor_requires_subject_dimension_and_candidate_in_one_sentence():
    ref = WebReference("split", "France", "https://en.wikipedia.org/?curid=2")
    doc = WebDocument(ref, "France is in Europe. Paris is famous. A capital is a seat of government.")
    assert LogicalSpaceExtractor().extract(request(), (doc,)) == ()


def test_logical_extractor_accepts_explicit_logical_binding():
    ref = WebReference("paris", "Paris", "https://en.wikipedia.org/?curid=3")
    doc = WebDocument(ref, "Paris is the capital and largest city of France.")
    observations = LogicalSpaceExtractor().extract(request(), (doc,))
    assert len(observations) == 1
    assert observations[0].observed_value == "paris"
    assert tuple(observations[0].provenance["logical_terms"]) == ("france", "capital", "paris")
    assert "Paris is the capital" in observations[0].excerpt


def test_logical_extractor_handles_another_dimension_without_relation_taxonomy():
    ref = WebReference("france", "France", "https://en.wikipedia.org/?curid=4")
    doc = WebDocument(ref, "French is the official language of France.")
    observations = LogicalSpaceExtractor().extract(request("language"), (doc,))
    assert len(observations) == 1
    assert observations[0].observed_value == "french"
    assert tuple(observations[0].provenance["logical_terms"]) == ("france", "language", "french")


def test_logical_extractor_preserves_supported_conflict_instead_of_voting():
    ref = WebReference("conflict", "Conflicting source", "https://en.wikipedia.org/?curid=5")
    doc = WebDocument(ref, "Paris is the capital of France. Lyon is the capital of France according to this conflicting statement.")
    observations = LogicalSpaceExtractor().extract(request(), (doc,))
    assert {item.observed_value for item in observations} == {"paris", "lyon"}


def test_logical_binding_accepts_open_ended_terms():
    binding = LogicalBinding(
        "b1",
        ("stone_8421", "stone_8422", "distance", "7.3 mm"),
        "sensor:demo",
        0.9,
    )
    assert binding.terms[-1] == "7.3 mm"


def test_csv_logical_space_is_human_readable_and_global(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    binding = LogicalBinding(
        "b1", ("paris", "capital", "france"), "source:1", 0.9,
        source_uri="https://example.test/1", mission_id="mission-a",
    )
    assert space.append((binding,)) == 1
    assert space.append((binding,)) == 0
    text = space.path.read_text(encoding="utf-8")
    assert "paris" in text and "capital" in text and "france" in text
    assert space.path == Path(tmp_path) / "logical_space.csv"


def test_logical_space_query_is_order_independent(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    space.append((LogicalBinding("b1", ("france", "capital", "paris"), "source:1", 0.91),))
    assert space.query("paris", "france")
    assert space.query("capital", "paris", "france")
    assert not space.query("lyon", "capital", "france")


def test_persistent_logical_space_tool_reuses_original_source_not_fake_new_truth(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    space.append((LogicalBinding(
        "b1", ("france", "capital", "paris"), "wikipedia:paris", 0.9,
        source_uri="https://en.wikipedia.org/wiki/Paris", mission_id="old-mission",
        provenance={"external_truth_claim": False},
    ),))
    result = PersistentLogicalSpaceTool(space).observe(request(capability="query"))
    assert len(result.observations) == 1
    observation = result.observations[0]
    assert observation.observed_value == "paris"
    assert observation.source_id == "wikipedia:paris"
    assert observation.provenance["logical_space_reuse"] is True
    assert observation.provenance["source_is_external_truth_claim"] is False


def test_persistent_logical_space_tool_falls_through_when_unknown(tmp_path):
    result = PersistentLogicalSpaceTool(CsvLogicalSpace(tmp_path)).observe(request(capability="query"))
    assert result.observations == ()
    assert result.retry_capabilities == ("search",)
    assert result.exhausted is True


def spec(mission_id="logical-space-demo"):
    return {
        "problem": {
            "mission_id": mission_id,
            "raw_text": "Acquire externally supported logic about France.",
            "analyzer_id": "build17-test",
            "queries": [
                {
                    "query_id": "capital",
                    "subject": "france",
                    "predicate": "capital",
                    "candidate_values": ["paris", "lyon"],
                    "original_text": "What is the capital of France?",
                },
                {
                    "query_id": "language",
                    "subject": "france",
                    "predicate": "language",
                    "candidate_values": ["french", "german"],
                    "original_text": "Which represented language candidate applies to France?",
                },
            ],
            "claims": [],
            "rules": [],
        },
        "challenge": {
            "suite_id": "selection",
            "cases": [
                {
                    "case_id": "selection-reference",
                    "role": "selection",
                    "expected_assignments": {"capital": "paris", "language": "french"},
                }
            ],
        },
        "failure_observations": [
            {
                "observation_id": "needs-observation",
                "kind": "prediction_failure",
                "query_ids": ["capital"],
                "severity": 1.0,
                "description": "Target-blind request for external observation.",
            }
        ],
    }


def test_end_to_end_robot_persists_logical_space(tmp_path):
    ref = WebReference("source:france", "Paris", "https://en.wikipedia.org/?curid=9")
    doc = WebDocument(ref, "Paris is the capital and largest city of France.")
    web = LogicalSpaceWebRobotTool(
        search_backend=FakeSearchBackend((ref,)),
        read_backend=FakeReadBackend((doc,)),
    )
    result = run_logical_space_robot_spec(spec(), store_path=tmp_path, web_tool=web, max_runtime_cycles=1)
    assert result.acquired_evidence_ids
    space = CsvLogicalSpace(tmp_path)
    matches = space.query("france", "capital", "paris")
    assert len(matches) == 1
    assert matches[0].mission_id == "logical-space-demo"


def test_logical_space_survives_new_mission_and_is_shared(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    space.append((LogicalBinding("b1", ("paris", "city"), "source:city", 0.9, mission_id="mission-a"),))
    again = CsvLogicalSpace(tmp_path)
    assert again.query("paris", "city")[0].mission_id == "mission-a"
    assert "mission-a" not in str(again.path)


def test_end_to_end_rejects_lyon_false_positive_from_live_failure_shape(tmp_path):
    lyon_ref = WebReference("source:lyon", "Lyon", "https://en.wikipedia.org/?curid=10")
    paris_ref = WebReference("source:paris", "Paris", "https://en.wikipedia.org/?curid=11")
    docs = (
        WebDocument(lyon_ref, "Lyon is a city in France. Lyon Lyon Lyon Lyon. Paris is mentioned elsewhere."),
        WebDocument(paris_ref, "Paris is the capital of France."),
    )
    web = LogicalSpaceWebRobotTool(
        search_backend=FakeSearchBackend((lyon_ref, paris_ref)),
        read_backend=FakeReadBackend(docs),
    )
    result = run_logical_space_robot_spec(spec("no-lyon-vote"), store_path=tmp_path, web_tool=web, max_runtime_cycles=1)
    evidence_path = Path(result.final_state.directory) / "evidence.csv"
    rows = list(csv.DictReader(evidence_path.open(encoding="utf-8")))
    assert {row["observed_value"] for row in rows} == {"paris"}
    assert CsvLogicalSpace(tmp_path).query("france", "capital", "lyon") == ()


def test_bindings_from_run_preserves_provenance(tmp_path):
    ref = WebReference("source:france", "Paris", "https://en.wikipedia.org/?curid=12")
    doc = WebDocument(ref, "Paris is the capital of France.")
    web = LogicalSpaceWebRobotTool(
        search_backend=FakeSearchBackend((ref,)),
        read_backend=FakeReadBackend((doc,)),
    )
    run = run_logical_space_robot_spec(spec("binding-provenance"), store_path=tmp_path, web_tool=web, max_runtime_cycles=1)
    bindings = bindings_from_run(run)
    assert bindings
    assert bindings[0].source_id == "source:france"
    assert bindings[0].source_uri == ref.url
    assert bindings[0].provenance["canonical_spec_modified"] is False


def test_logical_space_is_not_oracle_population(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    space.append((LogicalBinding("b1", ("paris", "city"), "source:1", 0.9),))
    assert space.query("paris", "city")
    assert not (Path(tmp_path) / "current_oracles.csv").exists()


def test_extractor_is_target_and_holdout_blind():
    ref = WebReference("source:1", "Paris", "https://en.wikipedia.org/?curid=13")
    obs = LogicalSpaceExtractor().extract(request(), (WebDocument(ref, "Paris is the capital of France."),))[0]
    assert obs.provenance["target_visible_to_extractor"] is False
    assert obs.provenance["holdout_visible_to_extractor"] is False
    assert obs.provenance["semantic_invention"] is False
