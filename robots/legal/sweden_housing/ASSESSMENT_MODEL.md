# Legal assessment model

Swedish housing law is represented as a mixed logical space: hard rules, temporal rules, exceptions, open-textured standards, facts, probabilistic evidence and precedent.

The Legal Logical Robot is deliberately **not** a conventional rule engine with a QCDS label attached afterward.

```text
statutory rule
    + exception
    + transition rule
    + mandatory rule
    + contractual fact
    + disputed fact
    + probabilistic evidence
    + open-textured legal concept
    + precedent
    + analogy
    + counter-analogy
    ↓
ACTIVE LEGAL QCDS SPACE
    ↓
TruthDistribution
    ↓
Syntract
```

## Distinct legal source layers — one final QCDS path

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
 ├── FACT / EVIDENCE STRUCTURE
 │     hard supplied fact
 │     source-attributed uncertain fact
 │     supporting evidence
 │     counter-evidence
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

But they participate in one Legal Syntract path:

```text
Condition Formation
        ↓
active BaseBundle + source-attributed OracleStack
        ↓
QCDS → statutory TruthDistribution → statutory Syntract
        ↓
re-entry + active praxis + remaining evidence
        ↓
QCDS again
        ↓
final Legal Syntract
```

## Hard law is a constraint, not a precomputed final answer

Condition Formation may deterministically establish structural facts that are genuinely fixed by the represented case:

- date / transition position;
- hard supplied factual conditions;
- explicit source scope or exclusion structure;
- which source-attributed rule constraints are reachable for the problem.

It must not pre-install the final legal result.

A legal consequence such as:

```text
conclusion:jb12_forfeiture_ground_late_residential_rent
```

remains a live `?` dimension in the QCDS BaseBundle. The represented statutory rule becomes an oracle constraint that scores candidate states.

```text
hard rule ≠ hard-coded answer before QCDS
hard rule = hard coherence constraint inside QCDS
```

## Probabilistic facts stay probabilistic

A proposition can be legally relevant without being known with certainty.

For example:

```text
independent second-hand use     support 0.74
no valid excuse                 support 0.85
```

Those values can make the relevant statutory constraint part of the active problem without silently converting either proposition to `true`.

```text
uncertain proposition
      ↓ Condition Formation
relevant rule becomes reachable
      ↓
proposition remains ?
      ↓ Conditional Evolution
EvidenceOracle applies source-attributed pressure
      ↓
QCDS distribution
```

Hard law can therefore coexist with uncertain evidence in the same active room.

Multiple evidentiary sources may support or oppose a proposition. Their confidence is oracle pressure inside the represented logical universe; it is **not automatically a calibrated probability that a court will reach a given outcome**.

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

When an open assessment question belongs to the activated rule path it remains a live QCDS dimension. If required factual material is absent, the legal output preserves the unresolved discriminator rather than guessing it.

## Praxis is integrated by re-entry

Praxis first activates by explicit represented similarity or counter-factors. A separate precedent-relevance projection is retained only as an explanatory diagnostic.

The final legal architecture is:

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
        +
case evidence where relevant
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

## Two execution substrates, same legal problem

The same final `BaseBundle + OracleStack` can be executed through:

```text
                 SAME ACTIVE LEGAL ROOM
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
      CLASSICAL EXACT         GROVER EMULATED
      exact 2^N support       software statevector
      oracle weighting        weighted phase marking
      QCDS rotations          adaptive Grover depth
      stabilization           QCDS rotations
              │                     │
              ▼                     ▼
       TruthDistribution      TruthDistribution
              │                     │
              ▼                     ▼
      reference Syntract      sibling Syntract
```

Classical Exact is the reproducible reference emulator. Grover Emulated is a software quantum-statevector substrate. Neither changes the legal source model.

The two distributions are compared rather than forced to be numerically identical.

## Scaling

The system does not silently prune active legal dimensions merely to fit a simulator.

Where the OracleStack reveals independent live components, those components can be executed as bounded parallel Grover rooms.

Where an oversized component remains coupled, arbitrary chunking is not claimed equivalent to global Grover evolution. Such a component requires a larger substrate or an explicit logically justified sequential/hybrid decomposition.

This keeps the QCDS parallel / sequential / hybrid architecture visible without pretending that every computational split preserves the same logical operation.

## Benchmarking

The legal benchmark compares the sibling substrates using metrics such as:

- entropy;
- oracle agreement;
- retained uncertainty;
- Grover depth / overshoot behavior;
- total-variation distance;
- top-state agreement;
- conflict markers.

QCDS is allowed to lose. A benchmark is a falsification surface, not a demonstration script whose answer is predetermined.

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

See [`QCDS_EXECUTION.md`](QCDS_EXECUTION.md) for the detailed mechanics.
