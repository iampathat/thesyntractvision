# Self-Expanding Reality Logic

BUILD 21 adds a **replaceable execution overlay** that connects existing QCDS oracle-gap discovery and oracle genesis to the governed `reality` Logical Universe.

It does not change the QCDS Fabric core, oracle core, Logical Space core, Logical Universe core, or the locked canonical specification.

## Purpose

Earlier builds proved that a global logical rule can change the resolved status of many represented objects without rewriting every base binding. BUILD 21 asks a harder question:

> Can the system become able to resolve something it could not resolve before, without receiving the missing logical rule as input?

The bounded MVP cycle is:

```text
Reality Logical Space
        ↓
current resolved view / Syntractfilter-facing query
        ↓
unresolved inference / OracleFailureObservation
        ↓
ORACLE GAP
        ↓
target-blind oracle genesis
        ↓
rival oracle hypotheses
        ↓
selection + holdout challenge
        ↓
surviving oracle hypothesis
        ↓
logical-rule bridge
        ↓
reality blast-radius sandbox
        ↓
PROMOTE / QUARANTINE
        ↓
new resolved Reality logic
        ↺
```

The answer is not passed to the genesis generator. Challenge targets are external references used only **after** hypotheses have been proposed.

## Runnable example

Install the package and run:

```bash
python -m pip install -e '.[test]'
qcds-reality-cycle examples/self_expanding_reality_mvp.json --store ./intelligence_store
```

The example begins with eight base logical bindings:

- two contain `winged`;
- six contain `grounded`;
- none contain `flies`.

The QCDS problem representation contains candidate dimensions for creature trait and movement ability, but contains **no semantic rule** connecting them. An explicit failure observation identifies the unresolved ability query.

The genesis layer creates rival implication hypotheses. A selection case and a separate holdout case challenge those hypotheses. In the current falsification example the surviving oracle is:

```text
winged => flies
```

That oracle is still not automatically declared true. BUILD 21 translates it into a candidate global Logical Transform and submits it to the existing BUILD 19 rule-drift governance for the observed `reality` universe.

Only if both boundaries succeed — oracle challenge and reality drift governance — does the rule become active.

## Why the example has three ability candidates

An earlier two-by-two test used:

```text
trait:   winged / grounded
ability: flies / walks
```

That test was falsified because one-hot binary complements made several implication directions logically degenerate. For example, under the supplied cases `walks => grounded` could indirectly favor `flies` whenever `winged` evidence suppressed `grounded`.

The test was therefore strengthened rather than patched. The ability space is now:

```text
flies / walks / swims
```

The direct rule `winged => flies` must improve the target on its own merits. Reverse/complement alternatives no longer receive the same score merely by excluding the only rival.

This failure is retained as an engineering lesson: **an oracle challenge must be identifying, not merely green**.

## Reality governance remains independent

Passing the oracle challenge is necessary but not sufficient for a rule to enter `reality`.

The default observed-universe drift policy is applied independently. A candidate that changes too much of the currently represented Reality Logical Space remains quarantined. BUILD 21 never performs an automatic blast-radius override.

The tests explicitly cover both cases:

```text
2 / 8 matching base bindings = 25%  -> promotable under current MVP policy
4 / 8 matching base bindings = 50%  -> quarantined under current MVP policy
```

These percentages are consequences of the current BUILD 19 implementation policy; they are not canonical QCDS constants.

## Non-materialized growth

If `winged => flies` is promoted, the stored base rows remain unchanged:

```text
(creature-001, winged)
(creature-002, winged)
```

The resolved view becomes able to find:

```text
(creature-001, winged, flies)
(creature-002, winged, flies)
```

without inserting `flies` into those two base bindings.

The runner captures the SHA-256 of `logical_space.csv` before rule activation and after the cycle. The example/test requires the digest to remain unchanged.

That is the intended growth mechanism at this MVP layer: new challenged global logic makes previously represented Reality logic resolvable in new ways without materializing every derived consequence as another stored fact.

## Fail-closed boundaries

BUILD 21 deliberately refuses several shortcuts:

- a semantic solution rule in the genesis problem input is rejected;
- a semantic solution rule hidden in a challenge frame is rejected;
- generated oracle hypotheses do not receive challenge targets;
- unsupported oracle kinds are not silently translated into global positive-term rules;
- a challenged oracle with zero logical-space effect is quarantined by drift governance;
- a high-blast reality candidate is not auto-overridden;
- derived logic is not written back into base Logical Space rows.

## What is autonomous and what is still supplied

Within this bounded cycle, QCDS performs oracle-gap localization, generates rival oracle hypotheses, challenges them, selects a surviving hypothesis, and passes it into governed Reality logic.

The current challenge suite is still externally supplied. BUILD 21 therefore does **not** yet claim autonomous acquisition of the independent experiments/evidence needed to construct its own holdout suite. Existing Evidence Planning and Logical Robot components provide the architectural pieces for a later build to close that boundary.

The current bridge also handles positive `implies` rules only. `excludes`, `equivalent`, negative antecedents, confidence algebra and richer contradiction semantics should remain explicit future work rather than being guessed into the global term layer.

## Claim boundary

This is a classical Python semantic proof. It does not establish AGI, ASI, quantum advantage, unrestricted self-evolution, or a scaling law.

The important new property is narrower and testable:

> **The resolved Reality Logical Space can gain a capability after QCDS oracle genesis and falsification even though the missing rule was not supplied to the genesis input.**

A future quantum implementation can target the same logical cycle with a different execution substrate. Quantum performance, encoding, oracle cost, circuit depth and measurement strategy remain separate empirical questions.
