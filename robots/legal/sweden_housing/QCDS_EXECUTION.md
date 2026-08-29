# Direct QCDS execution — Swedish Housing Law

The Swedish Housing Law Logical Robot does **not** use QCDS as a label after a conventional rules engine has already decided the legal answer.

The current execution path is designed so that the **active legal space itself is the QCDS space**.

## The execution path

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
        source-attributed statutory structure relevant
        to this case is projected into an active table
                              │
                              ▼
                   IN-MEMORY CSV TABLE
                fixed facts = 1 / candidates = ?
                              │
                              ▼
                         BaseBundle
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
          ▼                                       ▼
   known case conditions                  live legal dimensions
   fixed in this run                      regime / consequence /
                                          assessment = ?
          │                                       │
          └───────────────────┬───────────────────┘
                              ▼
                         OracleStack
              source-attributed legal constraints
                              │
                              ▼
                  EXACT CLASSICAL 2^N SPACE
                              │
             every active candidate state scored
                              │
                              ▼
          dimension-null + position + oracle-exposure
                         rotations
                              │
                              ▼
                   stabilized distribution
                              │
                              ▼
                    STATUTORY SYNTRACT
                              │
                              │ re-entry through
                              │ DistributionOracle
                              ▼
                + active precedent dimensions
                + similarity / counter-evidence
                              │
                              ▼
                 EXPANDED QCDS SPACE 2^(N+P)
                              │
                              ▼
                   rotations + stabilization
                              │
                              ▼
                     FINAL LEGAL SYNTRACT
```

## What the preliminary legal resolver is allowed to do

The legal body still has deterministic source-attributed machinery. Its role is **Condition Formation**, not final truth production.

It may identify which statutory material is reachable and relevant to the case. It may expose the hard rule path for provenance and teaching. It must not turn those consequences into the final Syntract before QCDS runs.

The important boundary is:

```text
legal resolver
    = selects / exposes source-attributed constraints

QCDS
    = evaluates the active logical state space
      and produces the distribution that is bound as Syntract
```

A consequence such as:

```text
conclusion:jb12_forfeiture_ground_late_residential_rent
```

is therefore represented as a live `?` dimension in the direct QCDS BaseBundle. The source-attributed rule becomes an oracle constraint over candidate states. The outcome is not fixed to `1` merely because a conventional resolver previously discovered the same rule path.

## The CSV is storage, not intelligence

The active legal table is serialized to CSV and reloaded into memory before QCDS execution.

That is deliberately boring infrastructure:

```text
CSV
  ↓
RAM
  ↓
BaseBundle + OracleStack
  ↓
QCDS Fabric
```

The CSV does not decide anything. It exists so a large represented legal universe can be stored and projected cheaply while only the bounded active room is expanded into exact classical QCDS states.

The runtime records a SHA-256 digest of the active CSV projection in the Syntract provenance so the exact logical table used for a run is inspectable.

## What 2^N means here

If the active room contains `N` unknown binary legal dimensions, the classical reference kernel enumerates exactly:

```text
2^N candidate states
```

Known case conditions do not branch. They remain fixed dimensions. The `?` dimensions branch.

Example shape:

```text
known: residential tenancy                  = 1
known: rent more than seven days late       = 1

unknown: Chapter 12 regime candidate        = ?
unknown: forfeiture ground                  = ?
unknown: recovery under section 44          = ?
unknown: procedural safeguard               = ?

4 unknown dimensions
→ 2^4 = 16 candidate states
```

The exact number varies by case because Condition Formation changes the active room.

The implementation exposes:

- `logical_width`
- `unknown_dimension_count`
- `candidate_binary_space`
- `candidate_state_count`
- `oracle_count`
- baseline and stabilized marginals
- entropy and retained uncertainty
- rotation sensitivity
- top candidate legal states
- final Syntract ID.

## The four canonical QCDS phases

### 1. Condition Formation — Superposition

The case activates the legal dimensions and source-attributed statutory constraints that can matter to the current problem.

Fixed represented facts stay fixed. Legal consequences, competing regimes and unresolved assessment dimensions remain live candidates.

### 2. Conditional Evolution — Constraint / Oracle

Statutory rules become legal constraint oracles.

For a rule of the form:

```text
A + B + C  →  D
```

QCDS evaluates candidate states. When `A`, `B` and `C` are true, a state that violates `D` loses coherence under that hard legal oracle.

The rule does not pre-write `D = 1` into the BaseBundle.

Praxis enters later as separate evidence oracles. Precedent is not installed as statute.

### 3. Recursive Inference — Amplification / Recursion

The classical reference substrate enumerates the active `2^N` room and runs the same QCDS Fabric over several legal views:

- baseline;
- dimension-null rotations;
- positional rotations;
- oracle-exposure rotations.

These runs challenge whether the result depends too strongly on a particular represented dimension, position or oracle exposure order.

This is a classical reference execution. It is **not** a claim of quantum speedup. The architecture is substrate-independent; the present legal robot uses the exact bounded classical substrate.

### 4. Truth-Alignment Verification — Syntract Binding

The rotated views are brought back to canonical coordinates and stabilized.

The stabilized `TruthDistribution` is what is bound into the Syntract.

```text
stabilized TruthDistribution
             ↓
          Syntract
```

That distribution — not the deterministic pre-pass — is the final QCDS object.

## Praxis re-enters the statutory Syntract

Praxis is not evaluated in an isolated side calculation and then pasted beside the answer.

The statutory QCDS distribution is carried into a second QCDS pass through the core `DistributionOracle`:

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
        ↓
expanded QCDS room
        ↓
FINAL LEGAL SYNTRACT
```

Only precedents with an explicit represented similarity or counter-factor enter the active room for that case.

The existing diagnostic precedent ranking is retained in the output because it is useful for explaining why cases activated. It is **not** the final Legal Syntract.

The boundaries remain:

```text
authority ≠ similarity
similarity ≠ outcome
precedent ≠ automatic rule installation
```

## Exact classical limit

The current direct legal runner deliberately has a bounded exact classical limit. It defaults to at most 18 live binary dimensions in one integrated run.

That is potentially:

```text
2^18 = 262,144 candidate states
```

If Condition Formation produces a larger live space, the runner raises an explicit error instead of silently pruning logical dimensions or pretending to have executed the full room.

Future scaling can use better partitioning, sequential/parallel/hybrid QCDS spaces, or a quantum substrate. The current implementation keeps the semantics visible rather than hiding a classical shortcut.

## Implementation

The domain QCDS adapter lives at:

```text
src/qcds_fabric/robots/legal/sweden_housing/qcds_space.py
```

It uses the existing shared core classes:

```text
BaseBundle
OracleStack
FabricLayer
DistributionOracle
Syntract
```

The canonical QCDS core is not copied into the Legal Logical Robot and is not reimplemented in JavaScript.

The public browser still calls:

```text
qcds_fabric.robots.legal.sweden_housing.robot
```

through Pyodide/WebAssembly. The browser is the body. QCDS remains the intelligence underneath.
