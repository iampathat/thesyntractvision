from qcds_fabric.first_logical_robot import WebDocument, WebReference
from qcds_fabric.logical_robot import LogicalRobotRequest
from qcds_fabric.logical_space import LogicalSpaceExtractor, LogicalSpaceWebRobotTool


class RecordingSearch:
    backend_id = "recording_search"

    def __init__(self):
        self.queries = []

    def search(self, query: str, *, limit: int):
        self.queries.append(query)
        return ()


class NoRead:
    backend_id = "no_read"

    def read(self, reference, *, max_chars):
        raise AssertionError("no reference should be read")


def request(capability="read"):
    return LogicalRobotRequest(
        request_id="req",
        plan_id="plan",
        evidence_action_id="action",
        capability=capability,
        objective="Find the capital logic for France",
        query_ids=("capital",),
        dimension_ids=("problem::france::capital::paris", "problem::france::capital::lyon"),
        candidate_values={"capital": ("paris", "lyon")},
        independent_source_required=True,
        attempt=1,
        provenance={"challenge_target_visible": False, "holdout_visible": False},
    )


def test_candidate_neutral_search_uses_axis_not_answers():
    search = RecordingSearch()
    tool = LogicalSpaceWebRobotTool(search_backend=search, read_backend=NoRead())
    result = tool.observe(request("search"))
    assert result.observations == ()
    assert search.queries == ["france capital"]
    assert "paris" not in search.queries[0]
    assert "lyon" not in search.queries[0]


def test_html_navigation_cooccurrence_outside_binding_span_is_rejected():
    ref = WebReference("nav", "Borders", "https://en.wikipedia.org/?curid=99")
    filler = " ".join(f"token{i}" for i in range(80))
    doc = WebDocument(
        ref,
        f"France {filler} capital {filler} Lyon",
    )
    assert LogicalSpaceExtractor(max_binding_span_words=32).extract(request(), (doc,)) == ()


def test_compact_binding_survives_span_guard():
    ref = WebReference("paris", "Paris", "https://en.wikipedia.org/?curid=100")
    doc = WebDocument(ref, "Paris is the capital and largest city of France.")
    obs = LogicalSpaceExtractor(max_binding_span_words=32).extract(request(), (doc,))
    assert len(obs) == 1
    assert obs[0].observed_value == "paris"
    assert obs[0].provenance["best_binding_span_words"] <= 32
