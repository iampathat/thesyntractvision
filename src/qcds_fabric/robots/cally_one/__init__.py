"""Cally.One Logical Robot.

Cally.One is a specialized manifested body above the shared QCDS / Syntract
core. The robot/product layer has its own Cally.One Tribute License and does
not inherit the QCDS core's MIT license merely by importing the core.
"""

from .robot import CallyOneService, run_cally_one, run_cally_one_json

__all__ = ["CallyOneService", "run_cally_one", "run_cally_one_json"]
