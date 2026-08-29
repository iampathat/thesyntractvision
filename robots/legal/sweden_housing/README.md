# Swedish Housing Law Logical Robot

This directory is the domain home for the first substantial real-world **specialized Logical Robot** in The Syntract Vision.

It is a growing, source-attributed Swedish housing-law Logical Universe built to test QCDS where law contains both **hard logic** and **judgment**.

The robot currently represents material from:

- **12 kap. jordabalken** — the general Swedish tenancy regime;
- **Privatuthyrningslag (2026:772)** — in force from 1 July 2026;
- transition-preserved effects of **lag (2012:978) om uthyrning av egen bostad** for qualifying older agreements;
- selected **Högsta domstolen** precedent;
- selected identified **Svea hovrätt** housing-law guidance;
- official preparatory material around the 2026 reform as interpretive background.

The legal snapshot is currently **2026-08-29**.

## The important point: the Legal Syntract is produced by QCDS

The Legal Logical Robot does not solve the case conventionally and then ask QCDS to approve the answer.

The current public execution path is:

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
        relevant source-attributed legal structure
                         │
                         ▼
               ACTIVE IN-MEMORY CSV TABLE
                         │
              fixed case facts = 1
              legal candidates = ?
                         │
                         ▼
                     BaseBundle
                         │
                         ▼
                     OracleStack
             hard statutory constraints
                         │
                         ▼
               EXACT CLASSICAL 2^N SPACE
                         │
        null + position + oracle-exposure rotations
                         │
                         ▼
              stabilized TruthDistribution
                         │
                         ▼
                 STATUTORY SYNTRACT
                         │
                    QCDS re-entry
                 DistributionOracle
                         +
                  active praxis
                         │
                         ▼
               EXPANDED QCDS SPACE
                         │
                         ▼
                  FINAL SYNTRACT
```

That distinction is fundamental.

A hard statutory consequence is represented as a live QCDS dimension before the run. The source-attributed legal rule is an oracle constraint over candidate states. The consequence is **not pre-written into the final Syntract** by the deterministic legal resolver.

The preliminary resolver remains useful for **Condition Formation** and provenance: it identifies which statutory rule paths are reachable and worth activating for the case. QCDS then evaluates the active state space.

See [`QCDS_EXECUTION.md`](QCDS_EXECUTION.md) for the full execution model.

## The four QCDS phases in the legal robot

```text
1 · CONDITION FORMATION
case → relevant legal dimensions / constraints

2 · CONDITIONAL EVOLUTION
source-attributed law → OracleStack
praxis → separate evidence oracles

3 · RECURSIVE INFERENCE
exact active 2^N classical state space
+ dimension-null / position / oracle-exposure rotations

4 · TRUTH-ALIGNMENT VERIFICATION
stabilized TruthDistribution → Syntract
```

The present implementation is an **exact bounded classical reference execution**. It is not a claim of quantum speedup. The QCDS architecture remains substrate-independent.

## CSV is storage, not the intelligence

The active legal table is serialized and reloaded entirely in memory:

```text
represented legal corpus
        ↓
Condition Formation
        ↓
CSV table in RAM
        ↓
BaseBundle + OracleStack
        ↓
QCDS Fabric
```

CSV only makes the projected legal room cheap to store and inspect. It does not perform inference.

The runtime records the CSV SHA-256 digest in Syntract provenance so the exact active projection can be identified.

## Exact classical space

If one case has `N` live binary legal dimensions, the current reference kernel really enumerates:

```text
2^N candidate states
```

Known facts do not branch. `?` dimensions do.

The output exposes, among other things:

- logical width;
- unknown dimension count;
- candidate space as `2^N`;
- actual candidate-state count;
- oracle count;
- baseline and stabilized marginals;
- entropy / retained uncertainty;
- rotation sensitivity;
- top coherent legal states;
- statutory Syntract ID;
- final Legal Syntract ID.

The exact classical runner currently refuses a single integrated room above its configured bound rather than silently pruning semantics. The current default is 18 live binary dimensions, i.e. up to `2^18 = 262,144` candidate states before considering the additional rotation runs.

## Praxis re-enters QCDS

Praxis is not pasted beside a finished statutory answer.

The first statutory Syntract is re-entered into QCDS through the core `DistributionOracle`. Active precedent dimensions are then added to the legal room together with similarity and counter-evidence:

```text
STATUTORY SYNTRACT
        ↓
DistributionOracle
        +
active precedent dimensions
        +
similarity / counter-evidence
        ↓
QCDS again
        ↓
FINAL LEGAL SYNTRACT
```

Only precedents sharing an explicit represented factor with the case become active. The full praxis corpus can therefore grow without placing every decision in every classical QCDS run.

The source hierarchy is never flattened:

```text
statute ≠ preparatory work ≠ HD precedent ≠ Svea guidance ≠ case fact

authority ≠ similarity
similarity ≠ outcome
precedent ≠ automatic rule installation
```

The separate precedent-relevance projection remains available as a **diagnostic explanation** of why judgments activated. It is not the final Legal Syntract.

## The legal universe grows in modules

The domain is not one giant JSON pile. The runtime assembles bounded legal layers:

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

Future legal areas can be added as separate modules without changing canonical QCDS semantics.

## What is hard and what is evaluative?

Some legal conditions are strict enough to become hard source-attributed constraints:

- contract dates and transition gates;
- explicit consent requirements;
- represented statutory deadlines;
- required warnings/notices;
- explicit exclusions;
- specified cure/recovery paths.

Other questions remain live assessment dimensions:

- is a breach of **minor significance**?
- are disturbances more than neighbours **reasonably should tolerate**?
- are they **specially serious**?
- is outsider use beyond what the landlord **reasonably must accept**?
- are reasons for second-hand letting or exchange sufficient?
- can a landlord **reasonably accept** a transfer?
- is a defect **material**?
- is non-extension **reasonable** after major renovation?
- how strong are competing landlord and tenant interests?

Missing facts are not permission to guess. Open-textured standards are not converted into hard truth merely because they appear in a statute.

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

Choose **Swedish Law** under **Pick a world**.

The public browser calls the packaged Python domain robot through Pyodide/WebAssembly. There is no duplicate JavaScript legal inference engine.

The stable Python path is:

```text
qcds_fabric.robots.legal.sweden_housing.robot
```

The direct legal QCDS adapter is:

```text
qcds_fabric.robots.legal.sweden_housing.qcds_space
```

The public CLI is:

```bash
qcds-legal-robot robots/legal/sweden_housing/cases/jb_unauthorized_sublet_forfeiture_2026.json
```

## Case library

The `cases/` directory currently contains **15 executable probes**:

| Case | Main logical problem |
|---|---|
| `new_private_let_2026.json` | post-2026 private-letting regime |
| `legacy_private_let_2026.json` | temporal transition / preserved old law |
| `jordabalk_12_fallback_2026.json` | fallback to Chapter 12 |
| `material_defect_praxis_2026.json` | material defect + competing precedent |
| `jb_unauthorized_sublet_forfeiture_2026.json` | consent + forfeiture + safeguards |
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

## Architecture boundary

The Swedish Housing Law Logical Robot is a specialized body, not a second intelligence core.

```text
Swedish Housing Legal Robot
        │
        ├── source corpus
        ├── case projection
        ├── Condition Formation
        └── praxis activation
                 │
                 ▼
             BaseBundle
             OracleStack
                 │
                 ▼
              QCDS Fabric
                 │
                 ▼
               Syntract
```

The shared QCDS classes remain in the core. The legal robot imports and calls them; it does not copy their semantics into the domain or browser.

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

Natural next layers include:

- broader Chapter 12 coverage and more exception/safeguard variants;
- more HD precedent and identified guiding Svea hovrätt decisions;
- Hyresnämnd material where it adds a distinct evidential/interpretive role;
- propositions, SOU and later treatment of case law;
- richer contracts and documentary evidence;
- disputed facts and evidence strength;
- competing party arguments;
- temporal snapshots;
- adversarial benchmark cases with withheld/discriminating facts;
- parallel/sequential/hybrid partitioning for active rooms larger than exact classical single-space execution.

The target is not to make law look simple. The target is to represent **where it is hard, where it is conditional, where it is uncertain, and then let QCDS operate on that structure**.

See also:

- [`QCDS_EXECUTION.md`](QCDS_EXECUTION.md)
- [`COVERAGE.md`](COVERAGE.md)
- [`SOURCES.md`](SOURCES.md)
- [`ASSESSMENT_MODEL.md`](ASSESSMENT_MODEL.md)
- root [`LIVING_SWARM_LOGICAL_ROBOTS.md`](../../../LIVING_SWARM_LOGICAL_ROBOTS.md)
