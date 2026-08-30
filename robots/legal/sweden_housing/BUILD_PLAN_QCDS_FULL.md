# Full QCDS Legal Build Plan

This file tracks the implementation sequence for the Swedish Housing Law Logical Robot. Build history stays here rather than in the root README.

## Goal

Make the legal robot a reference implementation of one QCDS logical architecture across three explicit execution modes:

1. **CLASSICAL EXACT** — exact enumeration of the active resource-bounded `2^N` legal state space.
2. **GROVER EMULATED** — statevector + phase-oracle marking + Grover-style amplification + rotations over the same active `BaseBundle` and `OracleStack` contract.
3. **QUANTUM FULL SPACE** — native-QPU target contract over the full represented legal universe, where semantic prefiltering for classical memory is forbidden.

The software modes may project/decompose for finite classical resources. The Quantum Full Space target may not remove represented logical dimensions merely because they appear irrelevant or are inconvenient to emulate.

Logic remains manifested through oracles / emulated oracles. All inference paths remain subordinate to the canonical QCDS four phases and bind a `TruthDistribution` into a Syntract. No preliminary legal resolver may precompute the final legal answer and install it as QCDS truth.

The root README is not a build diary. It may be complemented when architecture changes materially, but existing architecture diagrams and the canonical four-phase QCDS description must not be removed or rewritten by build bookkeeping.

## Completed legal full-QCDS sequence

- [x] **Build A — Multi-substrate execution**: shared legal runtime, exact classical and Grover-emulated passes, substrate provenance and side-by-side comparison.
- [x] **Build B — Probabilistic evidence**: source-attributed confidence becomes oracle pressure while hard law remains hard and disputed facts remain live dimensions.
- [x] **Build C — Integrated final Syntract**: statutory Syntract re-entry + active praxis + probabilistic evidence in the final QCDS space.
- [x] **Build D — Scaling**: explicit exact-state bounds, separability analysis, parallel/sequential/hybrid planning and no silent active-space truncation.
- [x] **Build E — Benchmark suite**: Classical Exact vs Grover-emulated comparison without assuming the Grover simulator must numerically reproduce classical weighting or win.
- [x] **Build F — Public surface + documentation**: public legal robot exposes state-space size, substrate mode, Grover depth, uncertainty, evidence, Syntract provenance and Quantum Full Space target boundaries.
- [x] **Quantum Full Space extension**: separate full-universe manifest and complete `BaseBundle + OracleStack` target contract, no classical candidate-state materialization, no semantic prefiltering, no fake native-QPU claim.

## Builds 41–44 around the same core

These builds extend execution topology without modifying QCDS itself:

- [x] **Build 41 — Architecture/regression hardening**: four-phase and README-diagram guardrails, stale CI cleanup, safe exact-classical rotation reuse, deterministic sharded full regression.
- [x] **Build 42 — Oracle-space topology and transport**: the same oracle-manifested Logical Universe may be hosted in a browser/session, external runtime or central host and transferred with universe identity/provenance preserved. Transfer does not promote truth.
- [x] **Build 43 — QCDS-driven swarm intelligence**: QCDS uncertainty selects bounded swarm frontier work; robot evidence/falsification/verification returns as oracle manifestations and re-enters the same QCDS Fabric. No majority-vote intelligence layer.
- [x] **Build 44 — Central high-capacity QCDS Fabric**: multiple oracle spaces can execute through the same Fabric in parallel; compatible sequential stages use `DistributionOracle` re-entry; hybrid execution runs sequential lanes concurrently. No silent universe merge or invented semantic mapping.

## Non-negotiable boundaries

- The canonical QCDS phases remain: **Condition Formation → Conditional Evolution → Recursive Inference → Truth-Alignment / Syntract Binding**.
- Do not move QCDS semantics into UI, JavaScript, swarm coordination, host infrastructure or the Legal Robot body.
- **Logical Robot does not contain QCDS. Logical Robot talks to QCDS.**
- Logic is represented/manifested through **oracles or emulated oracles**; central/session/external topology does not redefine the logic.
- Do not create a second legal reasoning core or a second swarm intelligence core.
- Grover, rotations, `2^N`, parallel/sequential/hybrid execution and Syntract re-entry remain visible.
- Hard structural case facts may be fixed during Condition Formation; legal outcomes, assessment dimensions and precedent relevance remain live QCDS dimensions where represented.
- Classical Exact is a reference substrate, not the definition of QCDS.
- Classical/Grover emulation may be resource-bounded; **Quantum Full Space may not semantically prefilter the represented universe for resource convenience**.
- Probabilities retain provenance and are not labeled calibrated court-outcome probabilities unless empirically calibrated.
- Native QPU execution and quantum advantage are not claimed by the current software build.
