from qcds_fabric_4_2.adaptive import AdaptiveRotationPlanner
from qcds_fabric_4_2.engine import Fabric42CellEngine
from qcds_fabric_4_2.nisq import NISQRotationScheduler, attribute_bias
from qcds_fabric_4_2.oracle import OracleClause, SemanticOracle
from qcds_fabric_4_2.types import MappingObservation


def test_nisq_mapping_rotates_semantics_across_physical_slots():
    mappings = NISQRotationScheduler().mappings(tuple("ABCD"))
    assert len(mappings) == 4
    assert {m.semantic_to_physical["A"] for m in mappings} == {"q0", "q1", "q2", "q3"}


def test_bias_attribution_can_follow_physical_slot():
    observations = []
    for semantic in "ABCD":
        for slot in ("q0", "q1", "q2", "q3"):
            observations.append(MappingObservation(semantic, slot, 1.0 if slot == "q2" else 0.1))
    result = attribute_bias(tuple(observations))
    assert result.attribution == "substrate-position"


def test_adaptive_planner_opens_targeted_views_from_influence_or_contradiction():
    oracle = SemanticOracle([
        OracleClause("A_and_D", frozenset({"A", "D"}), lambda a: a["A"] == 1 and a["D"] == 1),
        OracleClause("F", frozenset({"F"}), lambda a: a["F"] == 1),
    ])
    _, bound = Fabric42CellEngine(tuple("ABCDEFGH"), oracle).run()
    requests = AdaptiveRotationPlanner(influence_threshold=0.0).plan(bound)
    assert requests
    assert any(len(r.excluded_dimensions) == 2 for r in requests)
