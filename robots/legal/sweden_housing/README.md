# Swedish Housing Law Logical Robot

This directory is the domain home for the first substantial real-world Legal Logical Robot.

It models a bounded Swedish housing-law universe around:

- 12 kap. jordabalken;
- Privatuthyrningslag (2026:772);
- the preserved legacy effects of lag (2012:978) om uthyrning av egen bostad;
- temporal and transition rules;
- statutory scope and explicit exclusions;
- selected operational consequences;
- precedent / praxis as an interpretive assessment layer.

The purpose is not to build a conventional legal lookup tool. It is to expose a mixed legal Logical Universe where hard statutory logic, open-textured legal concepts, competing precedent analogies, disputed facts and unresolved questions can coexist.

```text
CASE
 │
 ├── declared statutory space
 │     statute / scope / dates / transition / exceptions
 │
 ├── factual space
 │     known / disputed / missing facts
 │
 ├── interpretive space
 │     precedent / analogy / counter-factor / principle
 │
 └── source provenance
        authority / time / citation
             ↓
      QCDS / Syntract core
             ↓
  competing coherent legal states
             ↓
          Syntract
```

## Architecture boundary

This is a **specialized Logical Robot**, not a new core.

```text
Swedish Housing Legal Robot
        ↓
Logical Universe + domain projection
        ↓
qcds_fabric.problem.problem_to_syntract
        ↓
QCDS Fabric
```

The canonical four-phase QCDS architecture remains unchanged.

## Domain layers

### Statutory layer

The statutory body represents hard or declared material such as effective dates, applicability requirements, transition rules and explicit exclusions. Its current implementation lives behind the public `qcds-legal-robot` path.

### Praxis / assessment layer

Precedent is deliberately not installed as another deterministic rule table.

```text
authority ≠ similarity
similarity ≠ outcome
precedent ≠ automatic rule installation
```

A precedent can be highly authoritative while only partly analogous to the facts before the robot. Similarity factors and counter-factors therefore enter as competing interpretive evidence and receive a separate QCDS assessment pass.

### Future layers

This domain can expand with:

- more of 12 kap. jordabalken;
- Svea hovrätt guidance;
- Hyresnämnd material where appropriate;
- propositions, SOU and other preparatory works;
- later treatment of precedent;
- competing doctrinal interpretations;
- contracts and other case evidence;
- disputed facts and evidential strength;
- temporal snapshots of the legal universe.

## Case fixtures

The `cases/` directory contains small executable legal scenarios used to exercise different legal regimes. They are fixtures, not the domain model itself.

## Swarm role

This robot can later participate as one capability within Living Swarm Logical Robots. A legal robot packet remains non-authoritative and must still be challenged/bound through the shared QCDS architecture.

See also the implementation-level assessment note in this directory and the root [`LIVING_SWARM_LOGICAL_ROBOTS.md`](../../../LIVING_SWARM_LOGICAL_ROBOTS.md).
