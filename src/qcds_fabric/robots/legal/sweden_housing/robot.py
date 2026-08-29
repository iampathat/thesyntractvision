"""Stable entry point for the Swedish Housing Law Logical Robot.

Domain-specific implementation is composed above the unchanged shared QCDS core.
"""

from __future__ import annotations

import json

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


def run_case_json(payload_json: str) -> str:
    """Browser/transport bridge. Domain and QCDS semantics stay in Python."""
    payload = json.loads(payload_json)
    result = SwedishHousingAssessmentRobot().run_case(payload).as_dict()
    return json.dumps(result, ensure_ascii=False, sort_keys=True)


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
    "run_case_json",
    "main",
]
