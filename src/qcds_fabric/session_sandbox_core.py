from __future__ import annotations

import json
from typing import Any, Mapping, Sequence

from .domain_lab_builder import normalize_custom_domain_pack
from .problem import ProblemQuery, SemanticProblemFrame, problem_to_syntract
from .semantic import SemanticClaim


class SessionSandboxError(ValueError):
    """Raised when a public session request cannot be executed without semantic invention."""


def _required_text(value: Any, name: str, *, maximum: int = 300) -> str:
    text = " ".join(str(value or "").split())
    if not text:
        raise SessionSandboxError(f"{name} is required")
    if len(text) > maximum:
        raise SessionSandboxError(f"{name} is too long")
    return text


def _candidate_values(value: Any) -> tuple[str, ...]:
    if isinstance(value, (str, bytes, bytearray)) or not isinstance(value, Sequence):
        raise SessionSandboxError("probe.candidate_values must be an array")
    values = tuple(dict.fromkeys(" ".join(str(item).split()) for item in value if " ".join(str(item).split())))
    if len(values) < 2:
        raise SessionSandboxError("probe requires at least two explicit candidate values")
    if len(values) > 16:
        raise SessionSandboxError("probe supports at most 16 candidate values")
    return values


def normalize_session_request(payload: Mapping[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, Mapping):
        raise SessionSandboxError("session request must be an object")
    raw_space = payload.get("space")
    if not isinstance(raw_space, Mapping):
        raise SessionSandboxError("space must be a Logical Space pack")
    space = normalize_custom_domain_pack(raw_space)

    raw_probe = payload.get("probe")
    if not isinstance(raw_probe, Mapping):
        raise SessionSandboxError("probe must be an object")
    probe = {
        "subject": _required_text(raw_probe.get("subject"), "probe.subject"),
        "predicate": _required_text(raw_probe.get("predicate"), "probe.predicate"),
        "candidate_values": _candidate_values(raw_probe.get("candidate_values")),
    }

    raw_evidence = payload.get("evidence", [])
    if isinstance(raw_evidence, (str, bytes, bytearray)) or not isinstance(raw_evidence, Sequence):
        raise SessionSandboxError("evidence must be an array")
    if len(raw_evidence) > 100:
        raise SessionSandboxError("session evidence is limited to 100 explicit assertions")

    evidence: list[dict[str, Any]] = []
    for index, raw in enumerate(raw_evidence, start=1):
        if not isinstance(raw, Mapping):
            raise SessionSandboxError(f"evidence {index} must be an object")
        try:
            confidence = float(raw.get("confidence", 1.0))
        except (TypeError, ValueError) as exc:
            raise SessionSandboxError(f"evidence {index} confidence must be numeric") from exc
        if not 0.5 <= confidence <= 1.0:
            raise SessionSandboxError(f"evidence {index} confidence must be in [0.5, 1.0]")
        evidence.append(
            {
                "subject": _required_text(raw.get("subject"), f"evidence {index}.subject"),
                "predicate": _required_text(raw.get("predicate"), f"evidence {index}.predicate"),
                "value": _required_text(raw.get("value"), f"evidence {index}.value"),
                "source_id": _required_text(raw.get("source_id") or f"session:{space['domain_id']}:{index:03d}", f"evidence {index}.source_id"),
                "confidence": confidence,
                "polarity": bool(raw.get("polarity", True)),
            }
        )

    max_width = int(payload.get("max_width", 20))
    if max_width <= 0 or max_width > 20:
        raise SessionSandboxError("max_width must be in [1, 20]")

    return {
        "space": space,
        "probe": probe,
        "evidence": evidence,
        "max_width": max_width,
    }


def _candidate_rows(items: Sequence[Any]) -> list[dict[str, Any]]:
    return [
        {
            "value": str(item.value),
            "probability": float(item.probability),
        }
        for item in items
    ]


def run_session(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Run one ephemeral Logical Robot -> QCDS Core request.

    This function is deliberately stateless. The browser owns the temporary
    session state; this bridge only validates explicit semantics, invokes the
    existing QCDS problem-to-Syntract core, and returns the result. Generic
    Logical Space bindings are context only and are never silently promoted to
    SemanticClaim evidence.
    """

    request = normalize_session_request(payload)
    space = request["space"]
    probe = request["probe"]
    evidence = request["evidence"]
    mission_id = f"session-{space['domain_id']}"

    query = ProblemQuery(
        query_id="session-probe",
        subject=str(probe["subject"]),
        predicate=str(probe["predicate"]),
        candidate_values=tuple(probe["candidate_values"]),
        original_text=str(space["challenge"]),
    )
    claims = tuple(
        SemanticClaim(
            subject=str(item["subject"]),
            predicate=str(item["predicate"]),
            value=str(item["value"]),
            source_id=str(item["source_id"]),
            confidence=float(item["confidence"]),
            polarity=bool(item["polarity"]),
            original_text="Explicit session assertion",
        )
        for item in evidence
    )
    frame = SemanticProblemFrame(
        mission_id=mission_id,
        raw_text=str(space["challenge"]),
        queries=(query,),
        claims=claims,
        analyzer_id="logical_robot_session_explicit_v1",
        provenance={
            "logical_space_id": space["universe_id"],
            "session_only": True,
            "generic_binding_count": len(space["observations"]),
            "generic_bindings_promoted_to_semantic_evidence": 0,
            "explicit_evidence_count": len(claims),
            "external_truth_claim": False,
            "canonical_spec_modified": False,
        },
    )

    result = problem_to_syntract(frame, max_width=int(request["max_width"]))
    baseline = result.inference.baseline_queries.get("session-probe", ())
    stabilized = result.inference.stabilized_queries.get("session-probe", ())
    distribution = result.syntract.bound_distribution

    return {
        "status": "ok",
        "session_only": True,
        "persistent_state": False,
        "database_used": False,
        "logical_robot_to_core": True,
        "core_execution": "qcds_fabric.problem.problem_to_syntract",
        "execution_substrate": "python-or-webassembly",
        "domain_id": space["domain_id"],
        "universe_id": space["universe_id"],
        "probe": {
            "subject": probe["subject"],
            "predicate": probe["predicate"],
            "candidate_values": list(probe["candidate_values"]),
        },
        "baseline": _candidate_rows(baseline),
        "stabilized": _candidate_rows(stabilized),
        "leading_candidates": list(result.inference.leading_candidates("session-probe")),
        "logical_width": result.compilation.provenance.get("logical_width"),
        "candidate_binary_space": result.compilation.provenance.get("candidate_binary_space"),
        "entropy": float(distribution.entropy),
        "conflict_markers": list(result.inference.conflict_markers),
        "generic_binding_count": len(space["observations"]),
        "generic_bindings_promoted_to_semantic_evidence": 0,
        "explicit_evidence_count": len(claims),
        "truth_effect_on_reality": 0,
        "answer_is_external_truth_claim": False,
        "canonical_spec_modified": False,
        "syntract_id": result.syntract.syntract_id,
    }


def run_session_json(payload_json: str) -> str:
    value = json.loads(payload_json)
    if not isinstance(value, Mapping):
        raise SessionSandboxError("session JSON must contain an object")
    return json.dumps(run_session(value), ensure_ascii=False, sort_keys=True)
