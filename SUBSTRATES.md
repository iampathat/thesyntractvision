# QCDS Fabric — substrate interface

BUILD 6 separated the **QCDS Fabric architecture** from the **local execution
substrate** in code. BUILD 7 adds bounded adaptive Grover-depth calibration on
top of that interface.

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

The bounded classical reference kernel scores candidate states directly,
applies its configured numerical amplification power, normalizes the result and
returns a `TruthDistribution`.

Substrate identity:

```text
classical
```

### Fixed-depth statevector / Grover reference simulator

`StatevectorGroverSubstrate`

The adapter performs complex-amplitude statevector evolution in software:

1. enumerate the bounded logical support;
2. initialize equal amplitudes;
3. evaluate the same active `OracleStack`;
4. map non-negative oracle score to phase;
5. apply phase marking;
6. apply inversion-about-the-mean diffusion;
7. repeat for explicit Grover depth `m`;
8. convert amplitudes to probabilities;
9. return the normal QCDS `TruthDistribution`.

The reference phase policy is:

```text
phi(state) = phase_scale × score(state) / max_score_in_view
```

with `phase_scale = pi` by default.

`m = 0` is an explicit unamplified statevector control. Positive values perform
mark+diffuse iterations.

The weighting policy is an implementation choice. It is not added to the locked
canonical v1.0 specification.

Substrate identity:

```text
statevector_grover_simulator
```

### Adaptive statevector / Grover simulator

`AdaptiveGroverSubstrate`

BUILD 7 wraps the same fixed-depth simulator in a bounded, view-local search for
an empirical `m*`.

Substrate identity:

```text
statevector_grover_adaptive_simulator
```

The selector uses internal oracle/distribution information only. External
benchmark targets are not available to depth selection.

See [`GROVER_DEPTH.md`](GROVER_DEPTH.md).

## Null semantics remain logical

No substrate implementation invents a third qubit value for `∅`.

A null dimension remains absent from the current logical inference view.
Statevector execution evolves amplitudes only over the candidate support
generated for that view. Oracle applicability and marginalization remain the
source of truth for absence semantics.

## Matched substrate benchmark

`run_substrate_benchmark(...)` holds fixed:

- `BaseBundle` / Conditions;
- active `OracleStack`;
- selected rotation families;
- stabilizer;
- external synthetic benchmark target.

It then compares multiple local substrates under the same Fabric topology.

The report explicitly records:

```text
superiority_assumed = False
quantum_advantage_claim = False
```

## Grover-depth benchmark

`run_grover_depth_benchmark(...)` compares fixed `m` values with the adaptive
view-local policy. The external target is used only after internal selection for
post-hoc evaluation.

This makes it possible to observe overshoot and to test whether adaptive depth
actually improves a case rather than assuming it does.

## What these simulators do not claim

They do **not** claim:

- native QPU execution;
- quantum query advantage;
- computational speedup over the classical reference kernel;
- superiority of Grover-style amplification for every oracle regime;
- that a high output probability is external truth;
- that the current adaptive depth policy is optimal.

Those questions require separate empirical tests and, for quantum advantage,
native quantum execution under a comparable problem/oracle model.

## Future substrate adapters

The interface is intended to admit:

- alternative numerical statevector engines;
- GPU/HPC implementations;
- circuit simulators;
- NISQ QPUs;
- future fault-tolerant QPUs;
- FPGA / specialized accelerators;
- hybrid execution.

A future adapter must preserve canonical logical semantics at the Fabric
boundary. Physical amplitude/phase operations remain distinct from architectural
dimension, position and oracle rotations.

---

**Architecture / theory:** Patrik Sundblom  
**Reference implementation assistance:** OpenAI ChatGPT  
**Software:** MIT
