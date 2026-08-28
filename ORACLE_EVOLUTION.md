# BUILD 11 — Challenged Oracle Evolution

BUILD 11 adds a bounded self-evolution path for **oracle populations** without
allowing the implementation to rewrite the locked QCDS Fabric v1.0 canon.

The core loop is:

```text
ACTIVE ORACLE POPULATION
          ↓
PROPOSAL GENERATORS
          ↓
MULTIPLE ORACLE HYPOTHESES
          ↓
SELECTION CHALLENGES
          ↓
HOLDOUT CHALLENGES
          ↓
PROMOTE / REJECT / RETIRE
          ↓
VERSIONED ORACLE POPULATION
          ↓
RE-INJECT INTO QCDS FABRIC
          ↺
```

## Separation of proposal and truth testing

The `OracleProposalGenerator` interface receives only:

- the current oracle population;
- the current generation number.

It does **not** receive the challenge suite or its external target distributions.
Targets therefore enter only after hypotheses have been generated.

This does not prove that an arbitrary external generator could never have seen
those targets elsewhere, but it makes target leakage absent from the BUILD 11
engine contract and auditable in provenance.

## Challenge cases

An `OracleChallengeCase` contains:

- a bounded `BaseBundle`;
- case-specific fixed/context oracles;
- an explicit external target distribution;
- a role: `selection` or `holdout`;
- provenance.

The evolving population is kept separate from case-specific evidence. This
allows one candidate rule/oracle to be challenged under multiple evidence
contexts.

## Promotion criteria

`OracleEvolutionConfig` controls promotion. By default a candidate needs:

- at least one selection case;
- at least one holdout case;
- positive mean selection L1 improvement;
- no mean holdout regression;
- no single-case L1 regression;
- no increase in contradiction markers;
- at least one observable distribution change.

These are implementation defaults, not new canonical QCDS rules. They are
explicit and replaceable.

## Built-in proposal generators

### `SemanticRuleMutationGenerator`

Mutates BUILD 10 `SemanticRuleOracle` objects while leaving source evidence
confidence untouched by default. It can challenge:

- `implies`;
- `excludes`;
- `equivalent`;
- optional explicit rule-confidence values.

A causal or temporal label remains provenance; the mutation changes only the
explicit executable rule transform/confidence.

### `OracleRetirementGenerator`

Creates explicit retirement hypotheses for named oracle ids. Retirement is
therefore a challenged generalization of BUILD 5 leave-one-out, not silent
automatic pruning.

## Lineage and reversibility

Every promoted hypothesis records:

- generation;
- generator;
- mutation;
- replaced oracle id;
- new oracle id, or `None` for retirement;
- resulting versioned stack identity;
- challenge suite id.

The initial oracle ids and complete promotion trace remain available, so an
external controller can roll back a population instead of treating evolution as
irreversible mutation.

## BUILD 10 integration

`extract_problem_rule_population(...)` selects only `SemanticRuleOracle`
objects from a BUILD 10 `ProblemCompilation`.

`challenge_case_from_problem(...)` separates those evolvable rules from the
problem-specific evidence/one-hot logic and constructs a challenge target from
explicit externally supplied query assignments.

After evolution,

```python
apply_evolved_oracle_population(compilation, evolution_result)
```

returns a new `ProblemCompilation` with fixed evidence/logic untouched and the
new oracle population re-injected. The normal QCDS Fabric inference path can
then run again.

This closes a bounded loop:

```text
PROBLEM → ORACLES → QCDS → CHALLENGE → EVOLVE ORACLES → QCDS → ...
```

## What BUILD 11 does not claim

BUILD 11 does not claim:

- autonomous discovery of universally true causal laws;
- unrestricted self-modification;
- automatic rewriting of QCDS canon or safety invariants;
- immunity to benchmark leakage or bad external validation data;
- AGI/ASI;
- native quantum advantage;
- automatic external truth.

It establishes a tested mechanism by which **oracle hypotheses can evolve under
explicit falsification pressure**, with holdout validation, lineage and
rollback boundaries preserved.
