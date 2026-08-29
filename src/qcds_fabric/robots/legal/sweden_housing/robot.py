"""Stable entry point for the Swedish Housing Law Logical Robot.

The specialized robot is a body above the shared QCDS core. The public path
uses the full dual-substrate QCDS execution while retaining the older
assessment class under an explicit legacy name for regression comparison.
"""

from __future__ import annotations

import json

from ....legal_assessment_robot import (
    LegalAssessmentResult,
    LegalPraxisError,
    SwedishHousingAssessmentRobot as LegacySwedishHousingAssessmentRobot,
    load_legal_praxis,
)
from ....legal_logical_robot import (
    LegalLogicalRobotError,
    LegalRobotResult,
    SwedishHousingLegalRobot,
    load_legal_case,
    load_legal_corpus,
)
from .full_robot import SwedishHousingFullQCDSRobot, main


class SwedishHousingAssessmentRobot(SwedishHousingFullQCDSRobot):
    """Stable public class name backed by the full QCDS implementation."""


def run_case_json(payload_json: str) -> str:
    """Browser/transport bridge. Domain and QCDS semantics stay in Python."""
    payload = json.loads(payload_json)
    result = SwedishHousingAssessmentRobot().run_case(payload).as_dict()
    return json.dumps(result, ensure_ascii=False, sort_keys=True)


__all__ = [
    "LegacySwedishHousingAssessmentRobot",
    "LegalAssessmentResult",
    "LegalLogicalRobotError",
    "LegalPraxisError",
    "LegalRobotResult",
    "SwedishHousingAssessmentRobot",
    "SwedishHousingFullQCDSRobot",
    "SwedishHousingLegalRobot",
    "load_legal_case",
    "load_legal_corpus",
    "load_legal_praxis",
    "run_case_json",
    "main",
]
