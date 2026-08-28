from __future__ import annotations

import csv
import json
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Any, Mapping, Protocol, Sequence

from .evidence_planning import EvidenceAcquisitionResult, IntelligenceCheckpoint
from .oracle_evolution import OracleLineageRecord
from .oracles import OracleStack
from .problem import (
    OntologyMap,
    ProblemCompilation,
    ProblemQuery,
    SemanticAtom,
    SemanticEntity,
    SemanticProblemFrame,
    SemanticRelation,
    SemanticRule,
    SemanticRuleOracle,
    compile_problem_frame,
)
from .semantic import SemanticClaim


class IntelligenceStoreError(ValueError):
    """Raised when persistent intelligence state cannot be represented safely."""


class IntelligenceStore(Protocol):
    def save_frame(self, frame: SemanticProblemFrame) -> None: ...
    def load_frame(self, mission_id: str) -> SemanticProblemFrame: ...
    def save_oracle_population(self, mission_id: str, stack: OracleStack, *, generation: int) -> None: ...
    def load_oracle_population(self, mission_id: str) -> OracleStack: ...
    def load_compilation(self, mission_id: str, *, max_width: int = 20) -> ProblemCompilation: ...


FRAME_FIELDS = (
    "record_type", "id", "subject", "predicate", "value", "values", "source_id",
    "confidence", "polarity", "kind", "relation_class", "object", "object_subject",
    "object_predicate", "entity_type", "aliases", "temporal_context", "text", "key",
    "target", "raw_text", "analyzer_id", "ontology_id", "provenance",
)

ORACLE_FIELDS = (
    "row_kind", "oracle_id", "oracle_type", "status", "generation",
    "antecedent_dimension", "consequent_dimension", "logic", "relation_class",
    "confidence", "source_id", "stack_id", "stack_version",
)

HISTORY_FIELDS = (
    "event_index", "event_id", "event_type", "cycle_index", "local_generation",
    "hypothesis_id", "generator_id", "mutation", "replaced_oracle_id", "new_oracle_id",
    "resulting_stack_identity", "challenge_suite_id",
)

EVIDENCE_FIELDS = (
    "result_id", "query_id", "observed_value", "source_id", "confidence", "polarity", "provenance",
)

CHECKPOINT_FIELDS = (
    "checkpoint_id", "cycle_index", "status", "reason", "resumable", "terminal",
    "resume_triggers", "plan_ids", "oracle_stack_identity", "provenance",
)


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _load_json(value: str, default: Any) -> Any:
    if not value:
        return default
    return json.loads(value)


def _bool(value: str | bool) -> bool:
    if isinstance(value, bool):
        return value
    return value.strip().lower() in {"1", "true", "yes"}


@dataclass(frozen=True)
class StoredMissionState:
    mission_id: str
    cycle_index: int
    oracle_stack_identity: str
    oracle_count: int
    evidence_count: int
    checkpoint_status: str | None
    directory: str
    provenance: Mapping[str, Any] = field(default_factory=dict)


@dataclass
class CsvIntelligenceStore:
    """Human-readable BUILD 15 intelligence store.

    The store is deliberately boring: ordinary CSV files inside one directory per
    mission. ``current_oracles.csv`` is the live evolvable oracle population and
    ``oracle_history.csv`` is append-only lineage. The storage backend is outside
    QCDS semantics and can later be replaced without changing the runtime API.
    """

    root: str | Path

    def __post_init__(self) -> None:
        self.root = Path(self.root)
        self.root.mkdir(parents=True, exist_ok=True)

    def mission_dir(self, mission_id: str) -> Path:
        if not mission_id.strip() or any(part in mission_id for part in ("/", "\\", "..")):
            raise IntelligenceStoreError("mission_id must be a simple directory-safe identifier")
        path = self.root / mission_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _path(self, mission_id: str, name: str) -> Path:
        return self.mission_dir(mission_id) / name

    @staticmethod
    def _write_rows(path: Path, fields: Sequence[str], rows: Sequence[Mapping[str, Any]]) -> None:
        temporary = path.with_suffix(path.suffix + ".tmp")
        with temporary.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(fields), extrasaction="ignore")
            writer.writeheader()
            for row in rows:
                writer.writerow({key: row.get(key, "") for key in fields})
        temporary.replace(path)

    @staticmethod
    def _read_rows(path: Path) -> list[dict[str, str]]:
        if not path.exists():
            return []
        with path.open("r", encoding="utf-8", newline="") as handle:
            return list(csv.DictReader(handle))

    @classmethod
    def _append_rows(cls, path: Path, fields: Sequence[str], rows: Sequence[Mapping[str, Any]]) -> None:
        existing = cls._read_rows(path)
        cls._write_rows(path, fields, (*existing, *rows))

    def save_frame(self, frame: SemanticProblemFrame) -> None:
        rows: list[dict[str, Any]] = [{
            "record_type": "meta",
            "id": frame.mission_id,
            "raw_text": frame.raw_text,
            "analyzer_id": frame.analyzer_id,
            "ontology_id": frame.ontology.ontology_id,
            "provenance": _json(dict(frame.provenance)),
        }]
        for query in frame.queries:
            rows.append({
                "record_type": "query", "id": query.query_id, "subject": query.subject,
                "predicate": query.predicate, "values": _json(query.candidate_values), "text": query.original_text,
            })
        for claim in frame.claims:
            rows.append({
                "record_type": "claim", "subject": claim.subject, "predicate": claim.predicate,
                "value": claim.value, "source_id": claim.source_id, "confidence": claim.confidence,
                "polarity": claim.polarity, "text": claim.original_text,
            })
        for entity in frame.entities:
            rows.append({
                "record_type": "entity", "id": entity.entity_id, "value": entity.label,
                "entity_type": entity.entity_type, "aliases": _json(entity.aliases),
                "provenance": _json(dict(entity.provenance)),
            })
        for relation in frame.relations:
            rows.append({
                "record_type": "relation", "subject": relation.subject, "predicate": relation.predicate,
                "object": relation.object, "source_id": relation.source_id, "confidence": relation.confidence,
                "polarity": relation.polarity, "relation_class": relation.relation_class,
                "temporal_context": relation.temporal_context or "", "text": relation.original_text,
            })
        for rule in frame.rules:
            rows.append({
                "record_type": "rule", "id": rule.rule_id,
                "subject": rule.antecedent.subject, "predicate": rule.antecedent.predicate,
                "value": rule.antecedent.value, "object_subject": rule.consequent.subject,
                "object_predicate": rule.consequent.predicate, "object": rule.consequent.value,
                "kind": rule.kind, "relation_class": rule.relation_class, "confidence": rule.confidence,
                "source_id": rule.source_id, "text": rule.original_text,
            })
        for mapping_name, mapping in (
            ("ontology_subject", frame.ontology.subjects),
            ("ontology_predicate", frame.ontology.predicates),
            ("ontology_value", frame.ontology.values),
        ):
            for key, target in mapping.items():
                rows.append({"record_type": mapping_name, "key": key, "target": target})
        for unresolved in frame.unresolved:
            rows.append({"record_type": "unresolved", "text": unresolved})
        self._write_rows(self._path(frame.mission_id, "mission.csv"), FRAME_FIELDS, rows)

    def load_frame(self, mission_id: str) -> SemanticProblemFrame:
        rows = self._read_rows(self._path(mission_id, "mission.csv"))
        if not rows:
            raise IntelligenceStoreError(f"mission {mission_id!r} does not exist")
        meta = next((row for row in rows if row["record_type"] == "meta"), None)
        if meta is None:
            raise IntelligenceStoreError("mission.csv is missing meta row")
        queries: list[ProblemQuery] = []
        claims: list[SemanticClaim] = []
        entities: list[SemanticEntity] = []
        relations: list[SemanticRelation] = []
        rules: list[SemanticRule] = []
        unresolved: list[str] = []
        subjects: dict[str, str] = {}
        predicates: dict[str, str] = {}
        values: dict[str, str] = {}
        for row in rows:
            kind = row["record_type"]
            if kind == "query":
                queries.append(ProblemQuery(row["id"], row["subject"], row["predicate"], tuple(_load_json(row["values"], [])), row["text"]))
            elif kind == "claim":
                claims.append(SemanticClaim(row["subject"], row["predicate"], row["value"], row["source_id"], float(row["confidence"]), _bool(row["polarity"]), row["text"]))
            elif kind == "entity":
                entities.append(SemanticEntity(row["id"], row["value"], row["entity_type"], tuple(_load_json(row["aliases"], [])), _load_json(row["provenance"], {})))
            elif kind == "relation":
                relations.append(SemanticRelation(row["subject"], row["predicate"], row["object"], row["source_id"], float(row["confidence"]), _bool(row["polarity"]), row["relation_class"], row["temporal_context"] or None, row["text"]))
            elif kind == "rule":
                rules.append(SemanticRule(
                    row["id"], SemanticAtom(row["subject"], row["predicate"], row["value"]),
                    SemanticAtom(row["object_subject"], row["object_predicate"], row["object"]),
                    row["kind"], row["relation_class"], float(row["confidence"]), row["source_id"], row["text"],
                ))
            elif kind == "ontology_subject":
                subjects[row["key"]] = row["target"]
            elif kind == "ontology_predicate":
                predicates[row["key"]] = row["target"]
            elif kind == "ontology_value":
                values[row["key"]] = row["target"]
            elif kind == "unresolved":
                unresolved.append(row["text"])
        return SemanticProblemFrame(
            mission_id=meta["id"], raw_text=meta["raw_text"], queries=tuple(queries), claims=tuple(claims),
            entities=tuple(entities), relations=tuple(relations), rules=tuple(rules),
            ontology=OntologyMap(subjects, predicates, values, meta["ontology_id"] or "identity"),
            unresolved=tuple(unresolved), analyzer_id=meta["analyzer_id"],
            provenance=_load_json(meta["provenance"], {}),
        )

    @staticmethod
    def _oracle_row(oracle: Any, stack: OracleStack, generation: int) -> dict[str, Any]:
        if not isinstance(oracle, SemanticRuleOracle):
            raise IntelligenceStoreError(
                f"BUILD 15 CSV evolvable population supports SemanticRuleOracle, got {type(oracle).__name__}"
            )
        return {
            "row_kind": "oracle", "oracle_id": oracle.oracle_id,
            "oracle_type": "SemanticRuleOracle", "status": "active", "generation": generation,
            "antecedent_dimension": oracle.antecedent_dimension,
            "consequent_dimension": oracle.consequent_dimension, "logic": oracle.kind,
            "relation_class": oracle.relation_class, "confidence": oracle.confidence,
            "source_id": oracle.source_id, "stack_id": stack.stack_id, "stack_version": stack.version,
        }

    def save_oracle_population(self, mission_id: str, stack: OracleStack, *, generation: int) -> None:
        if generation < 0:
            raise IntelligenceStoreError("generation cannot be negative")
        rows: list[dict[str, Any]] = [{
            "row_kind": "population", "status": "meta", "generation": generation,
            "stack_id": stack.stack_id, "stack_version": stack.version,
        }]
        rows.extend(self._oracle_row(oracle, stack, generation) for oracle in stack.oracles)
        self._write_rows(self._path(mission_id, "current_oracles.csv"), ORACLE_FIELDS, rows)

    def load_oracle_population(self, mission_id: str) -> OracleStack:
        rows = self._read_rows(self._path(mission_id, "current_oracles.csv"))
        if not rows:
            raise IntelligenceStoreError(f"mission {mission_id!r} has no persisted oracle population")
        meta = next((row for row in rows if row["row_kind"] == "population"), None)
        if meta is None:
            raise IntelligenceStoreError("current_oracles.csv is missing population metadata row")
        oracles: list[SemanticRuleOracle] = []
        for row in rows:
            if row["row_kind"] != "oracle":
                continue
            if row["oracle_type"] != "SemanticRuleOracle":
                raise IntelligenceStoreError(f"unsupported persisted oracle type {row['oracle_type']!r}")
            oracles.append(SemanticRuleOracle(
                row["oracle_id"], row["antecedent_dimension"], row["consequent_dimension"],
                row["logic"], row["relation_class"], float(row["confidence"]), row["source_id"],
            ))
        return OracleStack(meta["stack_id"], meta["stack_version"], tuple(oracles))

    def current_generation(self, mission_id: str) -> int:
        rows = self._read_rows(self._path(mission_id, "current_oracles.csv"))
        meta = next((row for row in rows if row.get("row_kind") == "population"), None)
        return int(meta["generation"]) if meta and meta.get("generation") else 0

    def initialize_population_history(self, mission_id: str, stack: OracleStack) -> None:
        path = self._path(mission_id, "oracle_history.csv")
        if self._read_rows(path):
            return
        rows = []
        if stack.oracles:
            for index, oracle in enumerate(stack.oracles, start=1):
                rows.append({
                    "event_index": index, "event_id": f"initial:{oracle.oracle_id}", "event_type": "INITIAL",
                    "cycle_index": 0, "local_generation": 0, "new_oracle_id": oracle.oracle_id,
                    "resulting_stack_identity": stack.identity,
                })
        else:
            rows.append({
                "event_index": 1, "event_id": "initial:empty-population", "event_type": "POPULATION_INITIALIZED",
                "cycle_index": 0, "local_generation": 0, "resulting_stack_identity": stack.identity,
            })
        self._write_rows(path, HISTORY_FIELDS, rows)

    def append_lineage(self, mission_id: str, lineage: Sequence[OracleLineageRecord], *, cycle_index: int) -> None:
        if not lineage:
            return
        path = self._path(mission_id, "oracle_history.csv")
        existing = self._read_rows(path)
        existing_ids = {row["event_id"] for row in existing}
        next_index = max((int(row["event_index"]) for row in existing if row.get("event_index")), default=0) + 1
        new_rows: list[dict[str, Any]] = []
        for record in lineage:
            event_id = f"c{cycle_index}:g{record.generation}:{record.hypothesis_id}:{record.resulting_stack_identity}"
            if event_id in existing_ids:
                continue
            if record.replaced_oracle_id and record.new_oracle_id:
                event_type = "MUTATED"
            elif record.replaced_oracle_id and not record.new_oracle_id:
                event_type = "RETIRED"
            else:
                event_type = "GENESIS_PROMOTED"
            new_rows.append({
                "event_index": next_index, "event_id": event_id, "event_type": event_type,
                "cycle_index": cycle_index, "local_generation": record.generation,
                "hypothesis_id": record.hypothesis_id, "generator_id": record.generator_id,
                "mutation": record.mutation, "replaced_oracle_id": record.replaced_oracle_id or "",
                "new_oracle_id": record.new_oracle_id or "", "resulting_stack_identity": record.resulting_stack_identity,
                "challenge_suite_id": record.challenge_suite_id,
            })
            existing_ids.add(event_id)
            next_index += 1
        if new_rows:
            self._append_rows(path, HISTORY_FIELDS, new_rows)

    def append_evidence(self, mission_id: str, results: Sequence[EvidenceAcquisitionResult]) -> None:
        if not results:
            return
        path = self._path(mission_id, "evidence.csv")
        existing = self._read_rows(path)
        ids = {row["result_id"] for row in existing}
        rows = []
        for result in results:
            if result.result_id in ids:
                raise IntelligenceStoreError(f"duplicate persisted evidence result {result.result_id!r}")
            ids.add(result.result_id)
            rows.append({
                "result_id": result.result_id, "query_id": result.query_id,
                "observed_value": result.observed_value, "source_id": result.source_id,
                "confidence": result.confidence, "polarity": result.polarity,
                "provenance": _json(dict(result.provenance)),
            })
        self._append_rows(path, EVIDENCE_FIELDS, rows)

    def append_checkpoint(self, mission_id: str, checkpoint: IntelligenceCheckpoint) -> None:
        path = self._path(mission_id, "checkpoints.csv")
        existing = self._read_rows(path)
        if any(row["checkpoint_id"] == checkpoint.checkpoint_id for row in existing):
            raise IntelligenceStoreError(f"duplicate checkpoint {checkpoint.checkpoint_id!r}")
        self._append_rows(path, CHECKPOINT_FIELDS, ({
            "checkpoint_id": checkpoint.checkpoint_id, "cycle_index": checkpoint.cycle_index,
            "status": checkpoint.status, "reason": checkpoint.reason, "resumable": checkpoint.resumable,
            "terminal": checkpoint.terminal, "resume_triggers": _json(checkpoint.resume_triggers),
            "plan_ids": _json(checkpoint.plan_ids), "oracle_stack_identity": checkpoint.oracle_stack_identity,
            "provenance": _json(dict(checkpoint.provenance)),
        },))

    def latest_checkpoint_row(self, mission_id: str) -> Mapping[str, str] | None:
        rows = self._read_rows(self._path(mission_id, "checkpoints.csv"))
        if not rows:
            return None
        return max(rows, key=lambda row: int(row["cycle_index"]))

    def next_cycle_index(self, mission_id: str) -> int:
        row = self.latest_checkpoint_row(mission_id)
        return 0 if row is None else int(row["cycle_index"]) + 1

    def evidence_count(self, mission_id: str) -> int:
        return len(self._read_rows(self._path(mission_id, "evidence.csv")))

    def load_compilation(self, mission_id: str, *, max_width: int = 20) -> ProblemCompilation:
        frame = self.load_frame(mission_id)
        compilation = compile_problem_frame(frame, max_width=max_width)
        if not compilation.executable or compilation.oracle_stack is None:
            return compilation
        population = self.load_oracle_population(mission_id)
        fixed = tuple(oracle for oracle in compilation.oracle_stack.oracles if not isinstance(oracle, SemanticRuleOracle))
        collisions = {oracle.oracle_id for oracle in fixed} & set(population.oracle_ids)
        if collisions:
            raise IntelligenceStoreError(f"persisted oracle ids collide with fixed problem oracles: {sorted(collisions)}")
        stack = OracleStack(
            compilation.oracle_stack.stack_id,
            f"{compilation.oracle_stack.version}+store:{population.version}",
            fixed + tuple(population.oracles),
        )
        provenance = {
            **dict(compilation.provenance),
            "intelligence_store_loaded": True,
            "intelligence_store_type": "csv",
            "evolvable_population_stack_id": population.stack_id,
            "evolvable_population_version": population.version,
            "canonical_spec_modified": False,
        }
        return replace(compilation, oracle_stack=stack, provenance=provenance)

    def state(self, mission_id: str) -> StoredMissionState:
        population = self.load_oracle_population(mission_id)
        checkpoint = self.latest_checkpoint_row(mission_id)
        return StoredMissionState(
            mission_id=mission_id,
            cycle_index=-1 if checkpoint is None else int(checkpoint["cycle_index"]),
            oracle_stack_identity=population.identity,
            oracle_count=len(population.oracles),
            evidence_count=self.evidence_count(mission_id),
            checkpoint_status=None if checkpoint is None else checkpoint["status"],
            directory=str(self.mission_dir(mission_id)),
            provenance={
                "store": "csv_intelligence_store_v0",
                "human_readable": True,
                "pickle_used": False,
                "canonical_spec_modified": False,
            },
        )
