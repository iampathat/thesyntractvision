"""Cally.One ChatGPT Logical Robot.

This package is a forked manifestation of the Cally.One calendar projection for
ChatGPT / Apps SDK / MCP work.  Calendar Space remains canonical represented
state and QCDS/Syntract remains the sole inference boundary.

Cally.One Tribute License 1.0 — see LICENSE.md in this package.
"""

# Install machine/API languages into the canonical dimension registry before
# the runtime creates Calendar Space. External APIs remain adapters around the
# shared domain contract rather than becoming separate calendar models.
from . import machine_language_dimensions as _machine_language_dimensions
from .chatgpt_bridge import (
    CHATGPT_PROJECTION,
    CHATGPT_ROBOT_ID,
    CHATGPT_ROBOT_LABEL,
    ChatGPTLogicalRobot,
    ChatGPTWorkspaceRouter,
)
from .runtime_v3 import CallyOneService, run_cally_one, run_cally_one_json

__all__ = [
    "CHATGPT_PROJECTION",
    "CHATGPT_ROBOT_ID",
    "CHATGPT_ROBOT_LABEL",
    "CallyOneService",
    "ChatGPTLogicalRobot",
    "ChatGPTWorkspaceRouter",
    "run_cally_one",
    "run_cally_one_json",
]
