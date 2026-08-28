# BUILD 21 — Self-Expanding Reality Logic Result

**Status:** PASS  
**Date:** 2026-08-28  
**Package:** `qcds-fabric 1.12.0`  
**Implementation commit:** `5edf05756142ba81ea1e6dead57c3351e4c1f088`  
**Fresh proof wrapper commit:** `795043d353d7af5f413bb8f09f3bdf919f02c3df`  
**GitHub Actions proof run:** `33209232611`  
**Raw result:** [`BUILD21_SELF_EXPANDING_REALITY_RESULT.json`](BUILD21_SELF_EXPANDING_REALITY_RESULT.json)

---

## Question tested

BUILD 21 tests a stricter property than the earlier global-rule demonstrations:

> **Can the resolved Reality Logical Space gain a capability after QCDS oracle genesis and falsification when the missing logical rule was not supplied to the genesis input?**

The test is a bounded classical Python proof. It is not an AGI, ASI or quantum-performance claim.

---

## Closed cycle

```text
Reality Logical Space
        ↓
ability unresolved
        ↓
Oracle gap
        ↓
target-blind pairwise oracle genesis
        ↓
12 rival implication hypotheses challenged
        ↓
selection + independent holdout
        ↓
1 oracle selected
        ↓
winged => flies
        ↓
Reality rule-drift governance
        ↓
promoted without blast override
        ↓
resolved knowledge: flies 0 → 2
```

The semantic rule `winged => flies` is absent from the genesis problem input and from the challenge frames. BUILD 21 rejects specs that preload semantic rules into either location.

Challenge targets are used after candidate generation to test hypotheses; they are not passed into the genesis generator.

---

## Primary result

| Measurement | Result |
|---|---:|
| Reality base bindings | 8 |
| Bindings containing `winged` | 2 |
| Stored base bindings containing `flies` | 0 |
| Oracle gaps | 1 |
| Rival hypotheses challenged | 12 |
| Hypotheses rejected | 9 |
| Oracle promotions | 1 |
| Selected logical rule | `winged => flies` |
| Resolved `flies` before cycle | 0 |
| Resolved `flies` after cycle | 2 |
| Knowledge gain on probe | **+2** |
| Reality bindings changed by proposed rule | 2 / 8 (25%) |
| Blast-radius override | **No** |
| Active generated Reality rules | 1 |

**Overall: PASS.**

The newly challenged rule makes two already represented Reality bindings resolvable through `flies` without adding `flies` to either base row.

---

## Persistence / non-materialization

The same example was executed a second time against the same store.

```text
restart_added_bindings = 0
knowledge_before       = 2
knowledge_after        = 2
active_reality_rules   = 1
rule_status            = already_active
```

The eight-row base Logical Space contains no materialized `flies` term after either run.

Base-space SHA-256:

```text
0cd03cdb87e743d0c07b872497096213ac4bd312a945de4eeffb19b52dc55ca9
```

The digest is unchanged across the rule-growth cycle. The new capability exists in the resolved logical space, not as a rewrite of the base observations.

---

## High-blast control

The same discovery/challenge experiment was repeated in a separate fresh Reality store with four `winged` and four control bindings.

QCDS again selected:

```text
winged => flies
```

but applying it would change 4 / 8 = **50%** of the represented Reality bindings. Under the current conservative observed-universe policy, that exceeds the permitted changed fraction.

Result:

```text
status               = quarantined
changed_fraction     = 0.5
active_reality_rules = 0
automatic_override   = false
```

This demonstrates that passing oracle challenge does not bypass Reality drift governance.

---

## A falsification that improved the experiment

The first BUILD 21 test did **not** pass.

The original synthetic universe had two one-hot trait candidates and two one-hot ability candidates:

```text
trait:   winged / grounded
ability: flies / walks
```

QCDS selected the implication:

```text
walks => grounded
```

rather than the intended direct rule:

```text
winged => flies
```

This was not treated as a code error or patched around. In a two-by-two one-hot space, complement/reverse implications can become observationally degenerate. In the selection case, suppressing `grounded` also lets `walks => grounded` suppress `walks`, indirectly favoring `flies`.

The global Logical Space then correctly rejected that selected oracle as a global rule because no stored base binding contained `walks`:

```text
changed_bindings = 0
changed_fraction = 0
reason           = zero_effect
status           = quarantined
```

The falsification therefore exposed an **underidentified challenge design**.

The experiment was strengthened by adding a third ability candidate:

```text
flies / walks / swims
```

With that symmetry broken, reverse/complement rules could no longer obtain the same effect by excluding the sole alternative. On the strengthened test, QCDS selected the direct `winged => flies` hypothesis.

This is an important result in its own right: oracle challenges must be **identifying**, not merely capable of producing a green test.

---

## Regression suite

After strengthening the falsification test, the complete repository suite passed:

```text
291 passed
0 failed
```

The BUILD 21 tests cover:

- closed-cycle Reality expansion;
- direct generated-rule identity;
- false rival rejection;
- non-materialized derived knowledge;
- high-blast quarantine after successful oracle challenge;
- restart/idempotence;
- rejection of answer-smuggling through problem rules;
- rejection of answer-smuggling through challenge-frame rules;
- explicit overlay and target/holdout provenance boundaries.

---

## What this establishes

Within the bounded test, the implementation demonstrates a first connected cycle in which:

```text
missing capability
→ oracle gap
→ generated rival logic
→ external challenge / holdout
→ surviving oracle
→ governed global Reality rule
→ new resolved capability
```

The missing rule itself was not supplied to the genesis input, and a bad rival was rejected rather than becoming active Reality logic.

This is materially different from BUILD 18–20, where the global logical rule was supplied explicitly to demonstrate projection semantics.

---

## What it does not establish

The challenge suite and its expected assignments are still externally supplied. BUILD 21 does not yet autonomously design, acquire and validate the independent holdout evidence required to promote its own Reality rules.

The current bridge handles positive implication rules only. It does not yet map `excludes`, `equivalent`, negative antecedents, probabilistic confidence algebra or richer global contradiction semantics.

The implementation is classical Python. This result makes no claim of quantum advantage, AGI, ASI, unrestricted self-evolution or a general scaling law.

The next substantial closure is therefore not a larger row-count benchmark. It is to connect **Evidence Planning + Logical Robot observations** to the construction of independent challenge evidence so the system can seek the evidence required to decide among its own rival oracle hypotheses.

---

## Reproduce

```bash
python -m pip install -e '.[test]'
qcds-reality-cycle examples/self_expanding_reality_mvp.json --store ./intelligence_store
```

For a clean first-run proof, use an empty store directory.
