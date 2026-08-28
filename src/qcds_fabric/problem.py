from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol, Sequence

from .fabric import FabricLayer, StabilizedRotationSuiteResult
from .models import BaseBundle, ChannelView, State, Syntract, TruthDistribution
from .oracles import OracleStack
from .semantic import CandidateProbability, EvidenceOracle, OneHotOracle, SemanticClaim, SemanticCompileError


def _normalize(value: str) -> str:
    return " ".join(value.strip().lower().split()).strip(" .?!")


def _slug(value: str) -> str:
    normalized = _normalize(value)
    out = []
    prior_sep = False
    for char in normalized:
        if char.isalnum():
            out.append(char)
            prior_sep = False
        elif not prior_sep:
            out.append("_")
            prior_sep = True
    return "".join(out).strip("_") or "unknown"


def _group_key(subject: str, predicate: str) -> str:
    return f"{_normalize(subject)}::{_normalize(predicate)}"


@dataclass(frozen=True)
class SemanticEntity:
    entity_id: str
    label: str
    entity_type: str = "entity"
    aliases: tuple[str, ...] = ()
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.entity_id.strip() or not self.label.strip():
            raise ValueError("semantic entity requires entity_id and label")
        if not self.entity_type.strip():
            raise ValueError("semantic entity requires entity_type")
        aliases = tuple(_normalize(alias) for alias in self.aliases)
        if len(set(aliases)) != len(aliases):
            raise ValueError("semantic entity aliases must be unique")


@dataclass(frozen=True)
class ProblemQuery:
    query_id: str
    subject: str
    predicate: str
    candidate_values: tuple[str, ...] = ()
    original_text: str = ""

    def __post_init__(self) -> None:
        if not self.query_id.strip():
            raise ValueError("problem query requires query_id")
        if not _normalize(self.subject) or not _normalize(self.predicate):
            raise ValueError("problem query requires subject and predicate")
        values = tuple(_normalize(value) for value in self.candidate_values if _normalize(value))
        if len(set(values)) != len(values):
            raise ValueError("problem query candidate values must be unique")

    @property
    def group_key(self) -> str:
        return _group_key(self.subject, self.predicate)


@dataclass(frozen=True)
class SemanticRelation:
    subject: str
    predicate: str
    object: str
    source_id: str
    confidence: float = 0.75
    polarity: bool = True
    relation_class: str = "relational"
    temporal_context: str | None = None
    original_text: str = ""

    def __post_init__(self) -> None:
        if not _normalize(self.subject) or not _normalize(self.predicate) or not _normalize(self.object):
            raise ValueError("semantic relation requires subject, predicate and object")
        if not self.source_id.strip():
            raise ValueError("semantic relation requires source_id")
        if not 0.5 <= self.confidence <= 1.0:
            raise ValueError("relation confidence must be in [0.5, 1.0]")
        if self.relation_class not in {"relational", "causal", "temporal"}:
            raise ValueError("relation_class must be relational, causal or temporal")

    def as_claim(self) -> SemanticClaim:
        return SemanticClaim(
            subject=self.subject,
            predicate=self.predicate,
            value=self.object,
            source_id=self.source_id,
            confidence=self.confidence,
            polarity=self.polarity,
            original_text=self.original_text,
        )


@dataclass(frozen=True)
class SemanticAtom:
    subject: str
    predicate: str
    value: str

    def __post_init__(self) -> None:
        if not _normalize(self.subject) or not _normalize(self.predicate) or not _normalize(self.value):
            raise ValueError("semantic atom requires subject, predicate and value")

    @property
    def group_key(self) -> str:
        return _group_key(self.subject, self.predicate)


@dataclass(frozen=True)
class SemanticRule:
    rule_id: str
    antecedent: SemanticAtom
    consequent: SemanticAtom
    kind: str = "implies"
    relation_class: str = "logical"
    confidence: float = 1.0
    source_id: str = "rule"
    original_text: str = ""

    def __post_init__(self) -> None:
        if not self.rule_id.strip():
            raise ValueError("semantic rule requires rule_id")
        if self.kind not in {"implies", "excludes", "equivalent"}:
            raise ValueError("rule kind must be implies, excludes or equivalent")
        if self.relation_class not in {"logical", "causal", "temporal"}:
            raise ValueError("rule relation_class must be logical, causal or temporal")
        if not 0.5 <= self.confidence <= 1.0:
            raise ValueError("rule confidence must be in [0.5, 1.0]")
        if not self.source_id.strip():
            raise ValueError("semantic rule requires source_id")


@dataclass(frozen=True)
class OntologyMap:
    subjects: Mapping[str, str] = field(default_factory=dict)
    predicates: Mapping[str, str] = field(default_factory=dict)
    values: Mapping[str, str] = field(default_factory=dict)
    ontology_id: str = "identity"

    def __post_init__(self) -> None:
        if not self.ontology_id.strip():
            raise ValueError("ontology_id must be non-empty")
        for mapping in (self.subjects, self.predicates, self.values):
            for source, target in mapping.items():
                if not _normalize(str(source)) or not _normalize(str(target)):
                    raise ValueError("ontology mappings cannot contain empty terms")

    @staticmethod
    def _resolve(value: str, mapping: Mapping[str, str]) -> str:
        normalized = _normalize(value)
        resolved = {_normalize(str(key)): _normalize(str(target)) for key, target in mapping.items()}
        return resolved.get(normalized, normalized)

    def subject(self, value: str) -> str:
        return self._resolve(value, self.subjects)

    def predicate(self, value: str) -> str:
        return self._resolve(value, self.predicates)

    def value(self, value: str) -> str:
        return self._resolve(value, self.values)


@dataclass(frozen=True)
class SemanticProblemFrame:
    mission_id: str
    raw_text: str
    queries: tuple[ProblemQuery, ...]
    claims: tuple[SemanticClaim, ...] = ()
    entities: tuple[SemanticEntity, ...] = ()
    relations: tuple[SemanticRelation, ...] = ()
    rules: tuple[SemanticRule, ...] = ()
    ontology: OntologyMap = field(default_factory=OntologyMap)
    unresolved: tuple[str, ...] = ()
    analyzer_id: str = "external-problem-adapter"
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.mission_id.strip():
            raise ValueError("semantic problem frame requires mission_id")
        if not self.analyzer_id.strip():
            raise ValueError("semantic problem frame requires analyzer_id")
        query_ids = [query.query_id for query in self.queries]
        if len(set(query_ids)) != len(query_ids):
            raise ValueError("problem query ids must be unique")
        entity_ids = [entity.entity_id for entity in self.entities]
        if len(set(entity_ids)) != len(entity_ids):
            raise ValueError("semantic entity ids must be unique")
        rule_ids = [rule.rule_id for rule in self.rules]
        if len(set(rule_ids)) != len(rule_ids):
            raise ValueError("semantic rule ids must be unique")


class SemanticProblemAdapter(Protocol):
    adapter_id: str

    def analyze_problem(self, text: str, *, mission_id: str) -> SemanticProblemFrame: ...


@dataclass(frozen=True)
class SemanticRuleOracle:
    oracle_id: str
    antecedent_dimension: str
    consequent_dimension: str
    kind: str
    relation_class: str
    confidence: float
    source_id: str

    def __post_init__(self) -> None:
        if not self.oracle_id.strip():
            raise ValueError("rule oracle requires oracle_id")
        if self.kind not in {"implies", "excludes", "equivalent"}:
            raise ValueError("unsupported rule oracle kind")
        if self.relation_class not in {"logical", "causal", "temporal"}:
            raise ValueError("unsupported rule oracle relation_class")
        if not 0.5 <= self.confidence <= 1.0:
            raise ValueError("rule oracle confidence must be in [0.5, 1.0]")

    def is_applicable(self, view: ChannelView) -> bool:
        active = set(view.active_dimension_ids())
        return self.antecedent_dimension in active and self.consequent_dimension in active

    def score(self, view: ChannelView, state: State) -> float:
        active = view.state_as_mapping(state)
        if self.antecedent_dimension not in active or self.consequent_dimension not in active:
            return 1.0
        left = active[self.antecedent_dimension] == 1
        right = active[self.consequent_dimension] == 1
        if self.kind == "implies":
            satisfied = (not left) or right
        elif self.kind == "excludes":
            satisfied = not (left and right)
        else:
            satisfied = left == right
        return self.confidence if satisfied else 1.0 - self.confidence


@dataclass(frozen=True)
class ProblemCompilation:
    frame: SemanticProblemFrame
    canonical_frame: SemanticProblemFrame
    bundle: BaseBundle | None
    oracle_stack: OracleStack | None
    query_groups: Mapping[str, str]
    group_dimensions: Mapping[str, tuple[str, ...]]
    group_values: Mapping[str, tuple[str, ...]]
    blocked_queries: Mapping[str, str]
    semantic_conflicts: tuple[str, ...]
    ontology_applications: tuple[str, ...]
    unresolved: tuple[str, ...]
    provenance: Mapping[str, Any]

    @property
    def executable_query_ids(self) -> tuple[str, ...]:
        return tuple(query_id for query_id in self.query_groups if query_id not in self.blocked_queries)

    @property
    def executable(self) -> bool:
        return self.bundle is not None and self.oracle_stack is not None and bool(self.executable_query_ids)


@dataclass(frozen=True)
class ProblemInferenceResult:
    compilation: ProblemCompilation
    suite: StabilizedRotationSuiteResult
    baseline_queries: Mapping[str, tuple[CandidateProbability, ...]]
    stabilized_queries: Mapping[str, tuple[CandidateProbability, ...]]
    conflict_markers: tuple[str, ...]
    provenance: Mapping[str, Any]

    def leading_candidates(self, query_id: str) -> tuple[str, ...]:
        candidates = self.stabilized_queries.get(query_id, ())
        if not candidates:
            return ()
        peak = candidates[0].probability
        return tuple(item.value for item in candidates if abs(item.probability - peak) <= 1e-12)


@dataclass(frozen=True)
class ProblemResult:
    frame: SemanticProblemFrame
    compilation: ProblemCompilation
    inference: ProblemInferenceResult
    syntract: Syntract


def _canonical_atom(atom: SemanticAtom, ontology: OntologyMap) -> SemanticAtom:
    return SemanticAtom(
        ontology.subject(atom.subject),
        ontology.predicate(atom.predicate),
        ontology.value(atom.value),
    )


def canonicalize_problem_frame(frame: SemanticProblemFrame) -> tuple[SemanticProblemFrame, tuple[str, ...]]:
    ontology = frame.ontology
    applications: list[str] = []

    def subject(value: str) -> str:
        result = ontology.subject(value)
        if result != _normalize(value):
            applications.append(f"subject:{_normalize(value)}->{result}")
        return result

    def predicate(value: str) -> str:
        result = ontology.predicate(value)
        if result != _normalize(value):
            applications.append(f"predicate:{_normalize(value)}->{result}")
        return result

    def candidate(value: str) -> str:
        result = ontology.value(value)
        if result != _normalize(value):
            applications.append(f"value:{_normalize(value)}->{result}")
        return result

    queries = tuple(
        ProblemQuery(
            query_id=query.query_id,
            subject=subject(query.subject),
            predicate=predicate(query.predicate),
            candidate_values=tuple(candidate(value) for value in query.candidate_values),
            original_text=query.original_text,
        )
        for query in frame.queries
    )
    claims = tuple(
        SemanticClaim(
            subject=subject(claim.subject),
            predicate=predicate(claim.predicate),
            value=candidate(claim.value),
            source_id=claim.source_id,
            confidence=claim.confidence,
            polarity=claim.polarity,
            original_text=claim.original_text,
        )
        for claim in frame.claims
    )
    relations = tuple(
        SemanticRelation(
            subject=subject(relation.subject),
            predicate=predicate(relation.predicate),
            object=candidate(relation.object),
            source_id=relation.source_id,
            confidence=relation.confidence,
            polarity=relation.polarity,
            relation_class=relation.relation_class,
            temporal_context=relation.temporal_context,
            original_text=relation.original_text,
        )
        for relation in frame.relations
    )
    rules = tuple(
        SemanticRule(
            rule_id=rule.rule_id,
            antecedent=_canonical_atom(rule.antecedent, ontology),
            consequent=_canonical_atom(rule.consequent, ontology),
            kind=rule.kind,
            relation_class=rule.relation_class,
            confidence=rule.confidence,
            source_id=rule.source_id,
            original_text=rule.original_text,
        )
        for rule in frame.rules
    )
    canonical = SemanticProblemFrame(
        mission_id=frame.mission_id,
        raw_text=frame.raw_text,
        queries=queries,
        claims=claims,
        entities=frame.entities,
        relations=relations,
        rules=rules,
        ontology=frame.ontology,
        unresolved=frame.unresolved,
        analyzer_id=frame.analyzer_id,
        provenance=frame.provenance,
    )
    return canonical, tuple(dict.fromkeys(applications))


def _append_unique(values: list[str], value: str) -> None:
    normalized = _normalize(value)
    if normalized and normalized not in values:
        values.append(normalized)


def _candidate_projection(
    compilation: ProblemCompilation,
    distribution: TruthDistribution,
    query_id: str,
) -> tuple[CandidateProbability, ...]:
    if compilation.bundle is None:
        return ()
    group_key = compilation.query_groups.get(query_id)
    if group_key is None or query_id in compilation.blocked_queries:
        return ()
    dims = compilation.group_dimensions[group_key]
    values = compilation.group_values[group_key]
    indexes = tuple(compilation.bundle.dimension_ids.index(dimension_id) for dimension_id in dims)
    raw = [
        sum(
            probability
            for state, probability in zip(distribution.support, distribution.probabilities)
            if state[index] == 1
        )
        for index in indexes
    ]
    total = sum(raw)
    normalized = [value / total for value in raw] if total > 0 else [0.0] * len(raw)
    result = [
        CandidateProbability(value, dimension_id, mass, probability)
        for value, dimension_id, mass, probability in zip(values, dims, raw, normalized)
    ]
    result.sort(key=lambda item: (-item.probability, item.value))
    return tuple(result)


def compile_problem_frame(frame: SemanticProblemFrame, *, max_width: int = 20) -> ProblemCompilation:
    if max_width <= 0:
        raise ValueError("max_width must be positive")

    canonical, ontology_applications = canonicalize_problem_frame(frame)
    issues = list(canonical.unresolved)

    entity_ids = {entity.entity_id for entity in canonical.entities}
    if entity_ids:
        ontology_targets = {_normalize(value) for value in canonical.ontology.subjects.values()}
        unknown_targets = sorted(target for target in ontology_targets if target not in entity_ids)
        if unknown_targets:
            raise SemanticCompileError(
                f"ontology subject targets are not declared entity ids: {unknown_targets}"
            )

    grouped_values: dict[str, list[str]] = {}
    group_meta: dict[str, tuple[str, str]] = {}
    query_groups: dict[str, str] = {}

    for query in canonical.queries:
        key = query.group_key
        query_groups[query.query_id] = key
        grouped_values.setdefault(key, [])
        group_meta.setdefault(key, (_normalize(query.subject), _normalize(query.predicate)))
        for value in query.candidate_values:
            _append_unique(grouped_values[key], value)

    all_claims = tuple(canonical.claims) + tuple(relation.as_claim() for relation in canonical.relations)
    for claim in all_claims:
        key = claim.group_key
        grouped_values.setdefault(key, [])
        group_meta.setdefault(key, (_normalize(claim.subject), _normalize(claim.predicate)))
        _append_unique(grouped_values[key], claim.value)

    for rule in canonical.rules:
        for atom in (rule.antecedent, rule.consequent):
            key = atom.group_key
            grouped_values.setdefault(key, [])
            group_meta.setdefault(key, (_normalize(atom.subject), _normalize(atom.predicate)))
            _append_unique(grouped_values[key], atom.value)

    blocked_queries: dict[str, str] = {}
    for query in canonical.queries:
        if not grouped_values.get(query.group_key):
            blocked_queries[query.query_id] = "query has no explicit, observed or rule-referenced candidates"
            issues.append(f"[compiler] query {query.query_id}: {blocked_queries[query.query_id]}")

    ordered_keys: list[str] = []
    for query in canonical.queries:
        if query.group_key not in ordered_keys:
            ordered_keys.append(query.group_key)
    ordered_keys.extend(key for key in sorted(grouped_values) if key not in ordered_keys)

    dimension_ids: list[str] = []
    group_dimensions: dict[str, tuple[str, ...]] = {}
    group_values: dict[str, tuple[str, ...]] = {}
    value_to_dimension: dict[str, dict[str, str]] = {}
    used_ids: set[str] = set()

    for key in ordered_keys:
        subject, predicate = group_meta[key]
        dims: list[str] = []
        value_map: dict[str, str] = {}
        for value in grouped_values[key]:
            base = f"problem::{_slug(subject)}::{_slug(predicate)}::{_slug(value)}"
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
        group_values[key] = tuple(grouped_values[key])
        value_to_dimension[key] = value_map

    if len(dimension_ids) > max_width:
        raise SemanticCompileError(
            f"problem compile width {len(dimension_ids)} exceeds max_width {max_width}"
        )

    positive_values: dict[str, set[str]] = {}
    polarity: dict[tuple[str, str], set[bool]] = {}
    for claim in all_claims:
        value = _normalize(claim.value)
        if claim.polarity:
            positive_values.setdefault(claim.group_key, set()).add(value)
        polarity.setdefault((claim.group_key, value), set()).add(claim.polarity)

    conflicts = [
        f"semantic_disagreement:{key}:{'|'.join(sorted(values))}"
        for key, values in sorted(positive_values.items())
        if len(values) > 1
    ]
    conflicts.extend(
        f"semantic_polarity_conflict:{key}:{value}"
        for (key, value), polarities in sorted(polarity.items())
        if polarities == {False, True}
    )

    executable_queries = tuple(
        query.query_id for query in canonical.queries if query.query_id not in blocked_queries
    )
    if not dimension_ids or not executable_queries:
        return ProblemCompilation(
            frame=frame,
            canonical_frame=canonical,
            bundle=None,
            oracle_stack=None,
            query_groups=query_groups,
            group_dimensions=group_dimensions,
            group_values=group_values,
            blocked_queries=blocked_queries,
            semantic_conflicts=tuple(conflicts),
            ontology_applications=ontology_applications,
            unresolved=tuple(issues),
            provenance={
                "compiler": "problem_to_syntract_v0",
                "executable": False,
                "semantic_invention": False,
                "canonical_spec_modified": False,
            },
        )

    oracles: list[Any] = []
    for key in ordered_keys:
        dims = group_dimensions[key]
        if len(dims) >= 2:
            oracles.append(OneHotOracle(f"logic:onehot:{_slug(key)}", dims))

    for index, claim in enumerate(all_claims):
        value = _normalize(claim.value)
        dimension_id = value_to_dimension[claim.group_key][value]
        relation_offset = len(canonical.claims)
        prefix = "relation" if index >= relation_offset else "evidence"
        oracles.append(
            EvidenceOracle(
                oracle_id=f"{prefix}:{index}:{_slug(claim.source_id)}",
                dimension_id=dimension_id,
                expected_value=1 if claim.polarity else 0,
                confidence=claim.confidence,
                source_id=claim.source_id,
                claim_text=claim.original_text,
            )
        )

    for rule in canonical.rules:
        left_value = _normalize(rule.antecedent.value)
        right_value = _normalize(rule.consequent.value)
        left = value_to_dimension[rule.antecedent.group_key][left_value]
        right = value_to_dimension[rule.consequent.group_key][right_value]
        oracles.append(
            SemanticRuleOracle(
                oracle_id=f"rule:{rule.relation_class}:{_slug(rule.rule_id)}",
                antecedent_dimension=left,
                consequent_dimension=right,
                kind=rule.kind,
                relation_class=rule.relation_class,
                confidence=rule.confidence,
                source_id=rule.source_id,
            )
        )

    stack = OracleStack(
        stack_id=f"problem:{canonical.mission_id}",
        version="1",
        oracles=tuple(oracles),
    )
    bundle = BaseBundle(
        bundle_id=f"problem:{canonical.mission_id}",
        dimension_ids=tuple(dimension_ids),
        values=("?",) * len(dimension_ids),
        provenance={
            "mission_id": canonical.mission_id,
            "analyzer_id": canonical.analyzer_id,
            "ontology_id": canonical.ontology.ontology_id,
            "ontology_applications": ontology_applications,
            "query_groups": dict(query_groups),
            "blocked_queries": dict(blocked_queries),
            "unresolved": tuple(issues),
            "semantic_conflicts": tuple(conflicts),
            "compiler": "problem_to_syntract_v0",
        },
        semantic_domain={
            "kind": "multi_query_problem_ingress",
            "query_count": len(canonical.queries),
            "entity_count": len(canonical.entities),
            "relation_count": len(canonical.relations),
            "rule_count": len(canonical.rules),
            "external_semantic_adapter_allowed": True,
        },
    )
    return ProblemCompilation(
        frame=frame,
        canonical_frame=canonical,
        bundle=bundle,
        oracle_stack=stack,
        query_groups=query_groups,
        group_dimensions=group_dimensions,
        group_values=group_values,
        blocked_queries=blocked_queries,
        semantic_conflicts=tuple(conflicts),
        ontology_applications=ontology_applications,
        unresolved=tuple(issues),
        provenance={
            "compiler": "problem_to_syntract_v0",
            "executable": True,
            "logical_width": bundle.width,
            "candidate_binary_space": f"2^{bundle.width}",
            "query_count": len(canonical.queries),
            "executable_query_count": len(executable_queries),
            "blocked_query_count": len(blocked_queries),
            "entity_count": len(canonical.entities),
            "relation_count": len(canonical.relations),
            "rule_count": len(canonical.rules),
            "causal_rule_count": sum(rule.relation_class == "causal" for rule in canonical.rules),
            "temporal_rule_count": sum(rule.relation_class == "temporal" for rule in canonical.rules),
            "ontology_application_count": len(ontology_applications),
            "semantic_invention": False,
            "trained_model_required": False,
            "external_semantic_adapter_allowed": True,
            "canonical_spec_modified": False,
        },
    )


def run_problem_compilation(
    compilation: ProblemCompilation,
    *,
    fabric_layer: FabricLayer | None = None,
    include_positional: bool = False,
    include_oracle_exposure: bool = False,
    include_crossed: bool = False,
) -> ProblemInferenceResult:
    if not compilation.executable or compilation.bundle is None or compilation.oracle_stack is None:
        raise SemanticCompileError(
            "problem compilation is not executable; inspect blocked_queries/unresolved instead of inventing semantics"
        )
    layer = fabric_layer or FabricLayer()
    suite = layer.run_stabilized_rotation_suite(
        compilation.bundle,
        compilation.oracle_stack,
        include_positional=include_positional,
        include_oracle_exposure=include_oracle_exposure,
        include_crossed=include_crossed,
    )
    baseline = {
        query_id: _candidate_projection(compilation, suite.baseline_distribution, query_id)
        for query_id in compilation.executable_query_ids
    }
    stabilized_distribution = suite.stabilized_return.stabilized_distribution
    stabilized = {
        query_id: _candidate_projection(compilation, stabilized_distribution, query_id)
        for query_id in compilation.executable_query_ids
    }
    markers = tuple(
        dict.fromkeys((*compilation.semantic_conflicts, *stabilized_distribution.contradiction_markers))
    )
    return ProblemInferenceResult(
        compilation=compilation,
        suite=suite,
        baseline_queries=baseline,
        stabilized_queries=stabilized,
        conflict_markers=markers,
        provenance={
            "engine": "problem_to_fabric_v0",
            "mission_id": compilation.canonical_frame.mission_id,
            "oracle_stack": compilation.oracle_stack.identity,
            "query_ids": compilation.executable_query_ids,
            "blocked_queries": dict(compilation.blocked_queries),
            "cross_query_rules_active": bool(compilation.canonical_frame.rules),
            "answer_is_external_truth_claim": False,
            "unresolved_preserved": True,
            "canonical_spec_modified": False,
        },
    )


def bind_problem_result(
    result: ProblemInferenceResult,
    *,
    syntract_id: str | None = None,
) -> Syntract:
    compilation = result.compilation
    if compilation.bundle is None or compilation.oracle_stack is None:
        raise SemanticCompileError("cannot bind a non-executable problem compilation")
    distribution = result.suite.stabilized_return.stabilized_distribution
    frame = compilation.canonical_frame
    return Syntract(
        syntract_id=syntract_id or f"syntract:problem:{frame.mission_id}",
        bound_distribution=distribution,
        evidence_provenance={
            "mission_id": frame.mission_id,
            "analyzer_id": frame.analyzer_id,
            "ontology_id": frame.ontology.ontology_id,
            "ontology_applications": compilation.ontology_applications,
            "query_groups": dict(compilation.query_groups),
            "group_values": dict(compilation.group_values),
            "blocked_queries": dict(compilation.blocked_queries),
            "entities": tuple(
                {"entity_id": entity.entity_id, "label": entity.label, "entity_type": entity.entity_type}
                for entity in frame.entities
            ),
            "relations": tuple(
                {
                    "subject": relation.subject,
                    "predicate": relation.predicate,
                    "object": relation.object,
                    "relation_class": relation.relation_class,
                    "temporal_context": relation.temporal_context,
                    "source_id": relation.source_id,
                    "confidence": relation.confidence,
                    "polarity": relation.polarity,
                }
                for relation in frame.relations
            ),
            "rules": tuple(
                {
                    "rule_id": rule.rule_id,
                    "kind": rule.kind,
                    "relation_class": rule.relation_class,
                    "source_id": rule.source_id,
                    "confidence": rule.confidence,
                    "antecedent": (rule.antecedent.subject, rule.antecedent.predicate, rule.antecedent.value),
                    "consequent": (rule.consequent.subject, rule.consequent.predicate, rule.consequent.value),
                }
                for rule in frame.rules
            ),
            "final_dimension_ids": compilation.bundle.dimension_ids,
            "oracle_stack": compilation.oracle_stack.identity,
            "unresolved": compilation.unresolved,
            "semantic_conflicts": compilation.semantic_conflicts,
            "raw_text": frame.raw_text,
        },
        contradiction_provenance=result.conflict_markers,
        composition_provenance={
            "problem_to_syntract": True,
            "compiler": "problem_to_syntract_v0",
            "multi_query": len(frame.queries) > 1,
            "cross_query_rules": bool(frame.rules),
            "hard_collapse": False,
            "can_reenter": True,
            "can_expand": True,
        },
    )


def problem_to_syntract(
    frame: SemanticProblemFrame,
    *,
    max_width: int = 20,
    fabric_layer: FabricLayer | None = None,
    include_positional: bool = False,
    include_oracle_exposure: bool = False,
    include_crossed: bool = False,
    syntract_id: str | None = None,
) -> ProblemResult:
    compilation = compile_problem_frame(frame, max_width=max_width)
    inference = run_problem_compilation(
        compilation,
        fabric_layer=fabric_layer,
        include_positional=include_positional,
        include_oracle_exposure=include_oracle_exposure,
        include_crossed=include_crossed,
    )
    syntract = bind_problem_result(inference, syntract_id=syntract_id)
    return ProblemResult(frame, compilation, inference, syntract)


def run_problem_text(
    text: str,
    *,
    mission_id: str,
    adapter: SemanticProblemAdapter,
    max_width: int = 20,
    fabric_layer: FabricLayer | None = None,
    include_positional: bool = False,
    include_oracle_exposure: bool = False,
    include_crossed: bool = False,
    syntract_id: str | None = None,
) -> ProblemResult:
    frame = adapter.analyze_problem(text, mission_id=mission_id)
    if not isinstance(frame, SemanticProblemFrame):
        raise SemanticCompileError("semantic problem adapter must return SemanticProblemFrame")
    return problem_to_syntract(
        frame,
        max_width=max_width,
        fabric_layer=fabric_layer,
        include_positional=include_positional,
        include_oracle_exposure=include_oracle_exposure,
        include_crossed=include_crossed,
        syntract_id=syntract_id,
    )
