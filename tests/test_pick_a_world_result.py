from qcds_fabric.living_robot_invite38 import living_robot_invite38_html


def test_pick_a_world_renders_one_result_path_only():
    html = living_robot_invite38_html(static_mode=True)
    script = html.rsplit("<script>", 1)[-1]

    assert "quick38(result,compiled)" in script
    assert "renderSessionResult(result);quick38" not in script
    assert "one Pick a World TruthDistribution is shown" in script


def test_pick_a_world_does_not_present_diagnostics_as_second_answer():
    html = living_robot_invite38_html(static_mode=True)
    script = html.rsplit("<script>", 1)[-1]

    assert "TruthDistribution mass" in script
    assert "Null/rotation diagnostics remain in Advanced" in script
    assert "not shown as a second answer" in script
    assert "robustness shift" not in script
    assert "STABILIZED LEADER" not in script
    assert "After robustness testing" not in script


def test_pick_a_world_oracles_are_translated_from_question_logic():
    html = living_robot_invite38_html(static_mode=True)
    script = html.rsplit("<script>", 1)[-1]

    assert "q38Compile(seed)" in script
    assert "translator:emulated-oracles:" in script
    assert "do not assign candidate probabilities directly" in script
    assert "question/material → translator → Logical Space → emulated oracle filters → QCDS four phases → TruthDistribution → Syntract" in script
