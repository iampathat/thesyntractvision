from __future__ import annotations

from typing import Any, Mapping, Sequence

from qcds_fabric.oracles import OracleStack

from .comparison import compare_truth_distributions
from .evidence import (
    LegalEvidenceItem,
    augment_rule_ids_with_evidence,
    evidence_oracles,
    parse_legal_evidence,
)
from .execution import (
    candidate_state_count,
    classical_exact_profile,
    grover_emulated_profile,
    profile_payload,
    quantum_full_space_profile,
    run_profile,
    target_profile_payload,
)
from .qcds_space import (
    LegalQCDSRuntime,
    _bind_syntract,
    _build_statutory_runtime,
    _expand_with_praxis,
    _runtime_payload,
)
from .quantum_full_space import compile_quantum_full_space_contract
from .scaling import execute_separable_grover_partitions, plan_legal_scaling


def _with_probabilistic_evidence(
    runtime: LegalQCDSRuntime,
    *,
    case_id: str,
    stage: str,
    evidence: Sequence[LegalEvidenceItem],
    prior_syntract_id: str | None = None,
) -> tuple[LegalQCDSRuntime, tuple[LegalEvidenceItem, ...], tuple[LegalEvidenceItem, ...]]:
    attached = tuple(item for item in evidence if item.canonical_term in runtime.term_dimensions)
    inactive = tuple(item for item in evidence if item.canonical_term not in runtime.term_dimensions)
    existing_ids = set(runtime.oracle_stack.oracle_ids)
    extra = tuple(
        oracle
        for oracle in evidence_oracles(attached, runtime.term_dimensions)
        if oracle.oracle_id not in existing_ids
    )
    if not extra:
        return runtime, attached, inactive

    stack = OracleStack(
        stack_id=f"{runtime.oracle_stack.stack_id}:evidence",
        version=f"{runtime.oracle_stack.version}+evidence",
        oracles=tuple((*runtime.oracle_stack.oracles, *extra)),
    )
    profile, fabric = classical_exact_profile()
    suite = run_profile(profile, fabric, runtime.bundle, stack)
    syntract = _bind_syntract(
        case_id=case_id,
        stage=stage,
        bundle=runtime.bundle,
        stack=stack,
        suite=suite,
        rows=runtime.rows,
        active_rule_ids=runtime.active_rule_ids,
        active_precedents=runtime.active_precedents,
        csv_text=runtime.csv_text,
        prior_syntract_id=prior_syntract_id,
    )
    return (
        LegalQCDSRuntime(
            bundle=runtime.bundle,
            oracle_stack=stack,
            suite=suite,
            syntract=syntract,
            rows=runtime.rows,
            term_dimensions=runtime.term_dimensions,
            active_rule_ids=runtime.active_rule_ids,
            active_precedents=runtime.active_precedents,
            csv_text=runtime.csv_text,
        ),
        attached,
        inactive,
    )


def _grover_runtime(
    exact: LegalQCDSRuntime,
    *,
    case_id: str,
    stage: str,
    max_states: int,
    max_iterations: int,
) -> tuple[LegalQCDSRuntime | None, Mapping[str, Any]]:
    state_count = candidate_state_count(exact.bundle)
    if state_count > max_states:
        partitioned = execute_separable_grover_partitions(
            exact.bundle,
            exact.oracle_stack,
            max_states=max_states,
            max_iterations=max_iterations,
        )
        return None, {
            "status": "partitioned_or_larger_substrate_required",
            "profile_id": "grover_emulated",
            "state_count": state_count,
            "max_states": max_states,
            "reason": "software statevector emulation bound exceeded; emulation may use exact separable decomposition but the active QCDS room is never silently truncated",
            "resource_bounded_emulation": True,
            "semantic_projection_allowed": True,
            "scaling": partitioned,
        }

    profile, fabric = grover_emulated_profile(
        max_states=max_states,
        max_iterations=max_iterations,
    )
    suite = run_profile(profile, fabric, exact.bundle, exact.oracle_stack)
    syntract = _bind_syntract(
        case_id=case_id,
        stage=stage,
        bundle=exact.bundle,
        stack=exact.oracle_stack,
        suite=suite,
        rows=exact.rows,
        active_rule_ids=exact.active_rule_ids,
        active_precedents=exact.active_precedents,
        csv_text=exact.csv_text,
        prior_syntract_id=exact.syntract.syntract_id,
    )
    runtime = LegalQCDSRuntime(
        bundle=exact.bundle,
        oracle_stack=exact.oracle_stack,
        suite=suite,
        syntract=syntract,
        rows=exact.rows,
        term_dimensions=exact.term_dimensions,
        active_rule_ids=exact.active_rule_ids,
        active_precedents=exact.active_precedents,
        csv_text=exact.csv_text,
    )
    payload = dict(profile_payload(profile, suite))
    payload.update({
        "status": "ok",
        "syntract_id": syntract.syntract_id,
        "same_base_bundle_id": exact.bundle.bundle_id,
        "same_oracle_stack_identity": exact.oracle_stack.identity,
        "comparison_to_classical_exact": compare_truth_distributions(
            exact.suite.stabilized_return.stabilized_distribution,
            suite.stabilized_return.stabilized_distribution,
        ),
        "scaling": plan_legal_scaling(
            exact.bundle,
            exact.oracle_stack,
            max_states=max_states,
        ).as_dict(),
    })
    return runtime, payload


def run_full_legal_qcds(
    *,
    case_id: str,
    case_terms: Sequence[str],
    resolved_terms: Sequence[str],
    unresolved_questions: Sequence[str],
    corpus: Mapping[str, Any],
    applied_rule_ids: Sequence[str],
    praxis: Mapping[str, Any] | None = None,
    qcds_evidence: Sequence[Mapping[str, Any]] | None = None,
    max_unknown_dimensions: int = 18,
    grover_max_states: int = 4096,
    grover_max_iterations: int = 8,
) -> Mapping[str, Any]:
    """Execute one legal problem through all defined QCDS execution modes.

    `classical_exact` and `grover_emulated` are resource-bounded reference/
    emulation modes. They may use classically projected Condition Formation to
    keep software execution finite, but they execute the resulting active room
    without silently deleting candidate states.

    `quantum_full_space` compiles a separate complete BaseBundle + OracleStack
    over the represented law/praxis/evidence universe without enumerating its
    classical 2^N support. It is a native-QPU target contract only in this build.
    """
    evidence = parse_legal_evidence(qcds_evidence)
    augmented_rule_ids = augment_rule_ids_with_evidence(
        corpus=corpus,
        applied_rule_ids=applied_rule_ids,
        resolved_terms=resolved_terms,
        evidence=evidence,
    )

    statutory = _build_statutory_runtime(
        case_id=case_id,
        case_terms=case_terms,
        resolved_terms=resolved_terms,
        unresolved_questions=unresolved_questions,
        corpus=corpus,
        applied_rule_ids=augmented_rule_ids,
        max_unknown_dimensions=max_unknown_dimensions,
    )
    statutory, statutory_attached, statutory_inactive = _with_probabilistic_evidence(
        statutory,
        case_id=case_id,
        stage="statutory-evidence",
        evidence=evidence,
    )
    statutory_payload = _runtime_payload(statutory, corpus)

    final_exact = statutory
    if praxis is not None:
        final_exact = _expand_with_praxis(
            case_id=case_id,
            statutory=statutory,
            praxis=praxis,
            represented_terms=resolved_terms,
            max_unknown_dimensions=max_unknown_dimensions,
        )
    if final_exact is not statutory:
        final_exact, final_attached, final_inactive = _with_probabilistic_evidence(
            final_exact,
            case_id=case_id,
            stage="final-evidence",
            evidence=evidence,
            prior_syntract_id=statutory.syntract.syntract_id,
        )
    else:
        final_attached, final_inactive = statutory_attached, statutory_inactive

    exact_payload = _runtime_payload(final_exact, corpus)
    exact_payload.update({
        "execution_profile": "classical_exact",
        "substrate_id": "classical",
        "exact_classical_reference": True,
        "grover_emulated": False,
        "resource_bounded_emulation": True,
        "semantic_projection_allowed": True,
    })

    grover_runtime, grover_payload = _grover_runtime(
        final_exact,
        case_id=case_id,
        stage="final-grover-emulated",
        max_states=grover_max_states,
        max_iterations=grover_max_iterations,
    )
    if grover_runtime is not None:
        grover_qcds = _runtime_payload(grover_runtime, corpus)
        grover_qcds.update(grover_payload)
        grover_qcds["core_execution"] = "qcds_fabric.AdaptiveGroverSubstrate via FabricLayer.run_stabilized_rotation_suite"
        grover_qcds["phases"] = {
            "1_condition_formation": exact_payload["phases"]["1_condition_formation"],
            "2_conditional_evolution": "the same source-attributed OracleStack marks the same candidate legal states with weighted phase pressure",
            "3_recursive_inference": "software statevector evolution uses adaptive Grover-style mark+diffuse amplification across the same active candidate support and QCDS rotation banks",
            "4_truth_alignment_verification": "the stabilized Grover-emulated TruthDistribution is bound as a sibling Legal Syntract",
        }
        grover_payload = grover_qcds

    full_compilation = compile_quantum_full_space_contract(
        corpus=corpus,
        praxis=praxis,
        case_terms=case_terms,
        resolved_terms=resolved_terms,
        unresolved_questions=unresolved_questions,
        qcds_evidence=qcds_evidence,
    )
    full_manifest = full_compilation.manifest
    quantum_target = quantum_full_space_profile()
    quantum_target_payload = dict(target_profile_payload(quantum_target))
    quantum_target_payload.update({
        "represented_universe": "full represented Swedish housing-law Logical Universe: statutory law, transitions, praxis, evidence and other represented legal dimensions",
        "condition_formation_policy": "Conditions may mark, bind or transform the represented universe but may not delete dimensions merely to fit classical memory",
        "relevance_policy": "relevance is intended to emerge from oracle interaction, amplitude evolution, recursive QCDS inference and Syntract binding",
        "decomposition_policy": "parallel/sequential/hybrid decomposition is valid only when it is itself a semantics-preserving QCDS/Syntract operation over the complete represented universe",
        "classical_prefiltering_for_memory": False,
        "software_emulation_of_full_universe": False,
        "full_universe_manifest": full_manifest.as_dict(),
        "full_universe_contract": full_compilation.as_dict(),
        "full_universe_bundle_id": full_compilation.bundle.bundle_id,
        "full_universe_oracle_stack_identity": full_compilation.oracle_stack.identity,
        "full_universe_oracle_count": len(full_compilation.oracle_stack.oracles),
        "active_emulation_dimension_count": final_exact.bundle.width,
        "full_universe_dimension_count": full_compilation.bundle.width,
        "full_universe_is_not_active_emulation_projection": True,
        "candidate_states_materialized": False,
    })

    attached_sources = [
        {
            "term": item.term,
            "confidence": item.confidence,
            "polarity": item.polarity,
            "source_id": item.source_id,
            "note": item.note,
        }
        for item in final_attached
    ]
    inactive_sources = [
        {
            "term": item.term,
            "confidence": item.confidence,
            "polarity": item.polarity,
            "source_id": item.source_id,
            "note": item.note,
        }
        for item in final_inactive
    ]

    scaling = plan_legal_scaling(
        final_exact.bundle,
        final_exact.oracle_stack,
        max_states=grover_max_states,
    ).as_dict()

    return {
        **exact_payload,
        "statutory_syntract_id": statutory.syntract.syntract_id,
        "reentered_statutory_syntract": final_exact is not statutory,
        "statutory_pass": {
            "syntract_id": statutory_payload["syntract_id"],
            "candidate_binary_space": statutory_payload["candidate_binary_space"],
            "candidate_state_count": statutory_payload["candidate_state_count"],
            "logical_width": statutory_payload["logical_width"],
            "oracle_count": statutory_payload["oracle_count"],
            "entropy": statutory_payload["entropy"],
            "retained_uncertainty": statutory_payload["retained_uncertainty"],
        },
        "execution_modes": {
            "classical_exact": {
                "status": "ok",
                "profile_id": "classical_exact",
                "resource_bounded_emulation": True,
                "semantic_projection_allowed": True,
                "full_active_room_executed_exactly": True,
                "full_represented_legal_universe_required": False,
                "syntract_id": final_exact.syntract.syntract_id,
            },
            "grover_emulated": grover_payload,
            "quantum_full_space": quantum_target_payload,
        },
        "dual_substrate": {
            "same_logical_contract": True,
            "same_base_bundle": True,
            "same_oracle_stack": True,
            "classical_exact": {
                "syntract_id": final_exact.syntract.syntract_id,
                "state_count": candidate_state_count(final_exact.bundle),
                "entropy": final_exact.suite.stabilized_return.stabilized_distribution.entropy,
                "oracle_agreement": final_exact.suite.stabilized_return.stabilized_distribution.oracle_agreement,
                "resource_bounded_emulation": True,
                "semantic_projection_allowed": True,
            },
            "grover_emulated": grover_payload,
        },
        "probabilistic_evidence": {
            "input_count": len(evidence),
            "attached_count": len(final_attached),
            "inactive_count": len(final_inactive),
            "attached": attached_sources,
            "inactive": inactive_sources,
            "hard_law_confidence": 1.0,
            "evidence_is_not_calibrated_court_outcome_probability": True,
        },
        "augmented_rule_ids_from_evidence": [
            rule_id for rule_id in augmented_rule_ids if rule_id not in set(applied_rule_ids)
        ],
        "scaling": scaling,
        "canonical_final_syntract": final_exact.syntract.syntract_id,
        "canonical_final_reference_substrate": "classical_exact",
        "quantum_emulation_is_sibling_syntract": True,
        "native_qpu": False,
        "native_quantum_target_defined": True,
        "quantum_full_space_semantic_prefiltering_forbidden": True,
        "quantum_advantage_claim": False,
    }


__all__ = ["run_full_legal_qcds"]
