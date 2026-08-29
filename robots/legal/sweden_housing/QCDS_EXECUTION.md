# QCDS execution — Swedish Housing Law

The Swedish Housing Law Logical Robot is a specialized body above the shared QCDS / Syntract architecture. It does **not** use QCDS as a label after a conventional rules engine has already decided the legal answer.

The legal universe is represented logically, and the execution semantics are deliberately split into three modes so classical resource limits can never be mistaken for the native quantum target.

## One architecture, three execution modes

```text
FULL REPRESENTED LEGAL UNIVERSE
Jordabalk 12 kap. + private-letting law + transition + praxis + evidence
                              │
                              ▼
                         QCDS CONDITIONS
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼
 CLASSICAL EXACT       GROVER EMULATED      QUANTUM FULL SPACE
 reference emulator    software statevector   native-QPU target
 resource bounded      resource bounded       NO semantic prefilter
 active projection     active projection      full represented universe
 exact 2^N support     Grover / phase         relevance emerges in QCDS
          │                   │                    │
          └──────────────┬────┘                    │
                         ▼                         │
                 TruthDistribution                │
                         ▼                         │
                      Syntract                     │
                                                   ▼
                                      future native QPU execution
```

### Mode 1 — Classical Exact

`classical_exact` is the reproducible reference emulator.

Classical resources are finite, so **Condition Formation may project the full represented legal universe into a smaller active room**. That is an emulator concession. Once the active `BaseBundle` is formed, the classical reference enumerates its complete `2^N` support and does not silently delete candidate states inside that room.

```text
full represented law
        ↓
resource-aware classical Condition Formation
        ↓
active room
        ↓
exact 2^N enumeration
```

### Mode 2 — Grover Emulated

`grover_emulated` executes the same active `BaseBundle + OracleStack` through the software statevector/Grover substrate.

It uses:

- equal superposition over the active support;
- score-derived weighted phase marking;
- inversion about the mean;
- adaptive Grover depth;
- QCDS rotation/stabilization.

This mode is still **software emulation**, so a memory/state-count bound is legitimate. Exact separable components may be executed separately when the oracle dependency graph proves separability. A coupled oversized component is never arbitrarily chunked and called equivalent to one global Grover operation.

### Mode 3 — Quantum Full Space

`quantum_full_space` is the native-QPU target contract.

This mode has a different and stricter rule:

> **Represented logical dimensions may not be removed merely to satisfy classical memory or state-count limits.**

The target is not:

```text
full law
  ↓
classical relevance filter
  ↓
small quantum problem
```

The target is:

```text
FULL REPRESENTED LOGICAL UNIVERSE
        │
        ├── statute
        ├── transition rules
        ├── exceptions
        ├── open legal standards
        ├── praxis
        ├── case facts
        ├── disputed facts
        ├── evidence
        └── represented legal relationships
        │
        ▼
   quantum representation / superposition
        │
        ▼
      Conditions
        │
        ▼
       oracles
        │
        ▼
 Grover / amplitude evolution
        │
        ▼
 recursive QCDS inference
        │
        ▼
 relevance / coherent structure emerges
        │
        ▼
      SYNTRACT
```

A physical QPU backend is **not connected in the current reference build**, so this mode reports `target_contract_only`. The software must not pretend Grover statevector emulation is native quantum execution.

## Full-universe manifest

The quantum target now has a separate manifest built independently of the classical active-case projection.

The manifest includes:

- every represented regime candidate;
- every represented rule antecedent;
- every represented rule consequence;
- every represented rule ID;
- every represented precedent dimension;
- represented precedent factors / statutory links;
- case terms;
- unresolved case questions;
- probabilistic evidence terms.

The manifest exposes:

```text
full_universe_dimension_count
represented_rule_count
represented_precedent_count
manifest_sha256
```

and is explicitly marked:

```text
classical_active_projection = false
semantic_prefiltering = false
```

This lets tests and future QPU adapters distinguish the **complete represented legal universe** from the bounded active room used by current emulators.

## The preliminary legal resolver is Condition Formation, not the answer

The legal body still contains deterministic, source-attributed machinery. In the current emulators its role includes resource-aware Condition Formation.

It may fix things structurally known for the run:

```text
contract date = known
residential tenancy = known
consent exists = known
statutory snapshot = known
```

It must not pre-install live legal outcomes:

```text
primary regime = ?
forfeiture consequence = ?
recovery consequence = ?
reasonableness assessment = ?
precedent relevance = ?
```

A consequence such as:

```text
conclusion:jb12_forfeiture_ground_late_residential_rent
```

remains a live QCDS dimension. The source-attributed Jordabalk rule is an oracle constraint over candidate states.

For the native quantum target, Condition Formation must be understood more broadly: it may **mark, bind, transform or condition** the represented universe, but it may not delete dimensions simply because a classical machine would struggle to materialize them.

## Probabilistic legal evidence

Not every legally important proposition is a hard case fact.

The case format supports `qcds_evidence`:

```json
{
  "qcds_evidence": [
    {
      "term": "sublet:independent_without_consent",
      "confidence": 0.74,
      "polarity": true,
      "source_id": "evidence:occupancy-pattern"
    }
  ]
}
```

An evidence-backed term may activate a relevant statutory relation in the emulator without being set to true.

```text
independent use @ 0.74
        ↓
term remains ?
        ↓
EvidenceOracle
        ↓
weighted QCDS pressure
```

The distinction remains:

```text
hard law ≠ uncertain fact
uncertain fact ≠ hard true/false
confidence ≠ calibrated court-outcome probability
```

## CSV is storage, not intelligence

Current classical execution can serialize the active legal table to CSV and reload it in memory:

```text
represented legal corpus
        ↓
classical Condition Formation
        ↓
active CSV projection
        ↓
RAM
        ↓
BaseBundle + OracleStack
        ↓
QCDS
```

The CSV decides nothing. It is a transparent implementation backend for the emulator. **The quantum architecture is not defined by CSV projection.**

## What `2^N` means in the emulators

If the current active emulation room contains `N` live binary dimensions, Classical Exact enumerates exactly:

```text
2^N candidate states
```

Known structural dimensions do not branch. `?` dimensions do.

For a future native quantum substrate, the architectural goal is not to classically enumerate those `2^N` rows first. The represented dimensions are encoded in the quantum state and acted on through conditions/oracles/amplitude evolution subject to physical measurement limits.

## The four canonical QCDS phases

### 1. Condition Formation — Superposition

**Emulation:** may use resource-aware projection to create a bounded active room.

**Quantum Full Space:** the complete represented logical universe remains represented; Conditions shape the state rather than semantically deleting dimensions for memory convenience.

### 2. Conditional Evolution — Constraint / Oracle

Hard statutory rules become legal constraint oracles. Probabilistic evidence becomes soft evidence-oracle pressure. Praxis remains a distinct source class.

### 3. Recursive Inference — Amplification / Recursion

Classical Exact performs full candidate-state evaluation inside its active room.

Grover Emulated performs software statevector phase/amplitude evolution inside the same active room.

Quantum Full Space targets native quantum execution where oracle interaction and amplitude evolution can operate over the full represented universe without first materializing every candidate row classically.

### 4. Truth-Alignment Verification — Syntract Binding

Rotated / evolved distributions are stabilized and bound:

```text
TruthDistribution
      ↓
   Syntract
```

The preliminary resolver is not the truth object.

## Statutory Syntract re-entry and praxis

The statutory distribution can re-enter a later QCDS pass through `DistributionOracle`:

```text
STATUTORY SYNTRACT
        ↓
DistributionOracle
        +
praxis
        +
similarity / counter-evidence
        +
case evidence
        ↓
QCDS again
        ↓
FINAL LEGAL SYNTRACT
```

In current emulation only explicitly activated precedent dimensions enter the bounded active room.

In Quantum Full Space the **entire represented praxis layer remains represented in the target universe**; relevance is not required to be classically decided first.

## Scaling: emulation vs quantum target

The rule is deliberately different for the two worlds.

### Resource-bounded emulation

Allowed:

- bounded active projection during Condition Formation;
- exact `2^N` execution of that active room;
- exact separable parallel components;
- declared sequential / hybrid Syntract re-entry;
- larger software substrate when required.

Not allowed:

- silently dropping dimensions *inside* the declared active room;
- pretending arbitrary chunks are globally Grover-equivalent.

### Quantum Full Space

Allowed:

- the complete represented universe;
- native oracle/amplitude operations;
- parallel / sequential / hybrid decomposition **only when the decomposition itself preserves the full QCDS semantics**;
- Syntract re-entry / recursive composition that preserves represented information.

Not allowed:

- classically removing dimensions merely because they appear irrelevant;
- classically pruning the universe to fit RAM and calling that native QCDS quantum execution.

This distinction applies beyond law. DNA is the same architectural class of problem: a classically inconvenient dimension can still be the dimension whose relation becomes decisive under the global oracle structure.

## Exact vs Grover benchmark

The legal robot compares Classical Exact and Grover Emulated on the same active logical contract.

Metrics include:

- support size;
- entropy;
- oracle agreement;
- retained uncertainty;
- selected Grover depth;
- total-variation distance;
- maximum probability delta;
- top-state agreement;
- conflict markers.

Grover emulation is allowed to lose. The purpose is falsifiable substrate comparison, not confirmation.

Quantum Full Space is not included in numerical substrate comparisons until a genuine compatible native backend is connected.

## Implementation map

```text
src/qcds_fabric/robots/legal/sweden_housing/
├── qcds_space.py          bounded active legal BaseBundle / OracleStack / Syntract
├── execution.py           Classical Exact, Grover Emulated, Quantum Full Space contracts
├── quantum_full_space.py  complete represented-universe manifest for native target
├── evidence.py            probabilistic legal evidence
├── full_qcds.py           integrated three-mode orchestration
├── cached_full_qcds.py    identical-run cache only; no inference shortcut
├── scaling.py             oracle-component scaling / parallel emulation
├── comparison.py          distribution comparison
├── benchmark.py           exact-vs-Grover emulator benchmark
├── full_robot.py          public specialized robot body
└── robot.py               stable public facade
```

Shared core classes remain shared; the legal robot does not contain a second QCDS implementation.

## Claim boundary

The current implementation now establishes a falsifiable distinction between:

- bounded Classical Exact reference execution;
- bounded Grover/statevector emulation;
- a non-executed **Quantum Full Space** target contract that forbids semantic prefiltering and records the complete represented legal universe.

It does **not** claim a physical QPU is connected, that the full universe has been executed natively, that quantum advantage has been demonstrated, that court outcomes are calibrated probabilities, or that Swedish law coverage is complete.
