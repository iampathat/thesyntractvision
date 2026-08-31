from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Mapping

from .problem import (
    ProblemQuery,
    SemanticAtom,
    SemanticProblemFrame,
    SemanticRule,
    problem_to_syntract,
)
from .semantic import SemanticClaim


@dataclass(frozen=True)
class PickWorldCase:
    case_id: str
    title: str
    subject: str
    worlds: Mapping[str, Mapping[str, str]]
    observations: tuple[tuple[str, str, float], ...]
    question: str


CASES: Mapping[str, PickWorldCase] = {
    "biology": PickWorldCase(
        case_id="biology",
        title="Cell response",
        subject="cell-001",
        worlds={
            "adaptive": {"signal": "high", "stress": "low", "nutrient": "rich", "energy": "high"},
            "stressed": {"signal": "high", "stress": "high", "nutrient": "limited", "energy": "low"},
            "dormant": {"signal": "low", "stress": "low", "nutrient": "limited", "energy": "low"},
            "apoptotic": {"signal": "low", "stress": "high", "nutrient": "limited", "energy": "low"},
        },
        observations=(
            ("signal", "high", 0.96),
            ("stress", "low", 0.88),
            ("nutrient", "limited", 0.72),
            ("energy", "high", 0.91),
        ),
        question="Which represented cell-response world remains coherent with the observations?",
    ),
    "robotics": PickWorldCase(
        case_id="robotics",
        title="Robot navigation",
        subject="robot-001",
        worlds={
            "direct": {"obstacle": "low", "battery": "high", "deadline": "tight", "human_zone": "clear"},
            "cautious": {"obstacle": "low", "battery": "high", "deadline": "loose", "human_zone": "clear"},
            "reroute": {"obstacle": "high", "battery": "high", "deadline": "loose", "human_zone": "clear"},
            "stop": {"obstacle": "high", "battery": "low", "deadline": "loose", "human_zone": "occupied"},
        },
        observations=(
            ("obstacle", "low", 1.0),
            ("battery", "high", 1.0),
            ("human_zone", "clear", 1.0),
        ),
        question="Which represented navigation world remains coherent when deadline is still unknown?",
    ),
    "materials": PickWorldCase(
        case_id="materials",
        title="Material state",
        subject="material-alpha",
        worlds={
            "stable": {"oxidation": "low", "coating": "intact", "fatigue": "low", "lattice": "dense"},
            "metastable": {"oxidation": "low", "coating": "worn", "fatigue": "low", "lattice": "dense"},
            "degrading": {"oxidation": "high", "coating": "worn", "fatigue": "high", "lattice": "dense"},
            "failed": {"oxidation": "high", "coating": "worn", "fatigue": "high", "lattice": "distorted"},
        },
        observations=(
            ("oxidation", "low", 0.97),
            ("coating", "worn", 0.93),
            ("fatigue", "low", 0.84),
            ("lattice", "dense", 0.95),
        ),
        question="Which represented material world remains coherent with the measured state?",
    ),
    "software": PickWorldCase(
        case_id="software",
        title="Service failure",
        subject="service-api",
        worlds={
            "healthy": {"latency": "normal", "queue": "flowing", "database": "available", "errors": "low"},
            "degraded": {"latency": "extreme", "queue": "flowing", "database": "available", "errors": "high"},
            "saturated": {"latency": "extreme", "queue": "blocked", "database": "available", "errors": "high"},
            "failing": {"latency": "extreme", "queue": "blocked", "database": "unavailable", "errors": "high"},
        },
        observations=(
            ("latency", "extreme", 0.99),
            ("queue", "blocked", 0.94),
            ("database", "unavailable", 0.97),
            ("errors", "high", 0.92),
        ),
        question="Which represented service world remains coherent with the telemetry?",
    ),
}


def _property_values(case: PickWorldCase, predicate: str) -> tuple[str, ...]:
    values: list[str] = []
    for world in case.worlds.values():
        value = world[predicate]
        if value not in values:
            values.append(value)
    return tuple(values)


def build_pick_world_frame(case_id: str) -> SemanticProblemFrame:
    try:
        case = CASES[case_id]
    except KeyError as exc:
        raise ValueError(f"unknown Pick a World case: {case_id}") from exc

    predicates = tuple(next(iter(case.worlds.values())).keys())
    if any(tuple(world.keys()) != predicates for world in case.worlds.values()):
        raise ValueError(f"Pick a World case {case_id} has inconsistent world dimensions")

    queries = [
        ProblemQuery(
            query_id="world",
            subject=case.subject,
            predicate="world",
            candidate_values=tuple(case.worlds.keys()),
            original_text=case.question,
        )
    ]
    queries.extend(
        ProblemQuery(
            query_id=f"property:{predicate}",
            subject=case.subject,
            predicate=predicate,
            candidate_values=_property_values(case, predicate),
            original_text=f"What is the represented {predicate}?",
        )
        for predicate in predicates
    )

    rules: list[SemanticRule] = []
    for world_name, properties in case.worlds.items():
        for predicate, value in properties.items():
            rules.append(
                SemanticRule(
                    rule_id=f"{case_id}:{world_name}:{predicate}",
                    antecedent=SemanticAtom(case.subject, "world", world_name),
                    consequent=SemanticAtom(case.subject, predicate, value),
                    kind="implies",
                    relation_class="logical",
                    confidence=1.0,
                    source_id=f"pick-world:{case_id}:world-definition",
                    original_text=f"If world={world_name}, then {predicate}={value}.",
                )
            )

    claims = tuple(
        SemanticClaim(
            subject=case.subject,
            predicate=predicate,
            value=value,
            source_id=f"pick-world:{case_id}:observation:{index:02d}",
            confidence=confidence,
            polarity=True,
            original_text=f"Observed {predicate}={value}.",
        )
        for index, (predicate, value, confidence) in enumerate(case.observations, start=1)
    )

    return SemanticProblemFrame(
        mission_id=f"pick-world-{case_id}",
        raw_text=case.question,
        queries=tuple(queries),
        claims=claims,
        rules=tuple(rules),
        analyzer_id="pick_a_world_logical_space_v1",
        provenance={
            "pick_a_world": True,
            "worlds_are_logical_conditions": True,
            "browser_pre_scoring": False,
            "observation_count": len(claims),
            "world_count": len(case.worlds),
            "property_count": len(predicates),
            "canonical_spec_modified": False,
        },
    )


def _rows(items: tuple[Any, ...]) -> list[dict[str, Any]]:
    return [{"value": str(item.value), "probability": float(item.probability)} for item in items]


def _inspection(case: PickWorldCase, frame: SemanticProblemFrame, width: int, baseline: list[dict[str, Any]], stabilized: list[dict[str, Any]], leaders: tuple[str, ...], binding_status: str, entropy: float) -> dict[str, Any]:
    predicates = tuple(next(iter(case.worlds.values())).keys())
    world_values = tuple(case.worlds.keys())
    property_values = {predicate: _property_values(case, predicate) for predicate in predicates}

    dimension_groups = [
        {
            "group": "world",
            "meaning": "Which complete represented world is active?",
            "values": list(world_values),
            "bits": [f"world={value}" for value in world_values],
            "bit_count": len(world_values),
        }
    ]
    dimension_groups.extend(
        {
            "group": predicate,
            "meaning": f"Which represented {predicate} value is active?",
            "values": list(values),
            "bits": [f"{predicate}={value}" for value in values],
            "bit_count": len(values),
        }
        for predicate, values in property_values.items()
    )
    logical_dimensions = [bit for group in dimension_groups for bit in group["bits"]]

    structural_oracles = [
        {
            "oracle_id": "onehot:world",
            "type": "structural",
            "logic": "Exactly one represented world may be active.",
            "members": [f"world={value}" for value in world_values],
        }
    ]
    structural_oracles.extend(
        {
            "oracle_id": f"onehot:{predicate}",
            "type": "structural",
            "logic": f"Exactly one {predicate} value may be active.",
            "members": [f"{predicate}={value}" for value in values],
        }
        for predicate, values in property_values.items()
    )

    evidence_oracles = [
        {
            "oracle_id": f"evidence:{index}:{predicate}",
            "type": "evidence",
            "logic": f"Observed {predicate}={value}.",
            "dimension": f"{predicate}={value}",
            "confidence": confidence,
        }
        for index, (predicate, value, confidence) in enumerate(case.observations, start=1)
    ]

    logical_oracles = [
        {
            "oracle_id": rule.rule_id,
            "type": "logical",
            "logic": rule.original_text,
            "antecedent": f"{rule.antecedent.predicate}={rule.antecedent.value}",
            "consequent": f"{rule.consequent.predicate}={rule.consequent.value}",
            "confidence": rule.confidence,
        }
        for rule in frame.rules
    ]
    oracle_total = len(structural_oracles) + len(evidence_oracles) + len(logical_oracles)

    phases = [
        {
            "number": 1,
            "name": "Condition Formation",
            "plain": "Create the represented possibility space.",
            "detail": f"{width} binary Conditions form a raw 2^{width} state space before oracle constraints.",
        },
        {
            "number": 2,
            "name": "Conditional Evolution",
            "plain": "Apply the question and evidence as oracle logic.",
            "detail": f"{oracle_total} active oracles: {len(structural_oracles)} structural, {len(evidence_oracles)} evidence, {len(logical_oracles)} logical.",
        },
        {
            "number": 3,
            "name": "Recursive Inference",
            "plain": "Concentrate the distribution around states that remain coherent.",
            "detail": f"World projection moves from baseline to stabilized TruthDistribution; leaders: {', '.join(leaders) if leaders else 'none'}.",
        },
        {
            "number": 4,
            "name": "Truth-Alignment Verification",
            "plain": "Check what can actually be bound without forcing a false certainty.",
            "detail": f"Binding status: {binding_status}. Distribution entropy: {entropy:.4f}.",
        },
    ]

    return {
        "dimension_groups": dimension_groups,
        "logical_dimensions": logical_dimensions,
        "raw_state_count": 2**width,
        "oracle_summary": {
            "total": oracle_total,
            "structural": len(structural_oracles),
            "evidence": len(evidence_oracles),
            "logical": len(logical_oracles),
        },
        "oracle_groups": {
            "structural": structural_oracles,
            "evidence": evidence_oracles,
            "logical": logical_oracles,
        },
        "qcds_phases": phases,
        "baseline_world_distribution": baseline,
        "stabilized_world_distribution": stabilized,
    }


def run_pick_world_case(case_id: str) -> dict[str, Any]:
    case = CASES.get(case_id)
    if case is None:
        raise ValueError(f"unknown Pick a World case: {case_id}")

    frame = build_pick_world_frame(case_id)
    result = problem_to_syntract(frame, max_width=20)
    baseline_items = result.inference.baseline_queries.get("world", ())
    stabilized_items = result.inference.stabilized_queries.get("world", ())
    baseline = _rows(baseline_items)
    stabilized = _rows(stabilized_items)
    leaders = result.inference.leading_candidates("world")
    width = int(result.compilation.provenance.get("logical_width") or 0)

    world_binding = leaders[0] if len(leaders) == 1 else None
    binding_status = "bound_single_world" if world_binding is not None else "unresolved_tie"
    entropy = float(result.syntract.bound_distribution.entropy)
    inspection = _inspection(case, frame, width, baseline, stabilized, leaders, binding_status, entropy)

    return {
        "status": "ok",
        "case_id": case.case_id,
        "title": case.title,
        "question": case.question,
        "subject": case.subject,
        "core_execution": "qcds_fabric.problem.problem_to_syntract",
        "browser_pre_scoring": False,
        "worlds_are_logical_conditions": True,
        "logical_width": width,
        "candidate_binary_space": f"2^{width}",
        "raw_state_count": inspection["raw_state_count"],
        "represented_worlds": list(case.worlds.keys()),
        "property_dimensions": list(next(iter(case.worlds.values())).keys()),
        "world_definitions": {name: dict(values) for name, values in case.worlds.items()},
        "observations": [
            {"predicate": predicate, "value": value, "confidence": confidence}
            for predicate, value, confidence in case.observations
        ],
        "rule_count": len(frame.rules),
        "baseline": baseline,
        "stabilized": stabilized,
        "leading_candidates": list(leaders),
        "world_binding": world_binding,
        "binding_status": binding_status,
        "syntract_id": result.syntract.syntract_id,
        "syntract_binds_distribution": True,
        "single_world_forced_on_tie": False,
        "entropy": entropy,
        "conflict_markers": list(result.inference.conflict_markers),
        "canonical_spec_modified": False,
        **inspection,
    }


def run_pick_world_case_json(payload_json: str) -> str:
    payload = json.loads(payload_json)
    if isinstance(payload, str):
        case_id = payload
    elif isinstance(payload, Mapping):
        case_id = str(payload.get("case_id") or "")
    else:
        raise ValueError("Pick a World payload must be a case id or object")
    return json.dumps(run_pick_world_case(case_id), ensure_ascii=False, sort_keys=True)


__all__ = ["CASES", "PickWorldCase", "build_pick_world_frame", "run_pick_world_case", "run_pick_world_case_json"]
