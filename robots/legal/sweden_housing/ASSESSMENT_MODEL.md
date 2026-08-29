# Legal assessment model

Swedish housing law is represented as a mixed logical space: hard rules, temporal rules, exceptions, open-textured standards, facts, evidence and precedent.

The Legal Logical Robot is deliberately **not** a conventional rule engine with a QCDS label attached afterward.

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
ACTIVE LEGAL QCDS SPACE
    ↓
Syntract
```

## Distinct legal source layers — one final QCDS room

The legal sources remain distinct even though the final problem is integrated:

```text
CASE
 │
 ├── HARD / DECLARED LEGAL STRUCTURE
 │     statute
 │     scope
 │     dates
 │     transition
 │     explicit exception
 │     procedural safeguard
 │
 ├── ASSESSMENT STRUCTURE
 │     reasonableness
 │     materiality
 │     degree
 │     proportionality
 │     missing / disputed discriminator
 │
 └── INTERPRETIVE / PRAXIS STRUCTURE
       precedent
       factual similarity
       counter-factor
       analogy
       legal principle
       source authority
       competing interpretation
```

These source classes are **not flattened into one kind of evidence**.

But they ultimately participate in one Legal Syntract path:

```text
Condition Formation
        ↓
active statutory BaseBundle + rule OracleStack
        ↓
QCDS → statutory TruthDistribution → statutory Syntract
        ↓
re-entry + active praxis dimensions
        ↓
QCDS again
        ↓
final Legal Syntract
```

## Hard law is a constraint, not a precomputed final answer

Condition Formation may deterministically establish structural facts that are genuinely hard and already fixed by the represented case:

- date / transition position;
- supplied factual conditions;
- explicit source scope or exclusion structure;
- which source-attributed rule constraints are reachable for the problem.

It must not pre-install the final legal result.

A legal consequence such as:

```text
conclusion:jb12_forfeiture_ground_late_residential_rent
```

remains a live `?` dimension in the QCDS BaseBundle. The represented statutory rule becomes an oracle constraint that scores the candidate states.

This means:

```text
hard rule ≠ hard-coded answer before QCDS

hard rule = hard coherence constraint inside QCDS
```

## Open standards stay open

Questions such as these are not converted to binary truth merely because the statute contains them:

```text
minor significance?
reasonably acceptable?
material inconvenience?
specially serious disturbance?
material defect?
reasonable to require the tenant to move?
```

When an open assessment question belongs to the activated rule path it remains a live QCDS dimension. If required factual material is absent, the legal output also preserves the unresolved discriminator rather than guessing it.

## Praxis is integrated by re-entry

Praxis first activates by explicit represented similarity or counter-factors. The separate precedent-relevance projection is retained only as an explanatory diagnostic.

The final legal architecture is instead:

```text
STATUTORY SYNTRACT
        ↓
DistributionOracle re-entry
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

The boundaries remain strict:

```text
authority ≠ similarity
similarity ≠ outcome
precedent ≠ automatic rule installation
```

Authority metadata is kept separate from factual similarity. A close Svea hovrätt decision does not become a higher authority than an HD precedent merely because it is factually closer.

## QCDS execution

The active legal room uses the existing shared QCDS Fabric:

```text
BaseBundle
    ↓
OracleStack
    ↓
exact classical 2^N candidate-state enumeration
    ↓
dimension-null rotations
position rotations
oracle-exposure rotations
    ↓
stabilization
    ↓
TruthDistribution
    ↓
Syntract
```

The current classical implementation is deliberately exact within its configured bound. It does not silently prune a larger room and still claim full execution.

CSV may be used as an in-memory tabular substrate for the projected legal dimensions, but CSV has no inference authority.

See [`QCDS_EXECUTION.md`](QCDS_EXECUTION.md) for the detailed execution mechanics.

## Source classes can differ

The represented legal universe can include different epistemic source classes without pretending they are equivalent:

- statute and regulation;
- binding or guiding precedent;
- preparatory works;
- lower-court or tribunal material;
- doctrine;
- contracts and documentary evidence;
- testimony and disputed facts.

Each can exert a different kind of pressure on the active Logical Space. None becomes automatic truth merely because it is ingested.

## Swarm

The Legal Logical Robot can cooperate with other capability robots:

```text
Legal Robot — statutory structure
Legal Robot — integrated Legal Syntract
Evidence Robot — contract / documents
Timeline Robot — dates and transition rules
Source Robot — current official law snapshot
        ↓
non-authoritative capability packets
        ↓
QCDS challenge / coherence / Syntract
```

No peer packet is authoritative over Reality.
