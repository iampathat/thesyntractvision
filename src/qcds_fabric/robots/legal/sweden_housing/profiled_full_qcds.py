from __future__ import annotations

from typing import Any, Mapping, Sequence

from .emulation_projection import project_praxis_for_emulation
from .evidence import augment_rule_ids_with_evidence, parse_legal_evidence
from .execution import quantum_full_space_profile, target_profile_payload
from .full_qcds import run_full_legal_qcds
from .qcds_space import _active_statutory_rows
from .quantum_full_space import compile_quantum_full_space_contract


def _statutory_unknown_count(
    *,
    case_terms: Sequence[str],
    resolved_terms: Sequence[str],
    unresolved_questions: Sequence[str],
    corpus: Mapping[str, Any],
    applied_rule_ids: Sequence[str],
    qcds_evidence: Sequence[Mapping[str, Any]] | None,
) -> int:
    evidence = parse_legal_evidence(qcds_evidence)
    augmented_rule_ids = augment_rule_ids_with_evidence(
        corpus=corpus,
        applied_rule_ids=applied_rule_ids,
        resolved_terms=resolved_terms,
        evidence=evidence,
    )
    _, rows, _ = _active_statutory_rows(
        case_terms=case_terms,
        resolved_terms=resolved_terms,
        unresolved_questions=unresolved_questions,
        corpus=corpus,
        applied_rule_ids=augmented_rule_ids,
    )
    return sum(row.initial_value == "?" for row in rows)


def _full_quantum_target_payload(
    *,
    corpus: Mapping[str, Any],
    praxis: Mapping[str, Any] | None,
    case_terms: Sequence[str],
    resolved_terms: Sequence[str],
    unresolved_questions: Sequence[str],
    qcds_evidence: Sequence[Mapping[str, Any]] | None,
    active_emulation_dimension_count: int,
) -> Mapping[str, Any]:
    compilation = compile_quantum_full_space_contract(
        corpus=corpus,
        praxis=praxis,
        case_terms=case_terms,
        resolved_terms=resolved_terms,
        unresolved_questions=unresolved_questions,
        qcds_evidence=qcds_evidence,
    )
    manifest = compilation.manifest
    target = quantum_full_space_profile()
    payload = dict(target_profile_payload(target))
    payload.update({
        "represented_universe": "full represented Swedish housing-law Logical Universe: statutory law, transitions, praxis, evidence and other represented legal dimensions",
        "condition_formation_policy": "Conditions may mark, bind or transform the represented universe but may not delete dimensions merely to fit classical memory",
        "relevance_policy": "relevance is intended to emerge from oracle interaction, amplitude evolution, recursive QCDS inference and Syntract binding",
        "decomposition_policy": "parallel/sequential/hybrid decomposition is valid only when it is itself a semantics-preserving QCDS/Syntract operation over the complete represented universe",
        "classical_prefiltering_for_memory": False,
        "software_emulation_of_full_universe": False,
        "full_universe_manifest": manifest.as_dict(),
        "full_universe_contract": compilation.as_dict(),
        "full_universe_bundle_id": compilation.bundle.bundle_id,
        "full_universe_oracle_stack_identity": compilation.oracle_stack.identity,
        "full_universe_oracle_count": len(compilation.oracle_stack.oracles),
        "active_emulation_dimension_count": active_emulation_dimension_count,
        "full_universe_dimension_count": compilation.bundle.width,
        "full_universe_is_not_active_emulation_projection": True,
        "candidate_states_materialized": False,
        "emulation_projection_applies_here": False,
    })
    return payload


def run_profiled_full_legal_qcds(
    *,
    case_id: str,
    case_terms: Sequence[str],
    resolved_terms: Sequence[str],
    unresolved_questions: Sequence[str],
    corpus: Mapping[str, Any],
    applied_rule_ids: Sequence[str],
    praxis: Mapping[str, Any] | None = None,
    qcds_evidence: Sequence[Mapping[str, Any]] | None = None,
    resource_profile_id: str,
    max_unknown_dimensions: int,
    grover_max_states: int,
    grover_max_iterations: int,
) -> Mapping[str, Any]:
    """Run resource-bounded emulation while preserving the full quantum target.

    Only the software execution view may be projected. The original represented
    corpus/praxis/evidence universe is always recompiled independently for the
    Quantum Full Space target contract.
    """
    statutory_unknown = _statutory_unknown_count(
        case_terms=case_terms,
        resolved_terms=resolved_terms,
        unresolved_questions=unresolved_questions,
        corpus=corpus,
        applied_rule_ids=applied_rule_ids,
        qcds_evidence=qcds_evidence,
    )
    emulation_praxis, projection = project_praxis_for_emulation(
        praxis,
        represented_terms=resolved_terms,
        statutory_unknown_dimensions=statutory_unknown,
        max_unknown_dimensions=max_unknown_dimensions,
    )

    result = dict(run_full_legal_qcds(
        case_id=case_id,
        case_terms=case_terms,
        resolved_terms=resolved_terms,
        unresolved_questions=unresolved_questions,
        corpus=corpus,
        applied_rule_ids=applied_rule_ids,
        praxis=emulation_praxis,
        qcds_evidence=qcds_evidence,
        max_unknown_dimensions=max_unknown_dimensions,
        grover_max_states=grover_max_states,
        grover_max_iterations=grover_max_iterations,
    ))

    projection_payload = dict(projection.as_dict())
    resource_payload = {
        "profile_id": resource_profile_id,
        "max_unknown_dimensions": max_unknown_dimensions,
        "max_exact_candidate_states": 1 << max_unknown_dimensions,
        "grover_max_states": grover_max_states,
        "grover_max_iterations": grover_max_iterations,
        "changes_qcds_semantics": False,
        "applies_to_quantum_full_space": False,
    }

    execution_modes = dict(result["execution_modes"])
    quantum_payload = _full_quantum_target_payload(
        corpus=corpus,
        praxis=praxis,
        case_terms=case_terms,
        resolved_terms=resolved_terms,
        unresolved_questions=unresolved_questions,
        qcds_evidence=qcds_evidence,
        active_emulation_dimension_count=int(result["logical_width"]),
    )
    execution_modes["quantum_full_space"] = quantum_payload

    classical = dict(execution_modes["classical_exact"])
    classical["resource_profile"] = resource_payload
    classical["emulation_projection"] = projection_payload
    execution_modes["classical_exact"] = classical

    grover = dict(execution_modes["grover_emulated"])
    grover["resource_profile"] = resource_payload
    grover["emulation_projection"] = projection_payload
    execution_modes["grover_emulated"] = grover

    dual = dict(result["dual_substrate"])
    dual["resource_profile"] = resource_payload
    dual["emulation_projection"] = projection_payload

    result.update({
        "execution_modes": execution_modes,
        "dual_substrate": dual,
        "emulation_resource_profile": resource_payload,
        "emulation_projection": projection_payload,
        "full_represented_universe_preserved_outside_emulation_projection": True,
    })
    return result


__all__ = ["run_profiled_full_legal_qcds"]
