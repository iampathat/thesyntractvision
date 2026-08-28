# QCDS Fabric BUILD 7 — adaptive Grover depth

BUILD 7 introduces a bounded empirical policy for the Grover-style amplification
depth `m` used by the statevector reference substrate.

The locked **QCDS Fabric v1.0** specification already exposes `m / m*` as a
compile/substrate parameter. BUILD 7 implements one falsifiable reference policy
for choosing it. The canonical specification itself is unchanged.

## Why depth needs calibration

Grover amplification is oscillatory. More iterations are not monotonically
better.

For a simple binary-marking problem a target peak can rise, reach a useful
maximum, then fall again if amplification continues. Therefore a fixed global
depth is a poor default for a Fabric in which different diagnostic views may
have different support sizes and different effective marked fractions.

A baseline view and a dimension-null view can legitimately require different
depths even though they belong to the same logical comparison bank.

## Explicit control: `m = 0`

`StatevectorGroverSubstrate(iterations=0)` is the unamplified statevector
control:

```text
equal superposition
        ↓
no mark/diffuse iteration
        ↓
uniform probability over represented support
```

It exists so depth experiments have a real no-amplification reference.

## Adaptive policy

`select_grover_depth(...)` evaluates increasing bounded depths.

For each trial it records:

- Grover iteration count;
- full `TruthDistribution`;
- expected normalized oracle score;
- oracle agreement;
- peak probability;
- entropy.

The selection objective is:

```text
E[ normalized oracle score ]
```

The search chooses the best value reached before the first configured overshoot
signal. With the default `overshoot_patience = 1`, a clear decline below the
best-so-far objective ends the search.

This is intentionally a **first-local-maximum policy**, not a scan for a later
periodic recurrence.

## What `m*` means here

BUILD 7 uses two distinct notions:

1. **Empirical `m*`** — the depth selected from the internal trial sequence.
2. **Binary theoretical `m*` diagnostic** — when the oracle score profile is
   genuinely binary (`0` versus one positive marked score) and the phase scale is
   `pi`, the implementation reports the textbook Grover estimate from the
   represented marked fraction.

The theoretical value is diagnostic. Weighted/graded oracle profiles do not get
mislabelled with a binary theoretical `m*`.

## View-local depth

`AdaptiveGroverSubstrate` implements the normal `InferenceSubstrate` contract:

```text
ChannelView + OracleStack
          ↓
bounded depth search
          ↓
select empirical m*
          ↓
TruthDistribution
```

Because Fabric invokes the substrate independently for each execution view,
different views may select different depths.

Example shape:

```text
baseline 8-state view      → m* = 2
null b0 4-state view       → m* = 1
null b1 4-state view       → m* = 1
null b2 4-state view       → m* = 1
```

Those numbers are case-dependent, not QCDS constants.

## No benchmark leakage

The adaptive selector does **not** receive an external benchmark target.

`run_grover_depth_benchmark(...)` deliberately separates two stages:

```text
INTERNAL SELECTION
Conditions + OracleStack → adaptive m*
                    |
                    | no target access
                    v
POST-HOC EVALUATION
external target → compare fixed m and adaptive result
```

The report can therefore show that:

- adaptive `m*` matches the externally best tested fixed depth;
- a different fixed depth is better;
- amplification does not help;
- a weighted oracle profile behaves differently from textbook binary Grover.

All are valid outcomes.

## Provenance

Adaptive output records at least:

- selected Grover iterations;
- depth search policy;
- trial count;
- stop reason;
- whether overshoot was detected;
- internal objective and selected objective value;
- binary theoretical `m*` when applicable;
- `external_target_used_for_depth_selection = False`;
- simulator / no-quantum-advantage claim boundary.

## Claim boundary

BUILD 7 does not claim:

- that adaptive depth proves external truth;
- that the internal objective is universally optimal;
- that Grover amplification helps every oracle regime;
- that statevector simulation provides quantum speedup;
- that the current depth policy is the final QPU calibration policy.

It provides a bounded, inspectable and falsifiable implementation that can be
replaced or challenged by later policies without changing the QCDS Fabric v1.0
architecture.

---

**Architecture / theory:** Patrik Sundblom  
**Reference implementation assistance:** OpenAI ChatGPT  
**Software:** MIT
