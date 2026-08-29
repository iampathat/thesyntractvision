# Swedish Housing Law Logical Robot

This directory is the domain home for the first substantial real-world **specialized Logical Robot** in The Syntract Vision.

It is a growing, source-attributed Swedish housing-law Logical Universe built to test QCDS where law contains both **hard logic**, **uncertain evidence** and **judgment**.

The represented snapshot currently includes material from:

- **12 kap. jordabalken** — the general Swedish tenancy regime;
- **Privatuthyrningslag (2026:772)** — in force from 1 July 2026;
- transition-preserved effects of **lag (2012:978) om uthyrning av egen bostad** for qualifying older agreements;
- selected **Högsta domstolen** precedent;
- selected identified **Svea hovrätt** housing-law guidance;
- official preparatory material around the 2026 reform as interpretive background.

Legal snapshot: **2026-08-29**.

## The important point: QCDS produces the Legal Syntract

The Legal Logical Robot does not solve a case conventionally and then ask QCDS to approve the answer.

The architecture now distinguishes **three execution modes** so the limits of software emulation are never confused with the quantum target:

```text
FULL REPRESENTED LEGAL UNIVERSE
Jordabalk + private-letting law + transition + praxis + evidence
                         │
                         ▼
                    QCDS CONDITIONS
                         │
        ┌────────────────┼─────────────────┐
        ▼                ▼                 ▼
 CLASSICAL EXACT   GROVER EMULATED   QUANTUM FULL SPACE
 reference         software          native-QPU target
 emulator          statevector       contract
 bounded active    bounded active    full represented
 projection        projection        legal universe
 exact 2^N         phase + Grover    NO semantic prefilter
        │                │                 │
        └──────────┬─────┘                 │
                   ▼                       │
          TruthDistribution(s)             │
                   ▼                       ▼
              Syntracts            future native QPU
```

The deterministic legal machinery is **Condition Formation and provenance**, not the final truth producer.

A statutory consequence remains a live `?` dimension before QCDS. The relevant law becomes an oracle constraint over candidate states.

See [`QCDS_EXECUTION.md`](QCDS_EXECUTION.md) for the complete execution model.

## Three execution modes

### Classical Exact

The reference emulator enumerates the complete support of the **declared active emulation room**:

```text
N live dimensions → 2^N candidate states
```

Because this is classical software, Condition Formation may first project the much larger represented legal universe into a bounded active room. That projection is an emulator concession, not the QCDS quantum principle.

Once the active room exists, Classical Exact does not silently prune its candidate states.

### Grover Emulated

The sibling quantum-emulated path uses the existing shared QCDS statevector/Grover substrate over the same active `BaseBundle + OracleStack`:

```text
equal superposition
      ↓
weighted phase marking from the same OracleStack
      ↓
inversion about the mean
      ↓
adaptive Grover depth / overshoot detection
      ↓
QCDS rotations
      ↓
stabilized distribution
      ↓
Grover-emulated Syntract
```

This is software quantum-statevector emulation. It is **not** a native-QPU or quantum-advantage claim.

The statevector is memory bounded, so exact separable QCDS components may be executed separately where oracle dependencies prove separability. Coupled oversized components are not arbitrarily chunked and called equivalent to global Grover evolution.

### Quantum Full Space

`quantum_full_space` is the separate native-QPU target contract.

Its defining rule is:

> **Do not semantically remove represented legal dimensions merely because a classical machine considers them irrelevant or cannot fit them in memory.**

The target path is therefore:

```text
FULL REPRESENTED LEGAL UNIVERSE
        │
        ├── all represented statutory rule terms
        ├── transition / exception structure
        ├── open legal dimensions
        ├── represented praxis
        ├── case facts / disputed facts
        └── evidence
        │
        ▼
 Conditions / quantum representation
        │
        ▼
       oracles
        │
        ▼
 amplitude evolution / Grover / recursive QCDS
        │
        ▼
 relevance and coherent structure emerge
        │
        ▼
      SYNTRACT
```

No physical QPU is connected in the current build. This mode therefore reports `target_contract_only`; the software does not pretend that Grover statevector emulation is native quantum execution.

## Full-universe quantum manifest

The native quantum target has a manifest compiled **independently of the active classical case projection**.

It retains:

- every represented primary-regime candidate;
- every represented rule antecedent and consequence;
- every represented rule ID;
- every represented precedent dimension;
- represented precedent factors and statutory links;
- case terms and open case questions;
- probabilistic evidence terms.

The output exposes the full-universe dimension count and a SHA-256 identity for the manifest. It is explicitly marked as **not** being the classical active projection.

This lets tests verify that, for example, a rent case does not cause a represented apartment-exchange branch or a remote represented precedent to disappear from the **Quantum Full Space** target merely because the current classical emulator does not need it.

## Probabilistic evidence is part of the room

Legal problems frequently contain propositions that are neither definitely true nor definitely false.

A case can therefore carry explicit `qcds_evidence`:

```json
{
  "term": "sublet:independent_without_consent",
  "confidence": 0.74,
  "polarity": true,
  "source_id": "evidence:occupancy-pattern"
}
```

In current emulation, that evidence may make the corresponding statutory rule relevant during Condition Formation, but the proposition remains a live QCDS dimension.

```text
uncertain proposition @ 0.74
        ↓
relevant legal constraint becomes active
        ↓
proposition remains ?
        ↓
EvidenceOracle supplies probabilistic pressure
        ↓
QCDS distribution
```

Hard law remains hard. Soft evidence remains soft.

A result can therefore be very broad, such as 0.55 / 0.35 / 0.10, or concentrate close to 100% when hard rules, strong evidence and the represented interpretive structure all align.

Those percentages are probability mass / coherence in the represented QCDS universe. They are not automatically calibrated probabilities of how a court will rule.

## The four QCDS phases in the legal robot

```text
1 · CONDITION FORMATION
emulation: resource-aware active room
quantum target: full represented universe remains represented

2 · CONDITIONAL EVOLUTION
law → hard OracleStack constraints
evidence → probabilistic EvidenceOracle pressure
praxis → separate interpretive source class

3 · RECURSIVE INFERENCE
Classical Exact 2^N
or Grover-emulated statevector amplification
or future native full-space quantum execution
+ QCDS rotations / recursion

4 · TRUTH-ALIGNMENT VERIFICATION
stabilized TruthDistribution → Syntract
```

The QCDS core remains substrate-independent. The Legal Logical Robot is a domain body above it.

## CSV is storage, not intelligence

The current software emulators can serialize the active legal table and reload it entirely in memory:

```text
represented legal corpus
        ↓
resource-aware Condition Formation
        ↓
CSV projection in RAM
        ↓
BaseBundle + OracleStack
        ↓
QCDS Fabric
```

The CSV makes the active emulator room cheap to store and inspect. It does not perform inference, and **CSV projection is not the definition of Quantum Full Space**.

The active CSV SHA-256 digest is retained in Syntract provenance.

## Statutory Syntract re-entry and praxis

Praxis is not pasted beside a finished statutory answer.

In the bounded emulation path:

```text
STATUTORY SYNTRACT
        ↓
DistributionOracle
        +
active precedent dimensions
        +
similarity / counter-evidence
        +
case evidence where relevant
        ↓
expanded QCDS room
        ↓
FINAL LEGAL SYNTRACT
```

Only precedent with an explicit represented similarity or counter-factor enters the active **emulation** room. This keeps software execution bounded.

The **Quantum Full Space** manifest, by contrast, retains the represented praxis universe rather than requiring every non-active precedent to be classically declared irrelevant before the quantum target.

The source hierarchy remains explicit:

```text
statute ≠ preparatory work ≠ HD precedent ≠ Svea guidance ≠ case evidence

authority ≠ similarity
similarity ≠ outcome
precedent ≠ automatic rule installation
```

A separate precedent-relevance `problem_to_syntract` projection remains available to explain why decisions activated in the emulator. It is diagnostic only; it is not the final Legal Syntract.

## Scaling without fake partitioning

### Emulation

Classical exact enumeration and software statevector emulation have explicit resource bounds.

The scaling planner examines which live dimensions are coupled by the OracleStack. If an active room separates into oracle-disconnected components conditioned on fixed structure, those components can be executed as bounded parallel Grover rooms:

```text
component A 2^8 ─┐
component B 2^8 ─┼─► parallel Grover-emulated QCDS
component C 2^8 ─┤
component D 2^8 ─┘
```

If an oversized component remains logically coupled, arbitrary chunks are **not** claimed to be equivalent to one global Grover operation.

### Quantum Full Space

The native quantum target may use parallel, sequential or hybrid QCDS only when that decomposition is itself a semantics-preserving QCDS/Syntract operation over the complete represented universe.

It may **not** solve a memory problem by classically deleting dimensions and then call the reduced problem “native quantum QCDS”.

## Exact vs Grover benchmark

The domain contains benchmark utilities for the two executable sibling software substrates.

They report, among other things:

- state-support size;
- entropy;
- oracle agreement;
- retained uncertainty;
- selected Grover depth by view;
- total-variation distance;
- maximum state-probability delta;
- whether the top state agrees;
- conflict markers.

The benchmark is not constructed so QCDS has to win. Grover-emulated execution is allowed to diverge or perform worse. The shared requirement is the same active logical problem and source-attributed oracle contract.

Quantum Full Space is not numerically benchmarked until a compatible real native backend exists.

## The legal universe grows in modules

The domain is not one giant rules file:

```text
base housing-law corpus
        │
        ├── Chapter 12 core expansion
        │     second hand / forfeiture / recovery
        │     extension / rent review
        │
        ├── use / conduct / access / transfer expansion
        │     care / disturbances / access
        │     transfer / close relative / exchange
        │
        └── praxis expansion
              HD + identified Svea guidance
        │
        ▼
represented legal universe for the snapshot
```

Future legal areas can be added as bounded modules without rewriting QCDS core semantics.

## What is hard and what is evaluative?

Some represented conditions can be hard:

- contract date and transition gates;
- explicit consent requirements;
- statutory deadlines;
- required notices/warnings;
- explicit exclusions;
- specified cure and recovery paths.

Other propositions are evidence-sensitive or evaluative:

- did another person actually have **independent use**?
- was there a **valid excuse**?
- is a breach of **minor significance**?
- are disturbances more than neighbours **reasonably should tolerate**?
- are they **specially serious**?
- is outsider use beyond what the landlord **reasonably must accept**?
- are reasons for second-hand letting or exchange sufficient?
- can the landlord **reasonably accept** a transfer?
- is a defect **material**?
- is non-extension **reasonable** after renovation?
- how strong are competing landlord and tenant interests?

Missing facts are not permission to guess. An open legal standard is not converted into hard truth merely because it appears in a statute.

## Current Chapter 12 coverage

The represented Chapter 12 universe includes important parts of:

- **24–26 §§** — care/damage responsibility, conduct/disturbances, warning/social-welfare procedure, supervision and landlord access;
- **32–38 §§** — transfer, close-relative transfer, apartment exchange and selected effects of authorized transfer;
- **39–41 §§** — second-hand letting, permission and outsider/lodger reasonableness;
- **42–44 §§** — forfeiture, rectification/time limits and recovery after late residential rent;
- **45 a–50 §§** — extension/security of tenure, exceptions, referral and right to remain during a pending extension dispute;
- **53–55 f §§** — rent-review scope, procedure, reasonable rent, second-hand ceilings and repayment;
- selected defect, classification and evidential questions represented through the praxis layer.

See [`COVERAGE.md`](COVERAGE.md) for the detailed coverage matrix.

## Try it in the browser

Open:

**https://iampathat.github.io/thesyntractvision/**

Choose **Swedish Law**.

The public browser calls the packaged Python domain robot through Pyodide/WebAssembly. There is no duplicate JavaScript legal inference engine.

The current result view exposes:

- legal facts and activated statutory path;
- active emulation `2^N` room;
- live marginals / uncertainty;
- statutory Syntract → final re-entry chain;
- **Classical Exact**;
- **Grover Emulated**;
- **Quantum Full Space · target** with full-universe dimension count and no-prefilter policy;
- adaptive Grover depth;
- exact-vs-Grover distribution comparison;
- probabilistic evidence;
- scaling/decomposition status.

Stable Python path:

```text
qcds_fabric.robots.legal.sweden_housing.robot
```

CLI:

```bash
qcds-legal-robot robots/legal/sweden_housing/cases/jb_unauthorized_sublet_forfeiture_2026.json
```

## Case library

The `cases/` directory currently contains **16 executable probes**.

| Case | Main logical problem |
|---|---|
| `new_private_let_2026.json` | post-2026 private-letting regime |
| `legacy_private_let_2026.json` | temporal transition / preserved old law |
| `jordabalk_12_fallback_2026.json` | fallback to Chapter 12 |
| `material_defect_praxis_2026.json` | material defect + competing precedent |
| `jb_unauthorized_sublet_forfeiture_2026.json` | hard represented consent/subletting facts + forfeiture safeguards |
| `jb_probabilistic_sublet_evidence_2026.json` | disputed independent use and excuse represented as 0.74 / 0.85 evidence |
| `jb_late_rent_recovery_2026.json` | forfeiture ground + statutory recovery together |
| `jb_extension_renovation_balance_2026.json` | security of tenure + renovation balance |
| `jb_excess_second_hand_rent_2026.json` | rent ceiling + repayment + praxis |
| `jb_outsider_reasonableness_2026.json` | deliberately unresolved §41 reasonableness |
| `jb_second_hand_permission_2026.json` | multi-condition §40 permission |
| `jb_disturbance_after_warning_2026.json` | disturbance + warning + social notice + safeguards |
| `jb_access_refusal_rectified_2026.json` | access ground + later rectification |
| `jb_transfer_unreasonable_refusal_2026.json` | transfer consent + unreasonable refusal |
| `jb_apartment_exchange_2026.json` | §35 multi-factor exchange |
| `jb_damage_evidence_2026.json` | evidence pointing to negligence without inventing negligence |

The fixtures are probes into the legal universe, not the domain model itself.

## Implementation map

```text
src/qcds_fabric/robots/legal/sweden_housing/
├── robot.py               stable public facade
├── full_robot.py          public specialized body
├── qcds_space.py          bounded active legal BaseBundle / OracleStack / Syntract
├── execution.py           Classical Exact + Grover Emulated + Quantum Full Space contracts
├── quantum_full_space.py  complete represented-universe native quantum manifest
├── evidence.py            probabilistic evidence
├── full_qcds.py           three-mode integrated orchestration
├── cached_full_qcds.py    safe identical-run reuse
├── scaling.py             dependency-aware bounded emulation scaling
├── comparison.py          substrate distribution comparison
└── benchmark.py           executable exact-vs-Grover metrics
```

The shared QCDS core remains outside the specialized robot. The legal robot imports and calls it; it does not copy inference semantics into its domain or UI.

## Architecture boundary

```text
Swedish Housing Legal Robot
        │
        ├── source corpus
        ├── case / evidence
        └── represented praxis
                 │
                 ▼
                QCDS
       ┌─────────┼──────────────┐
       ▼         ▼              ▼
Classical    Grover       Quantum Full Space
 Exact      Emulated          target
 bounded     bounded       full represented
 room        room          universe retained
       │         │              │
       └────┬────┘              │
            ▼                   ▼
   inspectable Syntracts   future native QPU
```

**Logical Robot does not contain QCDS. Logical Robot talks to QCDS.**

## Swarm role

The robot can emit a bounded non-authoritative capability packet into a Living Swarm system:

```text
Legal Robot ─────────────┐
Evidence / Contract Robot├──► capability packets
Timeline Robot ──────────┤             │
Source Robot ────────────┘             ▼
                               QCDS challenge / Syntract
```

Specialized expertise does not become authoritative over peer Reality merely because a specialist robot emitted it.

## How this grows

Natural next layers include broader Chapter 12 coverage, richer evidentiary records, more precedent and preparatory works, competing party arguments, temporal legal snapshots, empirical court-outcome calibration datasets, a genuine native-QPU adapter for the full-space contract and larger semantics-preserving parallel/sequential/hybrid QCDS composition.

The target is not to make law look simple. The target is to represent **where it is hard, where it is conditional, where it is uncertain, and then let QCDS operate on that structure**.

See also:

- [`QCDS_EXECUTION.md`](QCDS_EXECUTION.md)
- [`COVERAGE.md`](COVERAGE.md)
- [`SOURCES.md`](SOURCES.md)
- [`ASSESSMENT_MODEL.md`](ASSESSMENT_MODEL.md)
- root [`LIVING_SWARM_LOGICAL_ROBOTS.md`](../../../LIVING_SWARM_LOGICAL_ROBOTS.md)
