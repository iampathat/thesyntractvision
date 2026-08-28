from qcds_fabric.first_logical_robot import WebDocument, WebReference
from qcds_fabric.logical_assertion import find_logical_assertion
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
    assert obs[0].provenance["assertion_pattern"] == "candidate_asserts_dimension_subject"


def test_reverse_assertion_form_is_supported():
    support = find_logical_assertion(
        "The capital of France has been Paris since 1944.",
        subject="france",
        dimension="capital",
        candidate="paris",
    )
    assert support is not None
    assert support.pattern == "dimension_subject_asserts_candidate"


def test_capital_magazine_shape_is_not_capital_of_france_logic():
    ref = WebReference("magazine", "Capital (French magazine)", "https://en.wikipedia.org/?curid=15679784")
    doc = WebDocument(
        ref,
        "Capital is a French business magazine. Country France. Based in Paris. Language French. Capital is published monthly.",
    )
    assert LogicalSpaceExtractor().extract(request(), (doc,)) == ()


def test_local_cooccurrence_without_assertion_is_rejected():
    support = find_logical_assertion(
        "Capital magazine country France based in Paris.",
        subject="france",
        dimension="capital",
        candidate="paris",
    )
    assert support is None
