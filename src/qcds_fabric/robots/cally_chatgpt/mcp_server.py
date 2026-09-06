"""Remote MCP entrypoint for the Cally ChatGPT Logical Robot.

The public ChatGPT-facing contract is deliberately tiny:

    read / write / query / project / resolve

The first four verbs only represent, retrieve or project Calendar Space state.
``resolve`` is the sole inference crossing and is transported through one
host-neutral Hosted QCDS Runtime / SyntractSystem instance.

Workspace identity comes from authenticated app/session context in production,
never from a model-supplied tool argument.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from ...hosted_robotics import hosted_robotics_adapter
from ...hosted_runtime import HostedQCDSRuntime
from .chatgpt_bridge import CHATGPT_ROBOT_LABEL, ChatGPTWorkspaceRouter
from .hosted_interface import HostedCallyChatGPTInterface


DEFAULT_STORE_ROOT = Path(os.environ.get("CALLY_CHATGPT_STORE_ROOT", "/tmp/cally_chatgpt"))
_router = ChatGPTWorkspaceRouter(DEFAULT_STORE_ROOT)
_hosted_runtime = HostedQCDSRuntime()
_hosted_runtime.register(hosted_robotics_adapter())


def current_workspace_id() -> str:
    """Development resolver; production replaces this with authenticated identity."""
    return os.environ.get("CALLY_CHATGPT_WORKSPACE_ID", "developer-preview")


def hosted_runtime_descriptor() -> dict[str, Any]:
    """Expose deployment metadata to tests/operations without adding an MCP tool."""
    _interface()  # ensure Cally is visible alongside Robotics in the manifest
    return _hosted_runtime.descriptor()


def _interface() -> HostedCallyChatGPTInterface:
    return HostedCallyChatGPTInterface(_router.robot(current_workspace_id()), _hosted_runtime)


def create_mcp_server():
    """Create the MCP 2.x Streamable HTTP server consumed by ChatGPT."""
    try:
        from mcp.server.mcpserver import MCPServer
        from mcp.types import ToolAnnotations
    except ImportError as exc:  # pragma: no cover - deployment dependency
        raise RuntimeError(
            "MCP support is not installed. Install qcds-fabric[chatgpt]."
        ) from exc

    mcp = MCPServer(
        CHATGPT_ROBOT_LABEL,
        instructions=(
            "Cally has five ports: READ, WRITE, QUERY, PROJECT, RESOLVE. "
            "READ/WRITE/QUERY/PROJECT must not choose a best or true answer. "
            "Use RESOLVE only when logical inference is required; RESOLVE crosses "
            "the QCDS/SyntractSystem boundary."
        ),
    )

    @mcp.tool(
        title="Read Calendar Space",
        description="Read represented canonical Calendar Space state. Use for inspection before answering or changing Cally state.",
        annotations=ToolAnnotations(
            read_only_hint=True,
            destructive_hint=False,
            open_world_hint=False,
        ),
    )
    def read(selector: dict[str, Any] | None = None) -> dict[str, Any]:
        """Read canonical Calendar Space state, optionally selecting sections."""
        return _interface().read(selector or {})

    @mcp.tool(
        title="Write Calendar Space state",
        description="Represent an authorized Cally state change. This may create, update, archive, retire or delete represented state but performs no logical inference.",
        annotations=ToolAnnotations(
            read_only_hint=False,
            destructive_hint=True,
            open_world_hint=False,
        ),
    )
    def write(operation: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        """Represent an authorized state change; this verb performs no inference."""
        return _interface().write(operation, payload or {})

    @mcp.tool(
        title="Query Calendar Space",
        description="Deterministically select or filter represented Cally state. Do not use this tool to score or choose the best logical alternative.",
        annotations=ToolAnnotations(
            read_only_hint=True,
            destructive_hint=False,
            open_world_hint=False,
        ),
    )
    def query(spec: dict[str, Any] | None = None) -> dict[str, Any]:
        """Deterministically select represented state without scoring or inference."""
        return _interface().query(spec or {})

    @mcp.tool(
        title="Project Calendar Space",
        description="Project canonical Calendar Space state into a presentation such as the calendar view without changing represented truth.",
        annotations=ToolAnnotations(
            read_only_hint=True,
            destructive_hint=False,
            open_world_hint=False,
        ),
    )
    def project(
        projection: str = "calendar",
        options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Project canonical state into the calendar view without changing truth."""
        return _interface().project(projection, options or {})

    @mcp.tool(
        title="Resolve with QCDS",
        description="Use when the user asks Cally to solve, resolve a conflict or select the coherent alternative. Sends the represented problem through the shared Hosted QCDS Runtime and returns the Syntract result.",
        annotations=ToolAnnotations(
            read_only_hint=True,
            destructive_hint=False,
            open_world_hint=False,
        ),
    )
    def resolve(problem: dict[str, Any]) -> dict[str, Any]:
        """Resolve represented alternatives through the shared hosted QCDS runtime."""
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


__all__ = [
    "create_mcp_server",
    "current_workspace_id",
    "hosted_runtime_descriptor",
    "main",
]
