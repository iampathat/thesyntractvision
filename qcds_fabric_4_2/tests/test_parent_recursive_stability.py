from qcds_fabric_4_2.engine import Fabric42CellEngine
from qcds_fabric_4_2.oracle import OracleClause, SemanticOracle
from qcds_fabric_4_2.parent import ParentInferenceEngine
from qcds_fabric_4_2.recursive import RecursiveFabric42
from qcds_fabric_4_2.stability import StabilityEngine


def make_oracle(cycle, previous):
    clauses = [OracleClause("A", frozenset({"A"}), lambda a: a["A"] == 1)]
    if cycle >= 1:
        clauses.append(OracleClause("D", frozenset({"D"}), lambda a: a["D"] == 1))
    return SemanticOracle(clauses, version=f"oracle-v{cycle}")


def test_parent_is_fresh_executable_inference_not_vote_count():
    _, bound = Fabric42CellEngine(tuple("ABCDEFGH"), make_oracle(1, None)).run()
    parent = ParentInferenceEngine(max_candidates=8).run(bound)
    assert parent.provenance["child_full_distribution_consumed"] is True
    assert parent.grover.state_count in (2, 4, 8)
    assert parent.state_index_to_canonical


def test_recursive_run_executes_at_least_two_cycles_with_oracle_versions():
    runtime = RecursiveFabric42(
        tuple("ABCDEFGH"),
        make_oracle,
        min_cycles=2,
        max_cycles=4,
        stability=StabilityEngine(window=3, tvd_max=1.0, entropy_delta_max=10.0, topk_jaccard_min=0.0, influence_delta_max=1.0),
    )
    cycles = runtime.run()
    assert len(cycles) >= 2
    assert cycles[0].oracle_version == "oracle-v0"
    assert cycles[1].oracle_version == "oracle-v1"
    assert cycles[0].bank_id != cycles[1].bank_id
    assert cycles[1].parent.provenance["child_full_distribution_consumed"] is True
