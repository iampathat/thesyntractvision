from qcds_fabric.evidence_planning import EvidenceAcquisitionResult
from qcds_fabric.intelligence_store import CsvIntelligenceStore
from qcds_fabric.problem import ProblemQuery, SemanticProblemFrame
from qcds_fabric.semantic import SemanticClaim
from qcds_fabric.syntract_system import SyntractSystem


def _frame() -> SemanticProblemFrame:
    return SemanticProblemFrame(
        mission_id="build56-persistent",
        raw_text="Which material state remains coherent?",
        queries=(ProblemQuery("q-state", "sample", "state", ("stable", "unstable")),),
        claims=(SemanticClaim("sample", "state", "stable", "seed:a", 0.7, True, "Initial observation"),),
        analyzer_id="build56-test",
    )


def test_persistent_mission_uses_same_syntract_execution_boundary(tmp_path) -> None:
    system = SyntractSystem(max_width=8)
    mission = system.mission(CsvIntelligenceStore(tmp_path))

    created = mission.create(_frame())
    assert created.mission_id == "build56-persistent"
    assert created.syntract.syntract_id == "syntract:mission:build56-persistent:current"
    assert mission.state(created.mission_id).evidence_count == 0

    observed = mission.observe(
        created.mission_id,
        (
            EvidenceAcquisitionResult(
                result_id="obs:1",
                query_id="q-state",
                observed_value="unstable",
                source_id="independent:b",
                confidence=0.8,
                polarity=False,
            ),
        ),
    )
    assert observed.mission_id == created.mission_id
    assert mission.state(created.mission_id).evidence_count == 1
    assert observed.oracle_space.syntract_ids == (observed.syntract.syntract_id,)
    assert observed.provenance["single_qcds_architecture"] is True
