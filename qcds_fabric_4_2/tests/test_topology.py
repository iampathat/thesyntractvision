from qcds_fabric_4_2.topology import EmulatedFabricScheduler, canonical_512x12_plan


def test_512x12_dynamic_topology_preserves_width_depth_and_expansion():
    plan = canonical_512x12_plan()
    assert plan.max_width == 512
    assert plan.depth == 12
    assert plan.expands_after_contraction is True
    result = EmulatedFabricScheduler(max_workers=16).execute(plan)
    assert result.completed_nodes == sum(plan.widths)
    assert result.provenance_count == sum(plan.widths)
    assert result.layer_barriers == 11
    assert 0 in result.concurrent_layers
    assert result.topology_expands_after_contraction is True
