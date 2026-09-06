"""MCP transport for the host-neutral QCDS runtime.

This is a backend/runtime protocol, not a user-facing Logical Robot UI.  A
Logical Robot may call it from its RESOLVE port.  The server owns no domain
state and exposes no alternate inference path.
"""

from __future__ import annotations

from typing import Any

from .hosted_runtime import HostedQCDSRuntime


def create_hosted_runtime_mcp(runtime: HostedQCDSRuntime):
    """Expose one already-composed HostedQCDSRuntime through MCP 2.x."""
    try:
        from mcp.server.mcpserver import MCPServer
    except ImportError as exc:  # pragma: no cover - optional deployment dependency
        raise RuntimeError("MCP support is not installed. Install qcds-fabric[chatgpt].") from exc

    mcp = MCPServer("QCDS Hosted Runtime · Patrik Sundblom")

    @mcp.tool()
    def describe_runtime() -> dict[str, Any]:
        """Return runtime contract, attribution and registered Logical Robots."""
        return runtime.descriptor()

    @mcp.tool()
    def resolve_logical_robot(robot_id: str, problem: dict[str, Any]) -> dict[str, Any]:
        """Resolve one robot-formed problem through the single hosted QCDS/SyntractSystem."""
        return runtime.resolve(robot_id, problem)

    return mcp


__all__ = ["create_hosted_runtime_mcp"]
