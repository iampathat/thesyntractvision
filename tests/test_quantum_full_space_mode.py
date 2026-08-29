from __future__ import annotations

import pytest

from qcds_fabric.legal_assessment_robot import load_legal_praxis
from qcds_fabric.legal_logical_robot import load_legal_corpus
from qcds_fabric.models import BaseBundle
from qcds_fabric.oracles import OracleStack
from qcds_fabric.robots.legal.sweden_housing.execution import (
    classical_exact_profile,
    grover_emulated_profile,
    quantum_full_space_profile,
    run_profile,
    target_profile_payload,
    validate_execution_contract,
)
from qcds_fabric.robots.legal.sweden_housing.quantum_full_space import (
    build_quantum_full_space_manifest,
)


def _bundle() -> BaseBundle:
    return BaseBundle(
        bundle_id="test-full-space",
        dimension_ids=("a", "b", "c", "d"),
        values=("?", "?", "?", "?"),
        provenance={"test": True},
        semantic_domain={"kind": "test"},
    )


def test_classical_and_grover_emulation_allow_resource_bounded_projection_policy() -> None:
    classical, _ = classical_exact_profile()
    grover, _ = grover_emulated_profile(max_states=16)

    assert classical.resource_bounded_emulation is True
    assert classical.semantic_projection_allowed is True
    assert grover.resource_bounded_emulation is True
    assert grover.semantic_projection_allowed is True

    validate_execution_contract(
        classical,
        represented_dimension_ids=("a", "b", "c", "d"),
        execution_dimension_ids=("a", "c"),
    )
    validate_execution_contract(
        grover,
        represented_dimension_ids=("a", "b", "c", "d"),
        execution_dimension_ids=("a", "c"),
    )


def test_quantum_full_space_forbids_semantic_prefiltering() -> None:
    quantum = quantum_full_space_profile()

    assert quantum.native_quantum_target is True
    assert quantum.semantic_projection_allowed is False
    assert quantum.resource_bounded_emulation is False
    assert quantum.requires_full_logical_universe is True

    validate_execution_contract(
        quantum,
        represented_dimension_ids=("a", "b", "c", "d"),
        execution_dimension_ids=("a", "b", "c", "d"),
    )

    with pytest.raises(ValueError, match="forbids semantic pre-filtering"):
        validate_execution_contract(
            quantum,
            represented_dimension_ids=("a", "b", "c", "d"),
            execution_dimension_ids=("a", "c"),
        )


def test_quantum_full_space_is_target_contract_not_fake_software_qpu() -> None:
    quantum = quantum_full_space_profile()
    payload = target_profile_payload(quantum)

    assert payload["status"] == "target_contract_only"
    assert payload["native_qpu_connected"] is False
    assert payload["requires_full_logical_universe"] is True
    assert payload["semantic_projection_allowed"] is False

    with pytest.raises(NotImplementedError, match="no physical QPU backend"):
        _, classical_fabric = classical_exact_profile()
        run_profile(quantum, classical_fabric, _bundle(), OracleStack("empty", "1", ()))


def test_quantum_manifest_keeps_rules_and_praxis_that_classical_case_projection_does_not_need() -> None:
    corpus = {
        "corpus_id": "law-universe",
        "primary_regime_candidates": ["jb12", "special"],
        "sources": [{"source_id": "law-source"}],
        "sections": [{"section_id": "LAW:1", "source_id": "law-source"}],
        "rules": [
            {
                "rule_id": "rent-rule",
                "match_terms": ["issue:rent", "rent:late"],
                "emit_terms": ["conclusion:rent"],
            },
            {
                "rule_id": "exchange-rule",
                "match_terms": ["issue:exchange", "exchange:reason"],
                "emit_terms": ["conclusion:exchange"],
            },
        ],
    }
    praxis = {
        "precedents": [
            {
                "precedent_id": "NJA-X",
                "case_factors": ["factor:remote-but-represented"],
                "statutory_links": ["JB-12:35"],
            }
        ]
    }

    manifest = build_quantum_full_space_manifest(
        corpus=corpus,
        praxis=praxis,
        case_terms=("issue:rent",),
        resolved_terms=("rent:late",),
        unresolved_questions=(),
        qcds_evidence=({"term": "evidence:payment-log", "confidence": 0.8},),
    )
    payload = manifest.as_dict()

    assert "issue:exchange" in payload["dimension_terms"]
    assert "conclusion:exchange" in payload["dimension_terms"]
    assert "precedent:NJA-X" in payload["dimension_terms"]
    assert "factor:remote-but-represented" in payload["dimension_terms"]
    assert "evidence:payment-log" in payload["dimension_terms"]
    assert payload["represented_rule_count"] == 2
    assert payload["represented_source_ids"] == ["law-source"]
    assert payload["represented_section_ids"] == ["LAW:1"]
    assert payload["represented_precedent_count"] == 1
    assert payload["source_structure_preserved"] is True
    assert payload["classical_active_projection"] is False
    assert payload["semantic_prefiltering"] is False


def test_real_swedish_legal_quantum_manifest_keeps_full_law_and_praxis_layers() -> None:
    corpus = load_legal_corpus()
    praxis = load_legal_praxis()

    manifest = build_quantum_full_space_manifest(
        corpus=corpus,
        praxis=praxis,
        # Deliberately narrow current case: rent only. The quantum target must
        # still retain represented exchange/sublet/praxis logic outside it.
        case_terms=("issue:rent_review",),
        resolved_terms=("tenancy:residential",),
        unresolved_questions=(),
        qcds_evidence=(),
    ).as_dict()

    assert manifest["represented_rule_count"] == len(corpus["rules"])
    assert manifest["represented_source_count"] == len(corpus["sources"])
    assert manifest["represented_section_count"] == len(corpus["sections"])
    assert manifest["represented_precedent_count"] == len(praxis["precedents"])
    assert "sfs:1970:994:12" in manifest["represented_source_ids"]
    assert "JB-12:35" in manifest["represented_section_ids"]
    assert "precedent:NJA-2020-681" in manifest["dimension_terms"]
    assert "sublet:independent_without_consent" in manifest["dimension_terms"]
    assert "exchange:requested" in manifest["dimension_terms"]
    assert "conclusion:jb12_represented_section35_exchange_conditions_met_subject_to_tribunal_permission" in manifest["dimension_terms"]
    assert "12 kap. 35 § jordabalken" in manifest["dimension_terms"]
    assert manifest["represented_dimension_count"] > manifest["represented_rule_count"]
    assert manifest["source_structure_preserved"] is True
    assert manifest["classical_active_projection"] is False
    assert manifest["semantic_prefiltering"] is False
