"""Remote MCP entrypoint for the Cally.One ChatGPT Logical Robot.

Production rule: workspace identity must come from authenticated app/session
context, never from a model-supplied tool argument.  The environment-based
resolver below is intentionally a development bootstrap for one isolated
workspace.  Replace ``current_workspace_id`` with the authenticated resolver
when OAuth/account wiring is added.

The MCP layer only exposes tools.  It performs no calendar inference itself.
``resolve_with_qcds`` delegates to the canonical QCDS/Syntract path in
``chatgpt_bridge.ChatGPTLogicalRobot``.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from .chatgpt_bridge import CHATGPT_ROBOT_LABEL, ChatGPTWorkspaceRouter


DEFAULT_STORE_ROOT = Path(os.environ.get("CALLY_CHATGPT_STORE_ROOT", "/tmp/cally_chatgpt"))
_router = ChatGPTWorkspaceRouter(DEFAULT_STORE_ROOT)


def current_workspace_id() -> str:
    """Development workspace resolver.

    Production must derive this identity from authenticated MCP/App context.
    It is deliberately not an MCP tool parameter so the model cannot switch
    customer Calendar Spaces by inventing an identifier.
    """
    return os.environ.get("CALLY_CHATGPT_WORKSPACE_ID", "developer-preview")


def _call(name: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
    return _router.call_tool(current_workspace_id(), name, arguments or {})


def create_mcp_server():
    """Create the Streamable HTTP MCP server used by ChatGPT Apps SDK.

    The dependency is optional in the base QCDS package. Install the
    ``chatgpt`` extra before running this module. This targets MCP Python SDK
    2.x, where the server class is ``MCPServer``.
    """
    try:
        from mcp.server.mcpserver import MCPServer
    except ImportError as exc:  # pragma: no cover - deployment dependency
        raise RuntimeError(
            "MCP support is not installed. Install qcds-fabric[chatgpt]."
        ) from exc

    mcp = MCPServer(CHATGPT_ROBOT_LABEL)

    @mcp.tool()
    def get_calendar_space() -> dict[str, Any]:
        """Read canonical Calendar Space state for the authenticated workspace."""
        return _call("get_calendar_space")

    @mcp.tool()
    def hydrate_calendar_space(state: dict[str, Any]) -> dict[str, Any]:
        """Restore canonical Calendar Space state for the authenticated workspace."""
        return _call("hydrate_calendar_space", {"state": state})

    @mcp.tool()
    def upsert_person(payload: dict[str, Any]) -> dict[str, Any]:
        """Create or update represented person state."""
        return _call("upsert_person", payload)

    @mcp.tool()
    def archive_person(person_id: str, archived: bool = True) -> dict[str, Any]:
        """Archive or restore person state without erasing historical meaning."""
        return _call("archive_person", {"person_id": person_id, "archived": archived})

    @mcp.tool()
    def upsert_event(payload: dict[str, Any]) -> dict[str, Any]:
        """Create or update represented event state."""
        return _call("upsert_event", payload)

    @mcp.tool()
    def move_event(
        event_id: str,
        start: str,
        end: str | None = None,
        people: list[str] | None = None,
    ) -> dict[str, Any]:
        """Move an event in represented Calendar Space state."""
        return _call(
            "move_event",
            {"event_id": event_id, "start": start, "end": end, "people": people},
        )

    @mcp.tool()
    def delete_event(event_id: str) -> dict[str, Any]:
        """Delete the active event representation."""
        return _call("delete_event", {"event_id": event_id})

    @mcp.tool()
    def upsert_entity(payload: dict[str, Any]) -> dict[str, Any]:
        """Create or update organization/resource/thing/arbitrary state entity."""
        return _call("upsert_entity", payload)

    @mcp.tool()
    def upsert_relation(payload: dict[str, Any]) -> dict[str, Any]:
        """Create or update a relation between represented states."""
        return _call("upsert_relation", payload)

    @mcp.tool()
    def upsert_dimension(payload: dict[str, Any]) -> dict[str, Any]:
        """Create or evolve a canonical dimension definition."""
        return _call("upsert_dimension", payload)

    @mcp.tool()
    def retire_dimension(key: str, retired: bool = True) -> dict[str, Any]:
        """Retire or restore a dimension while preserving historical state."""
        return _call("retire_dimension", {"key": key, "retired": retired})

    @mcp.tool()
    def resolve_with_qcds(
        event_id: str,
        candidates: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Resolve represented alternatives through QCDS/Syntract only."""
        return _call("resolve_with_qcds", {"event_id": event_id, "candidates": candidates})

    return mcp


def main() -> None:
    """Run a stateless JSON Streamable HTTP MCP endpoint at /mcp."""
    create_mcp_server().run(
        transport="streamable-http",
        stateless_http=True,
        json_response=True,
    )


if __name__ == "__main__":  # pragma: no cover
    main()


__all__ = ["create_mcp_server", "current_workspace_id", "main"]
