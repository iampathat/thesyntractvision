from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from qcds_fabric.logical_assertion import normalize_logic_text


@dataclass(frozen=True)
class QuantumFullSpaceManifest:
    """Non-executed manifest of the complete represented legal universe.

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
            "evidence_term_count": len(self.evidence_terms),
            "evidence_terms": list(self.evidence_terms),
            "manifest_sha256": self.manifest_sha256,
            "classical_active_projection": False,
            "semantic_prefiltering": False,
            "source_structure_preserved": True,
        }


def _canonical(value: Any) -> str:
    return normalize_logic_text(str(value))


def _mapping(value: Any) -> Mapping[str, Any] | None:
    return value if isinstance(value, Mapping) else None


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
    counter logic. Case/evidence terms are added without deleting corpus logic.

    This is a target manifest only; no physical QPU execution is claimed.
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
            # Preserve the actual current praxis logic and generic future fields.
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
    for term in (*case_terms, *resolved_terms):
        text = str(term).strip()
        if text:
            normalized_case_terms.append(text)
            add(text)
    for question in unresolved_questions:
        text = str(question).strip()
        if not text:
            continue
        if not _canonical(text).startswith("question:"):
            text = f"question:{text}"
        normalized_case_terms.append(text)
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
        evidence_terms=tuple(payload["evidence_terms"]),
        manifest_sha256=digest,
    )


__all__ = ["QuantumFullSpaceManifest", "build_quantum_full_space_manifest"]
