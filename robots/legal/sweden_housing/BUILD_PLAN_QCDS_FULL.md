# Full QCDS Legal Build Plan

This file tracks the implementation sequence for the Swedish Housing Law Logical Robot. Build history stays here rather than in the root README.

## Goal

Make the legal robot a reference implementation of the same QCDS logical universe across two execution substrates:

1. **CLASSICAL EXACT** — exact enumeration of the active `2^N` legal state space.
2. **QUANTUM EMULATED** — statevector + phase-oracle marking + Grover-style amplification + rotations, using the same `BaseBundle` and `OracleStack` contract.

Both paths must bind a `TruthDistribution` into a Syntract. Neither path may precompute the legal answer outside QCDS.

The root README is **not frozen**. It should be complemented whenever these additions materially change the architecture readers need to understand. It must describe the resulting architecture, not narrate Build A/B/C history.

## Build sequence

- **Build A — Dual substrate execution**: shared legal runtime, exact classical and Grover-emulated passes, substrate provenance, side-by-side result comparison.
- **Build B — Probabilistic evidence**: case facts/evidence may carry explicit confidence; hard law stays hard; evidence becomes source-attributed probabilistic oracle pressure.
- **Build C — Integrated final Syntract**: statutory Syntract re-entry + active praxis + probabilistic evidence in one final QCDS space.
- **Build D — Scaling**: deterministic Condition Formation, bounded exact partitions, parallel/sequential/hybrid partition execution, Syntract re-entry across partitions; never silently truncate an active logical space.
- **Build E — Benchmark suite**: exact vs Grover-emulated comparisons for hard-law, ambiguous, contradictory, recovery and praxis-conflict cases.
- **Build F — Public surface + architecture documentation**: expose substrate, state-space size, Grover depth, oracle pressure, uncertainty and Syntract provenance; complement the root README with the resulting canonical architecture.

## Non-negotiable boundaries

- Do not move QCDS semantics into UI, JavaScript or the Legal Robot body.
- Do not create a second legal reasoning core.
- Grover, rotations, `2^N`, parallel/sequential/hybrid execution and Syntract re-entry remain visible.
- Hard structural facts may be fixed during Condition Formation; legal outcomes, assessment dimensions and precedent relevance remain live QCDS dimensions.
- Classical exact is a reference substrate, not the definition of QCDS.
- Quantum-emulated and future native-quantum execution consume the same logical contract.
- Probabilities must retain provenance and must not be mislabeled as calibrated court-outcome probabilities unless empirically calibrated.
