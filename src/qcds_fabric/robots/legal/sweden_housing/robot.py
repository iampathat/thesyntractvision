"""Stable entry point for the Swedish Housing Law Logical Robot.

Domain-specific implementation is composed above the unchanged shared QCDS core.
"""

from ....legal_assessment_robot import (
    LegalAssessmentResult,
    LegalPraxisError,
    SwedishHousingAssessmentRobot,
    load_legal_praxis,
    main,
)
from ....legal_logical_robot import (
    LegalLogicalRobotError,
    LegalRobotResult,
    SwedishHousingLegalRobot,
    load_legal_case,
    load_legal_corpus,
)

__all__ = [
    "LegalAssessmentResult",
    "LegalLogicalRobotError",
    "LegalPraxisError",
    "LegalRobotResult",
    "SwedishHousingAssessmentRobot",
    "SwedishHousingLegalRobot",
    "load_legal_case",
    "load_legal_corpus",
    "load_legal_praxis",
    "main",
]
