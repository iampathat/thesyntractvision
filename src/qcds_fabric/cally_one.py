"""Compatibility import for Cally.One.

Canonical product implementation lives in qcds_fabric.robots.cally_one.robot.
"""

from __future__ import annotations

from .robots.cally_one.robot import CallyOneService, run_cally_one, run_cally_one_json

__all__ = ["CallyOneService", "run_cally_one", "run_cally_one_json"]
