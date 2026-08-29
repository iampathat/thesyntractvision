# Swedish Housing Law Logical Robot

> A specialized Logical Robot body above the existing QCDS / Syntract architecture.

This is the first non-toy legal Logical Universe in this repository. It models a bounded snapshot of Swedish housing law and lets a case move through source-attributed legal rules, unresolved fact requirements and the existing QCDS core without introducing a second reasoning engine.

## Architecture

```text
case facts
    ↓
Swedish Housing Legal Logical Robot
    ↓
source-attributed declared Logical Universe
    ↓
existing LogicalRuleGovernance
    ↓
existing LogicalSpaceResolver
    ↓
applicable regime + consequences + unresolved facts
    ↓
existing qcds_fabric.problem.problem_to_syntract
    ↓
Syntract / truth distribution
    ↓
optional bounded swarm packet
```

The Legal Logical Robot is a **body/capability**, not QCDS itself. It does not move inference authority into a legal adapter, UI or swarm layer.

## Corpus snapshot

Packaged corpus:

`src/qcds_fabric/legal_data/sweden_housing_2026.json`

Snapshot date: **2026-08-29**.

The first corpus deliberately stays bounded but real. It currently represents selected applicability, transition, rent, notice, subletting, defect and termination logic from:

- **Privatuthyrningslag (2026:772)** — current private-letting regime from 1 July 2026.
- **Lag (2012:978) om uthyrning av egen bostad** — repealed from 1 July 2026 but preserved for qualifying agreements entered under that Act.
- **Jordabalk (1970:994), 12 kap. Hyra** — the general tenancy-law track represented by this first legal universe.

Official source URIs are stored with the corpus and returned with the applied rule path.

This is not a claim that the corpus is a complete representation of Swedish housing law. It is a source-attributed, inspectable legal universe intended for falsifiable QCDS experiments.

## Why this is different from the old lawbook demo

The old `examples/logical_universe_lawbook_mvp.json` was intentionally tiny: `human => legal_person`.

BUILD 39 does not replace that regression fixture. Instead it adds a separate domain robot with:

- multiple statutory regimes;
- date-dependent applicability;
- transition rules;
- exclusions and fallbacks;
- mandatory tenant-protection rules;
- rent-review paths;
- notice rules;
- late-rent cure logic;
- unauthorized subletting logic;
- material-defect logic;
- explicit unresolved fact requirements;
- official source provenance;
- a real QCDS `problem_to_syntract` pass after legal-universe resolution.

The represented legal corpus may contain many sections and rules while a single case activates only the subset whose conditions are present in that case binding.

## Run the current-law example

```bash
python -m pip install -e '.[test]'
qcds-legal-robot examples/swedish_housing_case_2026.json
```

The example concerns a new August 2026 residential letting by a natural person, together with rent-review, late-rent, contractual and subletting facts.

## Run the transition example

```bash
qcds-legal-robot examples/swedish_housing_case_legacy_2026.json
```

This case was entered in May 2026 and is designed to exercise the transition from the repealed 2012 private-letting Act into the 2026 legal snapshot.

## Run the general Chapter 12 track

```bash
qcds-legal-robot examples/swedish_housing_case_jb12_2026.json
```

This case changes one important scope condition: regular letting of more than two external units. The specialized 2026 private-letting regime is therefore excluded in the modeled universe and the case enters the represented Chapter 12 track.

## Case input

A case is explicit structured evidence, not free text silently promoted to law or truth.

```json
{
  "case_id": "example",
  "as_of_date": "2026-08-29",
  "contract_date": "2026-08-10",
  "facts": {
    "landlord_type": "natural_person",
    "residential_use": true,
    "holiday_purpose": false,
    "landlord_holds_unit_as_tenant": false,
    "regular_external_units": 2
  }
}
```

Missing facts become explicit `question:*` terms. The robot must not invent them merely to reach a legal regime.

## Output

The result separates several layers that are easy to conflate in ordinary legal-answer systems:

```text
case_terms
resolved_terms
primary_regimes
conclusions
unresolved_questions
applied_rules
sources
qcds_core
swarm_packet
```

`applied_rules` and `sources` provide the inspectable legal path. `qcds_core` proves that the specialized robot communicates with the existing QCDS core rather than replacing it.

## Swarm boundary

The robot emits an optional bounded capability packet:

```text
packet_type: qcds.logical_robot.capability_result.v1
robot_kind: legal_logical_robot
capability: swedish_housing_law
raw_case_included: false
authoritative_over_peer_reality: false
```

A future Living Swarm Logical Robot may exchange this packet as source-attributed input for challenge or verification. A peer must not treat it as automatic truth or permit it to overwrite Reality.

## Architecture boundary

BUILD 39 intentionally does **not** modify:

- the canonical QCDS four phases;
- `fabric.py`;
- `problem.py`;
- `oracles.py`;
- `rotations.py`;
- `stabilize.py`;
- the existing BUILD 38 public Logical Robot experience;
- the main README architecture narrative.

The new layer reuses existing Logical Universe governance/resolution and existing `problem_to_syntract` execution.

## Legal boundary

This is research software and an inspectable architecture experiment. It is **not legal advice** and the current corpus is not complete Swedish housing law.

Every run carries a corpus snapshot date. A case evaluated for a later date must first establish that the legal snapshot is still current.
