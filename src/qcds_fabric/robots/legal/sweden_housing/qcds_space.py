from __future__ import annotations

import csv
import hashlib
import io
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from qcds_fabric.fabric import FabricLayer, StabilizedRotationSuiteResult
from qcds_fabric.logical_assertion import normalize_logic_text
from qcds_fabric.models import BaseBundle, ChannelView, State, Syntract, TruthDistribution
from qcds_fabric.oracles import DistributionOracle, OracleStack
from qcds_fabric.semantic import EvidenceOracle, OneHotOracle


class LegalQCDSSpaceError(ValueError):
    """Raised when an active legal QCDS space cannot be represented exactly."""


def _canon(value: str) -> str:
    return normalize_logic_text(str(value))


def _slug(value: str) -> str:
    out: list[str] = []
    sep = False
    for char in _canon(value):
        if char.isalnum():
            out.append(char)
            sep = False
        elif not sep:
            out.append("-")
            sep = True
    return "".join(out).strip("-") or "term"


def _mapping(value: Any, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise LegalQCDSSpaceError(f"{label} must be an object")
    return value


@dataclass(frozen=True)
class LegalSpaceRow:
    dimension_id: str
    kind: str
    term: str
    initial_value: int | str
    source_id: str = ""
    section_id: str = ""
    note: str = ""

    def __post_init__(self) -> None:
        if self.initial_value not in (0, 1, "?"):
            raise LegalQCDSSpaceError("legal-space initial value must be 0, 1 or ?")
        if not self.dimension_id or not self.term:
            raise LegalQCDSSpaceError("legal-space row requires dimension_id and term")


@dataclass(frozen=True)
class LegalRuleConstraintOracle:
    """Evaluate one source-attributed multi-antecedent legal rule inside QCDS.

    A consequence is never derived before QCDS by this oracle. Candidate states
    survive or lose coherence according to whether they satisfy the represented
    implication. Logical absence in a rotated view is never reinterpreted as 0.
    """

    oracle_id: str
    antecedent_dimensions: tuple[str, ...]
    consequent_dimensions: tuple[str, ...]
    source_id: str
    section_id: str
    rule_id: str
    confidence: float = 1.0

    def __post_init__(self) -> None:
        if not self.oracle_id or not self.rule_id:
            raise ValueError("legal rule oracle requires identities")
        if not self.antecedent_dimensions or not self.consequent_dimensions:
            raise ValueError("legal rule oracle requires antecedent and consequent dimensions")
        if not 0.5 <= self.confidence <= 1.0:
            raise ValueError("legal rule oracle confidence must be in [0.5, 1.0]")

    @property
    def dimensions(self) -> tuple[str, ...]:
        return tuple(dict.fromkeys((*self.antecedent_dimensions, *self.consequent_dimensions)))

    def is_applicable(self, view: ChannelView) -> bool:
        active = set(view.active_dimension_ids())
        return all(dimension_id in active for dimension_id in self.dimensions)

    def score(self, view: ChannelView, state: State) -> float:
        active = view.state_as_mapping(state)
        if not all(dimension_id in active for dimension_id in self.dimensions):
            return 1.0
        if not all(active[dimension_id] == 1 for dimension_id in self.antecedent_dimensions):
            return 1.0
        satisfied = all(active[dimension_id] == 1 for dimension_id in self.consequent_dimensions)
        return self.confidence if satisfied else 1.0 - self.confidence


@dataclass(frozen=True)
class LegalQCDSRuntime:
    bundle: BaseBundle
    oracle_stack: OracleStack
    suite: StabilizedRotationSuiteResult
    syntract: Syntract
    rows: tuple[LegalSpaceRow, ...]
    term_dimensions: Mapping[str, str]
    active_rule_ids: tuple[str, ...]
    active_precedents: tuple[Mapping[str, Any], ...]
    csv_text: str


def _dimension_id(kind: str, term: str) -> str:
    return f"legal::{kind}::{_slug(term)}"


def _row_kind(term: str) -> str:
    canonical = _canon(term)
    if canonical.startswith("primary regime:"):
        return "regime"
    if canonical.startswith("conclusion:"):
        return "conclusion"
    if canonical.startswith("question:"):
        return "assessment"
    if canonical.startswith("precedent:"):
        return "precedent"
    if canonical.startswith("law:") or canonical.startswith("exclusion:") or canonical.startswith("transition:"):
        return "legal_state"
    return "condition"


def _csv_roundtrip(rows: Sequence[LegalSpaceRow]) -> tuple[tuple[LegalSpaceRow, ...], str]:
    """Serialize the active logical table and reload it entirely in memory."""
    buffer = io.StringIO()
    fields = ("dimension_id", "kind", "term", "initial_value", "source_id", "section_id", "note")
    writer = csv.DictWriter(buffer, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({
            "dimension_id": row.dimension_id,
            "kind": row.kind,
            "term": row.term,
            "initial_value": row.initial_value,
            "source_id": row.source_id,
            "section_id": row.section_id,
            "note": row.note,
        })
    text = buffer.getvalue()
    loaded: list[LegalSpaceRow] = []
    for raw in csv.DictReader(io.StringIO(text)):
        value: int | str = "?" if raw["initial_value"] == "?" else int(raw["initial_value"])
        loaded.append(LegalSpaceRow(
            raw["dimension_id"],
            raw["kind"],
            raw["term"],
            value,
            raw.get("source_id", ""),
            raw.get("section_id", ""),
            raw.get("note", ""),
        ))
    return tuple(loaded), text


def _marginal(distribution: TruthDistribution, bundle: BaseBundle, dimension_id: str) -> float:
    index = bundle.dimension_ids.index(dimension_id)
    return sum(
        probability
        for state, probability in zip(distribution.support, distribution.probabilities)
        if state[index] == 1
    )


def _projection(runtime: LegalQCDSRuntime, distribution: TruthDistribution) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in runtime.rows:
        if row.initial_value != "?":
            continue
        out.append({
            "dimension_id": row.dimension_id,
            "kind": row.kind,
            "term": row.term,
            "probability_true": _marginal(distribution, runtime.bundle, row.dimension_id),
            "source_id": row.source_id,
            "section_id": row.section_id,
        })
    out.sort(key=lambda item: (-float(item["probability_true"]), str(item["term"])))
    return out


def _top_states(runtime: LegalQCDSRuntime, limit: int = 8) -> list[dict[str, Any]]:
    distribution = runtime.suite.stabilized_return.stabilized_distribution
    indexed = sorted(enumerate(distribution.probabilities), key=lambda item: item[1], reverse=True)[:limit]
    rows = {row.dimension_id: row for row in runtime.rows}
    out: list[dict[str, Any]] = []
    for index, probability in indexed:
        state = distribution.support[index]
        active_terms = [
            rows[dimension_id].term
            for dimension_id, value in zip(runtime.bundle.dimension_ids, state)
            if value == 1 and rows[dimension_id].kind in {"regime", "conclusion", "assessment", "precedent", "legal_state"}
        ]
        out.append({"probability": probability, "active_terms": active_terms})
    return out


def _bind_syntract(
    *,
    case_id: str,
    stage: str,
    bundle: BaseBundle,
    stack: OracleStack,
    suite: StabilizedRotationSuiteResult,
    rows: Sequence[LegalSpaceRow],
    active_rule_ids: Sequence[str],
    active_precedents: Sequence[Mapping[str, Any]],
    csv_text: str,
    prior_syntract_id: str | None = None,
) -> Syntract:
    distribution = suite.stabilized_return.stabilized_distribution
    return Syntract(
        syntract_id=f"syntract:legal:sweden-housing:{_slug(case_id)}:{stage}",
        bound_distribution=distribution,
        evidence_provenance={
            "case_id": case_id,
            "legal_domain": "swedish_housing_law",
            "stage": stage,
            "active_rule_ids": tuple(active_rule_ids),
            "active_precedent_ids": tuple(str(row.get("precedent_id", "")) for row in active_precedents),
            "dimension_rows": tuple({
                "dimension_id": row.dimension_id,
                "kind": row.kind,
                "term": row.term,
                "initial_value": row.initial_value,
                "source_id": row.source_id,
                "section_id": row.section_id,
            } for row in rows),
            "csv_in_memory": True,
            "csv_sha256": hashlib.sha256(csv_text.encode("utf-8")).hexdigest(),
            "oracle_stack": stack.identity,
            "prior_syntract_id": prior_syntract_id,
        },
        contradiction_provenance=tuple(distribution.contradiction_markers),
        composition_provenance={
            "direct_qcds_base_bundle": True,
            "condition_formation": True,
            "conditional_evolution_oracle_stack": True,
            "recursive_inference": True,
            "truth_alignment_stabilization": True,
            "hard_collapse": False,
            "can_reenter": True,
            "can_expand": True,
            "canonical_spec_modified": False,
        },
    )


def _active_statutory_rows(
    *,
    case_terms: Sequence[str],
    unresolved_questions: Sequence[str],
    corpus: Mapping[str, Any],
    applied_rule_ids: Sequence[str],
) -> tuple[tuple[Mapping[str, Any], ...], list[LegalSpaceRow], dict[str, str]]:
    rule_index = {str(row["rule_id"]): _mapping(row, "rules[]") for row in corpus["rules"]}
    active_rules = tuple(rule_index[rule_id] for rule_id in applied_rule_ids if rule_id in rule_index)
    all_known = {_canon(term): str(term) for term in case_terms}
    referenced_match_terms = {
        _canon(str(term))
        for row in active_rules
        for term in row.get("match_terms", ())
    }
    # Condition Formation keeps only fixed facts that can affect an active rule.
    known_terms = {key: value for key, value in all_known.items() if key in referenced_match_terms}

    term_meta: dict[str, dict[str, str]] = {}
    active_terms: dict[str, str] = dict(known_terms)
    for row in active_rules:
        source_id = str(row.get("source_id", ""))
        section_id = str(row.get("section_id", ""))
        for term in (*row.get("match_terms", ()), *row.get("emit_terms", ())):
            canonical = _canon(str(term))
            active_terms.setdefault(canonical, str(term))
            term_meta.setdefault(canonical, {"source_id": source_id, "section_id": section_id})

    regime_terms = [f"primary_regime:{value}" for value in corpus["primary_regime_candidates"]]
    for term in regime_terms:
        active_terms.setdefault(_canon(term), term)

    for question in unresolved_questions:
        term = str(question)
        if not _canon(term).startswith("question:"):
            term = f"question:{term}"
        active_terms.setdefault(_canon(term), term)

    rows: list[LegalSpaceRow] = []
    term_dimensions: dict[str, str] = {}
    for canonical, display in active_terms.items():
        kind = _row_kind(display)
        dimension_id = _dimension_id(kind, display)
        term_dimensions[canonical] = dimension_id
        meta = term_meta.get(canonical, {})
        rows.append(LegalSpaceRow(
            dimension_id=dimension_id,
            kind=kind,
            term=display,
            initial_value=1 if canonical in known_terms else "?",
            source_id=meta.get("source_id", ""),
            section_id=meta.get("section_id", ""),
            note="active case condition" if canonical in known_terms else "QCDS candidate dimension",
        ))
    return active_rules, rows, term_dimensions


def _build_statutory_runtime(
    *,
    case_id: str,
    case_terms: Sequence[str],
    unresolved_questions: Sequence[str],
    corpus: Mapping[str, Any],
    applied_rule_ids: Sequence[str],
    max_unknown_dimensions: int,
) -> LegalQCDSRuntime:
    active_rules, rows, term_dimensions = _active_statutory_rows(
        case_terms=case_terms,
        unresolved_questions=unresolved_questions,
        corpus=corpus,
        applied_rule_ids=applied_rule_ids,
    )
    loaded_rows, csv_text = _csv_roundtrip(rows)
    unknown_count = sum(row.initial_value == "?" for row in loaded_rows)
    if unknown_count > max_unknown_dimensions:
        raise LegalQCDSSpaceError(
            f"active statutory QCDS space requires 2^{unknown_count} states; exact classical limit is 2^{max_unknown_dimensions} for this runner"
        )

    bundle = BaseBundle(
        bundle_id=f"legal-qcds:{_slug(case_id)}:statutory",
        dimension_ids=tuple(row.dimension_id for row in loaded_rows),
        values=tuple(row.initial_value for row in loaded_rows),
        provenance={
            "case_id": case_id,
            "legal_corpus_id": corpus["corpus_id"],
            "active_rule_ids": tuple(str(row["rule_id"]) for row in active_rules),
            "csv_in_memory": True,
            "condition_formation_dropped_irrelevant_fixed_terms": True,
            "unknown_dimension_count": unknown_count,
            "candidate_binary_space": f"2^{unknown_count}",
            "canonical_spec_modified": False,
        },
        semantic_domain={"kind": "swedish_housing_active_legal_space", "stage": "statutory"},
    )

    regime_terms = [f"primary_regime:{value}" for value in corpus["primary_regime_candidates"]]
    oracles: list[Any] = []
    regime_dimensions = tuple(term_dimensions[_canon(term)] for term in regime_terms)
    if len(regime_dimensions) >= 2:
        oracles.append(OneHotOracle("legal:primary-regime:onehot", regime_dimensions))
    for row in active_rules:
        oracles.append(LegalRuleConstraintOracle(
            oracle_id=f"legal:rule:{_slug(str(row['rule_id']))}",
            antecedent_dimensions=tuple(term_dimensions[_canon(str(term))] for term in row.get("match_terms", ())),
            consequent_dimensions=tuple(term_dimensions[_canon(str(term))] for term in row.get("emit_terms", ())),
            source_id=str(row.get("source_id", "")),
            section_id=str(row.get("section_id", "")),
            rule_id=str(row["rule_id"]),
            confidence=1.0,
        ))

    stack = OracleStack(f"legal-qcds:{_slug(case_id)}:statutory", "1", tuple(oracles))
    suite = FabricLayer().run_stabilized_rotation_suite(
        bundle,
        stack,
        include_positional=True,
        include_oracle_exposure=True,
        include_crossed=False,
    )
    syntract = _bind_syntract(
        case_id=case_id,
        stage="statutory",
        bundle=bundle,
        stack=stack,
        suite=suite,
        rows=loaded_rows,
        active_rule_ids=tuple(str(row["rule_id"]) for row in active_rules),
        active_precedents=(),
        csv_text=csv_text,
    )
    return LegalQCDSRuntime(
        bundle,
        stack,
        suite,
        syntract,
        loaded_rows,
        term_dimensions,
        tuple(str(row["rule_id"]) for row in active_rules),
        (),
        csv_text,
    )


def _active_precedents(praxis: Mapping[str, Any], represented_terms: Sequence[str]) -> tuple[dict[str, Any], ...]:
    known = {_canon(term) for term in represented_terms}
    active: list[dict[str, Any]] = []
    for raw in praxis.get("precedents", ()):
        row = _mapping(raw, "precedents[]")
        activation = [str(term) for term in row.get("activation_terms", ())]
        counter = [str(term) for term in row.get("counter_terms", ())]
        activation_hits = [term for term in activation if _canon(term) in known]
        counter_hits = [term for term in counter if _canon(term) in known]
        if activation_hits or counter_hits:
            active.append({
                **dict(row),
                "matched_similarity_factors": activation_hits,
                "matched_counter_factors": counter_hits,
            })
    return tuple(active)


def _expand_with_praxis(
    *,
    case_id: str,
    statutory: LegalQCDSRuntime,
    praxis: Mapping[str, Any],
    represented_terms: Sequence[str],
    max_unknown_dimensions: int,
) -> LegalQCDSRuntime:
    precedents = _active_precedents(praxis, represented_terms)
    if not precedents:
        return statutory

    extra_rows = [
        LegalSpaceRow(
            _dimension_id("precedent", f"precedent:{row['precedent_id']}"),
            "precedent",
            f"precedent:{row['precedent_id']}",
            "?",
            str(row.get("precedent_id", "")),
            "|".join(str(value) for value in row.get("statutory_links", ())),
            "active precedent relevance",
        )
        for row in precedents
    ]
    loaded_rows, csv_text = _csv_roundtrip((*statutory.rows, *extra_rows))
    unknown_count = sum(row.initial_value == "?" for row in loaded_rows)
    if unknown_count > max_unknown_dimensions:
        raise LegalQCDSSpaceError(
            f"integrated legal QCDS space requires 2^{unknown_count} states; exact classical limit is 2^{max_unknown_dimensions} for this runner"
        )

    bundle = BaseBundle(
        bundle_id=f"legal-qcds:{_slug(case_id)}:integrated",
        dimension_ids=tuple(row.dimension_id for row in loaded_rows),
        values=tuple(row.initial_value for row in loaded_rows),
        provenance={
            **dict(statutory.bundle.provenance),
            "stage": "integrated_statute_praxis",
            "prior_syntract_id": statutory.syntract.syntract_id,
            "active_precedent_ids": tuple(str(row["precedent_id"]) for row in precedents),
            "unknown_dimension_count": unknown_count,
            "candidate_binary_space": f"2^{unknown_count}",
        },
        semantic_domain={"kind": "swedish_housing_active_legal_space", "stage": "integrated_statute_praxis"},
    )

    prior = statutory.suite.stabilized_return.stabilized_distribution
    prior_probabilities = dict(zip(prior.support, prior.probabilities))
    oracles: list[Any] = [
        *statutory.oracle_stack.oracles,
        DistributionOracle(
            "legal:statutory-syntract-reentry",
            statutory.bundle.dimension_ids,
            prior_probabilities,
            1.0,
        ),
    ]
    precedent_dimensions = {row.source_id: row.dimension_id for row in extra_rows}
    for precedent in precedents:
        precedent_id = str(precedent["precedent_id"])
        dimension_id = precedent_dimensions[precedent_id]
        for index, factor in enumerate(precedent.get("matched_similarity_factors", ())):
            oracles.append(EvidenceOracle(
                f"legal:praxis:{_slug(precedent_id)}:similarity:{index}",
                dimension_id,
                1,
                0.75,
                precedent_id,
                f"represented similarity factor: {factor}",
            ))
        for index, factor in enumerate(precedent.get("matched_counter_factors", ())):
            oracles.append(EvidenceOracle(
                f"legal:praxis:{_slug(precedent_id)}:counter:{index}",
                dimension_id,
                0,
                0.75,
                precedent_id,
                f"represented counter-factor: {factor}",
            ))

    stack = OracleStack(f"legal-qcds:{_slug(case_id)}:integrated", "2", tuple(oracles))
    suite = FabricLayer().run_stabilized_rotation_suite(
        bundle,
        stack,
        include_positional=True,
        include_oracle_exposure=True,
        include_crossed=False,
    )
    syntract = _bind_syntract(
        case_id=case_id,
        stage="final",
        bundle=bundle,
        stack=stack,
        suite=suite,
        rows=loaded_rows,
        active_rule_ids=statutory.active_rule_ids,
        active_precedents=precedents,
        csv_text=csv_text,
        prior_syntract_id=statutory.syntract.syntract_id,
    )
    term_dimensions = dict(statutory.term_dimensions)
    term_dimensions.update({_canon(row.term): row.dimension_id for row in extra_rows})
    return LegalQCDSRuntime(
        bundle,
        stack,
        suite,
        syntract,
        loaded_rows,
        term_dimensions,
        statutory.active_rule_ids,
        precedents,
        csv_text,
    )


def _regime_projection(runtime: LegalQCDSRuntime, distribution: TruthDistribution, candidates: Sequence[str]) -> list[dict[str, Any]]:
    raw: list[tuple[str, float]] = []
    for value in candidates:
        dimension_id = runtime.term_dimensions.get(_canon(f"primary_regime:{value}"))
        if dimension_id is not None:
            raw.append((str(value), _marginal(distribution, runtime.bundle, dimension_id)))
    total = sum(probability for _, probability in raw)
    return [
        {"value": value, "probability": probability / total if total else 0.0}
        for value, probability in sorted(raw, key=lambda item: (-item[1], item[0]))
    ]


def _runtime_payload(runtime: LegalQCDSRuntime, corpus: Mapping[str, Any]) -> dict[str, Any]:
    baseline_distribution = runtime.suite.baseline_distribution
    stabilized_distribution = runtime.suite.stabilized_return.stabilized_distribution
    baseline = _regime_projection(runtime, baseline_distribution, corpus["primary_regime_candidates"])
    stabilized = _regime_projection(runtime, stabilized_distribution, corpus["primary_regime_candidates"])
    leading: list[str] = []
    if stabilized:
        peak = float(stabilized[0]["probability"])
        leading = [str(row["value"]) for row in stabilized if abs(float(row["probability"]) - peak) <= 1e-12]
    unknown_count = sum(row.initial_value == "?" for row in runtime.rows)
    return {
        "status": "ok",
        "core_execution": "qcds_fabric.FabricLayer.run_stabilized_rotation_suite",
        "direct_qcds_base_bundle": True,
        "syntract_id": runtime.syntract.syntract_id,
        "leading_candidates": leading,
        "baseline": baseline,
        "stabilized": stabilized,
        "logical_width": runtime.bundle.width,
        "unknown_dimension_count": unknown_count,
        "candidate_binary_space": f"2^{unknown_count}",
        "candidate_state_count": len(baseline_distribution.support),
        "oracle_count": len(runtime.oracle_stack.oracles),
        "active_rule_ids": list(runtime.active_rule_ids),
        "active_precedent_ids": [str(row.get("precedent_id", "")) for row in runtime.active_precedents],
        "marginals": _projection(runtime, stabilized_distribution),
        "baseline_marginals": _projection(runtime, baseline_distribution),
        "top_states": _top_states(runtime),
        "entropy": stabilized_distribution.entropy,
        "baseline_entropy": baseline_distribution.entropy,
        "oracle_agreement": stabilized_distribution.oracle_agreement,
        "retained_uncertainty": runtime.suite.stabilized_return.retained_uncertainty,
        "rotation_sensitivity": dict(runtime.suite.stabilized_return.rotation_sensitivity),
        "conflict_markers": list(stabilized_distribution.contradiction_markers),
        "csv_in_memory": True,
        "csv_row_count": len(runtime.rows),
        "csv_sha256": hashlib.sha256(runtime.csv_text.encode("utf-8")).hexdigest(),
        "phases": {
            "1_condition_formation": "case facts are projected to only the source-attributed statutory dimensions that can affect the active case; conclusions and live assessments remain '?'",
            "2_conditional_evolution": "source-attributed legal rule constraints and, after re-entry, praxis evidence oracles score candidate states",
            "3_recursive_inference": "exact classical enumeration of the active 2^N legal state space across dimension-null, position and oracle-exposure rotation banks",
            "4_truth_alignment_verification": "the stabilized TruthDistribution is bound directly as the Legal Syntract",
        },
        "canonical_spec_modified": False,
    }


def run_integrated_legal_qcds(
    *,
    case_id: str,
    case_terms: Sequence[str],
    resolved_terms: Sequence[str],
    unresolved_questions: Sequence[str],
    corpus: Mapping[str, Any],
    applied_rule_ids: Sequence[str],
    praxis: Mapping[str, Any] | None = None,
    max_unknown_dimensions: int = 18,
) -> Mapping[str, Any]:
    """Run the active Swedish legal space through the actual QCDS Fabric.

    The ordinary legal resolver is used only as a Condition Formation gate: it
    identifies which source-attributed statutory constraints are active. Their
    consequences are *not* fixed in the QCDS BaseBundle. They remain binary '?'
    dimensions in an exact 2^N state space.

    If praxis activates, the statutory Syntract re-enters QCDS through a
    DistributionOracle. Active precedent dimensions expand the same legal room,
    new evidence oracles are added, all rotations run again, and the stabilized
    distribution is bound as the final Legal Syntract.
    """
    statutory = _build_statutory_runtime(
        case_id=case_id,
        case_terms=case_terms,
        unresolved_questions=unresolved_questions,
        corpus=corpus,
        applied_rule_ids=applied_rule_ids,
        max_unknown_dimensions=max_unknown_dimensions,
    )
    statutory_payload = _runtime_payload(statutory, corpus)

    final_runtime = statutory
    if praxis is not None:
        final_runtime = _expand_with_praxis(
            case_id=case_id,
            statutory=statutory,
            praxis=praxis,
            represented_terms=resolved_terms,
            max_unknown_dimensions=max_unknown_dimensions,
        )
    final_payload = _runtime_payload(final_runtime, corpus)
    final_payload["statutory_syntract_id"] = statutory.syntract.syntract_id
    final_payload["reentered_statutory_syntract"] = final_runtime is not statutory
    final_payload["statutory_pass"] = {
        "syntract_id": statutory_payload["syntract_id"],
        "candidate_binary_space": statutory_payload["candidate_binary_space"],
        "candidate_state_count": statutory_payload["candidate_state_count"],
        "logical_width": statutory_payload["logical_width"],
        "oracle_count": statutory_payload["oracle_count"],
        "entropy": statutory_payload["entropy"],
        "retained_uncertainty": statutory_payload["retained_uncertainty"],
    }
    return final_payload


__all__ = [
    "LegalQCDSSpaceError",
    "LegalRuleConstraintOracle",
    "LegalSpaceRow",
    "run_integrated_legal_qcds",
]
