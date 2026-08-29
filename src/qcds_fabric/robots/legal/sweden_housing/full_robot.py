from __future__ import annotations

import argparse
import json
from typing import Any, Mapping, Sequence

from qcds_fabric.legal_assessment_robot import (
    LegalAssessmentResult,
    LegalPraxisError,
    _mapping,
    _praxis_qcds_pass,
    load_legal_praxis,
)
from qcds_fabric.legal_logical_robot import (
    LegalLogicalRobotError,
    SwedishHousingLegalRobot,
    load_legal_case,
)

from .cached_full_qcds import run_cached_full_legal_qcds
from .evidence import LegalEvidenceError
from .qcds_space import LegalQCDSSpaceError


class SwedishHousingFullQCDSRobot:
    """Public Swedish housing robot using the full dual-substrate QCDS path."""

    def __init__(
        self,
        *,
        legal_robot: SwedishHousingLegalRobot | None = None,
        praxis: Mapping[str, Any] | None = None,
        grover_max_states: int = 4096,
        grover_max_iterations: int = 8,
    ) -> None:
        self.legal_robot = legal_robot or SwedishHousingLegalRobot()
        self.praxis = dict(praxis or load_legal_praxis())
        self.grover_max_states = grover_max_states
        self.grover_max_iterations = grover_max_iterations

    def run_case(self, case: Mapping[str, Any]) -> LegalAssessmentResult:
        statutory = self.legal_robot.run_case(case).as_dict()
        praxis_diagnostic = _praxis_qcds_pass(
            case_id=str(statutory["case_id"]),
            resolved_terms=tuple(str(value) for value in statutory["resolved_terms"]),
            praxis=self.praxis,
        )
        raw_evidence = case.get("qcds_evidence", ())
        if raw_evidence is None:
            raw_evidence = ()
        if not isinstance(raw_evidence, Sequence) or isinstance(raw_evidence, (str, bytes, bytearray)):
            raise LegalEvidenceError("qcds_evidence must be an array of evidence objects")

        integrated_qcds = run_cached_full_legal_qcds(
            case_id=str(statutory["case_id"]),
            case_terms=tuple(str(value) for value in statutory["case_terms"]),
            resolved_terms=tuple(str(value) for value in statutory["resolved_terms"]),
            unresolved_questions=tuple(str(value) for value in statutory["unresolved_questions"]),
            corpus=self.legal_robot.corpus,
            applied_rule_ids=tuple(str(value) for value in statutory["applied_rules"]),
            praxis=self.praxis,
            qcds_evidence=tuple(_mapping(value, "qcds_evidence[]") for value in raw_evidence),
            grover_max_states=self.grover_max_states,
            grover_max_iterations=self.grover_max_iterations,
        )

        swarm = {
            **dict(_mapping(statutory["swarm_packet"], "swarm_packet")),
            "syntract_id": integrated_qcds["canonical_final_syntract"],
            "qcds_space": integrated_qcds["candidate_binary_space"],
            "reference_substrate": integrated_qcds["canonical_final_reference_substrate"],
            "grover_emulation_status": integrated_qcds["dual_substrate"]["grover_emulated"]["status"],
        }
        payload = {
            **statutory,
            "statutory_regime_projection": statutory["qcds_core"],
            "qcds_core": integrated_qcds,
            "praxis_assessment": praxis_diagnostic,
            "swarm_packet": swarm,
            "assessment_model": {
                "hard_layer": "source-attributed statute, transition, scope and procedure become QCDS constraints; they do not install the final legal outcome",
                "assessment_layer": "open standards and evidence-sensitive propositions remain live dimensions with uncertainty-bearing oracle pressure",
                "praxis_layer": "active precedent dimensions enter the same final QCDS room through statutory Syntract re-entry",
                "condition_formation": "hard structural facts, probabilistic evidence terms and source-attributed rules define the bounded active room",
                "qcds_role": "execute the same logical contract through exact classical and Grover-emulated substrates, rotate/challenge it, stabilize the TruthDistribution and bind sibling Syntracts",
                "two_execution_variants": True,
                "classical_exact_is_reference": True,
                "grover_emulation_uses_same_bundle_and_oracles": True,
                "probabilistic_evidence_supported": True,
                "identical_full_runs_cached_without_changing_inference": True,
                "final_answer_is_qcds_distribution": True,
                "statutory_result_preserved": False,
                "statutory_constraints_preserved": True,
                "canonical_spec_modified": False,
            },
        }
        return LegalAssessmentResult(payload)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run Swedish housing law through exact and Grover-emulated QCDS and bind Legal Syntracts."
    )
    parser.add_argument("case", help="Path to a housing-law case JSON")
    parser.add_argument("--praxis", help="Optional alternate praxis JSON")
    parser.add_argument("--grover-max-states", type=int, default=4096)
    parser.add_argument("--grover-max-iterations", type=int, default=8)
    args = parser.parse_args(argv)
    try:
        robot = SwedishHousingFullQCDSRobot(
            praxis=load_legal_praxis(args.praxis) if args.praxis else None,
            grover_max_states=args.grover_max_states,
            grover_max_iterations=args.grover_max_iterations,
        )
        result = robot.run_case(load_legal_case(args.case))
    except (
        OSError,
        json.JSONDecodeError,
        LegalLogicalRobotError,
        LegalPraxisError,
        LegalEvidenceError,
        LegalQCDSSpaceError,
        ValueError,
    ) as exc:
        parser.error(str(exc))
        return 2
    print(json.dumps(result.as_dict(), ensure_ascii=False, indent=2, sort_keys=True))
    return 0


__all__ = ["SwedishHousingFullQCDSRobot", "main"]


if __name__ == "__main__":
    raise SystemExit(main())
