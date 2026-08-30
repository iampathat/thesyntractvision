from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping

from .models import BaseBundle
from .oracles import OracleStack


class OracleSpaceError(ValueError):
    """Raised when an oracle-space transport/hosting boundary is violated."""


@dataclass(frozen=True)
class OracleSpace:
    """Portable manifestation of one Logical Universe for QCDS execution.

    Logic is not redefined by its host. The same BaseBundle + OracleStack may be
    hosted centrally, in an ephemeral browser/session runtime, or externally and
    later transferred. Host topology changes capacity and lifetime only; QCDS
    semantics remain in the core and logic remains manifested through oracles.
    """

    space_id: str
    universe_id: str
    bundle: BaseBundle
    oracle_stack: OracleStack
    host_kind: str = "external"
    provenance: Mapping[str, Any] = field(default_factory=dict)
    syntract_ids: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not self.space_id or not self.universe_id:
            raise OracleSpaceError("oracle space requires space_id and universe_id")
        if self.host_kind not in {"central", "session", "external"}:
            raise OracleSpaceError("host_kind must be central, session or external")

    @property
    def logical_contract_identity(self) -> tuple[str, str, tuple[str, ...]]:
        return (self.bundle.bundle_id, self.oracle_stack.identity, self.oracle_stack.oracle_ids)

    def rehost(self, *, host_kind: str, space_id: str | None = None, transfer_note: str = "") -> "OracleSpace":
        """Move the same logical contract to another host without promoting truth."""
        if host_kind not in {"central", "session", "external"}:
            raise OracleSpaceError("host_kind must be central, session or external")
        return OracleSpace(
            space_id=space_id or self.space_id,
            universe_id=self.universe_id,
            bundle=self.bundle,
            oracle_stack=self.oracle_stack,
            host_kind=host_kind,
            provenance={
                **dict(self.provenance),
                "transferred_from_space_id": self.space_id,
                "transferred_from_host_kind": self.host_kind,
                "transfer_note": transfer_note,
                "truth_promoted_by_transfer": False,
                "qcds_semantics_changed_by_transfer": False,
            },
            syntract_ids=self.syntract_ids,
        )


@dataclass
class OracleSpaceHost:
    """In-memory host for portable oracle spaces.

    This is deliberately not a second reasoning engine or a truth database. It
    mounts complete oracle-space contracts and hands them to QCDS Fabric.
    """

    host_id: str
    host_kind: str
    spaces: dict[str, OracleSpace] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.host_id:
            raise OracleSpaceError("host_id is required")
        if self.host_kind not in {"central", "session", "external"}:
            raise OracleSpaceError("host_kind must be central, session or external")

    def mount(self, space: OracleSpace, *, replace: bool = False) -> OracleSpace:
        if space.space_id in self.spaces and not replace:
            raise OracleSpaceError(f"oracle space {space.space_id!r} already mounted")
        hosted = space if space.host_kind == self.host_kind else space.rehost(host_kind=self.host_kind)
        self.spaces[hosted.space_id] = hosted
        return hosted

    def transfer_in(self, space: OracleSpace, *, space_id: str | None = None, note: str = "") -> OracleSpace:
        """Transfer an external/session space while preserving universe identity."""
        hosted = space.rehost(host_kind=self.host_kind, space_id=space_id, transfer_note=note)
        return self.mount(hosted)

    def get(self, space_id: str) -> OracleSpace:
        try:
            return self.spaces[space_id]
        except KeyError as exc:
            raise OracleSpaceError(f"unknown oracle space {space_id!r}") from exc

    def unmount(self, space_id: str) -> OracleSpace:
        try:
            return self.spaces.pop(space_id)
        except KeyError as exc:
            raise OracleSpaceError(f"unknown oracle space {space_id!r}") from exc

    def manifest(self) -> tuple[Mapping[str, Any], ...]:
        return tuple(
            {
                "space_id": space.space_id,
                "universe_id": space.universe_id,
                "host_kind": space.host_kind,
                "bundle_id": space.bundle.bundle_id,
                "oracle_stack_identity": space.oracle_stack.identity,
                "oracle_count": len(space.oracle_stack.oracles),
                "syntract_ids": space.syntract_ids,
            }
            for space in self.spaces.values()
        )


def transfer_oracle_space(space: OracleSpace, target: OracleSpaceHost, *, space_id: str | None = None, note: str = "") -> OracleSpace:
    """Explicit transport helper; transfer never implies Reality/truth promotion."""
    return target.transfer_in(space, space_id=space_id, note=note)


__all__ = ["OracleSpaceError", "OracleSpace", "OracleSpaceHost", "transfer_oracle_space"]
