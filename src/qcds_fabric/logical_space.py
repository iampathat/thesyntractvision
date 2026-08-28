from __future__ import annotations

import csv
import hashlib
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Sequence

from .first_logical_robot import (
    FirstLogicalRobot,
    FirstLogicalRobotConfig,
    FirstLogicalRobotRun,
    PublicWebLogicalRobotTool,
    WebDocument,
    _problem_frame_from_spec,
    challenge_suite_from_spec,
    failure_observations_from_spec,
)
from .intelligence_store import CsvIntelligenceStore
from .logical_robot import LogicalObservation, LogicalRobotRequest, LogicalRobotToolResult
from .runtime import SuperintelligenceRuntime


class LogicalSpaceError(ValueError):
    """Raised when a logical-space operation would require semantic invention."""


def _normalize(value: str) -> str:
    value = value.casefold().replace("_", " ").replace("’", "'")
    value = re.sub(r"[^\w\s'./:-]+", " ", value)
    return " ".join(value.split()).strip()


def _word_tokens(value: str) -> tuple[str, ...]:
    return tuple(_normalize(value).split())


def _phrase_occurrences(tokens: Sequence[str], phrase: str) -> tuple[tuple[int, int], ...]:
    needle = _word_tokens(phrase)
    if not needle or len(needle) > len(tokens):
        return ()
    width = len(needle)
    return tuple(
        (index, index + width - 1)
        for index in range(len(tokens) - width + 1)
        if tuple(tokens[index:index + width]) == needle
    )


def _minimum_binding_span_words(text: str, terms: Sequence[str]) -> int | None:
    """Smallest word span containing every logical term at least once."""
    tokens = _word_tokens(text)
    occurrences = tuple(_phrase_occurrences(tokens, term) for term in terms)
    if not occurrences or any(not values for values in occurrences):
        return None
    best: int | None = None

    def visit(index: int, chosen: list[tuple[int, int]]) -> None:
        nonlocal best
        if index == len(occurrences):
            start = min(item[0] for item in chosen)
            end = max(item[1] for item in chosen)
            span = end - start + 1
            if best is None or span < best:
                best = span
            return
        for occurrence in occurrences[index]:
            chosen.append(occurrence)
            visit(index + 1, chosen)
            chosen.pop()

    visit(0, [])
    return best


def _sentences(text: str) -> tuple[str, ...]:
    return tuple(
        " ".join(chunk.split())
        for chunk in re.split(r"(?<=[.!?])\s+|[\r\n]+", text)
        if chunk.strip()
    )


def _logic_excerpt(text: str, terms: Sequence[str], radius: int = 220) -> str:
    normalized = text.casefold()
    indexes = [normalized.find(term.casefold()) for term in terms if term and normalized.find(term.casefold()) >= 0]
    if not indexes:
        return " ".join(text[: radius * 2].split())
    start = max(0, min(indexes) - radius)
    end = min(len(text), max(indexes) + max((len(term) for term in terms), default=0) + radius)
    return " ".join(text[start:end].split())


def _query_logic(request: LogicalRobotRequest) -> dict[str, tuple[str, str, tuple[str, ...]]]:
    """Recover represented logical axes without assigning them a relation taxonomy."""
    dimensions: list[tuple[str, str, str]] = []
    for dimension_id in request.dimension_ids:
        parts = dimension_id.split("::", 3)
        if len(parts) != 4 or parts[0] != "problem":
            continue
        dimensions.append((_normalize(parts[1]), _normalize(parts[2]), _normalize(parts[3])))

    result: dict[str, tuple[str, str, tuple[str, ...]]] = {}
    for query_id in request.query_ids:
        candidates = tuple(_normalize(value) for value in request.candidate_values.get(query_id, ()) if _normalize(value))
        if not candidates:
            continue
        candidate_set = set(candidates)
        axes = {(subject, dimension) for subject, dimension, value in dimensions if value in candidate_set}
        if len(axes) == 1:
            subject, dimension = next(iter(axes))
            result[query_id] = (subject, dimension, candidates)
    return result


def _logical_search_query(request: LogicalRobotRequest) -> str:
    """Search for the logical axis, not candidate names that can bias discovery."""
    terms: list[str] = []
    for subject, dimension, _ in _query_logic(request).values():
        for term in (subject, dimension):
            if term and term not in terms:
                terms.append(term)
    return " ".join(terms) or request.objective


@dataclass(frozen=True)
class LogicalBinding:
    """One observed binding inside an open-ended logical space.

    ``terms`` intentionally has no fixed relation schema. A binding can be
    ("paris", "city"), ("paris", "capital", "france"), or later something
    like ("stone_8421", "stone_8422", "distance", "7.3 mm").
    """

    binding_id: str
    terms: tuple[str, ...]
    source_id: str
    confidence: float
    polarity: bool = True
    source_uri: str | None = None
    mission_id: str = ""
    observation_id: str = ""
    excerpt: str = ""
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        normalized = tuple(dict.fromkeys(_normalize(term) for term in self.terms if _normalize(term)))
        if not self.binding_id.strip() or len(normalized) < 2:
            raise ValueError("logical binding requires id and at least two terms")
        if not self.source_id.strip():
            raise ValueError("logical binding requires source provenance")
        if not 0.5 <= self.confidence <= 1.0:
            raise ValueError("logical binding confidence must be in [0.5, 1.0]")


LOGICAL_SPACE_FIELDS = (
    "binding_id", "terms", "term_count", "source_id", "confidence", "polarity",
    "source_uri", "mission_id", "observation_id", "excerpt", "provenance",
)


@dataclass
class CsvLogicalSpace:
    """Human-readable shared logical space above individual missions."""

    root: str | Path

    def __post_init__(self) -> None:
        self.root = Path(self.root)
        self.root.mkdir(parents=True, exist_ok=True)

    @property
    def path(self) -> Path:
        return self.root / "logical_space.csv"

    def _rows(self) -> list[dict[str, str]]:
        if not self.path.exists():
            return []
        with self.path.open("r", encoding="utf-8", newline="") as handle:
            return list(csv.DictReader(handle))

    def bindings(self) -> tuple[LogicalBinding, ...]:
        out: list[LogicalBinding] = []
        for row in self._rows():
            out.append(LogicalBinding(
                binding_id=row["binding_id"],
                terms=tuple(json.loads(row["terms"])),
                source_id=row["source_id"],
                confidence=float(row["confidence"]),
                polarity=row["polarity"].strip().lower() in {"1", "true", "yes"},
                source_uri=row["source_uri"] or None,
                mission_id=row["mission_id"],
                observation_id=row["observation_id"],
                excerpt=row["excerpt"],
                provenance=json.loads(row["provenance"] or "{}"),
            ))
        return tuple(out)

    def append(self, bindings: Sequence[LogicalBinding]) -> int:
        resolved = tuple(bindings)
        if not resolved:
            return 0
        existing = self._rows()
        known = {row["binding_id"] for row in existing}
        added = 0
        rows = list(existing)
        for binding in resolved:
            if binding.binding_id in known:
                continue
            terms = tuple(dict.fromkeys(_normalize(term) for term in binding.terms if _normalize(term)))
            rows.append({
                "binding_id": binding.binding_id,
                "terms": json.dumps(terms, ensure_ascii=False, separators=(",", ":")),
                "term_count": len(terms),
                "source_id": binding.source_id,
                "confidence": binding.confidence,
                "polarity": binding.polarity,
                "source_uri": binding.source_uri or "",
                "mission_id": binding.mission_id,
                "observation_id": binding.observation_id,
                "excerpt": binding.excerpt,
                "provenance": json.dumps(dict(binding.provenance), ensure_ascii=False, sort_keys=True, separators=(",", ":")),
            })
            known.add(binding.binding_id)
            added += 1
        temporary = self.path.with_suffix(".csv.tmp")
        with temporary.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(LOGICAL_SPACE_FIELDS), extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
        temporary.replace(self.path)
        return added

    def query(self, *terms: str, polarity: bool | None = True) -> tuple[LogicalBinding, ...]:
        wanted = {_normalize(term) for term in terms if _normalize(term)}
        if not wanted:
            return self.bindings()
        return tuple(
            binding for binding in self.bindings()
            if wanted.issubset({_normalize(term) for term in binding.terms})
            and (polarity is None or binding.polarity is polarity)
        )


@dataclass(frozen=True)
class LogicalSpaceExtractor:
    """MVP logical extractor: bounded local binding, never page-level mention voting."""

    min_support_units: int = 1
    max_binding_span_words: int = 32
    max_confidence: float = 0.95
    extractor_id: str = "logical_space_extractor_v1"

    def __post_init__(self) -> None:
        if self.min_support_units <= 0 or self.max_binding_span_words <= 0:
            raise ValueError("logical binding bounds must be positive")
        if not 0.5 <= self.max_confidence <= 1.0:
            raise ValueError("max_confidence must be in [0.5, 1.0]")

    def extract(self, request: LogicalRobotRequest, documents: Sequence[WebDocument]) -> tuple[LogicalObservation, ...]:
        query_logic = _query_logic(request)
        observations: list[LogicalObservation] = []
        for document in documents:
            units = _sentences(" ".join((document.reference.title, document.reference.snippet, document.text)))
            for query_id, (subject, dimension, candidates) in query_logic.items():
                for candidate in candidates:
                    terms = tuple(dict.fromkeys((subject, dimension, candidate)))
                    supports: list[tuple[str, int]] = []
                    for unit in units:
                        span = _minimum_binding_span_words(unit, terms)
                        if span is not None and span <= self.max_binding_span_words:
                            supports.append((unit, span))
                    if len(supports) < self.min_support_units:
                        continue
                    best_unit, best_span = min(supports, key=lambda item: item[1])
                    compactness = 1.0 - min(1.0, max(0, best_span - len(terms)) / self.max_binding_span_words)
                    confidence = min(self.max_confidence, 0.78 + 0.12 * compactness + 0.03 * min(len(supports), 2))
                    digest = hashlib.sha256(
                        f"{request.evidence_action_id}|{query_id}|{document.reference.url}|{'|'.join(terms)}".encode()
                    ).hexdigest()[:16]
                    observations.append(LogicalObservation(
                        observation_id=f"logicobs:{digest}",
                        query_id=query_id,
                        observed_value=candidate,
                        source_id=document.reference.reference_id,
                        capability=request.capability,
                        confidence=confidence,
                        polarity=True,
                        uri=document.reference.url,
                        excerpt=_logic_excerpt(best_unit, terms),
                        provenance={
                            "extractor": self.extractor_id,
                            "logical_terms": terms,
                            "support_unit_count": len(supports),
                            "best_binding_span_words": best_span,
                            "max_binding_span_words": self.max_binding_span_words,
                            "binding_scope": "bounded_local_text",
                            "page_level_mention_voting": False,
                            "target_visible_to_extractor": False,
                            "holdout_visible_to_extractor": False,
                            "source_is_external_truth_claim": False,
                            "semantic_invention": False,
                        },
                    ))
        return tuple(observations)


@dataclass
class LogicalSpaceWebRobotTool(PublicWebLogicalRobotTool):
    """Public web body using logical binding rather than mention-frequency voting."""

    extractor: LogicalSpaceExtractor = field(default_factory=LogicalSpaceExtractor)
    tool_id: str = "public_web_logical_space_robot_v1"

    def _search(self, request: LogicalRobotRequest):
        refs = self.search_backend.search(_logical_search_query(request), limit=self.search_limit)
        self._references[request.evidence_action_id] = refs
        return refs


@dataclass
class PersistentLogicalSpaceTool:
    """Read prior logical bindings before acquiring new external observations."""

    space: CsvLogicalSpace
    tool_id: str = "persistent_logical_space_v0"
    capabilities: tuple[str, ...] = ("query",)

    def observe(self, request: LogicalRobotRequest) -> LogicalRobotToolResult:
        observations: list[LogicalObservation] = []
        for query_id, (subject, dimension, candidates) in _query_logic(request).items():
            for candidate in candidates:
                for binding in self.space.query(subject, dimension, candidate):
                    digest = hashlib.sha256(
                        f"{request.evidence_action_id}|{query_id}|{binding.binding_id}".encode()
                    ).hexdigest()[:16]
                    observations.append(LogicalObservation(
                        observation_id=f"spaceobs:{digest}",
                        query_id=query_id,
                        observed_value=candidate,
                        source_id=binding.source_id,
                        capability="query",
                        confidence=binding.confidence,
                        polarity=binding.polarity,
                        uri=binding.source_uri,
                        excerpt=binding.excerpt,
                        provenance={
                            **dict(binding.provenance),
                            "logical_space_binding_id": binding.binding_id,
                            "logical_space_reuse": True,
                            "logical_terms": binding.terms,
                            "original_mission_id": binding.mission_id,
                            "target_visible_to_extractor": False,
                            "holdout_visible_to_extractor": False,
                            "source_is_external_truth_claim": False,
                        },
                    ))
        return LogicalRobotToolResult(
            observations=tuple(observations),
            retry_capabilities=("search",) if not observations else (),
            exhausted=not observations,
            notes=("logical_space_reused",) if observations else ("logical_space_no_binding",),
            provenance={
                "tool": self.tool_id,
                "shared_persistent_logic": True,
                "external_truth_claim": False,
                "target_visible": False,
            },
        )


def bindings_from_run(run: FirstLogicalRobotRun) -> tuple[LogicalBinding, ...]:
    bindings: list[LogicalBinding] = []
    for robot_run in run.robot_runs:
        for observation in robot_run.observations:
            terms = tuple(observation.provenance.get("logical_terms", ()))
            if len(terms) < 2:
                continue
            digest = hashlib.sha256(
                f"{observation.source_id}|{observation.uri}|{'|'.join(_normalize(term) for term in terms)}|{observation.polarity}".encode()
            ).hexdigest()[:20]
            bindings.append(LogicalBinding(
                binding_id=f"logic:{digest}",
                terms=terms,
                source_id=observation.source_id,
                confidence=observation.confidence,
                polarity=observation.polarity,
                source_uri=observation.uri,
                mission_id=run.mission_id,
                observation_id=observation.observation_id,
                excerpt=observation.excerpt,
                provenance={
                    **dict(observation.provenance),
                    "logical_space": "shared_csv_v0",
                    "canonical_spec_modified": False,
                },
            ))
    return tuple(bindings)


def run_logical_space_robot_spec(
    spec: Mapping[str, Any],
    *,
    store_path: str | Path,
    web_tool: Any | None = None,
    max_runtime_cycles: int = 6,
) -> FirstLogicalRobotRun:
    """Run the existing persistent QCDS runtime and expand shared logical space."""
    store = CsvIntelligenceStore(store_path)
    space = CsvLogicalSpace(store_path)
    runtime = SuperintelligenceRuntime(store)
    frame = _problem_frame_from_spec(spec)
    if not (store.mission_dir(frame.mission_id) / "mission.csv").exists():
        runtime.create_mission(frame)
    challenge = challenge_suite_from_spec(runtime, frame.mission_id, spec)
    robot = FirstLogicalRobot(
        runtime,
        (PersistentLogicalSpaceTool(space), web_tool or LogicalSpaceWebRobotTool()),
        config=FirstLogicalRobotConfig(max_runtime_cycles=max_runtime_cycles),
    )
    run = robot.run(
        frame.mission_id,
        challenge,
        failure_observations=failure_observations_from_spec(spec),
    )
    space.append(bindings_from_run(run))
    return run


def main(argv: Sequence[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Run the QCDS Logical Robot with persistent Logical Space")
    parser.add_argument("spec", help="JSON mission/challenge specification")
    parser.add_argument("--store", default="./intelligence_store", help="human-readable intelligence store")
    parser.add_argument("--max-cycles", type=int, default=6)
    args = parser.parse_args(argv)

    spec = json.loads(Path(args.spec).read_text(encoding="utf-8"))
    result = run_logical_space_robot_spec(spec, store_path=args.store, max_runtime_cycles=args.max_cycles)
    space = CsvLogicalSpace(args.store)
    print(json.dumps({
        "mission_id": result.mission_id,
        "status": result.status,
        "resumable": result.resumable,
        "runtime_steps": len(result.steps),
        "robot_runs": len(result.robot_runs),
        "acquired_evidence_ids": result.acquired_evidence_ids,
        "oracle_stack_identity": result.final_state.oracle_stack_identity,
        "oracle_count": result.final_state.oracle_count,
        "evidence_count": result.final_state.evidence_count,
        "logical_binding_count": len(space.bindings()),
        "logical_space_file": str(space.path),
        "store_directory": result.final_state.directory,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
