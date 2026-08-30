from __future__ import annotations

from qcds_fabric.pick_a_world_core import CASES, build_pick_world_frame, run_pick_world_case


def test_pick_a_world_cases_are_real_joint_logical_spaces() -> None:
    for case_id in CASES:
        frame = build_pick_world_frame(case_id)
        result = run_pick_world_case(case_id)

        assert result["browser_pre_scoring"] is False
        assert result["worlds_are_logical_conditions"] is True
        assert result["core_execution"] == "qcds_fabric.problem.problem_to_syntract"
        assert result["logical_width"] == 12
        assert result["candidate_binary_space"] == "2^12"
        assert len(result["represented_worlds"]) == 4
        assert len(result["property_dimensions"]) == 4
        assert result["rule_count"] == 16
        assert len(frame.queries) == 5
        assert len(frame.rules) == 16
        assert result["syntract_binds_distribution"] is True
        assert result["single_world_forced_on_tie"] is False


def test_robotics_preserves_real_tie_without_forcing_one_world() -> None:
    result = run_pick_world_case("robotics")

    assert set(result["leading_candidates"]) == {"direct", "cautious"}
    assert result["world_binding"] is None
    assert result["binding_status"] == "unresolved_tie"
    rows = {row["value"]: row["probability"] for row in result["stabilized"]}
    assert abs(rows["direct"] - rows["cautious"]) <= 1e-12


def test_other_cases_do_not_all_return_the_same_world_or_distribution() -> None:
    results = [run_pick_world_case(case_id) for case_id in ("biology", "materials", "software")]
    leaders = [tuple(result["leading_candidates"]) for result in results]
    distributions = [tuple(round(row["probability"], 8) for row in result["stabilized"]) for result in results]

    assert len(set(leaders)) >= 2
    assert len(set(distributions)) >= 2
