"""Remote MCP entrypoint for the Cally ChatGPT Logical Robot.

The public ChatGPT-facing contract is deliberately tiny:

    read / write / query / project / resolve

The first four verbs only represent, retrieve or project Calendar Space state.
``resolve`` is the sole inference crossing and delegates to QCDS/Syntract.
Workspace identity comes from authenticated app/session context in production,
never from a model-supplied tool argument.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from .chatgpt_bridge import CHATGPT_ROBOT_LABEL, ChatGPTWorkspaceRouter
from .interface import CallyChatGPTInterface


DEFAULT_STORE_ROOT = Path(os.environ.get("CALLY_CHATGPT_STORE_ROOT", "/tmp/cally_chatgpt"))
_router = ChatGPTWorkspaceRouter(DEFAULT_STORE_ROOT)


def current_workspace_id() -> str:
    """Development resolver; production replaces this with authenticated identity."""
    return os.environ.get("CALLY_CHATGPT_WORKSPACE_ID", "developer-preview")


def _interface() -> CallyChatGPTInterface:
    return CallyChatGPTInterface(_router.robot(current_workspace_id()))


def create_mcp_server():
    """Create the MCP 2.x Streamable HTTP server consumed by ChatGPT."""
    try:
        from mcp.server.mcpserver import MCPServer
    except ImportError as exc:  # pragma: no cover - deployment dependency
        raise RuntimeError(
            "MCP support is not installed. Install qcds-fabric[chatgpt]."
        ) from exc

    mcp = MCPServer(CHATGPT_ROBOT_LABEL)

    @mcp.tool()
    def read(selector: dict[str, Any] | None = None) -> dict[str, Any]:
        """Read canonical Calendar Space state, optionally selecting sections."""
        return _interface().read(selector or {})

    @mcp.tool()
    def write(operation: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        """Represent an authorized state change; this verb performs no inference."""
        return _interface().write(operation, payload or {})

    @mcp.tool()
    def query(spec: dict[str, Any] | None = None) -> dict[str, Any]:
        """Deterministically select represented state without scoring or inference."""
        return _interface().query(spec or {})

    @mcp.tool()
    def project(
        projection: str = "calendar",
        options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Project canonical state into the calendar view without changing truth."""
        return _interface().project(projection, options or {})

    @mcp.tool()
    def resolve(problem: dict[str, Any]) -> dict[str, Any]:
        """Resolve represented alternatives through QCDS/Syntract only."""
        return _interface().resolve(problem)

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
