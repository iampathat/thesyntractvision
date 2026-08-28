from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol, Sequence

from .fabric import FabricLayer, StabilizedRotationSuiteResult
from .models import BaseBundle, ChannelView, State, Syntract, TruthDistribution
from .oracles import OracleStack


class SemanticCompileError(ValueError):
    """Raised when a semantic compilation is not executable without invention."""


def _normalize_phrase(value: str) -> str:
    value = re.sub(r"\s+", " ", value.strip().lower())
    if value.startswith("the "):
        value = value[4:]
    return value.strip(" .?!")


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", _normalize_phrase(value)).strip("_")
    return slug or "unknown"


def _group_key(subject: str, predicate: str) -> str:
    return f"{_normalize_phrase(subject)}::{_normalize_phrase(predicate)}"


@dataclass(frozen=True)
class SemanticQuery:
    subject: str
    predicate: str
    candidate_values: tuple[str, ...] = ()
    original_text: str = ""

    def __post_init__(self) -> None:
        if not _normalize_phrase(self.subject) or not _normalize_phrase(self.predicate):
            raise ValueError("semantic query requires subject and predicate")
        normalized = tuple(_normalize_phrase(v) for v in self.candidate_values if _normalize_phrase(v))
        if len(set(normalized)) != len(normalized):
            raise ValueError("semantic query candidate values must be unique")

    @property
    def group_key(self) -> str:
        return _group_key(self.subject, self.predicate)


@dataclass(frozen=True)
class SemanticClaim:
    subject: str
    predicate: str
    value: str
    source_id: str
    confidence: float = 0.75
    polarity: bool = True
    original_text: str = ""

    def __post_init__(self) -> None:
        if not _normalize_phrase(self.subject):
            raise ValueError("semantic claim requires a subject")
        if not _normalize_phrase(self.predicate):
            raise ValueError("semantic claim requires a predicate")
        if not _normalize_phrase(self.value):
            raise ValueError("semantic claim requires a value")
        if not self.source_id.strip():
            raise ValueError("semantic claim requires source_id")
        if not 0.5 <= self.confidence <= 1.0:
            raise ValueError("confidence must be in [0.5, 1.0]")

    @property
    def group_key(self) -> str:
        return _group_key(self.subject, self.predicate)


@dataclass(frozen=True)
class SemanticFrame:
    mission_id: str
    raw_text: str
    query: SemanticQuery | None
    claims: tuple[SemanticClaim, ...]
    unresolved: tuple[str, ...] = ()
    analyzer_id: str = "external"
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.mission_id:
            raise ValueError("mission_id must be non-empty")
        if not self.analyzer_id:
            raise ValueError("analyzer_id must be non-empty")


class SemanticAnalyzer(Protocol):
    analyzer_id: str

    def analyze(self, text: str, *, mission_id: str) -> SemanticFrame: ...


@dataclass(frozen=True)
class ControlledEnglishAnalyzer:
    """Small deterministic BUILD 9 ingress used to prove the raw-text boundary.

    It intentionally recognizes only a bounded grammar. Anything else remains in
    ``unresolved`` rather than being guessed. A stronger external parser may
    produce the same SemanticFrame contract without changing QCDS Fabric.
    """

    default_confidence: float = 0.75
    analyzer_id: str = "controlled_english_v0"

    _QUESTION = re.compile(
        r"^\s*what\s+(?P<predicate>[a-zA-Z][\w-]*)\s+(?:was|is)\s+(?:the\s+)?(?P<subject>.+?)\s*\?\s*$",
        re.IGNORECASE,
    )
    _ATTRIBUTED = re.compile(
        r"^(?P<source>.+?)(?:\s*\[(?P<confidence>(?:0(?:\.\d+)?|1(?:\.0+)?))\])?\s+"
        r"says\s+(?:that\s+)?(?:the\s+)?(?P<subject>.+?)\s+(?:was|is)\s+"
        r"(?P<neg>not\s+)?(?P<value>[a-zA-Z0-9_-]+)\s*[.!]?\s*$",
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

        query_match: tuple[int, re.Match[str]] | None = None
        for index, sentence in enumerate(sentences):
            match = self._QUESTION.match(sentence)
            if match:
                query_match = (index, match)
                break

        query_subject: str | None = None
        query_predicate: str | None = None
        query_text = ""
        query_index: int | None = None
        if query_match is not None:
            query_index, match = query_match
            query_subject = _normalize_phrase(match.group("subject"))
            query_predicate = _normalize_phrase(match.group("predicate"))
            query_text = sentences[query_index]

        claims: list[SemanticClaim] = []
        unresolved: list[str] = []
        recognized_indexes: set[int] = set()
        if query_index is not None:
            recognized_indexes.add(query_index)

        for index, sentence in enumerate(sentences):
            if index == query_index:
                continue
            attributed = self._ATTRIBUTED.match(sentence)
            direct = None if attributed else self._DIRECT.match(sentence)
            match = attributed or direct
            if match is None:
                unresolved.append(sentence)
                continue

            subject = _normalize_phrase(match.group("subject"))
            predicate = query_predicate if query_subject == subject and query_predicate else "state"
            confidence_raw = match.groupdict().get("confidence")
            confidence = float(confidence_raw) if confidence_raw else self.default_confidence
            source_id = (
                match.group("source").strip()
                if attributed is not None
                else f"statement:{index}"
            )
            claims.append(
                SemanticClaim(
                    subject=subject,
                    predicate=predicate,
                    value=_normalize_phrase(match.group("value")),
                    source_id=source_id,
                    confidence=confidence,
                    polarity=match.group("neg") is None,
                    original_text=sentence,
                )
            )
            recognized_indexes.add(index)

        if query_subject is not None and query_predicate is not None:
            values: list[str] = []
            for claim in claims:
                if claim.group_key == _group_key(query_subject, query_predicate):
                    value = _normalize_phrase(claim.value)
                    if value not in values:
                        values.append(value)
            query = SemanticQuery(
                subject=query_subject,
                predicate=query_predicate,
                candidate_values=tuple(values),
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
                "recognized_sentence_count": len(recognized_indexes),
                "unresolved_sentence_count": len(unresolved),
                "grammar_is_bounded": True,
                "semantic_invention": False,
            },
        )


@dataclass(frozen=True)
class EvidenceOracle:
    """Soft source-evidence oracle for one compiled semantic proposition."""

    oracle_id: str
    dimension_id: str
    expected_value: int
    confidence: float
    source_id: str
    claim_text: str = ""
    strength: float = 1.0

    def __post_init__(self) -> None:
        if self.expected_value not in (0, 1):
            raise ValueError("expected_value must be binary")
        if not 0.5 <= self.confidence <= 1.0:
            raise ValueError("confidence must be in [0.5, 1.0]")
        if self.strength <= 0:
            raise ValueError("strength must be positive")

    def is_applicable(self, view: ChannelView) -> bool:
        return self.dimension_id in set(view.active_dimension_ids())

    def score(self, view: ChannelView, state: State) -> float:
        active = view.state_as_mapping(state)
        if self.dimension_id not in active:
            return 1.0
        matched = active[self.dimension_id] == self.expected_value
        base = self.confidence if matched else 1.0 - self.confidence
        return base ** self.strength


@dataclass(frozen=True)
class OneHotOracle:
    """Logic oracle enforcing one selected candidate inside an active group."""

    oracle_id: str
    dimension_ids: tuple[str, ...]

    def __post_init__(self) -> None:
        if len(self.dimension_ids) < 2:
            raise ValueError("OneHotOracle requires at least two dimensions")
        if len(set(self.dimension_ids)) != len(self.dimension_ids):
            raise ValueError("OneHotOracle dimension ids must be unique")

    def is_applicable(self, view: ChannelView) -> bool:
        active = set(view.active_dimension_ids())
        return any(dimension_id in active for dimension_id in self.dimension_ids)

    def score(self, view: ChannelView, state: State) -> float:
        active = view.state_as_mapping(state)
        selected = [active[d] for d in self.dimension_ids if d in active]
        if not selected:
            return 1.0
        return 1.0 if sum(selected) == 1 else 0.0


@dataclass(frozen=True)
class SemanticCompilation:
    frame: SemanticFrame
    bundle: BaseBundle | None
    oracle_stack: OracleStack | None
    query_group_key: str | None
    group_dimensions: Mapping[str, tuple[str, ...]]
    group_values: Mapping[str, tuple[str, ...]]
    semantic_conflicts: tuple[str, ...]
    unresolved: tuple[str, ...]
    provenance: Mapping[str, Any]

    @property
    def executable(self) -> bool:
        return (
            self.bundle is not None
            and self.oracle_stack is not None
            and self.query_group_key is not None
            and bool(self.group_dimensions.get(self.query_group_key, ()))
        )


@dataclass(frozen=True)
class CandidateProbability:
    value: str
    dimension_id: str
    raw_marginal: float
    probability: float


@dataclass(frozen=True)
class SemanticInferenceResult:
    compilation: SemanticCompilation
    suite: StabilizedRotationSuiteResult
    baseline_candidates: tuple[CandidateProbability, ...]
    stabilized_candidates: tuple[CandidateProbability, ...]
    conflict_markers: tuple[str, ...]
    provenance: Mapping[str, Any]

    @property
    def leading_candidates(self) -> tuple[str, ...]:
        if not self.stabilized_candidates:
            return ()
        peak = self.stabilized_candidates[0].probability
        return tuple(
            item.value
            for item in self.stabilized_candidates
            if abs(item.probability - peak) <= 1e-12
        )


@dataclass(frozen=True)
class HumanProblemResult:
    frame: SemanticFrame
    compilation: SemanticCompilation
    inference: SemanticInferenceResult
    syntract: Syntract


def _unique_append(target: list[str], value: str) -> None:
    if value not in target:
        target.append(value)


def compile_semantic_frame(frame: SemanticFrame, *, max_width: int = 16) -> SemanticCompilation:
    if max_width <= 0:
        raise ValueError("max_width must be positive")

    issues = list(frame.unresolved)
    if frame.query is None:
        issues.append("[compiler] missing explicit bounded query")

    grouped_values: dict[str, list[str]] = {}
    group_meta: dict[str, tuple[str, str]] = {}

    if frame.query is not None:
        qkey = frame.query.group_key
        grouped_values[qkey] = []
        group_meta[qkey] = (
            _normalize_phrase(frame.query.subject),
            _normalize_phrase(frame.query.predicate),
        )
        for value in frame.query.candidate_values:
            _unique_append(grouped_values[qkey], _normalize_phrase(value))
    else:
        qkey = None

    for claim in frame.claims:
        key = claim.group_key
        grouped_values.setdefault(key, [])
        group_meta.setdefault(
            key,
            (_normalize_phrase(claim.subject), _normalize_phrase(claim.predicate)),
        )
        _unique_append(grouped_values[key], _normalize_phrase(claim.value))

    if qkey is not None and not grouped_values.get(qkey):
        issues.append("[compiler] query has no explicit or observed candidate values")

    ordered_keys: list[str] = []
    if qkey is not None and qkey in grouped_values:
        ordered_keys.append(qkey)
    ordered_keys.extend(key for key in sorted(grouped_values) if key not in ordered_keys)

    dimension_ids: list[str] = []
    group_dimensions: dict[str, tuple[str, ...]] = {}
    group_values: dict[str, tuple[str, ...]] = {}
    value_to_dimension: dict[str, dict[str, str]] = {}
    used_ids: set[str] = set()

    for key in ordered_keys:
        subject, predicate = group_meta[key]
        dims: list[str] = []
        values = grouped_values[key]
        value_map: dict[str, str] = {}
        for position, value in enumerate(values):
            base = f"sem::{_slug(subject)}::{_slug(predicate)}::{_slug(value)}"
            dimension_id = base
            suffix = 2
            while dimension_id in used_ids:
                dimension_id = f"{base}__{suffix}"
                suffix += 1
            used_ids.add(dimension_id)
            dimension_ids.append(dimension_id)
            dims.append(dimension_id)
            value_map[value] = dimension_id
        group_dimensions[key] = tuple(dims)
        group_values[key] = tuple(values)
        value_to_dimension[key] = value_map

    if len(dimension_ids) > max_width:
        raise SemanticCompileError(
            f"semantic compile width {len(dimension_ids)} exceeds max_width {max_width}"
        )

    positive_values: dict[str, set[str]] = {}
    for claim in frame.claims:
        if claim.polarity:
            positive_values.setdefault(claim.group_key, set()).add(_normalize_phrase(claim.value))
    conflicts = tuple(
        f"semantic_disagreement:{key}:{'|'.join(sorted(values))}"
        for key, values in sorted(positive_values.items())
        if len(values) > 1
    )

    if qkey is None or not group_dimensions.get(qkey):
        return SemanticCompilation(
            frame=frame,
            bundle=None,
            oracle_stack=None,
            query_group_key=qkey,
            group_dimensions=group_dimensions,
            group_values=group_values,
            semantic_conflicts=conflicts,
            unresolved=tuple(issues),
            provenance={
                "compiler": "semantic_logic_compiler_v0",
                "executable": False,
                "semantic_invention": False,
                "canonical_spec_modified": False,
            },
        )

    oracles: list[Any] = []
    for key in ordered_keys:
        dims = group_dimensions[key]
        if len(dims) >= 2:
            oracles.append(
                OneHotOracle(
                    oracle_id=f"logic:onehot:{_slug(key)}",
                    dimension_ids=dims,
                )
            )

    for index, claim in enumerate(frame.claims):
        value = _normalize_phrase(claim.value)
        dimension_id = value_to_dimension.get(claim.group_key, {}).get(value)
        if dimension_id is None:
            issues.append(f"[compiler] claim {index} has no compiled dimension")
            continue
        oracles.append(
            EvidenceOracle(
                oracle_id=f"evidence:{index}:{_slug(claim.source_id)}",
                dimension_id=dimension_id,
                expected_value=1 if claim.polarity else 0,
                confidence=claim.confidence,
                source_id=claim.source_id,
                claim_text=claim.original_text,
            )
        )

    bundle = BaseBundle(
        bundle_id=f"semantic:{frame.mission_id}",
        dimension_ids=tuple(dimension_ids),
        values=("?",) * len(dimension_ids),
        provenance={
            "mission_id": frame.mission_id,
            "analyzer_id": frame.analyzer_id,
            "raw_text": frame.raw_text,
            "query_group": qkey,
            "group_values": {key: tuple(values) for key, values in group_values.items()},
            "unresolved": tuple(issues),
            "semantic_conflicts": conflicts,
            "compiler": "semantic_logic_compiler_v0",
        },
        semantic_domain={
            "kind": "human_semantic_ingress",
            "query_group": qkey,
            "external_semantic_parser_allowed": True,
        },
    )
    stack = OracleStack(
        stack_id=f"semantic:{frame.mission_id}",
        version="1",
        oracles=tuple(oracles),
    )
    return SemanticCompilation(
        frame=frame,
        bundle=bundle,
        oracle_stack=stack,
        query_group_key=qkey,
        group_dimensions=group_dimensions,
        group_values=group_values,
        semantic_conflicts=conflicts,
        unresolved=tuple(issues),
        provenance={
            "compiler": "semantic_logic_compiler_v0",
            "executable": True,
            "logical_width": bundle.width,
            "candidate_binary_space": f"2^{bundle.width}",
            "group_count": len(group_dimensions),
            "claim_count": len(frame.claims),
            "unresolved_count": len(issues),
            "semantic_conflict_count": len(conflicts),
            "semantic_invention": False,
            "trained_model_required": False,
            "external_semantic_parser_allowed": True,
            "canonical_spec_modified": False,
        },
    )


def _candidate_probabilities(
    compilation: SemanticCompilation,
    distribution: TruthDistribution,
) -> tuple[CandidateProbability, ...]:
    if not compilation.executable or compilation.bundle is None or compilation.query_group_key is None:
        return ()
    dims = compilation.group_dimensions[compilation.query_group_key]
    values = compilation.group_values[compilation.query_group_key]
    indexes = tuple(compilation.bundle.dimension_ids.index(dimension_id) for dimension_id in dims)
    raw: list[float] = []
    for index in indexes:
        mass = sum(
            probability
            for state, probability in zip(distribution.support, distribution.probabilities)
            if state[index] == 1
        )
        raw.append(mass)
    total = sum(raw)
    normalized = [value / total for value in raw] if total > 0 else [0.0] * len(raw)
    result = [
        CandidateProbability(value=value, dimension_id=dimension_id, raw_marginal=mass, probability=probability)
        for value, dimension_id, mass, probability in zip(values, dims, raw, normalized)
    ]
    result.sort(key=lambda item: (-item.probability, item.value))
    return tuple(result)


def run_semantic_compilation(
    compilation: SemanticCompilation,
    *,
    fabric_layer: FabricLayer | None = None,
    include_positional: bool = False,
    include_oracle_exposure: bool = False,
    include_crossed: bool = False,
) -> SemanticInferenceResult:
    if not compilation.executable or compilation.bundle is None or compilation.oracle_stack is None:
        raise SemanticCompileError(
            "semantic compilation is not executable; inspect unresolved instead of inventing missing logic"
        )
    layer = fabric_layer or FabricLayer()
    suite = layer.run_stabilized_rotation_suite(
        compilation.bundle,
        compilation.oracle_stack,
        include_positional=include_positional,
        include_oracle_exposure=include_oracle_exposure,
        include_crossed=include_crossed,
    )
    baseline_candidates = _candidate_probabilities(compilation, suite.baseline_distribution)
    stabilized_distribution = suite.stabilized_return.stabilized_distribution
    stabilized_candidates = _candidate_probabilities(compilation, stabilized_distribution)
    markers = tuple(
        dict.fromkeys(
            (*compilation.semantic_conflicts, *stabilized_distribution.contradiction_markers)
        )
    )
    baseline_leaders = tuple(
        item.value
        for item in baseline_candidates
        if baseline_candidates and abs(item.probability - baseline_candidates[0].probability) <= 1e-12
    )
    stabilized_leaders = tuple(
        item.value
        for item in stabilized_candidates
        if stabilized_candidates and abs(item.probability - stabilized_candidates[0].probability) <= 1e-12
    )
    return SemanticInferenceResult(
        compilation=compilation,
        suite=suite,
        baseline_candidates=baseline_candidates,
        stabilized_candidates=stabilized_candidates,
        conflict_markers=markers,
        provenance={
            "engine": "semantic_to_fabric_v0",
            "mission_id": compilation.frame.mission_id,
            "analyzer_id": compilation.frame.analyzer_id,
            "oracle_stack": compilation.oracle_stack.identity,
            "baseline_leaders": baseline_leaders,
            "stabilized_leaders": stabilized_leaders,
            "stabilization_changed_leader": set(baseline_leaders) != set(stabilized_leaders),
            "answer_is_external_truth_claim": False,
            "unresolved_preserved": True,
            "canonical_spec_modified": False,
        },
    )


def bind_semantic_result(
    result: SemanticInferenceResult,
    *,
    syntract_id: str | None = None,
) -> Syntract:
    compilation = result.compilation
    if compilation.bundle is None or compilation.oracle_stack is None:
        raise SemanticCompileError("cannot bind a non-executable semantic compilation")
    distribution = result.suite.stabilized_return.stabilized_distribution
    return Syntract(
        syntract_id=syntract_id or f"syntract:semantic:{compilation.frame.mission_id}",
        bound_distribution=distribution,
        evidence_provenance={
            "mission_id": compilation.frame.mission_id,
            "analyzer_id": compilation.frame.analyzer_id,
            "query_group": compilation.query_group_key,
            "group_values": dict(compilation.group_values),
            "final_dimension_ids": compilation.bundle.dimension_ids,
            "oracle_stack": compilation.oracle_stack.identity,
            "unresolved": compilation.unresolved,
            "semantic_conflicts": compilation.semantic_conflicts,
            "raw_text": compilation.frame.raw_text,
        },
        contradiction_provenance=result.conflict_markers,
        composition_provenance={
            "semantic_ingress": True,
            "compiler": "semantic_logic_compiler_v0",
            "fabric_executed": True,
            "hard_collapse": False,
            "can_reenter": True,
            "can_expand": True,
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
    frame = parser.analyze(text, mission_id=mission_id)
    return compile_semantic_frame(frame, max_width=max_width)


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
    return HumanProblemResult(
        frame=frame,
        compilation=compilation,
        inference=inference,
        syntract=syntract,
    )
