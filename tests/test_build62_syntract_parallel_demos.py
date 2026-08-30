import pytest

from qcds_fabric.syntract_parallel_demos import DEMO_SPECS, run_syntract_demo


@pytest.mark.parametrize(
    ("demo_id", "branch_count", "width"),
    (
        ("biomedicine", 5, 10),
        ("investigation", 6, 12),
        ("robotics", 5, 10),
    ),
)
def test_parallel_syntract_capability_demos_run_through_qcds(demo_id, branch_count, width):
    result = run_syntract_demo(demo_id)
    assert result["parallel_branch_count"] == branch_count
    assert result["joint_logical_width"] == width
    assert result["candidate_binary_space"] == f"2^{width}"
    assert len(result["components"]) == branch_count
    assert len(result["top_world"]) == branch_count
    assert result["higher_order_syntract_id"] == f"syntract:demo:{demo_id}:higher-order"
    assert result["hard_collapse"] is False
    assert result["majority_vote"] is False
    assert result["new_inference_engine"] is False
    assert result["external_truth_claim"] is False
    assert "parallel QCDS branches" in result["execution_path"]


def test_demo_catalog_is_exactly_the_three_requested_parallel_compositions():
    assert tuple(DEMO_SPECS) == ("biomedicine", "investigation", "robotics")
    assert [component.label for component in DEMO_SPECS["biomedicine"].components] == [
        "DNA Syntract", "Protein Syntract", "Cell Syntract", "Patient Syntract", "Drug Syntract"
    ]
    assert [component.label for component in DEMO_SPECS["investigation"].components] == [
        "Person Syntract", "Phone-data Syntract", "Car Syntract", "Camera Syntract", "Timeline Syntract", "Witness Syntract"
    ]
    assert [component.label for component in DEMO_SPECS["robotics"].components] == [
        "Robot Syntract", "Environment Syntract", "Mission Syntract", "Safety-rule Syntract", "People Syntract"
    ]
