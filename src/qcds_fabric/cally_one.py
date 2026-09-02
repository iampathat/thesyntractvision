"""Compatibility import for Cally.One.

Canonical public product runtime lives in qcds_fabric.robots.cally_one.runtime_v2.
The shared QCDS/Syntract core remains the inference engine beneath it.
"""

from __future__ import annotations

from .robots.cally_one.runtime_v2 import CallyOneService, run_cally_one, run_cally_one_json

__all__ = ["CallyOneService", "run_cally_one", "run_cally_one_json"]
