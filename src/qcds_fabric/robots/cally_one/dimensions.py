"""Dimension states for the Cally.One Logical Robot.

Cally.One Tribute License 1.0 — see LICENSE.md in this package.

A dimension is itself represented as state.  Its canonical key is stable while
labels, aliases, visibility, value semantics and lifecycle are mutable state.
Retiring a dimension hides it from active projections without deleting the
historical states that already use it.
"""

from __future__ import annotations

import re
from typing import Any, Mapping

from ...calendar_robot import CalendarRobotError, CalendarSpace, _cmp_dt
from .state_space import CallyOneStateGraph, StateEntity


BUILTIN_DIMENSIONS: dict[str, dict[str, Any]] = {
    "person": {
        "labels": {"en": "Person", "sv": "Person"},
        "value_kind": "entity:person",
        "preferred": True,
        "rich_editor": True,
    },
    "event": {
        "labels": {"en": "Event", "sv": "Händelse"},
        "value_kind": "event",
        "preferred": True,
        "rich_editor": True,
    },
    "organization": {
        "labels": {"en": "Organization", "sv": "Organisation"},
        "value_kind": "entity:organization",
        "preferred": True,
        "rich_editor": True,
    },
    "location": {
        "labels": {"en": "Location", "sv": "Plats"},
        "value_kind": "scalar",
        "preferred": True,
        "rich_editor": False,
    },
    "resource": {
        "labels": {"en": "Resource", "sv": "Resurs"},
        "value_kind": "entity:resource",
        "preferred": True,
        "rich_editor": True,
    },
    "thing": {
        "labels": {"en": "Thing", "sv": "Sak"},
        "value_kind": "entity:thing",
        "preferred": True,
        "rich_editor": True,
    },
    "day": {
        "labels": {"en": "Day", "sv": "Dag"},
        "value_kind": "temporal:day",
        "preferred": True,
        "rich_editor": False,
    },
    "language": {
        "labels": {"en": "Language", "sv": "Språk"},
        "value_kind": "language-state",
        "preferred": True,
        "rich_editor": False,
    },
}


def canonical_dimension_key(value: Any) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9_]+", "_", text).strip("_")
    if not text:
        raise CalendarRobotError("dimension key must be non-empty")
    return text


def _humanize(key: str) -> str:
    return " ".join(part.capitalize() for part in key.split("_") if part)


class DimensionStateRegistry:
    """State-backed dimension catalogue over one Calendar Space."""

    def __init__(self, graph: CallyOneStateGraph, space: CalendarSpace) -> None:
        self.graph = graph
        self.space = space

    @staticmethod
    def entity_id(key: str) -> str:
        return f"dimension:{canonical_dimension_key(key)}"

    def _dimension_entity(self, key: str) -> StateEntity | None:
        entity = self.graph.entities.get(self.entity_id(key))
        return entity if entity is not None and entity.kind == "dimension" else None

    def ensure(self) -> None:
        for key, spec in BUILTIN_DIMENSIONS.items():
            if self._dimension_entity(key) is None:
                self.upsert(
                    {
                        "key": key,
                        "label": spec["labels"].get("sv") or spec["labels"].get("en") or _humanize(key),
                        "labels": spec["labels"],
                        "value_kind": spec["value_kind"],
                        "preferred": spec["preferred"],
                        "rich_editor": spec["rich_editor"],
                        "system": True,
                    }
                )

        discovered = set(self.space.dimension_catalog().keys())
        for entity in self.graph.entities.values():
            if entity.kind != "dimension":
                discovered.update(str(key) for key in entity.dimensions)
        for relation in self.graph.relations.values():
            discovered.update(str(key) for key in relation.dimensions)

        for raw_key in sorted(discovered):
            key = canonical_dimension_key(raw_key)
            if self._dimension_entity(key) is None:
                self.upsert(
                    {
                        "key": key,
                        "label": _humanize(key),
                        "labels": {"en": _humanize(key), "sv": _humanize(key)},
                        "value_kind": "scalar",
                        "preferred": False,
                        "rich_editor": False,
                        "system": False,
                        "origin": "discovered",
                    }
                )

    def upsert(self, payload: Mapping[str, Any]) -> StateEntity:
        raw_key = payload.get("key") or payload.get("canonical_key")
        if not raw_key:
            raw_key = payload.get("label")
        key = canonical_dimension_key(raw_key)
        current = self._dimension_entity(key)
        current_dims = dict(current.dimensions) if current else {}

        raw_labels = payload.get("labels")
        if raw_labels is not None and not isinstance(raw_labels, Mapping):
            raise CalendarRobotError("dimension labels must be an object")
        labels = dict(current_dims.get("labels") or {})
        labels.update({str(k): str(v) for k, v in dict(raw_labels or {}).items() if str(v).strip()})

        explicit_label = str(payload.get("label") or "").strip()
        label = explicit_label or labels.get("sv") or labels.get("en") or (current.label if current else _humanize(key))
        if explicit_label:
            labels.setdefault("sv", explicit_label)
            labels.setdefault("en", explicit_label)

        aliases = list(current.aliases) if current else []
        if current and current.label != label and current.label not in aliases:
            aliases.append(current.label)
        raw_aliases = payload.get("aliases") or []
        if not isinstance(raw_aliases, (list, tuple)):
            raise CalendarRobotError("dimension aliases must be an array")
        for alias in raw_aliases:
            text = str(alias).strip()
            if text and text != label and text not in aliases:
                aliases.append(text)

        dimensions = current_dims
        dimensions.update(
            {
                "canonical_key": key,
                "labels": labels,
                "status": str(payload.get("status") or current_dims.get("status") or "active"),
                "hidden": bool(payload.get("hidden", current_dims.get("hidden", False))),
                "value_kind": str(payload.get("value_kind") or current_dims.get("value_kind") or "scalar"),
                "preferred": bool(payload.get("preferred", current_dims.get("preferred", False))),
                "rich_editor": bool(payload.get("rich_editor", current_dims.get("rich_editor", False))),
                "system": bool(payload.get("system", current_dims.get("system", False))),
                "origin": str(payload.get("origin") or current_dims.get("origin") or "user"),
            }
        )
        return self.graph.upsert_entity(
            {
                "entity_id": self.entity_id(key),
                "label": label,
                "kind": "dimension",
                "dimensions": dimensions,
                "aliases": aliases,
            }
        )

    def retire(self, key: str, *, retired: bool = True) -> StateEntity:
        canonical = canonical_dimension_key(key)
        current = self._dimension_entity(canonical)
        if current is None:
            self.ensure()
            current = self._dimension_entity(canonical)
        if current is None:
            raise CalendarRobotError(f"unknown dimension: {canonical}")
        return self.upsert(
            {
                "key": canonical,
                "label": current.label,
                "labels": dict(current.dimensions.get("labels") or {}),
                "aliases": list(current.aliases),
                "status": "retired" if retired else "active",
                "hidden": retired,
                "value_kind": current.dimensions.get("value_kind", "scalar"),
                "preferred": current.dimensions.get("preferred", False),
                "rich_editor": current.dimensions.get("rich_editor", False),
                "system": current.dimensions.get("system", False),
                "origin": current.dimensions.get("origin", "user"),
            }
        )

    def _usage(self, key: str) -> int:
        if key == "person":
            return len(self.space.people)
        if key == "event":
            return len(self.space.events)
        if key == "organization":
            return sum(item.kind == "organization" for item in self.graph.entities.values())
        if key == "resource":
            return sum(item.kind == "resource" for item in self.graph.entities.values())
        if key == "thing":
            return sum(item.kind == "thing" for item in self.graph.entities.values())
        if key == "day":
            return len({_cmp_dt(event.start).date().isoformat() for event in self.space.events.values()})

        count = 0
        if key == "location":
            count += sum(bool(event.location) for event in self.space.events.values())
        count += sum(key in person.dimensions for person in self.space.people.values())
        count += sum(key in event.dimensions for event in self.space.events.values())
        count += sum(key in entity.dimensions for entity in self.graph.entities.values() if entity.kind != "dimension")
        count += sum(key in relation.dimensions for relation in self.graph.relations.values())
        return count

    def snapshot(self) -> list[dict[str, Any]]:
        self.ensure()
        out: list[dict[str, Any]] = []
        for entity in self.graph.entities.values():
            if entity.kind != "dimension":
                continue
            dims = dict(entity.dimensions)
            key = canonical_dimension_key(dims.get("canonical_key") or entity.entity_id.removeprefix("dimension:"))
            out.append(
                {
                    "dimension_id": entity.entity_id,
                    "key": key,
                    "label": entity.label,
                    "labels": dict(dims.get("labels") or {}),
                    "aliases": list(entity.aliases),
                    "status": str(dims.get("status") or "active"),
                    "hidden": bool(dims.get("hidden", False)),
                    "value_kind": str(dims.get("value_kind") or "scalar"),
                    "preferred": bool(dims.get("preferred", False)),
                    "rich_editor": bool(dims.get("rich_editor", False)),
                    "system": bool(dims.get("system", False)),
                    "origin": str(dims.get("origin") or "user"),
                    "usage": self._usage(key),
                }
            )
        out.sort(key=lambda item: (item["status"] != "active", not item["preferred"], item["label"].lower()))
        return out


__all__ = ["BUILTIN_DIMENSIONS", "DimensionStateRegistry", "canonical_dimension_key"]
