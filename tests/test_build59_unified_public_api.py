import inspect

import qcds_fabric
import qcds_fabric.syntract_system as unified


def test_syntract_system_is_available_as_the_top_level_composition_api() -> None:
    assert qcds_fabric.SyntractSystem is unified.SyntractSystem
    assert qcds_fabric.SyntractMission is unified.SyntractMission
    assert qcds_fabric.SyntractExecution is unified.SyntractExecution
    assert qcds_fabric.SyntractRobotCycle is unified.SyntractRobotCycle


def test_unified_system_delegates_instead_of_reimplementing_qcds_theory() -> None:
    source = inspect.getsource(unified)

    # Existing architecture boundaries must remain the engines behind the facade.
    for delegated_symbol in (
        "problem_to_syntract",
        "run_problem_compilation",
        "bind_problem_result",
        "SuperintelligenceRuntime",
        "CentralQCDSFabric",
        "plan_swarm_frontier",
        "run_swarm_reentry",
    ):
        assert delegated_symbol in source

    # The facade must not grow a second local inference kernel/oracle scorer.
    assert "class ClassicalInferenceKernel" not in source
    assert "class StatevectorGroverSubstrate" not in source
    assert "def score(" not in source
    assert "def run_stabilized_rotation_suite(" not in source
    assert "def bind_problem_result(" not in source
