from qcds_fabric.problem import ProblemQuery, SemanticProblemFrame
from qcds_fabric.semantic import SemanticClaim
from qcds_fabric.syntract_system import SyntractSystem


def _frame() -> SemanticProblemFrame:
    return SemanticProblemFrame(
        mission_id="build55-one-system",
        raw_text="Which represented color remains coherent?",
        queries=(ProblemQuery("q-color", "car", "color", ("red", "blue")),),
        claims=(
            SemanticClaim("car", "color", "red", "source:a", 0.9, True, "Source A says red"),
            SemanticClaim("car", "color", "blue", "source:b", 0.7, False, "Source B excludes blue"),
        ),
        analyzer_id="build55-test",
    )


def test_one_entrypoint_returns_truth_distribution_syntract_and_oracle_space() -> None:
    system = SyntractSystem(max_width=8)
    execution = system.run_frame(_frame())

    assert execution.mission_id == "build55-one-system"
    assert execution.logical_width == 2
    assert execution.truth_distribution is execution.syntract.bound_distribution
    assert execution.oracle_space.bundle is execution.compilation.bundle
    assert execution.oracle_space.oracle_stack is execution.compilation.oracle_stack
    assert execution.oracle_space.syntract_ids == (execution.syntract.syntract_id,)
    assert execution.provenance["single_qcds_architecture"] is True
    assert execution.provenance["qcds_core_replaced"] is False


def test_same_execution_can_be_mounted_and_run_by_existing_central_fabric() -> None:
    system = SyntractSystem(max_width=8)
    execution = system.run_frame(_frame(), universe_id="test-universe")
    mounted = system.mount(execution)

    assert mounted.universe_id == "test-universe"
    assert mounted.host_kind == "central"
    assert mounted.logical_contract_identity == execution.oracle_space.logical_contract_identity

    central = system.run_mounted(mounted.space_id)
    assert central.universe_id == "test-universe"
    assert central.oracle_stack_identity == execution.compilation.oracle_stack.identity
    assert central.suite.stabilized_return.stabilized_distribution.support
