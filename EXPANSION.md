# QCDS Fabric BUILD 8 — expansion (`1 → N`)

BUILD 8 implements the opposite direction of inference in the reference
package while leaving the locked **QCDS Fabric v1.0** canonical artifacts
unchanged.

## What `1` means

The `1` in `1 → N` is **one bound structure**, not necessarily one certain
binary state.

A Syntract may still carry uncertainty. BUILD 8 therefore holds the source as
its full `TruthDistribution` through a `DistributionOracle`:

```text
BOUND SYNTRACT
     ↓
full TruthDistribution
     ↓
DistributionOracle
     ↓
source dimensions retained as Conditions
```

No peak state is silently substituted for the bound distribution.

## Opening the expansion space

An `ExpansionSpec` declares explicit new binary dimensions. Those dimensions are
opened as wildcards:

```text
BOUND SOURCE DIMENSIONS  +  NEW EXPANSION DIMENSIONS
        [? ... ?]        +         [? ... ?]
                         ↓
                   combined 2^B space
```

The bound-source DistributionOracle and the supplied proposal/test oracle stack
are applied before the normal Fabric pass.

The reference compiler records both:

- the full joint candidate space `2^(source + expansion)`;
- the projected expansion space `2^(expansion)`.

An explicit `max_total_width` prevents accidental exponential simulator growth.

## Expansion is not hidden generation

BUILD 8 does **not** contain a free-form hypothesis generator, LLM prompt loop,
world model, or domain ontology generator.

The core accepts explicit expansion dimensions and explicit oracles. A later
semantic compiler may generate those inputs from a scientific question,
engineering mission, case file, or natural-language request without changing
the Fabric semantics.

This separation matters because it lets expansion itself be falsified without
confounding it with a text generator.

## Projection: joint state → expansion branches

The Fabric returns a joint `TruthDistribution` over source and expansion
coordinates. BUILD 8 marginalizes the source coordinates and preserves the
probability mass over the expansion coordinates:

```text
P(source, expansion)
        ↓ marginalize source
P(expansion)
```

Both projections are retained:

- `baseline_projection` — before rotational stabilization;
- `stabilized_projection` — after the configured Fabric diagnostics and
  stabilization.

Neither is a hard answer. Contradiction markers and provenance survive the
projection.

## Contracting an expansion again

`contract_expansion(...)` takes the stabilized expansion distribution and uses
it as a new DistributionOracle over the expansion dimensions. Validation
oracles can then test those branches through a normal Fabric pass:

```text
BOUND SYNTRACT
     ↓
EXPAND 1 → N
     ↓
PROPOSAL / TEST ORACLES
     ↓
P(expansion branches)
     ↓
VALIDATION ORACLES
     ↓
CONTRACT N → 1
     ↓
NEW BOUND SYNTRACT
```

The resulting Syntract still contains a distribution. `N → 1` denotes one
bound structure, not an obligatory one-state collapse.

`run_expansion_cycle(...)` provides this bounded reference cycle:

```text
BIND → EXPAND → TEST → CONTRACT → BIND
```

The resulting Syntract can later become the source of another expansion.

## Substrate independence

BUILD 8 uses `FabricLayer` and therefore works with any conforming
`InferenceSubstrate`, including:

- the classical reference kernel;
- the fixed-depth statevector/Grover simulator;
- the adaptive statevector/Grover simulator;
- future hardware adapters that preserve the same Fabric boundary.

Expansion itself does not claim quantum advantage.

## Claim boundary

An expansion branch means:

> this branch remains compatible to the degree reported by the current bound
> source, Conditions, oracle regime, substrate and stabilization policy.

It does **not** mean:

- the branch is externally true;
- the branch is novel;
- the branch is physically realizable unless physics/experiment oracles establish
  that;
- the branch is safe unless safety constraints establish that;
- the branch was autonomously invented by the Fabric core.

External validation remains separate.

## Main API

```python
ExpansionSpec(...)
compile_syntract_expansion(...)
run_syntract_expansion(...)
contract_expansion(...)
run_expansion_cycle(...)
```

---

**Architecture / theory:** Patrik Sundblom  
**Reference implementation assistance:** OpenAI ChatGPT  
**Software:** MIT
