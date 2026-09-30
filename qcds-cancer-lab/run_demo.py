import argparse
import json
from engine import KernelConfig, QCDSCancerEngine
from case_cancer import open_cancer_syntract, complete_logic_syntract

def main():
    ap = argparse.ArgumentParser(description="QCDS recursive cancer research engine")
    ap.add_argument("--complete", action="store_true", help="use complete 01101001 logic instead of open ???????? logic")
    ap.add_argument("--shots", type=int, default=4096)
    ap.add_argument("--branches", type=int, default=128)
    ap.add_argument("--depth", type=int, default=4)
    ap.add_argument("--out", default="results_cancer_recursive.json")
    args = ap.parse_args()

    syntract = complete_logic_syntract() if args.complete else open_cancer_syntract()
    engine = QCDSCancerEngine(
        KernelConfig(shots=args.shots),
        parallel_branches=args.branches,
        funnel_width=8,
        recursion_depth=args.depth,
    )
    result = engine.run(syntract)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)

    print(f"Syntract: {result.syntract_name}")
    print(f"Final logic: {result.final_logic}")
    print(f"Final top state: {result.final_state}  p={result.final_p:.6f}")
    print("\nRounds:")
    for r in result.rounds:
        strongest = sorted(r.dimension_influence.items(), key=lambda kv: kv[1], reverse=True)[:3]
        print(f"  d{r.depth}: {r.input_logic} ({r.state_count} compatible states) -> {r.derived_logic}; top={r.consensus_top} p={r.consensus_p:.4f}")
        print("     strongest dimension influence:", ", ".join(f"{k}={v:.3f}" for k,v in strongest))
    print(f"\nWrote {args.out}")

if __name__ == "__main__":
    main()
