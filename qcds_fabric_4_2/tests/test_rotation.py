from qcds_fabric_4_2.rotation import RotationalIngressCell


def test_eight_way_bank_is_balanced_and_truly_excluded():
    dims = tuple("ABCDEFGH")
    cell = RotationalIngressCell(dims)
    views = cell.build_bank()
    assert len(views) == 8
    assert {v.excluded_dimension for v in views} == set(dims)
    for view in views:
        assert len(view.active_dimensions) == 7
        assert view.excluded_dimension not in view.active_dimensions
        assert view.state_count == 128


def test_bank_rotation_moves_semantics_without_changing_identity():
    cell = RotationalIngressCell(tuple("ABCDEFGH"))
    bank0 = cell.build_bank(0)
    bank1 = cell.build_bank(1)
    assert bank0[0].semantic_to_position["A"] != bank1[0].semantic_to_position["A"]
    assert bank0[0].canonical_dimensions == bank1[0].canonical_dimensions


def test_targeted_second_order_exclusion_is_real_absence():
    cell = RotationalIngressCell(tuple("ABCDEFGH"))
    view = cell.build_targeted_view(("B", "F"), bank_id=2, view_id="B-F")
    assert set(view.excluded_dimensions) == {"B", "F"}
    assert "B" not in view.active_dimensions and "F" not in view.active_dimensions
    assert view.state_count == 64
