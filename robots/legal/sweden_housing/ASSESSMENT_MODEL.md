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
REPRESENTED LEGAL QCDS UNIVERSE
    ↓
Conditions / oracles / recursive inference
    ↓
TruthDistribution
    ↓
Syntract
```

## Distinct legal source layers — one QCDS architecture

The legal sources remain distinct:

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

The current emulation path is:

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

The native quantum target uses the same source model but does not require the represented universe to be classically reduced to that active emulation room first.

## Hard law is a constraint, not a precomputed final answer

Condition Formation may deterministically establish structural facts that are genuinely fixed by the represented case:

- date / transition position;
- hard supplied factual conditions;
- explicit source scope or exclusion structure;
- which source-attributed rule constraints are reachable for a bounded software execution.

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

In **Quantum Full Space**, Conditions may mark/bind/transform the complete represented universe, but they may not delete dimensions merely because a classical implementation would find them expensive.

## Probabilistic facts stay probabilistic

A proposition can be legally relevant without being known with certainty.

For example:

```text
independent second-hand use     support 0.74
no valid excuse                 support 0.85
```

Those values can make the relevant statutory relation part of the bounded emulation problem without silently converting either proposition to `true`.

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

Hard law can therefore coexist with uncertain evidence in the same logical universe.

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

In current emulation, an open assessment question that belongs to the activated rule path remains a live QCDS dimension. If required factual material is absent, the legal output preserves the unresolved discriminator rather than guessing it.

In Quantum Full Space, represented open standards remain part of the complete target universe even when the current classical case projection does not activate them.

## Praxis is integrated by re-entry

In the software emulation path, praxis activates by explicit represented similarity or counter-factors. A separate precedent-relevance projection is retained only as an explanatory diagnostic.

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

For **Quantum Full Space**, the represented praxis corpus remains in the full-universe manifest; a precedent is not semantically deleted merely because the bounded classical activation pass did not select it.

## Three execution modes

The legal robot now exposes three distinct execution semantics:

```text
                 REPRESENTED LEGAL UNIVERSE
                           │
              ┌────────────┼─────────────┐
              ▼            ▼             ▼
      CLASSICAL EXACT   GROVER       QUANTUM FULL SPACE
      reference         EMULATED        TARGET
      bounded active    bounded active  complete represented
      projection        projection      universe retained
      exact 2^N         statevector     no semantic prefilter
              │            │             │
              ▼            ▼             ▼
       TruthDistribution  sibling      future native QPU
          / Syntract      Syntract
```

### Classical Exact

- reproducible reference emulator;
- resource-aware active projection is allowed before execution;
- the declared active `2^N` room is executed exactly;
- no candidate state is silently removed from that declared room.

### Grover Emulated

- software complex-amplitude statevector;
- same active BaseBundle + OracleStack as Classical Exact;
- weighted phase marking, inversion about the mean and adaptive Grover depth;
- memory-bounded and therefore allowed to use exact separable decomposition where logically justified.

### Quantum Full Space

- native-QPU target contract only in the current build;
- a separate full-universe manifest is compiled independently of the active emulator room;
- every represented rule term, represented praxis dimension and case/evidence term remains represented;
- semantic prefiltering for RAM/state-count convenience is forbidden;
- relevance is intended to emerge through Conditions, oracle interaction, amplitude evolution, recursive inference and Syntract binding.

## Scaling

The system distinguishes **emulation scaling** from **native quantum semantics**.

For emulation, where the OracleStack reveals independent active components, those components can be executed as bounded parallel Grover rooms. Where an oversized component remains coupled, arbitrary chunking is not claimed equivalent to global Grover evolution.

For Quantum Full Space, parallel / sequential / hybrid decomposition is valid only when the decomposition itself preserves the complete represented QCDS semantics. A classical relevance filter that deletes dimensions is not an acceptable quantum decomposition.

This keeps the QCDS parallel / sequential / hybrid architecture visible without pretending that every computational split preserves the same logical operation.

## Benchmarking

The current numerical legal benchmark compares the two executable software modes using metrics such as:

- entropy;
- oracle agreement;
- retained uncertainty;
- Grover depth / overshoot behavior;
- total-variation distance;
- top-state agreement;
- conflict markers.

QCDS is allowed to lose. A benchmark is a falsification surface, not a demonstration script whose answer is predetermined.

Quantum Full Space is not included in numerical substrate comparisons until a genuine compatible native backend is connected.

## Source classes can differ

The represented legal universe can include different epistemic source classes without pretending they are equivalent:

- statute and regulation;
- binding or guiding precedent;
- preparatory works;
- lower-court or tribunal material;
- doctrine;
- contracts and documentary evidence;
- testimony and disputed facts.

Each can exert a different kind of pressure on the Logical Space. None becomes automatic truth merely because it is ingested.

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
