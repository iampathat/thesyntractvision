from dataclasses import dataclass

from qcds_fabric.intelligence_store import CsvIntelligenceStore
from qcds_fabric.logical_robot import LogicalObservation, LogicalRobotToolResult
from qcds_fabric.oracle_evolution import (
    OracleChallengeSuite,
    OracleEvolutionConfig,
    challenge_case_from_problem,
)
from qcds_fabric.oracle_genesis import OracleFailureObservation, OracleGapDiscoveryConfig
from qcds_fabric.problem import ProblemQuery, SemanticProblemFrame, compile_problem_frame
from qcds_fabric.semantic import SemanticClaim
from qcds_fabric.syntract_system import SyntractSystem


def _scene(color: str = "red", *, mission_id: str = "build58") -> SemanticProblemFrame:
    return SemanticProblemFrame(
        mission_id=mission_id,
        raw_text="structured scene",
        queries=(
            ProblemQuery("car-color", "car", "color", ("red", "blue")),
            ProblemQuery("driver", "driver", "identity", ("alice", "bob")),
        ),
        claims=(SemanticClaim("car", "color", color, f"camera:{color}", 0.95),),
        analyzer_id="build58-test",
    )


def _challenge_suite() -> OracleChallengeSuite:
    red = compile_problem_frame(_scene("red", mission_id="build58-red"))
    blue = compile_problem_frame(_scene("blue", mission_id="build58-blue"))
    return OracleChallengeSuite(
        "build58-generalization",
        (
            challenge_case_from_problem(
                red,
                population_oracle_ids=(),
                expected_assignments={"car-color": "red", "driver": "alice"},
                case_id="red-alice",
                role="selection",
            ),
            challenge_case_from_problem(
                blue,
                population_oracle_ids=(),
                expected_assignments={"car-color": "blue", "driver": "bob"},
                case_id="blue-bob",
                role="holdout",
            ),
        ),
    )


@dataclass
class DriverTool:
    tool_id: str = "driver-source"
    capabilities: tuple[str, ...] = ("search",)

    def observe(self, request):
        return LogicalRobotToolResult(
            observations=(
                LogicalObservation(
                    observation_id="driver-observation",
                    query_id=request.query_ids[0],
                    observed_value="alice",
                    source_id="independent:driver-source",
                    capability=request.capability,
                    confidence=0.91,
                ),
            )
        )


def test_one_system_closes_qcds_plan_robot_evidence_qcds_syntract_loop(tmp_path) -> None:
    system = SyntractSystem(max_width=8)
    mission = system.mission(CsvIntelligenceStore(tmp_path))
    mission.create(_scene())

    cycle = mission.run_robot_once(
        "build58",
        _challenge_suite(),
        (DriverTool(),),
        observations=(
            OracleFailureObservation(
                "driver-failed",
                "prediction_failure",
                query_ids=("driver",),
                severity=1.0,
            ),
        ),
        discovery_config=OracleGapDiscoveryConfig(
            include_contradiction_resolution=False,
            include_null_influence=False,
        ),
        evolution_config=OracleEvolutionConfig(
            evaluation_mode="baseline",
            max_generations=1,
            min_selection_mean_l1_improvement=10.0,
        ),
    )

    assert cycle.robot is not None
    assert cycle.evidence_result_count == 1
    assert cycle.state.evidence_count == 1
    assert cycle.execution.syntract.bound_distribution.support
    assert cycle.execution.provenance["single_qcds_architecture"] is True
    assert cycle.runtime_result.followup_step is not None
