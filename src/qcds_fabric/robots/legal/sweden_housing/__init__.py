"""Swedish Housing Law Logical Robot.

This package is the stable domain namespace for the Swedish housing-law robot.
The robot remains a specialized body above the shared QCDS / Syntract core.

Exports are resolved lazily so domain submodules can use one another without
creating an import cycle through the public facade.
"""

from __future__ import annotations

from typing import Any

__all__ = ["SwedishHousingAssessmentRobot", "SwedishHousingLegalRobot"]


def __getattr__(name: str) -> Any:
    if name == "SwedishHousingAssessmentRobot":
        from ....legal_assessment_robot import SwedishHousingAssessmentRobot

        return SwedishHousingAssessmentRobot
    if name == "SwedishHousingLegalRobot":
        from ....legal_logical_robot import SwedishHousingLegalRobot

        return SwedishHousingLegalRobot
    raise AttributeError(name)
