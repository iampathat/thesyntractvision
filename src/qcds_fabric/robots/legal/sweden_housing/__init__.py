"""Swedish Housing Law Logical Robot.

This package is the stable domain namespace for the Swedish housing-law robot.
The public assessment robot uses the full dual-substrate QCDS path. Exports are
resolved lazily so domain submodules can use one another without import cycles.
"""

from __future__ import annotations

from typing import Any

__all__ = [
    "LegacySwedishHousingAssessmentRobot",
    "SwedishHousingAssessmentRobot",
    "SwedishHousingFullQCDSRobot",
    "SwedishHousingLegalRobot",
]


def __getattr__(name: str) -> Any:
    if name in {"SwedishHousingAssessmentRobot", "SwedishHousingFullQCDSRobot"}:
        from .full_robot import SwedishHousingFullQCDSRobot

        return SwedishHousingFullQCDSRobot
    if name == "LegacySwedishHousingAssessmentRobot":
        from ....legal_assessment_robot import SwedishHousingAssessmentRobot

        return SwedishHousingAssessmentRobot
    if name == "SwedishHousingLegalRobot":
        from ....legal_logical_robot import SwedishHousingLegalRobot

        return SwedishHousingLegalRobot
    raise AttributeError(name)
