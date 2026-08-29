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

```text
FULL REPRESENTED LEGAL UNIVERSE
Jordabalk + private-letting law + transition + praxis
                         │
                         ▼
                       CASE
                         │
                         ▼
                 CONDITION FORMATION
                         │
 hard structural facts + relevant statutory dimensions
 + source-attributed rule constraints
 + probabilistic evidence terms
                         │
                         ▼
               ACTIVE CSV TABLE IN RAM
                         │
                     BaseBundle
                         +
                     OracleStack
                         │
                SAME QCDS PROBLEM
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
  CLASSICAL EXACT                 GROVER EMULATED
  exact active 2^N                software statevector
  candidate support               phase marking
  rotations                       adaptive m*
  stabilization                   mark + diffuse
         │                               │
         ▼                               ▼
 TruthDistribution                TruthDistribution
         │                               │
         ▼                               ▼
 reference Syntract              sibling Grover Syntract
```

The deterministic legal machinery is therefore **Condition Formation and provenance**, not the final truth producer.

A statutory consequence remains a live `?` dimension before QCDS. The relevant law becomes an oracle constraint over candidate states.

See [`QCDS_EXECUTION.md`](QCDS_EXECUTION.md) for the complete execution model.

## Same logical contract, different substrates

The public robot now exposes two execution profiles over the same active `BaseBundle` and `OracleStack`:

### Classical Exact

The reference emulator enumerates the active binary support exactly:

```text
N live dimensions → 2^N candidate states
```

It applies the legal/evidence oracle stack and the QCDS rotation/stabilization machinery over that support.

### Grover Emulated

The sibling quantum-emulated path uses the existing shared QCDS statevector/Grover substrate:

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

The purpose of running both is not to force identical numeric probabilities. It is to make substrate behavior falsifiable while holding the logical problem constant.

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

That evidence may make the corresponding statutory rule relevant during Condition Formation, but the proposition remains a live QCDS dimension.

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
case → active legal dimensions, evidence and constraints

2 · CONDITIONAL EVOLUTION
law → hard OracleStack constraints
evidence → probabilistic EvidenceOracle pressure
praxis → separate interpretive evidence

3 · RECURSIVE INFERENCE
Classical Exact 2^N
or Grover-emulated statevector amplification
+ QCDS rotations / recursion

4 · TRUTH-ALIGNMENT VERIFICATION
stabilized TruthDistribution → Syntract
```

The QCDS core remains substrate-independent. The Legal Logical Robot is a domain body above it.

## CSV is storage, not intelligence

The active legal table is serialized and reloaded entirely in memory:

```text
represented legal corpus
        ↓
Condition Formation
        ↓
CSV projection in RAM
        ↓
BaseBundle + OracleStack
        ↓
QCDS Fabric
```

The CSV makes a large represented corpus cheap to store and inspect. It does not perform inference.

The active CSV SHA-256 digest is retained in Syntract provenance.

## Statutory Syntract re-entry and praxis

Praxis is not pasted beside a finished statutory answer.

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

Only precedent with an explicit represented similarity or counter-factor enters the active case room. The whole praxis corpus can continue to grow without every decision entering every run.

The source hierarchy remains explicit:

```text
statute ≠ preparatory work ≠ HD precedent ≠ Svea guidance ≠ case evidence

authority ≠ similarity
similarity ≠ outcome
precedent ≠ automatic rule installation
```

A separate precedent-relevance `problem_to_syntract` projection remains available to explain why decisions activated. It is diagnostic only; it is not the final Legal Syntract.

## Scaling without fake partitioning

Classical exact enumeration and software statevector emulation have explicit resource bounds. The robot does not solve that by silently deleting dimensions.

The scaling planner examines which live dimensions are coupled by the OracleStack.

If the active room separates into oracle-disconnected components conditioned on fixed structure, those components can be executed as bounded parallel Grover rooms:

```text
component A 2^8 ─┐
component B 2^8 ─┼─► parallel Grover-emulated QCDS
component C 2^8 ─┤
component D 2^8 ─┘
```

If an oversized component remains logically coupled, arbitrary chunks are **not** claimed to be equivalent to one global Grover operation. The runtime reports that a larger substrate or an explicit logically justified decomposition is required.

Parallel, sequential and hybrid QCDS remain architectural execution forms. The current implementation executes separable parallel components and preserves explicit boundaries for sequential Syntract re-entry / hybrid composition rather than inventing equivalence for a coupled global room.

## Exact vs Grover benchmark

The domain contains benchmark utilities for the two sibling substrate executions.

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

The benchmark is not constructed so QCDS has to win. Grover-emulated execution is allowed to diverge or perform worse. The shared requirement is the same logical problem and source-attributed oracle contract.

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
- active QCDS `2^N` room;
- live marginals / uncertainty;
- statutory Syntract → final re-entry chain;
- **Classical Exact** and **Grover Emulated** side by side;
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
├── robot.py            stable public facade
├── full_robot.py       public specialized body
├── qcds_space.py       legal BaseBundle / OracleStack / Syntract construction
├── execution.py        exact + Grover execution profiles
├── evidence.py         probabilistic evidence
├── full_qcds.py        dual-substrate integrated execution
├── cached_full_qcds.py safe identical-run reuse
├── scaling.py          dependency-aware bounded scaling
├── comparison.py       substrate distribution comparison
└── benchmark.py        benchmark metrics
```

The shared QCDS core remains outside the specialized robot. The legal robot imports and calls it; it does not copy inference semantics into its domain or UI.

## Architecture boundary

```text
Swedish Housing Legal Robot
        │
        ├── source corpus
        ├── case / evidence projection
        ├── Condition Formation
        └── praxis activation
                 │
                 ▼
        BaseBundle + OracleStack
                 │
                 ▼
             QCDS Fabric
        ┌────────┴────────┐
        ▼                 ▼
Classical Exact     Grover Emulated
        │                 │
        └────────┬────────┘
                 ▼
        inspectable Syntracts
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

Natural next layers include broader Chapter 12 coverage, richer evidentiary records, more precedent and preparatory works, competing party arguments, temporal legal snapshots, empirical court-outcome calibration datasets, native-QPU substrate adapters and larger explicitly decomposed QCDS rooms.

The target is not to make law look simple. The target is to represent **where it is hard, where it is conditional, where it is uncertain, and then let QCDS operate on that structure**.

See also:

- [`QCDS_EXECUTION.md`](QCDS_EXECUTION.md)
- [`COVERAGE.md`](COVERAGE.md)
- [`SOURCES.md`](SOURCES.md)
- [`ASSESSMENT_MODEL.md`](ASSESSMENT_MODEL.md)
- root [`LIVING_SWARM_LOGICAL_ROBOTS.md`](../../../LIVING_SWARM_LOGICAL_ROBOTS.md)
