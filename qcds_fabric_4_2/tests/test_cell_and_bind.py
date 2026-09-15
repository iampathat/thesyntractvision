from qcds_fabric_4_2.engine import Fabric42CellEngine
from qcds_fabric_4_2.oracle import OracleClause, SemanticOracle


def oracle(version="v0"):
    return SemanticOracle(
        [
            OracleClause("A_and_D", frozenset({"A", "D"}), lambda a: a["A"] == 1 and a["D"] == 1),
            OracleClause("F", frozenset({"F"}), lambda a: a["F"] == 1),
        ],
        version=version,
    )


def test_parallel_cell_returns_full_distributions_and_provenance():
    dims = tuple("ABCDEFGH")
    lanes, bound = Fabric42CellEngine(dims, oracle(), max_workers=8).run()
    assert len(lanes) == 8
    assert all(len(l.grover.probabilities) == 128 for l in lanes)
    assert len(bound.canonical_probabilities) == 256
    assert abs(sum(bound.canonical_probabilities) - 1.0) < 1e-12
    assert bound.provenance["full_distributions_preserved"] is True
    lane_a = next(l for l in lanes if l.view.excluded_dimension == "A")
    assert "A_and_D" in lane_a.inactive_clause_names


def test_bind_exposes_influence_necessity_and_sensitive_shell():
    _, bound = Fabric42CellEngine(tuple("ABCDEFGH"), oracle()).run()
    assert set(bound.dimension_influence) == set("ABCDEFGH")
    assert set(bound.dimensional_necessity) == set("ABCDEFGH")
    assert bound.stable_core
    assert isinstance(bound.sensitive_shell, tuple)
