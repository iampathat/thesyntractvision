"""Dimension states for the Cally.One Logical Robot.

Cally.One Tribute License 1.0 — see LICENSE.md in this package.

A dimension is itself represented as state. Its canonical key is stable while
labels, aliases, value semantics and lifecycle are mutable state. Display
language, calendar system, time zone and account access are therefore not UI
special cases: they are domain dimensions projected by the client. QCDS remains
the sole inference engine when logical inference is explicitly requested.
"""

from __future__ import annotations

import re
from typing import Any, Mapping

from ...calendar_robot import CalendarRobotError, CalendarSpace, _cmp_dt
from .state_space import CallyOneStateGraph, StateEntity


LANGUAGE_VALUES = [
    {
        "code": "sv",
        "labels": {"sv": "Svenska", "en": "Swedish"},
        "native_label": "Svenska",
        "locale": "sv-SE",
        "direction": "ltr",
    },
    {
        "code": "en",
        "labels": {"sv": "Engelska", "en": "English"},
        "native_label": "English",
        "locale": "en-GB",
        "direction": "ltr",
    },
]

CALENDAR_SYSTEM_VALUES = [
    {"code": "gregory", "labels": {"sv": "Gregoriansk", "en": "Gregorian"}},
    {"code": "iso8601", "labels": {"sv": "ISO 8601", "en": "ISO 8601"}},
    {"code": "islamic", "labels": {"sv": "Islamisk", "en": "Islamic"}},
    {"code": "islamic-umalqura", "labels": {"sv": "Islamisk · Umm al-Qura", "en": "Islamic · Umm al-Qura"}},
    {"code": "chinese", "labels": {"sv": "Kinesisk", "en": "Chinese"}},
    {"code": "hebrew", "labels": {"sv": "Hebreisk", "en": "Hebrew"}},
    {"code": "persian", "labels": {"sv": "Persisk", "en": "Persian"}},
    {"code": "indian", "labels": {"sv": "Indisk nationalkalender", "en": "Indian national calendar"}},
    {"code": "buddhist", "labels": {"sv": "Buddhistisk", "en": "Buddhist"}},
    {"code": "japanese", "labels": {"sv": "Japansk era", "en": "Japanese era"}},
]

# A time zone is a civil/local projection (normally an IANA zone on Earth).
# A time reference is the deeper clock/timescale state used by computers,
# navigation systems, missions and spacecraft. Keeping these separate avoids
# pretending that UTC, TAI, Unix time or a spacecraft clock are "time zones".
TIME_REFERENCE_VALUES = [
    {
        "code": "utc",
        "labels": {"sv": "UTC · koordinerad universell tid", "en": "UTC · Coordinated Universal Time"},
        "category": "civil-reference",
        "standard_family": "international",
    },
    {
        "code": "tai",
        "labels": {"sv": "TAI · internationell atomtid", "en": "TAI · International Atomic Time"},
        "category": "atomic",
        "standard_family": "international",
    },
    {
        "code": "gps",
        "labels": {"sv": "GPS-tid", "en": "GPS Time"},
        "category": "navigation",
        "standard_family": "gnss",
    },
    {
        "code": "tt",
        "labels": {"sv": "TT · terrestrisk tid", "en": "TT · Terrestrial Time"},
        "category": "relativistic-coordinate",
        "standard_family": "astronomy",
    },
    {
        "code": "ut1",
        "labels": {"sv": "UT1 · jordrotationstid", "en": "UT1 · Universal Time 1"},
        "category": "earth-rotation",
        "standard_family": "astronomy",
    },
    {
        "code": "tcg",
        "labels": {"sv": "TCG · geocentrisk koordinattid", "en": "TCG · Geocentric Coordinate Time"},
        "category": "relativistic-coordinate",
        "standard_family": "astronomy",
    },
    {
        "code": "tcb",
        "labels": {"sv": "TCB · barycentrisk koordinattid", "en": "TCB · Barycentric Coordinate Time"},
        "category": "relativistic-coordinate",
        "standard_family": "astronomy",
    },
    {
        "code": "tdb",
        "labels": {"sv": "TDB · barycentrisk dynamisk tid", "en": "TDB · Barycentric Dynamical Time"},
        "category": "relativistic-coordinate",
        "standard_family": "astronomy",
    },
    {
        "code": "met",
        "labels": {"sv": "MET · Mission Elapsed Time", "en": "MET · Mission Elapsed Time"},
        "category": "mission-relative",
        "requires_epoch": True,
    },
    {
        "code": "mrt",
        "labels": {"sv": "MRT · Mission Relative Time", "en": "MRT · Mission Relative Time"},
        "category": "mission-relative",
        "requires_epoch": True,
    },
    {
        "code": "sclk",
        "labels": {"sv": "SCLK · farkostens ombordklocka", "en": "SCLK · Spacecraft Clock"},
        "category": "onboard-clock",
        "requires_correlation": True,
    },
    {
        "code": "unix",
        "labels": {"sv": "Unix/POSIX-tid", "en": "Unix/POSIX time"},
        "category": "computing-encoding",
        "epoch": "1970-01-01T00:00:00Z",
        "physical_timescale": False,
    },
    {
        "code": "ltc",
        "labels": {"sv": "LTC · koordinerad måntid", "en": "LTC · Coordinated Lunar Time"},
        "category": "lunar-reference",
        "status": "standardization-in-progress",
        "traceable_to": "utc",
    },
]

REFERENCE_BODY_VALUES = [
    {"code": "earth", "labels": {"sv": "Jorden", "en": "Earth"}},
    {"code": "moon", "labels": {"sv": "Månen", "en": "Moon"}},
    {"code": "mars", "labels": {"sv": "Mars", "en": "Mars"}},
    {"code": "solar_system_barycenter", "labels": {"sv": "Solsystemets barycentrum", "en": "Solar-system barycenter"}},
    {"code": "spacecraft", "labels": {"sv": "Farkost / satellit", "en": "Spacecraft / satellite"}},
    {"code": "computer", "labels": {"sv": "Datorsystem", "en": "Computer system"}},
]

ACCOUNT_ROLE_VALUES = [
    {"code": "member", "labels": {"sv": "Medlem", "en": "Member"}},
    {"code": "admin", "labels": {"sv": "Admin", "en": "Admin"}},
    {"code": "superadmin", "labels": {"sv": "Superadmin", "en": "Superadmin"}},
]

BUILTIN_DIMENSIONS: dict[str, dict[str, Any]] = {
    "person": {"labels": {"en": "Person", "sv": "Person"}, "value_kind": "entity:person", "preferred": True, "rich_editor": True},
    "event": {"labels": {"en": "Event", "sv": "Händelse"}, "value_kind": "event", "preferred": True, "rich_editor": True},
    "organization": {"labels": {"en": "Organization", "sv": "Organisation"}, "value_kind": "entity:organization", "preferred": True, "rich_editor": True},
    "location": {"labels": {"en": "Location", "sv": "Plats"}, "value_kind": "scalar", "preferred": True, "rich_editor": False},
    "resource": {"labels": {"en": "Resource", "sv": "Resurs"}, "value_kind": "entity:resource", "preferred": True, "rich_editor": True},
    "thing": {"labels": {"en": "Thing", "sv": "Sak"}, "value_kind": "entity:thing", "preferred": True, "rich_editor": True},
    "day": {"labels": {"en": "Day", "sv": "Dag"}, "value_kind": "temporal:day", "preferred": True, "rich_editor": False},
    "language": {
        "labels": {"en": "Language", "sv": "Språk"},
        "value_kind": "language-state",
        "preferred": True,
        "rich_editor": True,
        "values": LANGUAGE_VALUES,
    },
    "interface_language": {
        "labels": {"en": "Interface language", "sv": "Gränssnittsspråk"},
        "value_kind": "language-state",
        "preferred": True,
        "rich_editor": False,
        "values": LANGUAGE_VALUES,
    },
    "calendar_display_language": {
        "labels": {"en": "Calendar display language", "sv": "Kalenderns visningsspråk"},
        "value_kind": "language-state",
        "preferred": True,
        "rich_editor": False,
        "values": LANGUAGE_VALUES,
    },
    "calendar_system": {
        "labels": {"en": "Calendar system", "sv": "Tideräkning"},
        "value_kind": "calendar-system-state",
        "preferred": True,
        "rich_editor": False,
        "values": CALENDAR_SYSTEM_VALUES,
    },
    "time_zone": {
        "labels": {"en": "Time zone", "sv": "Tidszon"},
        "value_kind": "time-zone-state",
        "preferred": True,
        "rich_editor": False,
    },
    "time_reference": {
        "labels": {"en": "Time reference / timescale", "sv": "Tidsreferens / tidsskala"},
        "value_kind": "time-reference-state",
        "preferred": True,
        "rich_editor": True,
        "values": TIME_REFERENCE_VALUES,
    },
    "time_epoch": {
        "labels": {"en": "Time epoch", "sv": "Tidsepok / nollpunkt"},
        "value_kind": "temporal-epoch-state",
        "preferred": False,
        "rich_editor": True,
    },
    "reference_body": {
        "labels": {"en": "Reference body / observer", "sv": "Referenskropp / observatör"},
        "value_kind": "observer-body-state",
        "preferred": False,
        "rich_editor": True,
        "values": REFERENCE_BODY_VALUES,
    },
    "reference_frame": {
        "labels": {"en": "Reference frame", "sv": "Referensram"},
        "value_kind": "reference-frame-state",
        "preferred": False,
        "rich_editor": True,
    },
    "clock_source": {
        "labels": {"en": "Clock source", "sv": "Klockkälla"},
        "value_kind": "clock-source-state",
        "preferred": False,
        "rich_editor": True,
    },
    "clock_format": {
        "labels": {"en": "Clock format", "sv": "Klockformat"},
        "value_kind": "clock-format-state",
        "preferred": True,
        "rich_editor": False,
        "values": [
            {"code": "auto", "labels": {"sv": "Automatiskt", "en": "Automatic"}},
            {"code": "h23", "labels": {"sv": "24 timmar", "en": "24 hour"}},
            {"code": "h12", "labels": {"sv": "12 timmar", "en": "12 hour"}},
        ],
    },
    "account_role": {
        "labels": {"en": "Account role", "sv": "Kontoroll"},
        "value_kind": "access-role-state",
        "preferred": False,
        "rich_editor": True,
        "values": ACCOUNT_ROLE_VALUES,
    },
    "visibility_policy": {
        "labels": {"en": "Visibility policy", "sv": "Synlighetspolicy"},
        "value_kind": "access-policy-state",
        "preferred": False,
        "rich_editor": True,
    },
    "calendar_layer_priority": {
        "labels": {"en": "Calendar layer priority", "sv": "Kalenderns lagerprioritet"},
        "value_kind": "scalar",
        "preferred": False,
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


def _normalize_values(raw: Any, current: Any = None) -> list[dict[str, Any]]:
    if raw is None:
        raw = current or []
    if not isinstance(raw, (list, tuple)):
        raise CalendarRobotError("dimension values must be an array")
    values: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, Mapping):
            raise CalendarRobotError("dimension value must be an object")
        value = dict(item)
        code = str(value.get("code") or "").strip()
        if not code:
            raise CalendarRobotError("dimension value code must be non-empty")
        labels = value.get("labels") or {}
        if not isinstance(labels, Mapping):
            raise CalendarRobotError("dimension value labels must be an object")
        value["code"] = code
        value["labels"] = {str(k): str(v) for k, v in labels.items() if str(v).strip()}
        values.append(value)
    return values


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
                        "values": spec.get("values", []),
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
        raw_key = payload.get("key") or payload.get("canonical_key") or payload.get("label")
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
                "values": _normalize_values(payload.get("values"), current_dims.get("values")),
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
                "values": list(current.dimensions.get("values") or []),
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
                    "values": list(dims.get("values") or []),
                    "usage": self._usage(key),
                }
            )
        out.sort(key=lambda item: (item["status"] != "active", not item["preferred"], item["label"].lower()))
        return out


__all__ = [
    "ACCOUNT_ROLE_VALUES",
    "BUILTIN_DIMENSIONS",
    "CALENDAR_SYSTEM_VALUES",
    "LANGUAGE_VALUES",
    "REFERENCE_BODY_VALUES",
    "TIME_REFERENCE_VALUES",
    "DimensionStateRegistry",
    "canonical_dimension_key",
]
