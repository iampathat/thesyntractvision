from qcds_fabric.pick_a_world_core import run_pick_world_case


def test_robotics_exposes_real_dimensions_and_oracle_groups():
    result = run_pick_world_case("robotics")

    assert result["logical_width"] == 12
    assert result["raw_state_count"] == 4096
    assert len(result["logical_dimensions"]) == 12
    assert result["logical_dimensions"][:4] == [
        "world=direct",
        "world=cautious",
        "world=reroute",
        "world=stop",
    ]

    groups = {group["group"]: group for group in result["dimension_groups"]}
    assert groups["world"]["bit_count"] == 4
    assert groups["deadline"]["values"] == ["tight", "loose"]

    summary = result["oracle_summary"]
    assert summary == {"total": 24, "structural": 5, "evidence": 3, "logical": 16}
    assert len(result["oracle_groups"]["structural"]) == 5
    assert len(result["oracle_groups"]["evidence"]) == 3
    assert len(result["oracle_groups"]["logical"]) == 16

    assert len(result["qcds_phases"]) == 4
    assert result["qcds_phases"][0]["name"] == "Condition Formation"
    assert result["qcds_phases"][3]["name"] == "Truth-Alignment Verification"


def test_tie_remains_unbound_while_inspection_retains_distribution():
    result = run_pick_world_case("robotics")

    assert set(result["leading_candidates"]) == {"direct", "cautious"}
    assert result["world_binding"] is None
    assert result["binding_status"] == "unresolved_tie"
    assert result["syntract_binds_distribution"] is True
    assert result["stabilized_world_distribution"] == result["stabilized"]
