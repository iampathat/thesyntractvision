"""Swedish Housing Law Logical Robot.

This package is the stable domain namespace for the Swedish housing-law robot.
The robot remains a specialized body above the shared QCDS / Syntract core.
"""

from ....legal_assessment_robot import SwedishHousingAssessmentRobot
from ....legal_logical_robot import SwedishHousingLegalRobot

__all__ = ["SwedishHousingAssessmentRobot", "SwedishHousingLegalRobot"]
