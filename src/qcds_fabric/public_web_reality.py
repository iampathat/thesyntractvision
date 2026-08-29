from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Sequence

from .evidence_driven_reality import (
    EvidenceDrivenRealityError,
    EvidenceDrivenRealityResult,
    load_evidence_driven_reality_spec,
    run_evidence_driven_reality_spec,
)
from .first_logical_robot import (
    FirstLogicalRobotError,
    HttpWebReadBackend,
    WebDocument,
    WebReadBackend,
    WebReference,
    WebSearchBackend,
    WikipediaSearchBackend,
)
from .logical_robot import LogicalObservation, LogicalRobotRequest, LogicalRobotToolResult
from .logical_robot_observatory import LogicalRobotEventLog


class PublicWebRealityError(ValueError):
    """Raised when BUILD 24 public-web observation cannot remain bounded."""


def _norm(value: str) -> str:
    return " ".join(value.casefold().split()).strip(" .?!")


def _context_from_request(request: LogicalRobotRequest) -> dict[str, str]:
    raw = request.provenance.get("build22_context_assignments", {})
    if not isinstance(raw, Mapping):
        return {}
    return {
        _norm(str(key)): _norm(str(value))
        for key, value in raw.items()
        if _norm(str(key)) and _norm(str(value))
    }


def _bounded_search_query(request: LogicalRobotRequest) -> str:
    context = _context_from_request(request)
    candidates = [
        _norm(str(value))
        for query_id in request.query_ids
        for value in request.candidate_values.get(query_id, ())
        if _norm(str(value))
    ]
    dimension_words: list[str] = []
    for dimension in request.dimension_ids:
        pieces = [piece.replace("_", " ") for piece in str(dimension).split("::") if piece]
        dimension_words.extend(pieces[-2:])
    tokens = [*context.values(), *dimension_words, *candidates]
    unique = list(dict.fromkeys(token for token in tokens if token))
    query = " ".join(unique[:18]).strip()
    if not query:
        query = " ".join(request.objective.split())[:300]
    if not query:
        raise PublicWebRealityError("public web request produced no bounded search query")
    return query


def _sentences(text: str) -> tuple[str, ...]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", text)
    return tuple(" ".join(part.split()) for part in parts if len(part.strip()) >= 8)


def _contains_token(text: str, token: str) -> bool:
    return bool(re.search(r"(?<!\w)" + re.escape(_norm(token)) + r"(?!\w)", _norm(text)))


@dataclass(frozen=True)
class ContextualCandidateExtractor:
    """Target-blind candidate observation extractor for BUILD 24.

    It scores represented candidate values only from text already acquired by the
    Logical Robot. A requested logical context may be established anywhere in the
    same document (including its title), while the candidate must still appear in
    an evidential sentence. It never sees selection/holdout roles or expected
    answers. This is observation ingress, not a truth oracle.
    """

    extractor_id: str = "contextual_candidate_extractor_v2"
    min_score: float = 2.5
    min_margin: float = 0.5

    def extract(self, request: LogicalRobotRequest, document: WebDocument) -> tuple[LogicalObservation, ...]:
        context_values = tuple(_context_from_request(request).values())
        document_text = f"{document.reference.title}. {document.reference.snippet}. {document.text}"
        document_norm = _norm(document_text)
        text_sentences = _sentences(document_text)
        document_context_hits = {
            value for value in context_values
            if _contains_token(document_norm, value)
        }
        observations: list[LogicalObservation] = []
        for query_id in request.query_ids:
            candidates = tuple(request.candidate_values.get(query_id, ()))
            if not candidates:
                continue
            relation_tokens = tuple(
                dict.fromkeys(
                    token
                    for token in (
                        _norm(query_id),
                        *(
                            _norm(piece)
                            for dimension in request.dimension_ids
                            for piece in str(dimension).split("::")[-2:-1]
                        ),
                    )
                    if token
                )
            )
            scored: list[tuple[str, float, str, tuple[str, ...]]] = []
            for candidate in candidates:
                candidate_norm = _norm(candidate)
                best_score = 0.0
                best_sentence = ""
                best_reasons: tuple[str, ...] = ()
                for sentence in text_sentences:
                    normalized = _norm(sentence)
                    if not _contains_token(normalized, candidate_norm):
                        continue
                    reasons: list[str] = ["candidate_in_sentence"]
                    score = 1.0
                    same_sentence_context = tuple(
                        value for value in context_values if _contains_token(normalized, value)
                    )
                    if same_sentence_context:
                        score += 1.5
                        reasons.append("context_in_same_sentence")
                    elif document_context_hits:
                        score += 1.0
                        reasons.append("context_established_in_document")
                    relation_hits = tuple(token for token in relation_tokens if _contains_token(normalized, token))
                    if relation_hits:
                        score += 1.0
                        reasons.append("represented_relation_in_sentence")
                    elif any(word in normalized for word in (" is ", " are ", "known as", "called", "can ")):
                        score += 0.5
                        reasons.append("bounded_relational_cue")
                    if score > best_score:
                        best_score = score
                        best_sentence = sentence
                        best_reasons = tuple(reasons)
                scored.append((candidate, best_score, best_sentence, best_reasons))
            scored.sort(key=lambda item: (-item[1], _norm(item[0])))
            winner, top_score, excerpt, reasons = scored[0]
            second_score = scored[1][1] if len(scored) > 1 else 0.0
            if top_score < self.min_score or top_score - second_score < self.min_margin:
                continue
            digest = hashlib.sha256(
                f"{request.evidence_action_id}|{query_id}|{document.reference.reference_id}|{winner}".encode("utf-8")
            ).hexdigest()[:16]
            confidence = min(0.92, 0.55 + 0.08 * top_score)
            observations.append(
                LogicalObservation(
                    observation_id=f"publicweb:{digest}",
                    query_id=query_id,
                    observed_value=winner,
                    source_id=document.reference.reference_id,
                    capability=request.capability,
                    confidence=confidence,
                    polarity=True,
                    uri=document.reference.url,
                    excerpt=excerpt[:1000],
                    provenance={
                        "extractor": self.extractor_id,
                        "target_visible_to_extractor": False,
                        "challenge_role_visible": False,
                        "expected_answer_visible": False,
                        "source_is_evidence_not_truth": True,
                        "source_independence_scope": "distinct_document_reference_only",
                        "publisher_independence_claim": False,
                        "context_binding_scope": "same_document",
                        "candidate_evidence_scope": "sentence",
                        "score": top_score,
                        "score_margin": top_score - second_score,
                        "score_reasons": list(reasons),
                    },
                )
            )
        return tuple(observations)


@dataclass
class ContextualPublicWebTool:
    """Public read-only web body for the BUILD 22 evidence requests.

    This is the same Logical Robot extended with a public-web observation body.
    It does not bypass QCDS, oracle genesis, challenge, or Reality governance.
    """

    search_backend: WebSearchBackend = field(default_factory=WikipediaSearchBackend)
    read_backend: WebReadBackend = field(default_factory=HttpWebReadBackend)
    extractor: ContextualCandidateExtractor = field(default_factory=ContextualCandidateExtractor)
    search_limit: int = 6
    max_pages_per_context: int = 5
    max_chars_per_page: int = 50_000
    tool_id: str = "contextual_public_web_logical_robot_v1"
    capabilities: tuple[str, ...] = ("search", "read", "follow", "query", "compare")
    _references: dict[str, tuple[WebReference, ...]] = field(default_factory=dict, init=False, repr=False)
    _documents: dict[str, tuple[WebDocument, ...]] = field(default_factory=dict, init=False, repr=False)

    def __post_init__(self) -> None:
        if self.search_limit <= 0 or self.max_pages_per_context <= 0 or self.max_chars_per_page <= 0:
            raise ValueError("public web bounds must be positive")

    def _search(self, request: LogicalRobotRequest) -> tuple[WebReference, ...]:
        refs = self.search_backend.search(_bounded_search_query(request), limit=self.search_limit)
        self._references[request.evidence_action_id] = refs
        return refs

    def _read(self, request: LogicalRobotRequest) -> tuple[WebDocument, ...]:
        refs = self._references.get(request.evidence_action_id, ()) or self._search(request)
        docs: list[WebDocument] = []
        for ref in refs[: self.max_pages_per_context]:
            try:
                docs.append(self.read_backend.read(ref, max_chars=self.max_chars_per_page))
            except (FirstLogicalRobotError, OSError, UnicodeError, ValueError):
                continue
        self._documents[request.evidence_action_id] = tuple(docs)
        return tuple(docs)

    def observe(self, request: LogicalRobotRequest) -> LogicalRobotToolResult:
        try:
            if request.capability in {"search", "query"}:
                refs = self._search(request)
                return LogicalRobotToolResult(
                    discovered_references=tuple(ref.url for ref in refs),
                    exhausted=not refs,
                    retry_capabilities=("read",) if refs else (),
                    notes=("public_references_discovered",) if refs else ("no_public_references",),
                    provenance={
                        "tool": self.tool_id,
                        "read_only": True,
                        "external_truth_claim": False,
                        "search_query": _bounded_search_query(request),
                    },
                )
            docs = self._documents.get(request.evidence_action_id, ()) or self._read(request)
            observations: list[LogicalObservation] = []
            for document in docs:
                observations.extend(self.extractor.extract(request, document))
            return LogicalRobotToolResult(
                observations=tuple(observations),
                discovered_references=tuple(doc.reference.url for doc in docs),
                exhausted=not docs,
                retry_capabilities=(),
                notes=("public_documents_observed",) if docs else ("no_readable_public_documents",),
                provenance={
                    "tool": self.tool_id,
                    "read_only": True,
                    "external_truth_claim": False,
                    "publisher_independence_claim": False,
                },
            )
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            return LogicalRobotToolResult(
                observations=(),
                discovered_references=(),
                exhausted=True,
                retry_capabilities=(),
                notes=(f"public_web_failure:{type(exc).__name__}",),
                provenance={"tool": self.tool_id, "read_only": True, "external_truth_claim": False},
            )


def _emit_result_events(log: LogicalRobotEventLog, result: EvidenceDrivenRealityResult) -> None:
    mission_id = result.mission_id
    log.emit("oracle_gap_detected", {"count": result.oracle_gap_count}, mission_id=mission_id)
    log.emit("rival_hypotheses_generated", {"count": result.rival_hypothesis_count}, mission_id=mission_id)
    for context in result.planned_contexts:
        log.emit("contrast_context_planned", dict(context), mission_id=mission_id)
    log.emit(
        "public_observations_acquired",
        {"count": result.robot_observation_count, "sources": list(result.robot_source_ids)},
        mission_id=mission_id,
    )
    if result.challenge_case_count:
        log.emit(
            "challenge_generated_from_observations",
            {
                "cases": result.challenge_case_count,
                "selection": result.selection_case_count,
                "holdout": result.holdout_case_count,
            },
            mission_id=mission_id,
        )
    if result.reality_result is not None:
        reality = result.reality_result.as_dict()
        for outcome in reality.get("governed_rule_outcomes", []):
            status = str(outcome.get("status", ""))
            log.emit(
                "rule_promoted" if status == "promoted_to_reality" else "rule_quarantined",
                dict(outcome),
                mission_id=mission_id,
            )
        log.emit(
            "knowledge_change",
            {
                "before": reality.get("before_probe_count"),
                "after": reality.get("after_probe_count"),
                "gain": reality.get("knowledge_gain"),
            },
            mission_id=mission_id,
        )
    terminal_type = "cycle_expanded" if result.status == "expanded" else (
        "cycle_quarantined" if result.status == "quarantined" else result.status
    )
    log.emit(terminal_type, {"status": result.status}, mission_id=mission_id)


def run_public_web_reality_spec(
    spec: Mapping[str, Any],
    *,
    store_root: str | Path = "./intelligence_store",
    tools: Sequence[Any] | None = None,
    event_log: LogicalRobotEventLog | None = None,
) -> EvidenceDrivenRealityResult:
    log = event_log or LogicalRobotEventLog(store_root)
    mission_id = str(spec.get("mission_id", "build24-public-web-reality")).strip()
    log.emit(
        "public_web_reality_cycle_started",
        {"mission_id": mission_id, "external_web": tools is None},
        mission_id=mission_id,
    )
    resolved_tools = tuple(tools) if tools is not None else (ContextualPublicWebTool(),)
    try:
        result = run_evidence_driven_reality_spec(spec, store_root=store_root, tools=resolved_tools)
    except (EvidenceDrivenRealityError, ValueError) as exc:
        log.emit("public_web_reality_cycle_failed", {"error": str(exc)}, mission_id=mission_id)
        raise PublicWebRealityError(str(exc)) from exc
    _emit_result_events(log, result)
    return result


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run BUILD 24: the same Logical Robot acquires real public-web observations for BUILD 22 Reality discovery."
    )
    parser.add_argument("spec", help="Path to a BUILD 22-compatible JSON spec")
    parser.add_argument("--store", default="./intelligence_store", help="Persistent intelligence-store root")
    args = parser.parse_args(argv)
    try:
        spec = load_evidence_driven_reality_spec(args.spec)
        result = run_public_web_reality_spec(spec, store_root=args.store)
    except (OSError, json.JSONDecodeError, PublicWebRealityError, ValueError) as exc:
        parser.error(str(exc))
        return 2
    print(json.dumps(result.as_dict(), ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
