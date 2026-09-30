import argparse
import json

from engine import QCDSCancerEngine
from case_cancer import HYPOTHESES, OPEN_INPUT, PARTIAL_INPUT, COMPLETE_INPUT


def main() -> None:
    ap = argparse.ArgumentParser(description="Run QCDS Cancer Lab 128→8→1")
    ap.add_argument("--mask", default=OPEN_INPUT, help="8-symbol 0/1/? Condition")
    ap.add_argument("--cycles", type=int, default=4)
    ap.add_argument("--out", default="results_cancer_recursive.json")
    args = ap.parse_args()

    engine = QCDSCancerEngine(max_cycles=args.cycles)
    result = engine.run(args.mask, HYPOTHESES)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)

    print(f"Input Condition: {result.input_logic}")
    print(f"Final Parent-Grover state: {result.final_state}")
    print(f"Final Parent-Grover p: {result.final_probability:.9f}")
    print(f"Derived logic: {result.final_logic}")
    print(f"Cycles: {len(result.cycles)}")
    for cycle in result.cycles:
        print(
            f"  cycle {cycle.cycle}: lanes={cycle.lane_count}, "
            f"Grover m={cycle.grover_min}..{cycle.grover_max}, "
            f"Parent m={cycle.parent_iterations}, "
            f"Parent top={cycle.parent_top_state} p={cycle.parent_top_probability:.6f}"
        )
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
