import os
import sys

HERE = os.path.dirname(__file__)
LAB = os.path.dirname(HERE)
sys.path.insert(0, LAB)

from engine import (
    DEFAULT_HYPOTHESES,
    PARALLEL_LANES,
    QCDSCancerEngine,
    state_matches_mask,
)

ROOT = os.path.dirname(LAB)
FABRIC_SRC = os.path.join(ROOT, "qcds_fabric_4_2", "src")
sys.path.insert(0, FABRIC_SRC)

from qcds_fabric_4_2.grover import peak_iteration_count, run_grover


def test_canonical_grover_256_single_target_peak_is_12():
    assert peak_iteration_count(256, 1, max_iterations=40) == 12
    run = run_grover(256, {173}, max_iterations=40)
    assert run.iterations == 12
    assert run.marked_mass > 0.9999


def test_cancer_cycle_is_128_to_8_to_parent_grover():
    result = QCDSCancerEngine(max_cycles=1, min_cycles=1).run("????????", DEFAULT_HYPOTHESES)
    c = result.cycles[0]
    assert c.lane_count == PARALLEL_LANES == 128
    assert c.family_count == 8
    assert c.parent_iterations >= 0
    assert result.final_state


def test_fixed_input_bits_are_never_lost_globally():
    mask = "1111????"
    result = QCDSCancerEngine(max_cycles=2, min_cycles=2).run(mask, DEFAULT_HYPOTHESES)
    assert result.final_state.startswith("1111")
    assert all(state.startswith("1111") for state in result.final_distribution)
    assert all(state_matches_mask(sum(int(bit) << i for i, bit in enumerate(state)), mask) for state in result.final_distribution)


def test_partial_condition_keeps_all_sixteen_parent_states():
    result = QCDSCancerEngine(max_cycles=1, min_cycles=1).run("1111????", ())
    assert len(result.final_distribution) == 16
    assert abs(sum(result.final_distribution.values()) - 1.0) < 1e-12
    assert all(abs(p - 1 / 16) < 1e-12 for p in result.final_distribution.values())


def test_complete_logic_is_valid_condition():
    result = QCDSCancerEngine(max_cycles=1, min_cycles=1).run("01101001", DEFAULT_HYPOTHESES)
    assert result.final_state == "01101001"
    assert set(result.final_distribution) == {"01101001"}


def test_recursive_parent_structure_returns_as_oracle():
    result = QCDSCancerEngine(max_cycles=3, min_cycles=2).run("1111????", DEFAULT_HYPOTHESES)
    assert len(result.cycles) >= 2
    assert result.cycles[0].derived_logic
    assert result.cycles[1].lane_count == 128


if __name__ == "__main__":
    test_canonical_grover_256_single_target_peak_is_12()
    test_cancer_cycle_is_128_to_8_to_parent_grover()
    test_fixed_input_bits_are_never_lost_globally()
    test_partial_condition_keeps_all_sixteen_parent_states()
    test_complete_logic_is_valid_condition()
    test_recursive_parent_structure_returns_as_oracle()
    print("QCDS Cancer Python engine tests: PASS")
