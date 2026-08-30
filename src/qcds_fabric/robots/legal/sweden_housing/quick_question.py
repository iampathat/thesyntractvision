from __future__ import annotations

import json
from typing import Any, Mapping

from qcds_fabric.legal_logical_robot import SwedishHousingLegalRobot

from .question_ingress import translate_legal_question


def run_public_question(case: Mapping[str, Any]) -> dict[str, Any]:
    """Fast public legal question path above the unchanged QCDS core.

    The public RUN QUESTION button must not invoke the full praxis + dual-substrate
    research pass. This bounded path still performs the intended architecture:
    question/material -> translator -> represented legal Logical Space ->
    statutory/legal filters -> canonical QCDS regime pass -> Syntract.
    """

    translated_case, ingress = translate_legal_question(case)
    result = SwedishHousingLegalRobot().run_case(translated_case).as_dict()

    ingress_payload = dict(ingress.as_dict())
    ingress_payload.update(
        {
            "translated_case_terms": list(result.get("case_terms", ())),
            "activated_rule_ids": list(result.get("applied_rules", ())),
            "path": "question/material -> translator -> Logical Space -> oracle filters -> QCDS four phases -> TruthDistribution -> Syntract",
        }
    )

    return {
        **result,
        "question_ingress": ingress_payload,
        "public_execution_profile": "bounded_legal_question",
        "full_praxis_pass_executed": False,
        "full_dual_substrate_pass_executed": False,
        "canonical_qcds_core_modified": False,
    }


def run_public_question_json(payload_json: str) -> str:
    payload = json.loads(payload_json)
    if not isinstance(payload, Mapping):
        raise ValueError("legal question payload must be an object")
    return json.dumps(run_public_question(payload), ensure_ascii=False, sort_keys=True)


__all__ = ["run_public_question", "run_public_question_json"]
