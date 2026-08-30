from qcds_fabric.living_robot_invite38 import living_robot_invite38_html


def test_pick_a_world_renders_one_result_path_only():
    html = living_robot_invite38_html(static_mode=True)
    script = html.rsplit("<script>", 1)[-1]

    assert "quick38(result)" in script
    assert "renderSessionResult(result);quick38(result)" not in script
    assert "one Pick a World result is shown" in script


def test_pick_a_world_does_not_present_candidate_nulling_as_second_answer():
    html = living_robot_invite38_html(static_mode=True)
    script = html.rsplit("<script>", 1)[-1]

    assert "oracle-filtered mass" in script
    assert "independent null dimensions" in script
    assert "Nulling one of them removes part of the question" in script
    assert "robustness shift" not in script
    assert "STABILIZED LEADER" not in script
    assert "After robustness testing" not in script
