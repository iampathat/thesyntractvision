# QCDS Fabric implementation status

This code tree is a software implementation companion to the locked
**QCDS Fabric v1.0 canonical specification**. It does not modify the canonical
specification.

**Architecture / theory:** Patrik Sundblom  
**Reference implementation assistance:** OpenAI ChatGPT  
**Software license:** MIT (repository license)

## BUILD 0 — merged

Core data structures, strict `0` / `?` / `∅` separation, exact/mask oracles,
versioned oracle stacks, bounded classical TruthDistribution inference,
explicit contradiction state, full dimension-null bank, transparent null
stabilization, and canonical logical-space accounting.

## BUILD 1 — merged

Positional rotation, oracle-exposure rotation, crossed rotations, canonical
position mapping, fail-closed oracle-stack validation, absence-aware oracle
normalization, rotation diagnostics, and full transformation provenance.

## BUILD 2 — merged

Family-aware stabilization across null/position/oracle/crossed views with
explicit equal-family weighting, plus a provenance-preserving serial contraction
funnel that binds stabilized returns without hard collapse.

## BUILD 3 — merged

Bounded recursive re-entry. `DistributionOracle` carries a full
uncertainty-bearing TruthDistribution into a later Condition space, logical
`∅` is handled by marginalization, bound leaves are namespaced, and the normal
Fabric path can execute again without inventing a binary label for the prior
result.

## BUILD 4 — merged

Automated bounded orchestration of local Fabric passes, stabilization,
contraction funnel, distribution-oracle re-entry, vector convergence
diagnostics, repeated cycles, full trace and final Syntract binding.
Convergence remains an internal stability observation, not an external truth
claim.

## BUILD 5 — merged

Falsification / benchmark harness:

- matched architecture ablations;
- explicit external synthetic targets;
- L1/KL, entropy, agreement, peak and contradiction metrics;
- execution-slot and oracle-exposure fault injection;
- dimension-null contradiction localization;
- oracle leave-one-out analysis;
- no predeclared winner and no automatic oracle retirement.

See `BENCHMARKS.md`.

## BUILD 6 — merged

Substrate separation:

- explicit `InferenceSubstrate` contract;
- existing classical reference substrate;
- bounded complex statevector/Grover simulator;
- fixed Grover iteration depth;
- simulator state-count guard;
- same Fabric topology across classical and statevector paths;
- matched substrate benchmarking;
- explicit no-QPU / no-quantum-advantage claim boundary.

See `SUBSTRATES.md`.

## BUILD 7 — adaptive Grover depth

Adds bounded, view-local empirical `m/m*` calibration for the statevector/Grover
reference path:

- `m=0` is now an explicit unamplified statevector control;
- `GroverDepthConfig` bounds the search;
- `select_grover_depth(...)` walks depth upward and selects the first internal
  objective maximum before detected overshoot;
- the internal objective is expected normalized oracle score;
- `AdaptiveGroverSubstrate` may choose a different depth for each baseline,
  null, positional, oracle-exposure, or crossed view;
- textbook binary-marking `m*` is exposed as a diagnostic when applicable, not
  as a universal policy;
- `run_grover_depth_benchmark(...)` compares fixed depths with adaptive depth
  under an external target that is **not available to the adaptive selector**;
- every chosen depth, trial count, stop reason and overshoot signal is retained
  in provenance.

See `GROVER_DEPTH.md`.

## Not yet implemented

- expansion (`1 → N`);
- native QPU adapter / hardware execution;
- production oracle governance and external-validation boundaries;
- domain-level semantic compiler from unrestricted human problems into
  Conditions/oracles;
- larger public benchmark corpora and statistically powered experiment runner;
- noise-aware calibration against real quantum hardware.

## Design rule

Every BUILD keeps diagnostic views separate from independent logical
dimensions, preserves uncertainty, and retains enough provenance to falsify the
implementation against the canonical specification.

A convergence signal is an internal stability observation, not by itself a
claim of external truth. A statevector simulation is not evidence of quantum
advantage. An internally selected Grover depth is not evidence that the selected
state is externally true.
