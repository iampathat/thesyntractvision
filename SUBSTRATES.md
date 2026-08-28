# QCDS Fabric BUILD 6 — substrate interface

BUILD 6 separates the **QCDS Fabric architecture** from the **local execution substrate** in code.

The canonical QCDS Fabric v1.0 specification remains unchanged.

## Contract

A local substrate implements the minimal `InferenceSubstrate` contract:

```text
ChannelView + OracleStack
          ↓
   local substrate
          ↓
 TruthDistribution
```

The surrounding Fabric topology does not change when the substrate changes:

```text
same Conditions
same oracle regime
same null / position / oracle rotations
same stabilization
same recursive funnel
same binding
```

Only the local inference mechanism is exchanged.

## Implemented substrates

### Classical reference

`ClassicalInferenceKernel`

The existing bounded classical reference kernel scores candidate states directly,
applies the configured numerical amplification power, normalizes the result and
returns a `TruthDistribution`.

Its substrate identity is:

```text
classical
```

### Statevector / Grover reference simulator

`StatevectorGroverSubstrate`

The BUILD 6 adapter performs actual complex-amplitude statevector evolution in
software:

1. enumerate the bounded logical support for the current `ChannelView`;
2. initialize equal amplitudes over that support;
3. evaluate the same active `OracleStack` used by the classical reference path;
4. map the non-negative oracle score in the current view to a phase;
5. apply phase marking;
6. apply inversion-about-the-mean diffusion;
7. repeat for the explicitly configured Grover iteration count;
8. convert final amplitudes to probabilities;
9. return the normal QCDS `TruthDistribution`.

The current reference phase policy is:

```text
phi(state) = phase_scale × score(state) / max_score_in_view
```

with:

```text
phase_scale = pi
```

by default.

That weighting policy is an **implementation choice for the BUILD 6 reference
simulator**. It is not added to the locked canonical v1.0 specification.

The simulator is intentionally bounded by `max_states` so a classical
statevector run cannot accidentally allocate an unbounded `2^B` array.

Its substrate identity is:

```text
statevector_grover_simulator
```

## Null semantics remain logical

BUILD 6 does not invent a third qubit value for `∅`.

A null dimension remains absent from the current logical inference view.
The statevector adapter evolves amplitudes only over the candidate support
generated for that view. Existing oracle applicability and marginalization rules
therefore remain the source of truth for absence semantics.

## What BUILD 6 does not claim

A statevector simulator is still classical software.

BUILD 6 does **not** claim:

- native QPU execution;
- quantum query advantage;
- computational speedup over the classical reference kernel;
- superiority of Grover-style amplification for every oracle regime;
- that a high output probability is external truth.

Those questions require separate empirical tests and, for quantum advantage,
native quantum execution under a comparable problem/oracle model.

## Matched substrate benchmark

`run_substrate_benchmark(...)` holds the following fixed:

- `BaseBundle` / Conditions;
- active `OracleStack`;
- selected rotation families;
- stabilizer;
- external synthetic benchmark target.

It then runs the same Fabric topology across two or more substrate variants and
reports:

- baseline metrics against the external target;
- stabilized metrics against the external target;
- pairwise L1 distance between substrate baseline distributions;
- pairwise L1 distance between substrate stabilized distributions;
- which variant has the smallest stabilized L1 error for that benchmark case.

The report explicitly records:

```text
superiority_assumed = False
quantum_advantage_claim = False
```

If the classical reference path outperforms the statevector adapter, that is a
valid result. If the statevector adapter outperforms the classical path, that is
also only a benchmark result until replicated and explained.

## Future substrate adapters

The interface is intended to admit later adapters for:

- alternative numerical statevector engines;
- GPU/HPC implementations;
- circuit simulators;
- NISQ QPUs;
- future fault-tolerant QPUs;
- FPGA / specialized accelerators;
- hybrid execution.

A future adapter must preserve the canonical logical semantics at the Fabric
boundary. Physical amplitude/phase operations inside a QPU remain distinct from
architectural dimension, position and oracle rotations.

---

**Architecture / theory:** Patrik Sundblom  
**Reference implementation assistance:** OpenAI ChatGPT  
**Software:** MIT
