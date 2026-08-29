# QCDS execution — Swedish Housing Law

The Swedish Housing Law Logical Robot is a specialized body above the shared QCDS / Syntract architecture. It does **not** use QCDS as a label after a conventional rules engine has already decided the legal answer.

The active legal space itself is the QCDS space.

## One logical contract, two execution substrates

The current legal robot can execute the same active `BaseBundle` and the same `OracleStack` through two reference substrates:

```text
FULL REPRESENTED LEGAL UNIVERSE
Jordabalk 12 kap. + private-letting law + transition + praxis
                              │
                              ▼
                            CASE
                              │
                              ▼
                    CONDITION FORMATION
                              │
        hard structural facts + relevant dimensions
        + source-attributed legal constraints
        + probabilistic evidence terms
                              │
                              ▼
                   IN-MEMORY CSV TABLE
                fixed structure = 1 / live = ?
                              │
                              ▼
                    BaseBundle + OracleStack
                              │
              SAME LOGICAL CONTRACT
                              │
             ┌────────────────┴────────────────┐
             │                                 │
             ▼                                 ▼
      CLASSICAL EXACT                 GROVER EMULATED
      exact 2^N support               software statevector
      oracle weighting                equal superposition
      QCDS rotations                  weighted phase marking
      stabilization                   adaptive Grover m*
             │                        mark + diffuse
             │                        QCDS rotations
             │                                 │
             ▼                                 ▼
      TruthDistribution                 TruthDistribution
             │                                 │
             ▼                                 ▼
   reference Legal Syntract           sibling Grover Syntract
```

**Classical Exact** is the reproducible reference emulator for the current legal robot. **Grover Emulated** is a software quantum-statevector execution of the same logical problem. It does not claim native-QPU execution or quantum advantage.

A future native quantum substrate should consume the same `BaseBundle + OracleStack` boundary rather than redefine the legal robot or QCDS semantics.

## The preliminary legal resolver is Condition Formation, not the answer

The legal body still contains deterministic, source-attributed machinery. Its role is to identify reachable statutory structure and make the legal path inspectable.

It may fix things that are structurally known for the run:

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

remains a live QCDS dimension. The source-attributed Jordabalk rule is an oracle constraint over candidate states. A candidate state that violates a hard applicable rule loses coherence under that oracle.

```text
legal resolver
    = forms the active source-attributed problem

QCDS
    = evaluates the represented candidate space
      and binds the stabilized TruthDistribution as Syntract
```

## Probabilistic legal evidence

Not every legally important proposition is a hard case fact.

The public legal case format therefore supports `qcds_evidence`:

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

An evidence-backed term can activate a relevant statutory constraint during Condition Formation **without being set to true**.

```text
represented evidence: independent use @ 0.74
                    │
                    ▼
relevant section 39 / 42 rule enters active room
                    │
                    ▼
independent use remains ?
                    │
                    ▼
EvidenceOracle applies 0.74 pressure inside QCDS
```

This distinction is essential:

```text
hard law ≠ uncertain fact
uncertain fact ≠ hard false/true
confidence ≠ calibrated court-outcome probability
```

Multiple supporting and opposing evidence items can coexist as separate source-attributed oracle pressure. A strong, contradiction-free case can concentrate near 100%; an ambiguous case can retain a broad distribution.

The resulting percentages describe probability mass / coherence **inside the represented QCDS universe under the supplied oracle semantics**. They are not automatically empirical probabilities of how a real court will decide until separately calibrated against real outcomes.

## CSV is storage, not intelligence

The active legal table is serialized to CSV and reloaded entirely in memory before execution:

```text
large represented legal corpus
        ↓
Condition Formation
        ↓
active CSV projection
        ↓
RAM
        ↓
BaseBundle + OracleStack
        ↓
QCDS
```

The CSV decides nothing. It is a transparent and cheap tabular substrate for the active projection.

Each Syntract records the SHA-256 digest of the active CSV projection so the exact represented table behind a run is inspectable.

## What `2^N` means

If the active room contains `N` live binary dimensions, Classical Exact enumerates exactly:

```text
2^N candidate states
```

Known structural dimensions do not branch. `?` dimensions do.

Example:

```text
known: residential tenancy               = 1
known: rent > seven days late            = 1

live: primary regime                     = ?
live: forfeiture ground                  = ?
live: section 44 recovery                = ?
live: procedural discriminator           = ?

4 live dimensions
→ 2^4 = 16 states
```

The legal runtime exposes:

- logical width;
- number of live dimensions;
- `2^N` candidate-space notation;
- actual candidate-state count;
- oracle count;
- baseline and stabilized marginals;
- entropy and retained uncertainty;
- rotation sensitivity;
- top coherent legal states;
- evidence provenance;
- statutory and final Syntract IDs;
- execution substrate and Grover depth where applicable.

## The four canonical QCDS phases

### 1. Condition Formation — Superposition

The case activates only legal dimensions and constraints that can matter to the represented problem. Hard structural facts can be fixed. Legal outcomes, assessment states and evidence-sensitive propositions remain live.

### 2. Conditional Evolution — Constraint / Oracle

Hard statutory rules become legal constraint oracles.

A source rule:

```text
A + B + C → D
```

is evaluated against candidate states. If `A`, `B` and `C` hold, a state violating `D` is incoherent under the hard oracle.

Probabilistic evidence uses `EvidenceOracle` rather than converting uncertain evidence into hard law or hard fact.

Praxis remains a separate epistemic source class; precedent is never installed as statute.

### 3. Recursive Inference — Amplification / Recursion

Both execution profiles use the shared QCDS Fabric rotation/stabilization boundary.

**Classical Exact** enumerates the active support and applies oracle weighting over every candidate state.

**Grover Emulated** uses the existing adaptive statevector/Grover substrate:

```text
equal superposition
      ↓
score-derived weighted phase marking
      ↓
inversion about the mean
      ↓
adaptive search for local Grover depth m*
      ↓
rotation banks
      ↓
stabilization
```

The adaptive depth policy detects overshoot and selects a local depth using only the current oracle-score profile, not an external answer key.

The QCDS rotation families remain visible:

- dimension-null;
- position;
- oracle exposure;
- crossed rotations where explicitly enabled.

### 4. Truth-Alignment Verification — Syntract Binding

Rotated distributions are returned to canonical coordinates and stabilized.

```text
stabilized TruthDistribution
             ↓
          Syntract
```

The distribution is the QCDS object. The preliminary resolver output is provenance / Condition Formation, not the final truth object.

## Statutory Syntract re-entry and praxis

Praxis is not pasted beside a finished answer.

The statutory QCDS distribution re-enters the next QCDS pass through `DistributionOracle`:

```text
STATUTORY SYNTRACT
        ↓
DistributionOracle
        +
active precedent dimensions
        +
similarity evidence
        +
counter-evidence
        +
case evidence where relevant
        ↓
expanded QCDS room
        ↓
FINAL LEGAL SYNTRACT
```

Only precedents with explicit represented similarity or counter-factors enter the active case room.

The separate `problem_to_syntract` precedent ranking remains available as a human-readable diagnostic. It does **not** produce the final Legal Syntract.

```text
authority ≠ similarity
similarity ≠ outcome
precedent ≠ automatic rule installation
```

## Scaling without pretending arbitrary chunks are Grover-equivalent

There are two different implementation bounds:

1. the direct exact-classical legal runner has an explicit maximum live width for a single exact integrated run;
2. the software statevector/Grover emulator has its own maximum state count, currently normally `4096` states for the legal public path.

The statevector bound is not solved by silently deleting legal dimensions.

The scaling planner builds a dependency graph from **which live dimensions each oracle couples**.

If a large active room separates into oracle-disconnected components conditioned on fixed structural facts, those components can be run as bounded Grover-emulated partitions:

```text
ACTIVE ROOM
   │
   ├── component A  2^8 ─┐
   ├── component B  2^8 ─┼─ parallel bounded execution
   ├── component C  2^8 ─┤
   └── component D  2^8 ─┘
```

This is an actual separability claim derived from oracle dependencies.

If an oversized component is still logically coupled by its oracles, the implementation **refuses to pretend arbitrary chunking is equivalent to global Grover evolution**:

```text
large coupled component
        ↓
NOT silently chunked
        ↓
requires one of:
- larger emulator substrate
- native quantum substrate
- explicit domain decomposition with declared semantics
- sequential Syntract re-entry where that decomposition is logically justified
- hybrid execution with explicit boundaries
```

Parallel, sequential and hybrid execution remain part of the QCDS architecture. The current scaling implementation executes separable parallel Grover components and exposes the boundary for sequential/hybrid composition instead of inventing an equivalence for a coupled global room.

## Exact vs Grover benchmark

The legal robot includes benchmark utilities that compare the two substrates on the same logical contract.

Reported metrics include:

- state-support size;
- entropy;
- oracle agreement;
- retained uncertainty;
- selected Grover depth by view;
- total-variation distance between stabilized distributions;
- maximum probability delta;
- top-state agreement;
- conflict markers.

The benchmark explicitly allows Grover-emulated QCDS to lose. There is no requirement that Grover statevector dynamics numerically reproduce Classical Exact normalized-oracle weighting.

What must be shared is the **logical contract**: same problem dimensions and same source-attributed OracleStack.

## Current public reference case for probabilistic evidence

`cases/jb_probabilistic_sublet_evidence_2026.json` represents a Chapter 12 subletting problem where the statutory setting is known but two decisive propositions are evidential rather than hard:

```text
independent use without consent   0.74 support
no valid excuse                   0.85 support
```

Those terms remain live QCDS dimensions. They can activate relevant Jordabalk constraints but are not pre-installed as facts.

## Implementation map

```text
src/qcds_fabric/robots/legal/sweden_housing/
├── qcds_space.py       direct legal BaseBundle / OracleStack / Syntract path
├── execution.py        Classical Exact + Grover Emulated profiles
├── evidence.py         probabilistic legal evidence
├── full_qcds.py        integrated dual-substrate orchestration
├── cached_full_qcds.py identical-run cache only; no inference shortcut
├── scaling.py          oracle-component scaling / parallel execution
├── comparison.py       distribution comparison
├── benchmark.py        exact-vs-Grover benchmark metrics
├── full_robot.py       public specialized robot body
└── robot.py            stable public facade
```

The implementation reuses shared core classes such as:

```text
BaseBundle
OracleStack
FabricLayer
DistributionOracle
EvidenceOracle
AdaptiveGroverSubstrate
Syntract
```

The canonical QCDS core is not copied into the Legal Logical Robot and is not reimplemented in JavaScript.

The public browser calls the stable Python robot through Pyodide/WebAssembly. The browser is a body. The QCDS intelligence remains underneath.

## Claim boundary

The current implementation establishes a falsifiable reference path for:

- direct legal `2^N` QCDS execution;
- hard statutory constraints and soft probabilistic evidence in one logical room;
- statutory Syntract re-entry with active praxis;
- exact-classical and Grover-emulated sibling executions over the same logical contract;
- bounded separable parallel Grover execution;
- explicit refusal to silently truncate or fake-partition coupled state spaces;
- benchmark comparison of substrate behavior.

It does **not** establish native quantum advantage, production legal correctness, calibrated court-outcome probabilities, complete Swedish housing-law coverage, or superintelligence.
