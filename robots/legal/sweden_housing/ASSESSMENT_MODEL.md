# Legal assessment model

Swedish housing law is represented as a mixed logical space: hard rules, temporal rules, exceptions, open-textured standards, facts and precedent.

The Legal Logical Robot is deliberately **not** a conventional rule engine.

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

## Two layers, not one

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

```text
authority ≠ similarity
similarity ≠ outcome
precedent ≠ automatic rule installation
```

## QCDS role

The praxis layer represents each precedent as a competing candidate in a QCDS problem space. Represented similarity factors become positive evidence for precedent relevance. Explicit counter-factors become negative evidence. QCDS receives the competing precedent candidates through the existing `qcds_fabric.problem.problem_to_syntract` path.

The output is a stabilized precedent-relevance distribution, not a declaration that the leading precedent automatically decides the case.

A result can therefore separate the statutory regime from interpretive pressure:

```text
Statutory regime: A

Relevant interpretive pressure:
  Precedent X  — strongly analogous on defect/materiality
  Precedent Y  — analogous on remedy but different factual setting
  Precedent Z  — counter-factor on independent use

Unresolved discriminator:
  fact Q
```

## Representing precedent

A precedent can carry structured dimensions such as:

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

A new case activates only the relevant part of the larger represented universe.

## Source classes can differ

Future legal assessment can include different epistemic source classes without pretending they are equivalent:

- statute and regulation;
- binding or guiding precedent;
- preparatory works;
- lower-court or tribunal material;
- doctrine;
- contracts and documentary evidence;
- testimony and disputed facts.

Each may exert a different kind of pressure on the Logical Space. None becomes automatic truth merely because it is ingested.

## Swarm

The Legal Logical Robot can later cooperate with other capability robots:

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
