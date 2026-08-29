from qcds_fabric.first_logical_robot import WebDocument, WebReference
from qcds_fabric.logical_robot import LogicalRobotRequest
from qcds_fabric.public_web_reality import ContextualCandidateExtractor, ContextualPublicWebTool


def _request(context: str):
    return LogicalRobotRequest(
        request_id="r",
        plan_id="p",
        evidence_action_id=f"ctx:{context}",
        capability="read",
        objective="Acquire discriminating evidence",
        query_ids=("capital",),
        dimension_ids=("problem::place::capital::paris", "problem::place::capital::lyon", "problem::place::capital::berlin"),
        candidate_values={"capital": ("paris", "lyon", "berlin")},
        independent_source_required=True,
        attempt=1,
        provenance={"build22_context_assignments": {"country": context}},
    )


def test_build24_rejects_capital_outfit_lyon_false_positive():
    doc = WebDocument(
        WebReference("psg", "Paris Saint-Germain Féminine", "https://example.test/psg", "French football in France"),
        "With the coach on the bench, the capital outfit exacted revenge on Lyon in the Coupe de France final.",
    )
    observations = ContextualCandidateExtractor().extract(_request("france"), doc)
    assert observations == ()


def test_build24_accepts_document_title_context_plus_assertion_sentence():
    doc = WebDocument(
        WebReference("germany", "Germany", "https://example.test/germany", "Country in Central Europe"),
        "Its capital is Berlin. Germany has sixteen constituent states.",
    )
    observations = ContextualCandidateExtractor().extract(_request("germany"), doc)
    assert len(observations) == 1
    assert observations[0].observed_value == "berlin"
    assert observations[0].provenance["candidate_evidence_scope"] == "assertion_sentence"


class SearchSpy:
    backend_id = "search-spy"

    def __init__(self):
        self.query = None

    def search(self, query, *, limit):
        self.query = query
        return ()


class NoRead:
    backend_id = "no-read"

    def read(self, reference, *, max_chars):
        raise AssertionError("no references should be read")


def test_build24_search_axis_is_candidate_neutral():
    search = SearchSpy()
    tool = ContextualPublicWebTool(search_backend=search, read_backend=NoRead())
    request = _request("france")
    search_request = LogicalRobotRequest(
        request_id=request.request_id,
        plan_id=request.plan_id,
        evidence_action_id=request.evidence_action_id,
        capability="search",
        objective=request.objective,
        query_ids=request.query_ids,
        dimension_ids=request.dimension_ids,
        candidate_values=request.candidate_values,
        independent_source_required=True,
        attempt=1,
        provenance=request.provenance,
    )
    tool.observe(search_request)
    assert search.query is not None
    assert "france" in search.query
    assert "capital" in search.query
    assert "paris" not in search.query
    assert "lyon" not in search.query
    assert "berlin" not in search.query
