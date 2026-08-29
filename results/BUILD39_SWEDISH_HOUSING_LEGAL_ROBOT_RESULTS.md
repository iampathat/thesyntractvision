# BUILD 39 — Swedish Housing Law Logical Robot

Verified on `main` with the repository regression/falsification suite.

## What was added

BUILD 39 adds a specialized Legal Logical Robot body for a bounded Swedish housing-law universe.

It does **not** replace the existing Logical Robot and does **not** modify QCDS/Fabric core semantics.

New pieces:

- `src/qcds_fabric/legal_logical_robot.py`
- `src/qcds_fabric/legal_data/sweden_housing_2026.json`
- `examples/swedish_housing_case_2026.json`
- `examples/swedish_housing_case_legacy_2026.json`
- `examples/swedish_housing_case_jb12_2026.json`
- `SWEDISH_HOUSING_LOGICAL_ROBOT.md`
- `tests/test_build39_legal_logical_robot.py`
- CLI: `qcds-legal-robot`

Package version: `qcds-fabric 1.29.0`.

## Architecture verified

```text
case facts
    ↓
Legal Logical Robot body
    ↓
declared Swedish Housing Law Logical Universe
    ↓
existing LogicalRuleGovernance + LogicalSpaceResolver
    ↓
applicable modeled regime / consequences / unresolved facts
    ↓
existing qcds_fabric.problem.problem_to_syntract
    ↓
Syntract
    ↓
optional bounded swarm packet
```

The returned architecture boundary explicitly reports:

- specialized Logical Robot body: yes;
- existing Logical Universe governance: yes;
- talks to QCDS core: yes;
- QCDS core modified: no;
- canonical specification modified: no;
- authority over peer Reality: no.

## Legal universe

Snapshot: `2026-08-29`.

The first bounded corpus contains three official SFS source families and more than twenty represented statutory sections/rules covering, among other things:

- current private-letting scope;
- 2026 transition from the repealed 2012 Act;
- general Chapter 12 fallback track;
- scope exclusions;
- tenant-adverse clauses;
- notice;
- rent review;
- late rent and cure;
- second-hand letting;
- material defects.

The corpus is source-attributed and intentionally incomplete. It is a falsifiable research universe, not a complete legal database and not legal advice.

## Verified cases

### Current 2026 private-letting case

`examples/swedish_housing_case_2026.json`

The regression requires the legal universe to resolve the current modeled private-letting regime and derive the relevant represented consequences for the supplied late-rent, subletting, rent-review, fixed-term and adverse-clause facts. The result must then call `qcds_fabric.problem.problem_to_syntract` without modifying the canonical core.

### Preserved legacy case

`examples/swedish_housing_case_legacy_2026.json`

The regression requires a May 2026 qualifying agreement, evaluated on 29 August 2026, to remain on the modeled legacy 2012 Act + residual Chapter 12 path through the transition rule.

### Chapter 12 fallback case

`examples/swedish_housing_case_jb12_2026.json`

The regression changes a scope condition to regular letting of more than two external units. The current private-letting regime must be excluded and the case must enter the represented Chapter 12 track.

### Missing-fact case

A deliberately incomplete case is also tested. Missing scope facts must remain explicit unresolved questions rather than being invented in order to force a regime.

### Swarm packet

The bounded packet is tested to ensure it:

- identifies `legal_logical_robot` / `swedish_housing_law`;
- carries the resulting Syntract id;
- does not include the raw case;
- is not authoritative over peer Reality.

## Regression result

GitHub Actions run `33248430973` completed successfully on BUILD 39.

```text
365 passed in 10.12s
```

This includes the pre-existing repository suite plus the new BUILD 39 legal-robot regression cases.
