# Swedish Housing Law Logical Robot

This directory is the domain home for the first substantial real-world **specialized Logical Robot** in The Syntract Vision.

It is a growing, source-attributed Swedish housing-law Logical Universe built to test QCDS where law contains both **hard logic** and **judgment**.

The robot currently represents material from:

- **12 kap. jordabalken** — the general Swedish tenancy regime;
- **Privatuthyrningslag (2026:772)** — in force from 1 July 2026;
- the transition-preserved effects of **lag (2012:978) om uthyrning av egen bostad** for qualifying older agreements;
- selected **Högsta domstolen** precedent;
- selected identified **Svea hovrätt** housing-law guidance;
- official preparatory material around the 2026 reform as interpretive background.

The legal snapshot is currently **2026-08-29**.

## The idea in one picture

```text
FULL REPRESENTED LEGAL UNIVERSE
statutes + dates + transition + rules + praxis + source provenance
                         │
                         ▼
                       CASE
                         │
                         ▼
                 CONDITION FORMATION
                         │
           only case-relevant structure activates
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
   HARD / DECLARED PATH          ASSESSMENT PATH
 scope · deadline · rule         reasonableness · degree
 explicit consequence            materiality · balancing
          │                             │
          │                       relevant praxis
          │                       analogy / counter-factor
          └──────────────┬──────────────┘
                         ▼
                 QCDS / Syntract core
                         ▼
       coherent result + unresolved discriminators
```

This is deliberately **not** a conventional legal lookup tool and not a giant `if/else` tree.

A legal rule can be explicit while its application still depends on an open standard. The robot therefore distinguishes:

```text
hard rule ≠ complete legal answer
precedent authority ≠ factual similarity
factual similarity ≠ legal outcome
missing fact ≠ permission to guess
```

## What is hard and what is soft?

Some legal conditions can be represented very strictly:

- the contract date is before or after 1 July 2026;
- rent is more than a stated statutory delay threshold;
- a required consent exists or does not exist;
- a statutory time window is represented as met or not met;
- a special statute is excluded by an explicit scope condition.

Other questions are inherently evaluative:

- is a breach of **minor significance**?
- is accommodation of outsiders more than the landlord **reasonably must accept**?
- are reasons for second-hand letting **considerable**?
- does the landlord have a **justified reason** to refuse?
- is a defect **material**?
- is it **reasonable** that a tenant move because of a major renovation?
- how should the landlord's interest be balanced against the tenant's hardship?

Those are not converted into hard truth just because they occur in a statute. They remain explicit **assessment questions** until represented facts, rules and interpretive authority discriminate them.

## Current Chapter 12 coverage

The represented Chapter 12 core now includes important parts of:

- **39–41 §§** — second-hand letting, permission and outsider/lodger reasonableness;
- **42–44 §§** — forfeiture, rectification/time limits and recovery after late residential rent;
- **45 a–50 §§** — extension/security of tenure, exceptions, referral and right to remain during a pending extension dispute;
- **53–55 f §§** — rent-review scope, procedure, reasonable rent, second-hand ceilings and repayment;
- existing defect, classification and other Chapter 12 links represented through the praxis layer.

See [`COVERAGE.md`](COVERAGE.md) for the detailed matrix.

## Praxis is a separate logical layer

The robot does **not** install judgments as new statutory rules.

The praxis corpus contains authority metadata, issue tags, statutory links, similarity factors, counter-factors and principles. A case first activates only the decisions that share an explicit represented factor with it.

Example:

```text
13 represented decisions
        ↓ case facts
4 decisions share explicit factors
        ↓ Condition Formation
active praxis space = 2^4
        ↓
QCDS relevance challenge
        ↓
leading interpretive pressure
```

The full corpus can therefore grow without forcing every precedent into every active classical QCDS run.

The current authority classes include:

```text
Högsta domstolen precedent
        ↓
identified guiding Svea hovrätt decision
        ↓
other identified Svea hovrätt decision
```

That hierarchy is reported separately from QCDS factual relevance. A lower-court decision may be factually very close without becoming a higher legal authority than an HD precedent.

## Try it

### Public browser

Open:

**https://iampathat.github.io/thesyntractvision/**

Choose **Swedish Law** under **Pick a world**.

The legal web body explains each run as:

```text
1. CASE FACTS
2. LEGAL GATE
3. APPLIED HARD RULE PATH
4. ASSESSMENT ZONE
5. PRAXIS / ACTIVE QCDS SPACE
6. QCDS / SYNTRACT
```

The browser executes the packaged Python domain robot and QCDS core through Pyodide/WebAssembly. The web UI does not contain a duplicate JavaScript legal inference engine.

### CLI

```bash
qcds-legal-robot robots/legal/sweden_housing/cases/jb_unauthorized_sublet_forfeiture_2026.json
```

## Case library

The `cases/` directory is an executable teaching and regression library. It currently includes examples of:

| Case | What it demonstrates |
|---|---|
| `new_private_let_2026.json` | 2026 private-letting regime and tenant-protection consequences |
| `legacy_private_let_2026.json` | temporal transition: repealed law can remain applicable to an older contract |
| `jordabalk_12_fallback_2026.json` | why a special regime can fall away to Chapter 12 |
| `material_defect_praxis_2026.json` | hard defect consequence plus competing interpretive precedent |
| `jb_unauthorized_sublet_forfeiture_2026.json` | consent rule + forfeiture + still-open minor-significance/time questions |
| `jb_late_rent_recovery_2026.json` | forfeiture ground and statutory recovery represented together |
| `jb_extension_renovation_balance_2026.json` | default security of tenure + major-renovation reasonableness balance |
| `jb_excess_second_hand_rent_2026.json` | statutory second-hand rent ceiling + repayment discriminator + guiding praxis |
| `jb_outsider_reasonableness_2026.json` | a deliberately unresolved section 41 reasonableness problem |
| `jb_second_hand_permission_2026.json` | multi-condition tribunal permission under section 40 |

These fixtures are **not** the domain model. They are probes into the growing legal universe.

## Architecture boundary

This is a specialized Logical Robot, not another intelligence core.

```text
Swedish Housing Legal Robot
        │
        ├── domain corpus
        ├── case projection
        ├── statutory resolver
        └── praxis activation
                 │
                 ▼
qcds_fabric.problem.problem_to_syntract
                 │
                 ▼
            QCDS Fabric
```

The canonical QCDS phases and core inference semantics remain unchanged.

The Python entry point is:

```text
qcds_fabric.robots.legal.sweden_housing
```

The public CLI is:

```text
qcds-legal-robot
```

## Swarm role

The Legal Logical Robot can participate as one capability inside a Living Swarm Logical Robot system.

```text
Legal Robot ─────────────┐
Evidence / Contract Robot├──► bounded capability packets
Timeline Robot ──────────┤             │
Source Robot ────────────┘             ▼
                               QCDS challenge / Syntract
```

Its packet is explicitly **non-authoritative over peer Reality**. Specialized expertise does not become truth merely because a specialist robot emitted it.

## How this grows

This directory is where the legal robot grows. Natural next layers include:

- substantially more of Chapter 12;
- more HD precedent and identified guiding Svea hovrätt decisions;
- Hyresnämnd material where it adds a distinct evidential/interpretive role;
- propositions, SOU and later treatment of case law;
- richer contract facts and documentary evidence;
- factual disputes and evidence strength;
- competing party arguments;
- temporal snapshots of the legal universe;
- adversarial benchmark cases with withheld/discriminating facts.

The target is not to make the law look simple. The target is to represent **where it is simple, where it is conditional, and where the legal system itself demands judgment**.

See also:

- [`COVERAGE.md`](COVERAGE.md)
- [`SOURCES.md`](SOURCES.md)
- [`ASSESSMENT_MODEL.md`](ASSESSMENT_MODEL.md)
- root [`LIVING_SWARM_LOGICAL_ROBOTS.md`](../../../LIVING_SWARM_LOGICAL_ROBOTS.md)
