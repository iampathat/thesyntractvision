from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from qcds_fabric.logical_assertion import normalize_logic_text
from qcds_fabric.semantic import EvidenceOracle


class LegalEvidenceError(ValueError):
    pass


@dataclass(frozen=True)
class LegalEvidenceItem:
    term: str
    confidence: float
    polarity: bool
    source_id: str
    note: str = ""

    def __post_init__(self) -> None:
        if not normalize_logic_text(self.term):
            raise LegalEvidenceError("evidence term must be non-empty")
        if not 0.5 <= self.confidence <= 1.0:
            raise LegalEvidenceError("evidence confidence must be in [0.5, 1.0]")
        if not self.source_id:
            raise LegalEvidenceError("evidence source_id must be non-empty")

    @property
    def canonical_term(self) -> str:
        return normalize_logic_text(self.term)


def parse_legal_evidence(values: Sequence[Mapping[str, Any]] | None) -> tuple[LegalEvidenceItem, ...]:
    if not values:
        return ()
    out: list[LegalEvidenceItem] = []
    for index, raw in enumerate(values):
        if not isinstance(raw, Mapping):
            raise LegalEvidenceError(f"qcds_evidence[{index}] must be an object")
        term = str(raw.get("term", "")).strip()
        confidence = float(raw.get("confidence", 1.0))
        polarity_raw = raw.get("polarity", True)
        if not isinstance(polarity_raw, bool):
            raise LegalEvidenceError(f"qcds_evidence[{index}].polarity must be boolean")
        source_id = str(raw.get("source_id", f"case-evidence:{index}")).strip()
        note = str(raw.get("note", "")).strip()
        out.append(LegalEvidenceItem(term, confidence, polarity_raw, source_id, note))
    return tuple(out)


def evidence_oracles(
    items: Sequence[LegalEvidenceItem],
    term_dimensions: Mapping[str, str],
) -> tuple[EvidenceOracle, ...]:
    out: list[EvidenceOracle] = []
    for index, item in enumerate(items):
        dimension_id = term_dimensions.get(item.canonical_term)
        if dimension_id is None:
            continue
        out.append(EvidenceOracle(
            oracle_id=f"legal:case-evidence:{index}:{item.source_id}",
            dimension_id=dimension_id,
            expected_value=1 if item.polarity else 0,
            confidence=item.confidence,
            source_id=item.source_id,
            claim_text=item.note or f"probabilistic evidence for {item.term}",
        ))
    return tuple(out)


__all__ = [
    "LegalEvidenceError",
    "LegalEvidenceItem",
    "evidence_oracles",
    "parse_legal_evidence",
]
