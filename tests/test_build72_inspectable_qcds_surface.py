from qcds_fabric.living_robot_public import PUBLIC_BUILD, living_robot_public_html


def test_public_pick_world_surface_is_inspectable_and_explains_real_logic():
    html = living_robot_public_html(static_mode=True)

    assert int(PUBLIC_BUILD) >= 72
    assert "QCDS CORE · OPEN THE LOGICAL SPACE" in html
    assert "WORLD CONDITIONS" in html
    assert "PROPERTY SPACE" in html
    assert "LOGICAL SPACE" in html
    assert "ORACLE SPACE" in html
    assert "OPEN ↓" in html
    assert "q69Inspect" in html

    assert "24 active" not in html  # counts come from the runtime result, not hardcoded markup
    assert "result.oracle_summary" in html
    assert "result.logical_dimensions" in html
    assert "result.dimension_groups" in html
    assert "result.qcds_phases" in html
    assert "result.stabilized_world_distribution" in html


def test_oracle_view_explains_missing_evidence_and_tie_without_forcing_binding():
    html = living_robot_public_html(static_mode=True)

    assert "WHY THIS RUN ENDS WHERE IT DOES" in html
    assert "No evidence oracle resolves" in html
    assert "QCDS therefore preserves the tie instead of inventing a winner." in html
    assert "SINGLE WORLD · NOT BOUND" in html
    assert "TruthDistribution" in html


def test_qcds_view_shows_baseline_to_stabilized_run():
    html = living_robot_public_html(static_mode=True)

    assert "REPRESENT" in html
    assert "CONSTRAIN" in html
    assert "INFER" in html
    assert "BIND" in html
    assert "Before recursive inference" in html
    assert "After stabilization" in html
    assert "Truth alignment refuses a fake winner." in html
