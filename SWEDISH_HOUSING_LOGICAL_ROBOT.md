# Swedish Housing Law Logical Robot

> A specialized Logical Robot body above the shared QCDS / Syntract architecture.

The canonical domain home is:

[`robots/legal/sweden_housing/`](robots/legal/sweden_housing/)

The robot represents a bounded, source-attributed Swedish housing-law Logical Universe and runs each active legal problem through the existing QCDS Fabric.

## Current architecture

```text
case facts
    ↓
Swedish Housing Law Logical Robot
    ↓
Condition Formation
relevant source-attributed statutory constraints
+ live legal / assessment dimensions
    ↓
in-memory CSV active table
    ↓
BaseBundle + OracleStack
    ↓
exact active 2^N QCDS space
    ↓
dimension-null + position + oracle-exposure rotations
    ↓
stabilized TruthDistribution
    ↓
STATUTORY SYNTRACT
    ↓
DistributionOracle re-entry
+ active praxis dimensions / evidence
    ↓
expanded QCDS space
    ↓
FINAL LEGAL SYNTRACT
```

The preliminary legal resolver is retained for **Condition Formation, source selection and provenance**. It is not the producer of the final Legal Syntract.

Hard statutory consequences remain `?` dimensions before direct QCDS execution. Source-attributed legal rules become oracle constraints over candidate states. The stabilized QCDS distribution is what is bound as Syntract.

The active table may be serialized as CSV and loaded in memory, but CSV is only storage. Inference remains in the shared QCDS classes:

```text
BaseBundle
OracleStack
FabricLayer
DistributionOracle
Syntract
```

The legal robot does not contain a second QCDS implementation and the browser does not duplicate legal inference in JavaScript.

## Read the current documentation

- [`robots/legal/sweden_housing/README.md`](robots/legal/sweden_housing/README.md) — domain overview.
- [`robots/legal/sweden_housing/QCDS_EXECUTION.md`](robots/legal/sweden_housing/QCDS_EXECUTION.md) — exact direct-QCDS execution path.
- [`robots/legal/sweden_housing/COVERAGE.md`](robots/legal/sweden_housing/COVERAGE.md) — represented legal coverage.
- [`robots/legal/sweden_housing/SOURCES.md`](robots/legal/sweden_housing/SOURCES.md) — sources and authority classes.
- [`robots/legal/sweden_housing/ASSESSMENT_MODEL.md`](robots/legal/sweden_housing/ASSESSMENT_MODEL.md) — hard law, assessment and praxis boundaries.

## Run it

```bash
python -m pip install -e '.[test]'
qcds-legal-robot robots/legal/sweden_housing/cases/jb_late_rent_recovery_2026.json
```

Or use the public browser:

**https://iampathat.github.io/thesyntractvision/**

Choose **Swedish Law**.

## Output boundary

The public assessment result keeps the deterministic legal projection for explanation and provenance, but the main `qcds_core` object is the direct active-space execution. It exposes:

```text
candidate_binary_space
candidate_state_count
unknown_dimension_count
oracle_count
baseline_marginals
marginals
rotation_sensitivity
statutory_syntract_id
syntract_id
```

When relevant praxis activates, `syntract_id` is the final Syntract produced after the statutory QCDS distribution re-enters QCDS and the logical room expands with precedent dimensions.

## Legal boundary

This is research software and an inspectable architecture experiment. It is **not legal advice**, and the represented corpus is not complete Swedish housing law.

Every run carries a legal snapshot. Missing or open facts are not silently invented merely to force a legal answer.
