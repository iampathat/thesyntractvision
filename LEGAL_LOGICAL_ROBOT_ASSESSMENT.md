# Legal Logical Robot — Assessment Layer

> Swedish housing law as a mixed logical space: hard rules, temporal rules, exceptions, open-textured standards and precedent.

The Legal Logical Robot is deliberately **not** a conventional rule engine.

A legal system contains several different kinds of epistemic material at the same time:

```text
statutory rule
    + exception
    + transition rule
    + mandatory rule
    + contractual fact
    + disputed fact
    + open-textured legal concept
    + precedent
    + analogy
    + counter-analogy
    + evidential uncertainty
    ↓
legal assessment
```

That mixture is why law is a useful real-world QCDS domain.

## Two layers, not one

BUILD 39 created the first bounded source-attributed statutory universe.

BUILD 40 adds a separate precedent / assessment layer.

```text
CASE
 │
 ├── HARD / DECLARED LEGAL SPACE
 │     statute
 │     scope
 │     dates
 │     transition
 │     explicit exception
 │     explicit consequence
 │
 └── INTERPRETIVE / PRAXIS SPACE
       precedent
       factual similarity
       counter-factor
       analogy
       legal principle
       source authority
       competing interpretation
```

The two layers must not be collapsed.

A statutory condition can be represented as a hard logical condition. A precedent is different: it can be highly authoritative while still being only partly analogous to the present facts.

Therefore:

```text
authority ≠ similarity
similarity ≠ outcome
precedent ≠ automatic rule installation
```

## QCDS role

The praxis layer represents each precedent as a competing candidate in a QCDS problem space.

Represented similarity factors become positive evidence for precedent relevance. Explicit counter-factors become negative evidence. QCDS then receives the competing precedent candidates through the existing:

`qcds_fabric.problem.problem_to_syntract`

path.

The output is a stabilized **precedent-relevance distribution**, not a declaration that the leading precedent automatically decides the case.

This distinction matters. The Legal Logical Robot may say, in effect:

```text
Statutory regime: A

Relevant interpretive pressure:
  Precedent X  — strongly analogous on defect/materiality
  Precedent Y  — analogous on remedy but different factual setting
  Precedent Z  — counter-factor on independent use

Unresolved discriminator:
  fact Q
```

That is much closer to legal reasoning than:

```text
IF section = 12:16 THEN answer = X
```

## Current precedent corpus

`src/qcds_fabric/legal_data/sweden_housing_praxis_2026.json`

The first bounded corpus includes source-attributed Högsta domstolen precedents such as:

- **NJA 2020 s. 681 — “Lokalerna i Gulddragaren”**: classification under Chapter 12 and the residential/commercial distinction.
- **NJA 2022 s. 188 — “Lägenheten i Fältskären”**: hindrance/detriment and legal usability of a dwelling.
- **NJA 2022 s. 329 — “Brandskadan i asyllägenheten”**: second-hand/independent use and responsibility under Chapter 12.
- **NJA 2019 s. 445 — “Entré Malmö”**: hindrance/detriment, rent reduction and early termination in a serious defect setting.
- **NJA 2011 s. 454**: tenant responsibility, negligence and the legal significance of contractual house rules.

This corpus is intentionally small. It proves the architecture before broader ingestion of Supreme Court, Svea Court of Appeal and Housing and Tenancy Tribunal material.

## Why this can scale

A future legal universe does not need to convert every judgment into a deterministic rule.

A precedent can instead carry structured dimensions such as:

```text
court / authority
issue
statutory links
facts
ratio / principle
distinguishing facts
supporting factors
counter-factors
temporal validity
later treatment
```

A new case activates only the relevant part of that larger represented universe.

The same architecture can later add:

- Svea hovrätt guiding housing-law decisions;
- Hyresnämnd material where appropriate;
- preparatory works (`prop.`, `SOU`, committee reports);
- later treatment of a precedent;
- competing doctrinal interpretations;
- evidential disputes about the facts themselves.

None of those sources should become automatic truth merely because they are ingested.

## Swarm

A Legal Logical Robot can be one capability within a Living Swarm Logical Robot system.

For example:

```text
Legal Robot — statutory scope
Legal Robot — precedent assessment
Evidence Robot — contract / documents
Timeline Robot — dates and transition rules
Source Robot — current official law snapshot
        ↓
non-authoritative capability packets
        ↓
QCDS challenge / coherence / Syntract
```

No peer packet is authoritative over Reality.

## Architecture boundary

BUILD 40 does not modify QCDS core semantics.

It adds:

- `legal_assessment_robot.py`
- `sweden_housing_praxis_2026.json`
- tests for precedent competition and preservation of the statutory result

The public CLI `qcds-legal-robot` now composes the statutory Legal Logical Robot with this praxis assessment layer.

The old BUILD 39 statutory robot remains directly available in code and its regressions remain intact.
