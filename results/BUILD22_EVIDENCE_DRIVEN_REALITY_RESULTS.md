# BUILD 22 — Evidence-Driven Reality Discovery Result

**Status:** PASS  
**Date:** 2026-08-28  
**Package:** `qcds-fabric 1.13.0`  
**Fresh proof wrapper commit:** `b05db2d576ac6331301b24b130c96d5a794166f1`  
**GitHub Actions proof run:** `33210935010`  
**Raw result:** [`BUILD22_EVIDENCE_DRIVEN_REALITY_RESULT.json`](BUILD22_EVIDENCE_DRIVEN_REALITY_RESULT.json)

---

## Question tested

BUILD 22 asks a stricter question than BUILD 21:

> Can an unresolved Reality question cause QCDS to generate rivals, decide which contexts need observation, send those questions to a Logical Robot, construct its own independent selection/holdout challenge from returned observations, and then expand governed Reality logic — without a caller supplying the challenge answers?

The answer in the bounded test is **yes**.

This is a classical Python architectural proof, not an AGI/ASI, automatic-science or quantum-performance claim.

---

## Final closed cycle

```text
Reality Logical Space
        ↓
ability unresolved under trait=winged
        ↓
1 oracle gap
        ↓
12 target-blind rival implication hypotheses
        ↓
QCDS disagreement planning
        ↓
current context selected before outcome:
trait=winged
        +
target-blind contrast context:
trait=grounded
        ↓
Logical Robot observes ability
        ↓
2 independent winged sources: flies
1 independent grounded source: walks
        ↓
independence + contradiction gate
        ↓
3 challenge cases generated automatically
2 selection + 1 holdout
        ↓
BUILD 21 challenge / falsification
        ↓
winged => flies survives
        ↓
BUILD 19 Reality blast-radius governance
        ↓
promoted without override
        ↓
resolved flies: 0 → 2
```

Neither the `challenge` object nor `expected_assignments` appears in the BUILD 22 input. Observation-pool records are also rejected if they attempt to carry challenge roles or target-answer fields.

---

## Primary result

| Measurement | Result |
|---|---:|
| Oracle gaps | 1 |
| Rival oracle hypotheses | 12 |
| Planned target query | `ability` |
| Current context | `trait = winged` |
| Contrast context | `trait = grounded` |
| Independent current-context sources | 2 |
| Independent contrast-context sources | 1 |
| Logical Robot observations | 3 |
| Generated challenge cases | 3 |
| Selection cases | 2 |
| Holdout cases | 1 |
| Selected rule | `winged => flies` |
| Resolved `flies` before | 0 |
| Resolved `flies` after | 2 |
| Knowledge gain | **+2** |
| Active generated Reality rules | 1 |
| Automatic blast override | **No** |

**Overall: PASS.**

The Logical Robot was given the represented query, candidate values and chosen context. It was not given selection/holdout role, expected answer or oracle hypothesis IDs.

---

## Why the first BUILD 22 design failed

The first implementation asked two independent sources the same target question under the same current context.

```text
trait = winged
ability = ?
```

Both could report `flies`, but that did not identify why `flies` followed. Rival reverse/complement implications could still survive the narrow evidence. The run ended in quarantine rather than a valid Reality expansion.

That failure was not patched by weakening the tests or by steering the generator toward `winged => flies`.

Instead BUILD 22 was changed to require **contrast evidence**. Before seeing target outcomes, the existing unresolved context becomes the selection context and the existing QCDS disagreement planner scores represented alternate contexts. The best bounded contrast becomes the holdout context.

For this problem the resulting pre-observation plan is:

```text
current:   trait = winged
contrast:  trait = grounded
observe:   ability
```

Only after those contexts are fixed does the Logical Robot acquire the target values.

The falsification therefore established an architectural requirement:

> Independent sources are not enough when they repeat the same underidentified experiment; the evidence plan must discriminate among rival logical explanations.

---

## Contradictory evidence control

A separate proof changed the second independent `winged` observation from `flies` to `walks`.

Result:

```text
status                    = conflicting_identifying_evidence
generated challenge cases = 0
active Reality rules      = 0
```

The contradiction is therefore retained as an unresolved evidence state. It is not collapsed into a challenge target and no candidate is allowed to become active Reality logic.

---

## Missing contrast evidence control

A separate run removed the `grounded` contrast observation while retaining both independent `winged` observations.

Result:

```text
status                    = awaiting_identifying_evidence
generated challenge cases = 0
active Reality rules      = 0
```

Agreement in the current context is deliberately insufficient when the selected discriminating contrast has not been observed.

---

## High-blast control

The evidence-driven loop was also run with four `winged` and four control Reality bindings.

The same evidence acquisition and challenge selected:

```text
winged => flies
```

but the proposed rule would change 4 / 8 = **50%** of the represented Reality space.

Result:

```text
status               = quarantined
changed_fraction     = 0.5
active_reality_rules = 0
```

Evidence-driven discovery therefore does not bypass the existing observed-universe drift policy.

---

## Restart / reuse

The successful example was immediately run again against the same intelligence store.

```text
status               = already_resolved
evidence plans       = 0
robot observations   = 0
active Reality rules = 1
```

The learned Reality rule is reused rather than reacquiring the same evidence.

---

## Boundaries proven by tests

BUILD 22 tests explicitly check that:

- a caller cannot supply a manual challenge suite;
- a caller cannot supply top-level expected assignments;
- observation fixtures cannot label rows as selection/holdout or carry target-answer fields;
- the Logical Robot receives context but not selection/holdout role, expected answer or hypothesis IDs;
- two independent current-context sources are required by default;
- a contrast-context source is separately required;
- duplicate source IDs do not fake independence;
- conflicting evidence blocks challenge construction;
- missing contrast evidence leaves the cycle resumably unresolved;
- a challenged rule still passes through BUILD 19 blast-radius governance;
- successful learned Reality logic is reused on restart;
- solution rules are still forbidden from the initial problem input.

The complete repository suite after the final design passed:

```text
303 passed
0 failed
```

---

## What BUILD 22 establishes

Within the bounded test, the implementation now connects:

```text
I do not know
    ↓
which rival logical explanations exist?
    ↓
where would those rivals disagree?
    ↓
which represented context should I observe?
    ↓
Logical Robot acquires independent evidence
    ↓
is the evidence sufficient and non-contradictory?
    ↓
build challenge from observations
    ↓
falsify rivals
    ↓
govern blast radius
    ↓
expand Reality logic or remain unresolved
```

That is materially different from BUILD 21 because the challenge outcomes are not manually supplied to the BUILD 22 caller.

---

## What it does not establish

The current MVP remains deliberately bounded:

- context selection currently varies represented categorical context values one axis at a time;
- the observation-pool tool is a deterministic proof fixture, not a claim that arbitrary web or physical evidence is reliable;
- source independence is represented by source IDs and is not yet a full causal/provenance independence model;
- contradiction handling is a fail-closed gate, not yet a probabilistic global contradiction resolver;
- the resolver remains classical Python over inspectable persistence;
- there is no claim of automatic scientific truth discovery, causal completeness, AGI, ASI, quantum advantage or large-scale performance.

The architectural boundary remains replaceable: future web, scientific-instrument, simulation or physical-robot bodies can implement the same `LogicalRobotTool` contract without receiving the hidden challenge answer.
