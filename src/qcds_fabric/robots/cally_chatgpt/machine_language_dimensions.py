"""Machine/API language states for the Cally.One Logical Robot.

External calendar formats, protocols and APIs are treated as languages spoken
by adapters around the canonical Calendar Space.  They never become a second
domain model and never replace QCDS/Syntract inference.

Cally.One Tribute License 1.0 — see LICENSE.md in this package.
"""

from __future__ import annotations

from typing import Any

from .dimensions import BUILTIN_DIMENSIONS


MACHINE_LANGUAGE_VALUES: list[dict[str, Any]] = [
    {
        "code": "vcalendar_1_0",
        "labels": {"sv": "vCalendar 1.0", "en": "vCalendar 1.0"},
        "family": "calendar-document",
        "version": "1.0",
        "generation": "legacy",
        "transport": "file",
        "capabilities": ["import", "export"],
        "default_fidelity": "partial",
    },
    {
        "code": "icalendar",
        "labels": {"sv": "iCalendar / ICS", "en": "iCalendar / ICS"},
        "family": "calendar-document",
        "version": "RFC 5545 family",
        "generation": "standard",
        "transport": "file-or-protocol-payload",
        "capabilities": ["import", "export", "events", "recurrence", "attendees", "time-zones"],
        "default_fidelity": "mapped",
    },
    {
        "code": "caldav",
        "labels": {"sv": "CalDAV", "en": "CalDAV"},
        "family": "calendar-sync",
        "version": "standards-family",
        "generation": "standard",
        "transport": "http-webdav",
        "capabilities": ["read", "write", "sync", "collections", "etag", "icalendar-payload"],
        "default_fidelity": "mapped",
    },
    {
        "code": "itip",
        "labels": {"sv": "iTIP · kalenderbokning", "en": "iTIP · calendar scheduling"},
        "family": "calendar-scheduling",
        "version": "standards-family",
        "generation": "standard",
        "transport": "abstract-scheduling",
        "capabilities": ["request", "reply", "cancel", "publish", "counter"],
        "default_fidelity": "mapped",
    },
    {
        "code": "imip",
        "labels": {"sv": "iMIP · kalender via e-post", "en": "iMIP · calendar over email"},
        "family": "calendar-scheduling-transport",
        "version": "standards-family",
        "generation": "standard",
        "transport": "email",
        "capabilities": ["itip-over-email", "invitations", "replies"],
        "default_fidelity": "mapped",
    },
    {
        "code": "exchange_ews",
        "labels": {"sv": "Exchange Web Services · EWS", "en": "Exchange Web Services · EWS"},
        "family": "vendor-api",
        "version": "legacy-exchange",
        "generation": "legacy",
        "transport": "soap-http",
        "capabilities": ["read", "write", "sync", "calendar-items", "attendees", "recurrence"],
        "default_fidelity": "mapped",
    },
    {
        "code": "exchange_activesync",
        "labels": {"sv": "Exchange ActiveSync", "en": "Exchange ActiveSync"},
        "family": "device-sync",
        "version": "legacy-mobile-sync",
        "generation": "legacy",
        "transport": "http",
        "capabilities": ["device-sync", "calendar-items", "recurrence", "attendees"],
        "default_fidelity": "partial",
    },
    {
        "code": "google_calendar_api",
        "labels": {"sv": "Google Calendar API", "en": "Google Calendar API"},
        "family": "vendor-api",
        "version": "v3-family",
        "generation": "modern",
        "transport": "json-http",
        "capabilities": ["read", "write", "sync", "events", "attendees", "recurrence", "freebusy"],
        "default_fidelity": "mapped",
    },
    {
        "code": "microsoft_graph_calendar",
        "labels": {"sv": "Microsoft Graph · Calendar", "en": "Microsoft Graph · Calendar"},
        "family": "vendor-api",
        "version": "graph",
        "generation": "modern",
        "transport": "json-http",
        "capabilities": ["read", "write", "sync", "events", "attendees", "recurrence", "calendar-view"],
        "default_fidelity": "mapped",
    },
    {
        "code": "generic_json_rest",
        "labels": {"sv": "Generisk JSON / REST", "en": "Generic JSON / REST"},
        "family": "custom-api",
        "version": "mapping-defined",
        "generation": "generic",
        "transport": "json-http",
        "capabilities": ["custom-mapping", "read", "write"],
        "default_fidelity": "declared",
    },
]

CONNECTOR_DIRECTION_VALUES = [
    {"code": "import_only", "labels": {"sv": "Endast in", "en": "Import only"}},
    {"code": "export_only", "labels": {"sv": "Endast ut", "en": "Export only"}},
    {"code": "read_only", "labels": {"sv": "Läs", "en": "Read only"}},
    {"code": "read_write", "labels": {"sv": "Läs + skriv", "en": "Read + write"}},
    {"code": "bidirectional_sync", "labels": {"sv": "Tvåvägssynk", "en": "Bidirectional sync"}},
]

TRANSLATION_FIDELITY_VALUES = [
    {"code": "lossless", "labels": {"sv": "Förlustfri", "en": "Lossless"}},
    {"code": "mapped", "labels": {"sv": "Semantiskt mappad", "en": "Semantically mapped"}},
    {"code": "partial", "labels": {"sv": "Delvis", "en": "Partial"}},
    {"code": "declared", "labels": {"sv": "Definieras av adaptern", "en": "Declared by adapter"}},
]

CONNECTOR_AUTHORITY_VALUES = [
    {"code": "calendar_space", "labels": {"sv": "Calendar Space styr", "en": "Calendar Space authoritative"}},
    {"code": "external", "labels": {"sv": "Extern källa styr", "en": "External source authoritative"}},
    {"code": "shared", "labels": {"sv": "Delad auktoritet", "en": "Shared authority"}},
    {"code": "human_resolution", "labels": {"sv": "Människa avgör konflikt", "en": "Human resolves conflict"}},
]

SYNC_STATE_VALUES = [
    {"code": "disconnected", "labels": {"sv": "Inte ansluten", "en": "Disconnected"}},
    {"code": "ready", "labels": {"sv": "Redo", "en": "Ready"}},
    {"code": "syncing", "labels": {"sv": "Synkar", "en": "Syncing"}},
    {"code": "conflict", "labels": {"sv": "Motsägelse", "en": "Conflict"}},
    {"code": "degraded", "labels": {"sv": "Delvis kompatibel", "en": "Degraded"}},
    {"code": "error", "labels": {"sv": "Fel", "en": "Error"}},
]

MACHINE_LANGUAGE_DIMENSIONS: dict[str, dict[str, Any]] = {
    "machine_language": {
        "labels": {"sv": "Maskinspråk / kalender-API", "en": "Machine language / calendar API"},
        "value_kind": "machine-language-state",
        "preferred": True,
        "rich_editor": True,
        "values": MACHINE_LANGUAGE_VALUES,
    },
    "connector_direction": {
        "labels": {"sv": "Adapterriktning", "en": "Connector direction"},
        "value_kind": "adapter-direction-state",
        "preferred": False,
        "rich_editor": False,
        "values": CONNECTOR_DIRECTION_VALUES,
    },
    "adapter_capability": {
        "labels": {"sv": "Adapterförmåga", "en": "Adapter capability"},
        "value_kind": "capability-state",
        "preferred": False,
        "rich_editor": True,
    },
    "semantic_mapping": {
        "labels": {"sv": "Semantisk mappning", "en": "Semantic mapping"},
        "value_kind": "semantic-mapping-state",
        "preferred": False,
        "rich_editor": True,
    },
    "identity_mapping": {
        "labels": {"sv": "Identitetsmappning", "en": "Identity mapping"},
        "value_kind": "identity-mapping-state",
        "preferred": False,
        "rich_editor": True,
    },
    "time_semantics": {
        "labels": {"sv": "Tidssemantik i adaptern", "en": "Adapter time semantics"},
        "value_kind": "semantic-mapping-state",
        "preferred": False,
        "rich_editor": True,
    },
    "recurrence_semantics": {
        "labels": {"sv": "Upprepningssemantik", "en": "Recurrence semantics"},
        "value_kind": "semantic-mapping-state",
        "preferred": False,
        "rich_editor": True,
    },
    "permission_semantics": {
        "labels": {"sv": "Behörighetssemantik", "en": "Permission semantics"},
        "value_kind": "semantic-mapping-state",
        "preferred": False,
        "rich_editor": True,
    },
    "translation_fidelity": {
        "labels": {"sv": "Översättningsprecision", "en": "Translation fidelity"},
        "value_kind": "translation-fidelity-state",
        "preferred": False,
        "rich_editor": False,
        "values": TRANSLATION_FIDELITY_VALUES,
    },
    "connector_authority": {
        "labels": {"sv": "Källa / auktoritet", "en": "Source authority"},
        "value_kind": "authority-state",
        "preferred": False,
        "rich_editor": False,
        "values": CONNECTOR_AUTHORITY_VALUES,
    },
    "external_system": {
        "labels": {"sv": "Externt system", "en": "External system"},
        "value_kind": "external-system-state",
        "preferred": False,
        "rich_editor": True,
    },
    "external_id": {
        "labels": {"sv": "Externt ID", "en": "External ID"},
        "value_kind": "external-identity-state",
        "preferred": False,
        "rich_editor": False,
    },
    "external_revision": {
        "labels": {"sv": "Extern revision / ETag", "en": "External revision / ETag"},
        "value_kind": "external-revision-state",
        "preferred": False,
        "rich_editor": False,
    },
    "sync_state": {
        "labels": {"sv": "Synktillstånd", "en": "Sync state"},
        "value_kind": "sync-state",
        "preferred": False,
        "rich_editor": False,
        "values": SYNC_STATE_VALUES,
    },
    "source_provenance": {
        "labels": {"sv": "Källproveniens", "en": "Source provenance"},
        "value_kind": "provenance-state",
        "preferred": False,
        "rich_editor": True,
    },
}


def install_machine_language_dimensions() -> None:
    """Install adapter-language dimensions without replacing future core specs."""
    for key, spec in MACHINE_LANGUAGE_DIMENSIONS.items():
        BUILTIN_DIMENSIONS.setdefault(key, spec)


install_machine_language_dimensions()


__all__ = [
    "CONNECTOR_AUTHORITY_VALUES",
    "CONNECTOR_DIRECTION_VALUES",
    "MACHINE_LANGUAGE_DIMENSIONS",
    "MACHINE_LANGUAGE_VALUES",
    "SYNC_STATE_VALUES",
    "TRANSLATION_FIDELITY_VALUES",
    "install_machine_language_dimensions",
]
