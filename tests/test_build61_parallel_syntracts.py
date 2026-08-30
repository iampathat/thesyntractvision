from qcds_fabric.models import BaseBundle, Syntract, TruthDistribution
from qcds_fabric.parallel_syntracts import ParallelSyntractInput, run_parallel_syntracts
from qcds_fabric.problem import SemanticRuleOracle


def _syntract(name, p_true):
    distribution = TruthDistribution(
        support=((0, 1), (1, 0)),
        probabilities=(1.0 - p_true, p_true),
        raw_scores=(1.0 - p_true, p_true),
        top_k=((1, 0), (0, 1)) if p_true >= 0.5 else ((0, 1), (1, 0)),
        entropy=TruthDistribution.shannon_entropy((1.0 - p_true, p_true)),
        oracle_agreement=1.0,
        contradiction_markers=(),
        normalization="test",
        provenance={"test": True},
    )
    return Syntract(
        syntract_id=f"syntract:{name}",
        bound_distribution=distribution,
        evidence_provenance={"final_dimension_ids": (f"{name}:yes", f"{name}:no")},
        contradiction_provenance=(),
        composition_provenance={"test": True},
    )


def test_parallel_syntracts_use_existing_parallel_qcds_and_joint_reentry():
    left = ParallelSyntractInput("dna", _syntract("dna", 0.8), ("yes", "no"), "DNA")
    right = ParallelSyntractInput("protein", _syntract("protein", 0.7), ("yes", "no"), "Protein")
    link = SemanticRuleOracle(
        "link:dna-to-protein",
        "dna::yes",
        "protein::yes",
        "implies",
        "logical",
        0.9,
        "demo-link",
    )
    result = run_parallel_syntracts((left, right), composition_id="test", cross_oracles=(link,))

    assert result.syntract.syntract_id == "syntract:parallel:test"
    assert result.syntract.composition_provenance["parallel_execution"] is True
    assert result.syntract.composition_provenance["joint_qcds_reentry"] is True
    assert result.syntract.composition_provenance["hard_collapse"] is False
    assert result.provenance["new_inference_engine"] is False
    assert len(result.branch_runs) == 2
    assert result.joint_bundle.dimension_ids == ("dna::yes", "dna::no", "protein::yes", "protein::no")
    assert "link:dna-to-protein" in result.joint_oracle_stack.oracle_ids
    assert abs(sum(result.truth_distribution.probabilities) - 1.0) < 1e-9
