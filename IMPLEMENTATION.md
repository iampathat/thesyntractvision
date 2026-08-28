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

Falsification / benchmark harness with matched architecture ablations, explicit
external synthetic targets, L1/KL and stability metrics, injected slot/oracle
bias, contradiction probes and oracle leave-one-out analysis. The full Fabric is
not declared the winner in advance.

See `BENCHMARKS.md`.

## BUILD 6 — merged

Explicit `InferenceSubstrate` separation, existing classical reference path,
bounded complex statevector/Grover simulator, simulator state guard and matched
cross-substrate benchmarking with no native-QPU or quantum-advantage claim.

See `SUBSTRATES.md`.

## BUILD 7 — merged

Bounded view-local empirical `m/m*` calibration for the statevector/Grover path,
including explicit `m=0`, first-local-maximum selection, overshoot detection,
per-view depth provenance and fixed-vs-adaptive benchmarking without leaking the
external target into depth selection.

See `GROVER_DEPTH.md`.

## BUILD 8 — expansion (`1 → N`)

Adds the opposite inference direction without hard-collapsing the bound source:

- one bound Syntract is compiled as a `DistributionOracle` rather than a forced
  binary state;
- explicit expansion dimensions are opened as `?` alongside the bound source;
- proposal/test oracles constrain the expanded Condition space;
- both baseline and stabilized joint distributions are marginalized onto the
  new expansion dimensions, yielding explicit compatible branch distributions;
- contradictions remain visible in the projected expansion result;
- expansion is substrate-neutral because it runs through the normal
  `FabricLayer`;
- a tested expansion can be contracted again through a distribution-oracle
  prior plus validation oracles and bound into a new Syntract;
- `run_expansion_cycle(...)` implements the bounded reference path
  `BIND → EXPAND → TEST → CONTRACT → BIND`;
- total logical width is explicitly bounded and dimension collisions fail
  closed;
- the implementation does **not** hide an unrestricted hypothesis generator or
  semantic compiler inside the Fabric core.

See `EXPANSION.md`.

## Not yet implemented

- native QPU adapter / hardware execution;
- production oracle governance and external-validation boundaries;
- domain-level semantic compiler from unrestricted human problems into
  Conditions/oracles/expansion dimensions;
- larger public benchmark corpora and statistically powered experiment runner;
- noise-aware calibration against real quantum hardware.

## Design rule

Every BUILD keeps diagnostic views separate from independent logical
dimensions, preserves uncertainty, and retains enough provenance to falsify the
implementation against the canonical specification.

A convergence signal is an internal stability observation, not by itself a
claim of external truth. A statevector simulation is not evidence of quantum
advantage. An internally selected Grover depth is not evidence that the selected
state is externally true. Expansion branches are candidate consequences or
mechanisms under stated Conditions/oracles; they are not automatically facts.
