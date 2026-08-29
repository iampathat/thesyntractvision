from __future__ import annotations

from qcds_fabric.legal_assessment_robot import load_legal_praxis
from qcds_fabric.legal_logical_robot import load_legal_corpus
from qcds_fabric.robots.legal.sweden_housing.quantum_full_space import (
    compile_quantum_full_space_contract,
)


def _synthetic_corpus() -> dict[str, object]:
    return {
        "corpus_id": "full-space-contract-test",
        "primary_regime_candidates": ["jb12", "special"],
        "sources": [{"source_id": "law-source"}],
        "sections": [
            {"section_id": "LAW:1", "source_id": "law-source"},
            {"section_id": "LAW:2", "source_id": "law-source"},
        ],
        "rules": [
            {
                "rule_id": "rent-rule",
                "source_id": "law-source",
                "section_id": "LAW:1",
                "match_terms": ["issue:rent", "rent:late"],
                "emit_terms": ["conclusion:rent"],
            },
            {
                "rule_id": "exchange-rule",
                "source_id": "law-source",
                "section_id": "LAW:2",
                "match_terms": ["issue:exchange", "exchange:reason"],
                "emit_terms": ["conclusion:exchange"],
            },
        ],
    }


def _synthetic_praxis() -> dict[str, object]:
    return {
        "precedents": [
            {
                "precedent_id": "NJA-X",
                "activation_terms": ["issue:exchange"],
                "counter_terms": ["exchange:counter"],
                "statutory_links": ["LAW:2"],
                "issue_tags": ["exchange"],
                "principles": ["represented principle"],
            }
        ]
    }


def test_full_space_contract_compiles_complete_bundle_without_prebinding_resolver_output() -> None:
    compilation = compile_quantum_full_space_contract(
        corpus=_synthetic_corpus(),
        praxis=_synthetic_praxis(),
        case_terms=("issue:rent", "rent:late"),
        resolved_terms=("primary_regime:jb12", "conclusion:rent"),
        unresolved_questions=("open discriminator",),
        qcds_evidence=(
            {
                "term": "evidence:payment-log",
                "confidence": 0.8,
                "polarity": True,
                "source_id": "payment-log",
            },
        ),
    )

    payload = compilation.as_dict()
    values_by_term = dict(zip(compilation.manifest.dimension_terms, compilation.bundle.values))

    assert compilation.bundle.width == compilation.manifest.represented_dimension_count
    assert len(compilation.bundle.dimension_ids) == len(set(compilation.bundle.dimension_ids))

    # Only original case input is fixed. Classical resolver output is represented
    # but must remain live for QCDS instead of being installed as truth.
    assert values_by_term["issue:rent"] == 1
    assert values_by_term["rent:late"] == 1
    assert values_by_term["primary_regime:jb12"] == "?"
    assert values_by_term["conclusion:rent"] == "?"

    assert values_by_term["issue:exchange"] == "?"
    assert values_by_term["conclusion:exchange"] == "?"
    assert values_by_term["precedent:NJA-X"] == "?"
    assert values_by_term["question:open discriminator"] == "?"
    assert values_by_term["evidence:payment-log"] == "?"

    assert compilation.manifest.case_terms == ("issue:rent", "rent:late")
    assert "primary_regime:jb12" in compilation.manifest.resolver_terms
    assert "conclusion:rent" in compilation.manifest.resolver_terms
    assert "question:open discriminator" in compilation.manifest.resolver_terms

    oracle_ids = set(compilation.oracle_stack.oracle_ids)
    assert "legal:quantum-full:primary-regime:onehot" in oracle_ids
    assert any(oracle_id.startswith("legal:quantum-full:rule:rent-rule") for oracle_id in oracle_ids)
    assert any(oracle_id.startswith("legal:quantum-full:rule:exchange-rule") for oracle_id in oracle_ids)
    assert any(":praxis:nja-x:activation:" in oracle_id for oracle_id in oracle_ids)
    assert any(":praxis:nja-x:counter:" in oracle_id for oracle_id in oracle_ids)
    assert any(oracle_id.startswith("legal:case-evidence:") for oracle_id in oracle_ids)

    assert payload["full_bundle_width"] == compilation.manifest.represented_dimension_count
    assert payload["full_unknown_dimension_count"] > 0
    assert payload["full_candidate_binary_space"] == f"2^{payload['full_unknown_dimension_count']}"
    assert payload["candidate_states_materialized"] is False
    assert payload["classical_active_projection"] is False
    assert payload["semantic_prefiltering"] is False
    assert payload["fixed_input_policy"] == "case_terms_only"
    assert payload["resolver_outputs_prebound"] is False
    assert payload["native_qpu_connected"] is False


def test_real_swedish_housing_full_space_contract_keeps_entire_loaded_law_and_praxis_universe() -> None:
    corpus = load_legal_corpus()
    praxis = load_legal_praxis()

    compilation = compile_quantum_full_space_contract(
        corpus=corpus,
        praxis=praxis,
        case_terms=("issue:rent_review",),
        resolved_terms=("tenancy:residential",),
        unresolved_questions=(),
        qcds_evidence=(),
    )
    payload = compilation.as_dict()
    values_by_term = dict(zip(compilation.manifest.dimension_terms, compilation.bundle.values))

    assert compilation.bundle.width == compilation.manifest.represented_dimension_count
    assert compilation.manifest.represented_dimension_count > len(corpus["rules"])
    assert len(compilation.manifest.rule_ids) == len(corpus["rules"])
    assert len(compilation.manifest.source_ids) == len(corpus["sources"])
    assert len(compilation.manifest.section_ids) == len(corpus["sections"])
    assert len(compilation.manifest.precedent_ids) == len(praxis["precedents"])

    represented_terms = set(compilation.manifest.dimension_terms)
    assert "exchange:requested" in represented_terms
    assert "sublet:independent_without_consent" in represented_terms
    assert "precedent:NJA-2020-681" in represented_terms
    assert "conclusion:jb12_represented_section35_exchange_conditions_met_subject_to_tribunal_permission" in represented_terms

    assert values_by_term["issue:rent_review"] == 1
    assert values_by_term["tenancy:residential"] == "?"

    rule_oracles = [
        oracle_id for oracle_id in compilation.oracle_stack.oracle_ids
        if oracle_id.startswith("legal:quantum-full:rule:")
    ]
    praxis_oracles = [
        oracle_id for oracle_id in compilation.oracle_stack.oracle_ids
        if oracle_id.startswith("legal:quantum-full:praxis:")
    ]
    assert len(rule_oracles) == len(corpus["rules"])
    assert praxis_oracles

    assert payload["full_unknown_dimension_count"] > 18
    assert payload["full_candidate_binary_space"] == f"2^{payload['full_unknown_dimension_count']}"
    assert payload["candidate_states_materialized"] is False
    assert payload["semantic_prefiltering"] is False
    assert payload["resolver_outputs_prebound"] is False
    assert compilation.bundle.provenance["represented_rule_count"] == len(corpus["rules"])
    assert compilation.bundle.provenance["represented_precedent_count"] == len(praxis["precedents"])
    assert compilation.bundle.provenance["resolver_outputs_prebound"] is False
