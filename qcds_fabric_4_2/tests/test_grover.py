from qcds_fabric_4_2.grover import iteration_envelope, peak_iteration_count, run_grover


def test_256_single_target_peak_is_not_three():
    k = peak_iteration_count(256, 1, max_iterations=40)
    assert 11 <= k <= 13
    assert k > 3


def test_256_single_target_extended_40_iteration_envelope():
    envelope = iteration_envelope(256, 1, max_iterations=40)
    assert len(envelope) == 41
    assert max(range(len(envelope)), key=envelope.__getitem__) == peak_iteration_count(256, 1, max_iterations=40)
    assert envelope[-1] >= 0.0


def test_single_target_reaches_near_unit_mass():
    run = run_grover(256, {173}, max_iterations=40)
    assert run.top_state == 173
    assert run.marked_mass > 0.99
    assert run.iterations > 3


def test_no_marks_remains_uniform_and_visible():
    run = run_grover(128, set())
    assert run.iterations == 0
    assert run.marked_mass == 0.0
    assert abs(run.top_probability - 1 / 128) < 1e-12
