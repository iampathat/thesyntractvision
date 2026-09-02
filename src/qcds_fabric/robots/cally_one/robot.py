"""Canonical entry point for the Cally.One Logical Robot.

Cally.One is a product/body above the shared QCDS / Syntract core. Calendar
state, event-oracle construction and presentation belong to the robot layer;
the inference engine remains the shared SyntractSystem/QCDS core.
"""

from __future__ import annotations

from ...cally_one import CallyOneService, run_cally_one, run_cally_one_json

__all__ = ["CallyOneService", "run_cally_one", "run_cally_one_json"]
