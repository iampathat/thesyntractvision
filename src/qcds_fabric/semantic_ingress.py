from __future__ import annotations

import re
from dataclasses import dataclass

from .fabric import FabricLayer
from .semantic import (
    HumanProblemResult,
    SemanticAnalyzer,
    SemanticClaim,
    SemanticCompilation,
    SemanticFrame,
    SemanticQuery,
    bind_semantic_result,
    compile_semantic_frame,
    run_semantic_compilation,
)


def _normalize_phrase(value: str) -> str:
    value = re.sub(r"\s+", " ", value.strip().lower())
    if value.startswith("the "):
        value = value[4:]
    return value.strip(" .?!")


@dataclass(frozen=True)
class ControlledEnglishAnalyzer:
    """Corrected bounded raw-text analyzer for the public BUILD 9 ingress API.

    Source confidence is parsed from an optional suffix such as ``[0.90]`` on
    the source label. Unknown text remains unresolved; this parser never guesses
    missing semantics.
    """

    default_confidence: float = 0.75
    analyzer_id: str = "controlled_english_v0"

    _QUESTION = re.compile(
        r"^\s*what\s+(?P<predicate>[a-zA-Z][\w-]*)\s+(?:was|is)\s+(?:the\s+)?(?P<subject>.+?)\s*\?\s*$",
        re.IGNORECASE,
    )
    _ATTRIBUTED = re.compile(
        r"^(?P<source_prefix>.+?)\s+says\s+(?:that\s+)?(?:the\s+)?"
        r"(?P<subject>.+?)\s+(?:was|is)\s+(?P<neg>not\s+)?"
        r"(?P<value>[a-zA-Z0-9_-]+)\s*[.!]?\s*$",
        re.IGNORECASE,
    )
    _SOURCE = re.compile(
        r"^(?P<source>.*?)(?:\s*\[(?P<confidence>(?:0(?:\.\d+)?|1(?:\.0+)?))\])?\s*$",
        re.IGNORECASE,
    )
    _DIRECT = re.compile(
        r"^(?:the\s+)?(?P<subject>.+?)\s+(?:was|is)\s+"
        r"(?P<neg>not\s+)?(?P<value>[a-zA-Z0-9_-]+)\s*[.!]?\s*$",
        re.IGNORECASE,
    )

    def __post_init__(self) -> None:
        if not 0.5 <= self.default_confidence <= 1.0:
            raise ValueError("default_confidence must be in [0.5, 1.0]")

    def analyze(self, text: str, *, mission_id: str) -> SemanticFrame:
        raw = text.strip()
        sentences = tuple(
            piece.strip()
            for piece in re.findall(r"[^.!?]+[.!?]?", raw)
            if piece.strip()
        )

        query_index: int | None = None
        query_subject: str | None = None
        query_predicate: str | None = None
        query_text = ""
        for index, sentence in enumerate(sentences):
            match = self._QUESTION.match(sentence)
            if match:
                query_index = index
                query_subject = _normalize_phrase(match.group("subject"))
                query_predicate = _normalize_phrase(match.group("predicate"))
                query_text = sentence
                break

        claims: list[SemanticClaim] = []
        unresolved: list[str] = []
        recognized = 1 if query_index is not None else 0

        for index, sentence in enumerate(sentences):
            if index == query_index:
                continue

            attributed = self._ATTRIBUTED.match(sentence)
            if attributed is not None:
                source_match = self._SOURCE.match(attributed.group("source_prefix").strip())
                if source_match is None or not source_match.group("source").strip():
                    unresolved.append(sentence)
                    continue
                source_id = source_match.group("source").strip()
                confidence_raw = source_match.group("confidence")
                confidence = float(confidence_raw) if confidence_raw else self.default_confidence
                subject = _normalize_phrase(attributed.group("subject"))
                predicate = query_predicate if query_subject == subject and query_predicate else "state"
                claims.append(
                    SemanticClaim(
                        subject=subject,
                        predicate=predicate,
                        value=_normalize_phrase(attributed.group("value")),
                        source_id=source_id,
                        confidence=confidence,
                        polarity=attributed.group("neg") is None,
                        original_text=sentence,
                    )
                )
                recognized += 1
                continue

            direct = self._DIRECT.match(sentence)
            if direct is None:
                unresolved.append(sentence)
                continue
            subject = _normalize_phrase(direct.group("subject"))
            predicate = query_predicate if query_subject == subject and query_predicate else "state"
            claims.append(
                SemanticClaim(
                    subject=subject,
                    predicate=predicate,
                    value=_normalize_phrase(direct.group("value")),
                    source_id=f"statement:{index}",
                    confidence=self.default_confidence,
                    polarity=direct.group("neg") is None,
                    original_text=sentence,
                )
            )
            recognized += 1

        if query_subject is not None and query_predicate is not None:
            candidates: list[str] = []
            query_key = f"{query_subject}::{query_predicate}"
            for claim in claims:
                if claim.group_key == query_key and claim.value not in candidates:
                    candidates.append(claim.value)
            query = SemanticQuery(
                subject=query_subject,
                predicate=query_predicate,
                candidate_values=tuple(candidates),
                original_text=query_text,
            )
        else:
            query = None

        return SemanticFrame(
            mission_id=mission_id,
            raw_text=raw,
            query=query,
            claims=tuple(claims),
            unresolved=tuple(unresolved),
            analyzer_id=self.analyzer_id,
            provenance={
                "analyzer": self.analyzer_id,
                "sentence_count": len(sentences),
                "recognized_sentence_count": recognized,
                "unresolved_sentence_count": len(unresolved),
                "grammar_is_bounded": True,
                "source_confidence_syntax": "[0.50..1.00]",
                "semantic_invention": False,
            },
        )


def human_to_logic(
    text: str,
    *,
    mission_id: str = "human-problem",
    analyzer: SemanticAnalyzer | None = None,
    max_width: int = 16,
) -> SemanticCompilation:
    parser = analyzer or ControlledEnglishAnalyzer()
    return compile_semantic_frame(parser.analyze(text, mission_id=mission_id), max_width=max_width)


def run_human_problem(
    text: str,
    *,
    mission_id: str = "human-problem",
    analyzer: SemanticAnalyzer | None = None,
    max_width: int = 16,
    fabric_layer: FabricLayer | None = None,
    include_positional: bool = False,
    include_oracle_exposure: bool = False,
    include_crossed: bool = False,
    syntract_id: str | None = None,
) -> HumanProblemResult:
    parser = analyzer or ControlledEnglishAnalyzer()
    frame = parser.analyze(text, mission_id=mission_id)
    compilation = compile_semantic_frame(frame, max_width=max_width)
    inference = run_semantic_compilation(
        compilation,
        fabric_layer=fabric_layer,
        include_positional=include_positional,
        include_oracle_exposure=include_oracle_exposure,
        include_crossed=include_crossed,
    )
    syntract = bind_semantic_result(inference, syntract_id=syntract_id)
    return HumanProblemResult(frame=frame, compilation=compilation, inference=inference, syntract=syntract)
