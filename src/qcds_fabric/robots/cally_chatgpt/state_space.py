"""Unified Cally.One state graph.

Cally.One Tribute License 1.0 — see LICENSE.md in this package.

Everything represented by the Cally.One Logical Robot is state.  Person,
organization, room, vehicle, equipment, food, clothing and arbitrary future
concepts share one entity model.  Their links are state too.

The graph is a product-layer state representation above the shared QCDS core.
It does not implement inference.
"""

from __future__ import annotations

import json
import threading
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping

from ...calendar_robot import CalendarRobotError


def _clean(value: Any, name: str) -> str:
    text = " ".join(str(value).strip().split())
    if not text:
        raise CalendarRobotError(f"{name} must be non-empty")
    return text


def _json_value(value: Any) -> Any:
    try:
        json.dumps(value)
    except (TypeError, ValueError) as exc:
        raise CalendarRobotError("state dimensions must be JSON serializable") from exc
    return value


@dataclass(frozen=True)
class StateEntity:
    entity_id: str
    label: str
    kind: str = "thing"
    dimensions: Mapping[str, Any] = field(default_factory=dict)
    aliases: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        _clean(self.entity_id, "entity_id")
        _clean(self.label, "label")
        _clean(self.kind, "kind")
        for key, value in self.dimensions.items():
            _clean(key, "dimension name")
            _json_value(value)

    def as_dict(self) -> dict[str, Any]:
        return {
            "entity_id": self.entity_id,
            "label": self.label,
            "kind": self.kind,
            "dimensions": dict(self.dimensions),
            "aliases": list(self.aliases),
        }

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any], *, entity_id: str | None = None) -> "StateEntity":
        kind = _clean(value.get("kind") or "thing", "kind").lower().replace(" ", "_")
        resolved_id = str(entity_id or value.get("entity_id") or f"{kind}-{uuid.uuid4().hex[:12]}")
        dimensions = value.get("dimensions") or {}
        aliases = value.get("aliases") or ()
        if not isinstance(dimensions, Mapping):
            raise CalendarRobotError("entity dimensions must be an object")
        if not isinstance(aliases, (list, tuple)):
            raise CalendarRobotError("entity aliases must be an array")
        return cls(
            entity_id=resolved_id,
            label=str(value.get("label") or value.get("name") or kind.title()),
            kind=kind,
            dimensions={str(k): v for k, v in dimensions.items()},
            aliases=tuple(str(item) for item in aliases if str(item).strip()),
        )


@dataclass(frozen=True)
class StateRelation:
    relation_id: str
    subject_id: str
    predicate: str
    object_id: str
    dimensions: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        _clean(self.relation_id, "relation_id")
        _clean(self.subject_id, "subject_id")
        _clean(self.predicate, "predicate")
        _clean(self.object_id, "object_id")
        for key, value in self.dimensions.items():
            _clean(key, "dimension name")
            _json_value(value)

    def as_dict(self) -> dict[str, Any]:
        return {
            "relation_id": self.relation_id,
            "subject_id": self.subject_id,
            "predicate": self.predicate,
            "object_id": self.object_id,
            "dimensions": dict(self.dimensions),
        }

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any], *, relation_id: str | None = None) -> "StateRelation":
        predicate = _clean(value.get("predicate") or "related_to", "predicate").lower().replace(" ", "_")
        resolved_id = str(relation_id or value.get("relation_id") or f"relation-{uuid.uuid4().hex[:12]}")
        dimensions = value.get("dimensions") or {}
        if not isinstance(dimensions, Mapping):
            raise CalendarRobotError("relation dimensions must be an object")
        return cls(
            relation_id=resolved_id,
            subject_id=str(value.get("subject_id") or ""),
            predicate=predicate,
            object_id=str(value.get("object_id") or ""),
            dimensions={str(k): v for k, v in dimensions.items()},
        )


class CallyOneStateGraph:
    """Persistent graph projection of one Calendar Space.

    Physical persistence may be partitioned for implementation reasons; that
    does not make separate logical spaces.  Events from CalendarSpace and the
    entities/relations here are nodes and relations of the same Calendar Space.
    """

    FORMAT_VERSION = 1

    def __init__(self, store_root: str | Path) -> None:
        self.store_root = Path(store_root)
        self.store_root.mkdir(parents=True, exist_ok=True)
        self.path = self.store_root / "cally_one_states.json"
        self._lock = threading.RLock()
        self.entities: dict[str, StateEntity] = {}
        self.relations: dict[str, StateRelation] = {}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise CalendarRobotError(f"cannot read Cally.One state graph: {exc}") from exc
        for item in raw.get("entities", []):
            entity = StateEntity.from_mapping(item)
            self.entities[entity.entity_id] = entity
        for item in raw.get("relations", []):
            relation = StateRelation.from_mapping(item)
            self.relations[relation.relation_id] = relation

    def _save(self) -> None:
        body = {
            "format": "cally-one-state-graph",
            "version": self.FORMAT_VERSION,
            "everything_is_state": True,
            "entities": [item.as_dict() for item in self.entities.values()],
            "relations": [item.as_dict() for item in self.relations.values()],
        }
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(body, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
        tmp.replace(self.path)

    def clear(self) -> None:
        with self._lock:
            self.entities.clear()
            self.relations.clear()
            self._save()

    def upsert_entity(self, payload: Mapping[str, Any]) -> StateEntity:
        entity_id = str(payload.get("entity_id") or "") or None
        entity = StateEntity.from_mapping(payload, entity_id=entity_id)
        with self._lock:
            self.entities[entity.entity_id] = entity
            self._save()
        return entity

    def ensure_person(self, person_id: str, name: str, dimensions: Mapping[str, Any] | None = None) -> StateEntity:
        current = self.entities.get(person_id)
        merged = dict(current.dimensions) if current else {}
        merged.update(dict(dimensions or {}))
        return self.upsert_entity(
            {
                "entity_id": person_id,
                "label": name,
                "kind": "person",
                "dimensions": merged,
                "aliases": list(current.aliases) if current else [],
            }
        )

    def upsert_relation(self, payload: Mapping[str, Any]) -> StateRelation:
        relation_id = str(payload.get("relation_id") or "") or None
        relation = StateRelation.from_mapping(payload, relation_id=relation_id)
        with self._lock:
            self.relations[relation.relation_id] = relation
            self._save()
        return relation

    def remove_relations(self, *, subject_id: str | None = None, predicate: str | None = None, object_id: str | None = None) -> int:
        with self._lock:
            remove = [
                relation_id
                for relation_id, relation in self.relations.items()
                if (subject_id is None or relation.subject_id == subject_id)
                and (predicate is None or relation.predicate == predicate)
                and (object_id is None or relation.object_id == object_id)
            ]
            for relation_id in remove:
                del self.relations[relation_id]
            if remove:
                self._save()
            return len(remove)

    def relations_for(self, state_id: str, *, predicate: str | None = None) -> tuple[StateRelation, ...]:
        return tuple(
            relation
            for relation in self.relations.values()
            if (relation.subject_id == state_id or relation.object_id == state_id)
            and (predicate is None or relation.predicate == predicate)
        )

    def snapshot(self) -> dict[str, Any]:
        kinds: dict[str, int] = {}
        for entity in self.entities.values():
            kinds[entity.kind] = kinds.get(entity.kind, 0) + 1
        return {
            "everything_is_state": True,
            "entities": [item.as_dict() for item in sorted(self.entities.values(), key=lambda x: (x.kind, x.label.lower()))],
            "relations": [item.as_dict() for item in self.relations.values()],
            "entity_kinds": kinds,
            "relation_predicates": sorted({item.predicate for item in self.relations.values()}),
        }


__all__ = ["StateEntity", "StateRelation", "CallyOneStateGraph"]
