# Logical Universes and Rule Drift Governance

QCDS can reason over more than one logical universe without pretending that every rule has the same epistemic status.

The MVP distinguishes four universe modes:

- **observed** — source-attributed logic intended to model an observed world; generated global rules require challenge before promotion.
- **declared** — a rule-defined universe such as a statute book, policy system, game or formal specification; the declared authority defines the constitutive rules of that universe.
- **hypothetical** — an isolated logical sandbox for counterfactual or proposed rules.
- **simulation** — an isolated rule space for simulated systems.

The existing shared `logical_space.csv` remains the `reality` universe. This preserves compatibility with the current Logical Robot. Other universes live under:

```text
intelligence_store/
├── logical_space.csv                  # reality
├── logical_rules.csv                  # reality
├── logical_rule_candidates.csv        # reality governance proposals
├── logical_universes.csv
└── universes/
    └── swedish-law-2026/
        ├── logical_space.csv
        ├── logical_rules.csv
        ├── logical_rule_history.csv
        └── logical_rule_candidates.csv
```

## A rule is not active merely because it was generated

A new logical rule first exists as a candidate. Before it can enter an active universe, the governance layer resolves the current universe twice:

```text
CURRENT ACTIVE LOGIC
        ↓
resolved universe A

CURRENT ACTIVE LOGIC + CANDIDATE
        ↓
resolved universe B

A ↔ B
        ↓
logical blast radius
```

The MVP measures:

- total represented bindings;
- bindings directly matched by the rule;
- bindings whose resolved logic would actually change;
- changed fraction of the represented universe;
- derived term instances added and removed;
- maximum logical-term delta on any one binding;
- a sample of changed binding IDs.

The default policy is intentionally conservative. A candidate is quarantined when it changes more than 25% of the represented bindings, changes more than 500 bindings, changes too many terms on an individual binding, or currently has zero represented effect.

These numbers are MVP safeguards, not canonical QCDS constants. They are implementation policy and can be replaced by stronger statistical, oracle- and Syntract-based governance later.

## Observed universe

For an observed universe, a candidate that is within blast-radius bounds is still not automatically true.

```text
oracle genesis
     ↓
candidate rule
     ↓
blast-radius analysis
     ↓
challenge / falsification
     ↓
promotion
```

A quarantined rule additionally requires an explicit blast-radius override. This makes high-impact rule changes visible instead of allowing them to silently reshape the represented world.

## Declared universe

A declared logical universe is different. Its rules are constitutive rather than empirical.

For example, a simplified legal universe could declare:

```text
human => legal_person
adult => voting_eligible
```

Those statements do not become claims about physical reality merely because they are active in the legal universe. They define consequences *inside that declared universe*.

The same represented individual can therefore resolve differently in two universes:

```text
REALITY
alice = human

LAWBOOK
alice = human
human => legal_person

Result:
reality query legal_person  -> no derived match
lawbook query legal_person  -> alice
```

The declared universe still receives blast-radius analysis and versioned rule history. Large changes therefore remain inspectable even when the authority intentionally chooses them.

## Why this matters

The purpose is not to build a collection of hand-coded domain relation classes. A universe remains an open logical space. Rules can expand and compose over that space:

```text
human => happy
happy => positive
positive => approachable
```

Changing one rule changes the resolved logical view without rewriting every base object. BUILD 18 proved this semantic property over 10,000 represented humans while leaving the base Logical Space byte-for-byte unchanged.

Logical Universes add a boundary around that power: a rule can reshape the relevant universe, but not silently reshape every other universe.

## Current claim boundary

This is a Python/CSV MVP of the semantics and governance boundary. It does not prove quantum advantage, billion-scale execution, legal correctness, automatic truth discovery, or safe unrestricted self-evolution.

Later substrates can execute the same logical semantics differently. The universe/rule boundary is intentionally separate from the CSV representation so active oracle logic can later live closer to FPGA, accelerator or quantum execution without changing the conceptual interface.
