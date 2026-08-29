# Evidence-Driven Reality Discovery — BUILD 22

BUILD 22 closes a gap left by BUILD 21.

BUILD 21 proved that QCDS can generate rival oracle hypotheses, challenge them and promote a surviving bounded rule into the observed `reality` Logical Universe without materializing the derived term into every base row. Its challenge answers, however, were supplied by the caller.

BUILD 22 removes that manual challenge-answer step for a bounded MVP.

```text
unresolved Reality question
        ↓
oracle gap
        ↓
target-blind rival oracle hypotheses
        ↓
QCDS disagreement planning
        ↓
current context + target-blind contrast context
        ↓
Logical Robot acquires independent observations
        ↓
conflict / independence gate
        ↓
selection + holdout challenge assembled from observations
        ↓
BUILD 21 oracle challenge
        ↓
BUILD 19 Reality blast-radius governance
        ↓
new resolved Reality logic, or no change
```

The implementation is an additive overlay in `src/qcds_fabric/evidence_driven_reality.py`. It does not change the locked QCDS Fabric v1.0 specification or the existing QCDS/Fabric, oracle-genesis, evidence-planning, Logical Robot, Logical Space, Logical Universe or BUILD 21 core modules.

## Why contrast evidence is required

The first BUILD 22 attempt asked two independent sources the same unresolved question in the same context. That was insufficient. Agreement about an outcome does not by itself identify which of several rival logical implications explains it.

For example, observing `flies` twice while the current context is `winged` can still leave reverse or complement hypotheses underidentified.

BUILD 22 therefore does something stricter before observing the answer:

1. The existing unresolved context becomes the selection context.
2. QCDS evaluates represented alternate contexts using the existing target-blind disagreement planner.
3. The alternate context with strongest bounded discrimination becomes the holdout context.
4. Only then does the Logical Robot observe the target query in those contexts.

In the runnable example:

```text
current context:   trait = winged
contrast context:  trait = grounded
question:          ability = ?
```

The planner chooses the contexts before it sees `flies` or `walks`.

## What the Logical Robot sees

The Logical Robot receives:

- the query to observe;
- the represented candidate values;
- the selected logical context;
- source-independence requirements;
- an observation objective.

It does **not** receive:

- selection/holdout role;
- expected answer;
- challenge target;
- oracle hypothesis IDs;
- the eventual promoted rule.

The selection/holdout role is internal to the BUILD 22 planner and is fixed before the observed target value arrives.

## Evidence gates

BUILD 22 fails closed before challenge construction when the evidence is not identifying enough.

- The current context requires two independent source IDs by default.
- The contrast context requires at least one independent source by default.
- The same source cannot satisfy multiple independence requirements.
- If independent observations in the same planned context disagree on the represented target value, BUILD 22 records `conflicting_identifying_evidence` and creates no challenge and no active rule.
- Missing current or contrast observations produce `awaiting_identifying_evidence`.

These defaults are MVP policy, not canonical QCDS constants.

## Challenge construction

Only after the observations pass the evidence gates does BUILD 22 construct a challenge suite.

The context itself is part of the generated case because it was selected before observing the target outcome. The observed target value becomes the external expected assignment for that case.

Example:

```text
planned before observation:
  selection context = winged
  holdout context   = grounded

observed later:
  winged source A   -> flies
  winged source B   -> flies
  grounded source C -> walks
```

This becomes two independent selection cases and one holdout case. The challenge is then handed to BUILD 21. The oracle generator still never receives those target assignments.

## Reality governance still applies

Successful evidence acquisition and oracle challenge do not bypass BUILD 19 rule-drift governance.

A challenged candidate with an excessive logical blast radius remains quarantined. BUILD 22 never automatically requests a blast-radius override.

## Persistence

Source-attributed base Reality bindings are persisted before derived-rule discovery. The discovery trace is additionally appended to:

```text
intelligence_store/reality_discovery_history.jsonl
```

A successful learned rule remains in the existing Reality `logical_rules.csv`. On a later run, if the requested probe already resolves from stored Reality logic, BUILD 22 returns `already_resolved` without asking the Logical Robot to reacquire the same evidence.

## Run the MVP

```bash
python -m pip install -e '.[test]'
qcds-reality-discovery examples/evidence_driven_reality_mvp.json --store ./intelligence_store
```

## Claim boundary

BUILD 22 is a bounded classical Python proof of an architectural property:

> a missing logical capability can trigger target-blind rival generation, target-blind evidence-question selection, external observation, automatically assembled independent challenge cases, challenged oracle selection and governed Reality expansion without a manually supplied challenge answer.

It does not establish automatic scientific truth discovery, universal causal identification, AGI/ASI, quantum advantage, billion-scale execution or correctness of arbitrary external observations. The current context search is deliberately bounded to represented categorical alternatives and the current resolver remains classical Python over inspectable persistence.
