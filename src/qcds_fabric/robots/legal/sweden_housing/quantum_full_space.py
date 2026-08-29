from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from qcds_fabric.logical_assertion import normalize_logic_text
from qcds_fabric.models import BaseBundle, ChannelView, State
from qcds_fabric.oracles import OracleStack
from qcds_fabric.semantic import OneHotOracle

from .evidence import evidence_oracles, parse_legal_evidence
from .qcds_space import LegalRuleConstraintOracle


@dataclass(frozen=True)
class QuantumFullSpaceManifest:
    """Manifest of the complete represented legal universe.

    The manifest is independent of the classically projected active BaseBundle.
    Logical proposition terms are kept separately from source/section structure
    so preserving the whole represented legal universe does not pretend every
    source identifier or paragraph identifier is itself one binary proposition.
    """

    corpus_id: str
    dimension_terms: tuple[str, ...]
    rule_ids: tuple[str, ...]
    source_ids: tuple[str, ...]
    section_ids: tuple[str, ...]
    precedent_ids: tuple[str, ...]
    case_terms: tuple[str, ...]
    resolver_terms: tuple[str, ...]
    evidence_terms: tuple[str, ...]
    manifest_sha256: str

    @property
    def represented_dimension_count(self) -> int:
        return len(self.dimension_terms)

    def as_dict(self) -> dict[str, Any]:
        return {
            "corpus_id": self.corpus_id,
            "represented_dimension_count": self.represented_dimension_count,
            "dimension_terms": list(self.dimension_terms),
            "represented_rule_count": len(self.rule_ids),
            "represented_rule_ids": list(self.rule_ids),
            "represented_source_count": len(self.source_ids),
            "represented_source_ids": list(self.source_ids),
            "represented_section_count": len(self.section_ids),
            "represented_section_ids": list(self.section_ids),
            "represented_precedent_count": len(self.precedent_ids),
            "represented_precedent_ids": list(self.precedent_ids),
            "case_term_count": len(self.case_terms),
            "case_terms": list(self.case_terms),
            "resolver_term_count": len(self.resolver_terms),
            "resolver_terms": list(self.resolver_terms),
            "resolver_terms_prebound": False,
            "evidence_term_count": len(self.evidence_terms),
            "evidence_terms": list(self.evidence_terms),
            "manifest_sha256": self.manifest_sha256,
            "classical_active_projection": False,
            "semantic_prefiltering": False,
            "source_structure_preserved": True,
        }


@dataclass(frozen=True)
class QuantumPraxisRelationOracle:
    """Conditional praxis relation kept inside the full quantum target room.

    A represented activation/counter term is not used to preselect the precedent.
    Instead both terms remain dimensions and the oracle rewards candidate states
    whose precedent-relevance dimension is coherent with that relation.
    """

    oracle_id: str
    antecedent_dimension: str
    precedent_dimension: str
    expected_precedent: int
    precedent_id: str
    confidence: float = 0.75

    def __post_init__(self) -> None:
        if self.expected_precedent not in (0, 1):
            raise ValueError("expected_precedent must be binary")
        if not 0.5 <= self.confidence <= 1.0:
            raise ValueError("praxis relation confidence must be in [0.5, 1.0]")

    @property
    def dimensions(self) -> tuple[str, str]:
        return (self.antecedent_dimension, self.precedent_dimension)

    def is_applicable(self, view: ChannelView) -> bool:
        active = set(view.active_dimension_ids())
        return self.antecedent_dimension in active and self.precedent_dimension in active

    def score(self, view: ChannelView, state: State) -> float:
        active = view.state_as_mapping(state)
        if self.antecedent_dimension not in active or self.precedent_dimension not in active:
            return 1.0
        if active[self.antecedent_dimension] != 1:
            return 1.0
        matched = active[self.precedent_dimension] == self.expected_precedent
        return self.confidence if matched else 1.0 - self.confidence


@dataclass(frozen=True)
class QuantumFullSpaceCompilation:
    """Full BaseBundle + OracleStack contract ready for a native QPU adapter.

    Construction is cheap and does not enumerate the 2^N support. The reference
    build deliberately stops at this contract because no physical QPU backend is
    connected.
    """

    manifest: QuantumFullSpaceManifest
    bundle: BaseBundle
    oracle_stack: OracleStack
    term_dimensions: Mapping[str, str]

    def as_dict(self) -> dict[str, Any]:
        unknown = sum(1 for value in self.bundle.values if value == "?")
        return {
            "full_bundle_id": self.bundle.bundle_id,
            "full_bundle_width": self.bundle.width,
            "full_fixed_dimension_count": self.bundle.width - unknown,
            "full_unknown_dimension_count": unknown,
            "full_candidate_binary_space": f"2^{unknown}",
            "full_oracle_stack_identity": self.oracle_stack.identity,
            "full_oracle_count": len(self.oracle_stack.oracles),
            "manifest_sha256": self.manifest.manifest_sha256,
            "candidate_states_materialized": False,
            "classical_active_projection": False,
            "semantic_prefiltering": False,
            "fixed_input_policy": "case_terms_only",
            "resolver_outputs_prebound": False,
            "native_qpu_connected": False,
        }


def _canonical(value: Any) -> str:
    return normalize_logic_text(str(value))


def _mapping(value: Any) -> Mapping[str, Any] | None:
    return value if isinstance(value, Mapping) else None


def _slug(value: Any) -> str:
    out: list[str] = []
    separator = False
    for char in _canonical(value):
        if char.isalnum():
            out.append(char)
            separator = False
        elif not separator:
            out.append("-")
            separator = True
    return "".join(out).strip("-") or "term"


def _full_dimension_id(term: str) -> str:
    return f"legal::quantum-full::{_slug(term)}"


def build_quantum_full_space_manifest(
    *,
    corpus: Mapping[str, Any],
    praxis: Mapping[str, Any] | None,
    case_terms: Sequence[str],
    resolved_terms: Sequence[str],
    unresolved_questions: Sequence[str],
    qcds_evidence: Sequence[Mapping[str, Any]] | None,
) -> QuantumFullSpaceManifest:
    """Compile the complete represented legal universe for native quantum target.

    No statutory rule is selected by current-case relevance here. Every loaded
    rule term is retained, every represented source/section remains in the
    source structure, and every represented precedent keeps its activation /
    counter logic. Resolver outputs are represented but are explicitly distinct
    from original case inputs so they cannot silently become prebound truth.
    """
    display_by_canonical: dict[str, str] = {}

    def add(term: Any) -> None:
        text = str(term).strip()
        if not text:
            return
        display_by_canonical.setdefault(_canonical(text), text)

    source_ids: list[str] = []
    for raw in corpus.get("sources", ()):
        row = _mapping(raw)
        if row is None:
            continue
        source_id = str(row.get("source_id", "")).strip()
        if source_id:
            source_ids.append(source_id)

    section_ids: list[str] = []
    for raw in corpus.get("sections", ()):
        row = _mapping(raw)
        if row is None:
            continue
        section_id = str(row.get("section_id", "")).strip()
        if section_id:
            section_ids.append(section_id)

    for value in corpus.get("primary_regime_candidates", ()):
        add(f"primary_regime:{value}")

    rule_ids: list[str] = []
    for raw in corpus.get("rules", ()):
        row = _mapping(raw)
        if row is None:
            continue
        rule_id = str(row.get("rule_id", "")).strip()
        if rule_id:
            rule_ids.append(rule_id)
        for term in row.get("match_terms", ()):
            add(term)
        for term in row.get("emit_terms", ()):
            add(term)

    precedent_ids: list[str] = []
    if praxis is not None:
        for raw in praxis.get("precedents", praxis.get("cases", ())):
            row = _mapping(raw)
            if row is None:
                continue
            precedent_id = str(row.get("precedent_id", row.get("case_id", ""))).strip()
            if not precedent_id:
                continue
            precedent_ids.append(precedent_id)
            add(f"precedent:{precedent_id}")
            for key in (
                "activation_terms",
                "counter_terms",
                "similarity_factors",
                "counter_factors",
                "case_factors",
                "legal_factors",
                "statutory_links",
                "issue_tags",
                "principles",
            ):
                for term in row.get(key, ()):
                    add(term)

    normalized_case_terms: list[str] = []
    for term in case_terms:
        text = str(term).strip()
        if text:
            normalized_case_terms.append(text)
            add(text)

    normalized_resolver_terms: list[str] = []
    for term in resolved_terms:
        text = str(term).strip()
        if text:
            normalized_resolver_terms.append(text)
            add(text)

    for question in unresolved_questions:
        text = str(question).strip()
        if not text:
            continue
        if not _canonical(text).startswith("question:"):
            text = f"question:{text}"
        normalized_resolver_terms.append(text)
        add(text)

    evidence_terms: list[str] = []
    for raw in qcds_evidence or ():
        row = _mapping(raw)
        if row is None:
            continue
        term = str(row.get("term", "")).strip()
        if term:
            evidence_terms.append(term)
            add(term)

    dimension_terms = tuple(display_by_canonical[key] for key in sorted(display_by_canonical))
    payload = {
        "corpus_id": str(corpus.get("corpus_id", "")),
        "dimensions": list(dimension_terms),
        "rules": sorted(set(rule_ids)),
        "sources": sorted(set(source_ids)),
        "sections": sorted(set(section_ids)),
        "precedents": sorted(set(precedent_ids)),
        "case_terms": sorted(set(normalized_case_terms)),
        "resolver_terms": sorted(set(normalized_resolver_terms)),
        "evidence_terms": sorted(set(evidence_terms)),
    }
    digest = hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return QuantumFullSpaceManifest(
        corpus_id=payload["corpus_id"],
        dimension_terms=dimension_terms,
        rule_ids=tuple(payload["rules"]),
        source_ids=tuple(payload["sources"]),
        section_ids=tuple(payload["sections"]),
        precedent_ids=tuple(payload["precedents"]),
        case_terms=tuple(payload["case_terms"]),
        resolver_terms=tuple(payload["resolver_terms"]),
        evidence_terms=tuple(payload["evidence_terms"]),
        manifest_sha256=digest,
    )


def compile_quantum_full_space_contract(
    *,
    corpus: Mapping[str, Any],
    praxis: Mapping[str, Any] | None,
    case_terms: Sequence[str],
    resolved_terms: Sequence[str],
    unresolved_questions: Sequence[str],
    qcds_evidence: Sequence[Mapping[str, Any]] | None,
) -> QuantumFullSpaceCompilation:
    """Compile the complete represented law/praxis/evidence room for native QPU.

    This function does **not** call `candidate_states()` and does not apply the
    bounded emulator Condition Formation selector. The full logical term set
    becomes one BaseBundle and all represented statutory rules become constraint
    oracles. Praxis activation/counter relations remain conditional oracles.

    Only original `case_terms` are fixed as supplied input. `resolved_terms` from
    the classical explanatory resolver remain represented as `?`; in particular,
    a resolver-emitted legal conclusion must not become truth before QCDS runs.
    """
    manifest = build_quantum_full_space_manifest(
        corpus=corpus,
        praxis=praxis,
        case_terms=case_terms,
        resolved_terms=resolved_terms,
        unresolved_questions=unresolved_questions,
        qcds_evidence=qcds_evidence,
    )

    known_case_inputs = {_canonical(term) for term in case_terms if str(term).strip()}
    term_dimensions = {
        _canonical(term): _full_dimension_id(term)
        for term in manifest.dimension_terms
    }
    bundle = BaseBundle(
        bundle_id=f"legal-qcds:quantum-full:{_slug(manifest.corpus_id)}:{manifest.manifest_sha256[:12]}",
        dimension_ids=tuple(term_dimensions[_canonical(term)] for term in manifest.dimension_terms),
        values=tuple(1 if _canonical(term) in known_case_inputs else "?" for term in manifest.dimension_terms),
        provenance={
            "legal_corpus_id": manifest.corpus_id,
            "quantum_full_space": True,
            "manifest_sha256": manifest.manifest_sha256,
            "semantic_prefiltering": False,
            "candidate_states_materialized": False,
            "fixed_input_policy": "case_terms_only",
            "resolver_outputs_prebound": False,
            "represented_rule_count": len(manifest.rule_ids),
            "represented_precedent_count": len(manifest.precedent_ids),
            "represented_source_count": len(manifest.source_ids),
            "represented_section_count": len(manifest.section_ids),
        },
        semantic_domain={
            "kind": "swedish_housing_full_represented_legal_space",
            "execution_target": "native_qpu",
        },
    )

    oracles: list[Any] = []
    regime_dimensions = tuple(
        term_dimensions[_canonical(f"primary_regime:{value}")]
        for value in corpus.get("primary_regime_candidates", ())
        if _canonical(f"primary_regime:{value}") in term_dimensions
    )
    if len(regime_dimensions) >= 2:
        oracles.append(OneHotOracle("legal:quantum-full:primary-regime:onehot", regime_dimensions))

    for raw in corpus.get("rules", ()):
        row = _mapping(raw)
        if row is None:
            continue
        antecedents = tuple(
            term_dimensions[_canonical(term)]
            for term in row.get("match_terms", ())
            if _canonical(term) in term_dimensions
        )
        consequents = tuple(
            term_dimensions[_canonical(term)]
            for term in row.get("emit_terms", ())
            if _canonical(term) in term_dimensions
        )
        if not antecedents or not consequents:
            continue
        rule_id = str(row.get("rule_id", ""))
        oracles.append(LegalRuleConstraintOracle(
            oracle_id=f"legal:quantum-full:rule:{_slug(rule_id)}",
            antecedent_dimensions=antecedents,
            consequent_dimensions=consequents,
            source_id=str(row.get("source_id", "")),
            section_id=str(row.get("section_id", "")),
            rule_id=rule_id,
            confidence=1.0,
        ))

    if praxis is not None:
        for raw in praxis.get("precedents", praxis.get("cases", ())):
            row = _mapping(raw)
            if row is None:
                continue
            precedent_id = str(row.get("precedent_id", row.get("case_id", ""))).strip()
            precedent_dimension = term_dimensions.get(_canonical(f"precedent:{precedent_id}"))
            if not precedent_id or precedent_dimension is None:
                continue
            for index, term in enumerate(row.get("activation_terms", ())):
                antecedent = term_dimensions.get(_canonical(term))
                if antecedent is not None:
                    oracles.append(QuantumPraxisRelationOracle(
                        oracle_id=f"legal:quantum-full:praxis:{_slug(precedent_id)}:activation:{index}",
                        antecedent_dimension=antecedent,
                        precedent_dimension=precedent_dimension,
                        expected_precedent=1,
                        precedent_id=precedent_id,
                    ))
            for index, term in enumerate(row.get("counter_terms", ())):
                antecedent = term_dimensions.get(_canonical(term))
                if antecedent is not None:
                    oracles.append(QuantumPraxisRelationOracle(
                        oracle_id=f"legal:quantum-full:praxis:{_slug(precedent_id)}:counter:{index}",
                        antecedent_dimension=antecedent,
                        precedent_dimension=precedent_dimension,
                        expected_precedent=0,
                        precedent_id=precedent_id,
                    ))

    evidence = parse_legal_evidence(qcds_evidence)
    oracles.extend(evidence_oracles(evidence, term_dimensions))

    stack = OracleStack(
        stack_id=f"legal-qcds:quantum-full:{_slug(manifest.corpus_id)}",
        version="1",
        oracles=tuple(oracles),
    )
    return QuantumFullSpaceCompilation(
        manifest=manifest,
        bundle=bundle,
        oracle_stack=stack,
        term_dimensions=term_dimensions,
    )


__all__ = [
    "QuantumFullSpaceCompilation",
    "QuantumFullSpaceManifest",
    "QuantumPraxisRelationOracle",
    "build_quantum_full_space_manifest",
    "compile_quantum_full_space_contract",
]
