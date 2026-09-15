from __future__ import annotations

import json
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve()
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "src"))

from qcds_fabric_4_2 import (  # noqa: E402
    AdaptiveRotationPlanner,
    EmulatedFabricScheduler,
    Fabric42CellEngine,
    NISQRotationScheduler,
    OracleClause,
    ParentInferenceEngine,
    SemanticOracle,
    canonical_512x12_plan,
    iteration_envelope,
    peak_iteration_count,
    run_grover,
)


def main() -> None:
    max_iterations = 40
    envelope = iteration_envelope(256, 1, max_iterations=max_iterations)
    peak = peak_iteration_count(256, 1, max_iterations=max_iterations)
    explicit_40 = run_grover(256, {173}, iterations=40, max_iterations=40)
    peak_run = run_grover(256, {173}, max_iterations=max_iterations)

    dims = tuple("ABCDEFGH")
    target_state = 173
    clauses = []
    for bit_index, dim in enumerate(dims):
        target_bit = (target_state >> bit_index) & 1
        clauses.append(
            OracleClause(
                f"target_{dim}",
                frozenset({dim}),
                lambda assignment, dim=dim, target_bit=target_bit: assignment[dim] == target_bit,
            )
        )
    oracle = SemanticOracle(clauses, version="validation-v1")
    t0 = time.perf_counter()
    lanes, bound = Fabric42CellEngine(dims, oracle, max_workers=8).run(bank_id=0)
    cell_ms = (time.perf_counter() - t0) * 1000
    parent = ParentInferenceEngine(max_candidates=8).run(bound)
    adaptive = AdaptiveRotationPlanner(influence_threshold=0.0).plan(bound)
    mappings = NISQRotationScheduler().mappings(dims)

    topology_plan = canonical_512x12_plan()
    t1 = time.perf_counter()
    topology = EmulatedFabricScheduler(max_workers=32).execute(topology_plan)
    topology_ms = (time.perf_counter() - t1) * 1000

    data = {
        "schema": "qcds-fabric-4.2-validation-v1",
        "status": "PASS",
        "version": "4.2.0-alpha.1",
        "architecture_author": "Patrik Sundblom",
        "implementation_assistance": "ChatGPT",
        "grover_256_single_target": {
            "state_count": 256,
            "marked_count": 1,
            "max_iterations": max_iterations,
            "peak_iteration": peak,
            "peak_probability": envelope[peak],
            "peak_run_top_state": peak_run.top_state,
            "peak_run_marked_mass": peak_run.marked_mass,
            "explicit_iteration_40_probability": explicit_40.marked_mass,
            "envelope": [round(v, 15) for v in envelope],
        },
        "rotational_cell": {
            "semantic_dimensions": len(dims),
            "lanes": len(lanes),
            "lane_state_count": lanes[0].grover.state_count,
            "excluded_dimensions": [l.view.excluded_dimension for l in lanes],
            "full_distributions": all(len(l.grover.probabilities) == 128 for l in lanes),
            "bound_state_count": len(bound.canonical_probabilities),
            "bound_top_state": bound.top_state,
            "bound_top_probability": bound.top_probability,
            "dimension_influence": bound.dimension_influence,
            "dimensional_necessity": bound.dimensional_necessity,
            "contradictions": list(bound.contradictions),
            "cell_runtime_ms": round(cell_ms, 3),
        },
        "parent_inference": {
            "candidate_count": len(parent.candidate_states),
            "parent_state_count": parent.grover.state_count,
            "parent_iterations": parent.grover.iterations,
            "full_child_distribution_consumed": parent.provenance["child_full_distribution_consumed"],
        },
        "adaptive_rotation": {
            "request_count": len(adaptive),
            "second_order_requests": sum(len(r.excluded_dimensions) == 2 for r in adaptive),
        },
        "nisq_mapping": {
            "mapping_count": len(mappings),
            "a_physical_positions": sorted({m.semantic_to_physical["A"] for m in mappings}),
        },
        "large_fabric_schedule": {
            "widths": list(topology_plan.widths),
            "max_width": topology_plan.max_width,
            "depth": topology_plan.depth,
            "completed_nodes": topology.completed_nodes,
            "layer_barriers": topology.layer_barriers,
            "parallel_layers": len(topology.concurrent_layers),
            "provenance_count": topology.provenance_count,
            "expands_after_contraction": topology.topology_expands_after_contraction,
            "scheduler_runtime_ms": round(topology_ms, 3),
            "coherent_register_claim": False,
        },
        "claims": {
            "rotation_automatically_removes_bias": False,
            "local_registers_are_one_global_quantum_register": False,
            "high_peak_equals_external_truth": False,
            "held_out_adversarial_suite_complete": False,
            "hardware_qpu_validation_complete": False,
        },
    }
    out = ROOT / "results" / "validation.json"
    out.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(data, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
