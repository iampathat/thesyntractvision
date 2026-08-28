# BUILD 12 — Oracle Genesis

BUILD 12 adds a bounded **oracle genesis** layer around the existing QCDS Fabric
reference implementation. It does not modify the locked QCDS Fabric v1.0 canon.

The purpose is to answer a different question from BUILD 11:

> BUILD 11 asks whether an existing oracle should mutate, survive or retire.  
> BUILD 12 asks where an oracle appears to be missing and what explicit rival
> oracle hypotheses should be challenged there.

## Executable loop

```text
PROBLEM / SYNTRACT
       ↓
QCDS INFERENCE
       ↓
DIAGNOSTIC FAILURE SIGNALS
 contradiction resolution · null influence
 prediction failure · expansion failure
       ↓
ORACLE GAP
 affected dimensions + bounded context
       ↓
GENESIS
 generate rival explicit oracle hypotheses
       ↓
BUILD 11 CHALLENGE
 selection + holdout
       ↓
PROMOTE / REJECT
       ↓
VERSIONED ORACLE POPULATION
       ↓
RE-INJECT → QCDS INFERENCE
       ↺
```

## Target-blind discovery

`OracleFailureObservation` intentionally contains no expected answer, target
state or target distribution field. It may say that a prediction or expansion
failed and identify the affected query/dimensions, but it cannot tell discovery
what the correct answer was.

The discovery layer may also derive internal signals from Fabric diagnostics:

- a baseline contradiction that disappears when one dimension is null;
- a dimension-null view that materially changes oracle agreement;
- a dimension-null view that materially changes entropy.

These signals are aggregated into `OracleGap` objects. Each gap preserves the
affected dimensions, bounded context dimensions, source signal ids, severity and
provenance.

External target values remain in BUILD 11 `OracleChallengeCase` objects. They
are used only after candidate hypotheses have already been generated.

## Pairwise semantic-rule genesis

The built-in `PairwiseSemanticRuleGenesisGenerator` is deliberately simple and
falsifiable. For a discovered cross-group gap it generates a bounded rival field
of explicit BUILD 10 `SemanticRuleOracle` candidates using:

- `implies`
- `excludes`
- `equivalent`

It proposes both directions when configured to do so and can test explicit
confidence values. It does not infer causal truth and labels its built-in
candidates `logical`.

Within-group rules are not generated, and a semantic rule already present in
the active population is not emitted again.

## BUILD 11 bridge

`DiscoveredGapProposalGenerator` binds one target-blind `OracleGap` to the BUILD
11 `OracleProposalGenerator` contract. This is important because the BUILD 11
challenge engine remains unchanged:

```text
gap discovery → genesis proposals → existing BUILD 11 evaluator
```

Promotion still requires the configured selection/holdout gates. Genesis does
not bypass challenge.

## End-to-end cycle

`run_oracle_genesis_cycle(...)` performs:

1. extract the current evolvable BUILD 10 rule population;
2. discover target-blind oracle gaps;
3. bind one or more genesis generators to those gaps;
4. challenge all resulting hypotheses through BUILD 11;
5. retain only promoted oracle versions;
6. re-inject the evolved population into a fresh `ProblemCompilation`;
7. run ordinary QCDS Fabric again;
8. bind the updated result to a Syntract.

If no gap is detected, the cycle stops with `no_oracle_gaps`. If gaps exist but
no candidate survives challenge, BUILD 11 stops with
`no_promotable_hypotheses`. Evolution is therefore not forced to continue.

## Failure observations

Two target-blind external signal classes are implemented:

- `prediction_failure`
- `expansion_failure`

They report where validation failed, not the missing truth value. This permits
BUILD 8 expansion failures or externally observed prediction failures to trigger
oracle search without leaking the holdout answer into hypothesis generation.

## Claim boundary

BUILD 12 establishes a tested path for **oracle gap discovery + oracle genesis +
challenged evolution**. It does not establish universal causal discovery,
unrestricted autonomous science, unrestricted self-modification, AGI/ASI,
native quantum advantage or automatic external truth.

A generated oracle is a hypothesis until it survives explicit challenge, and a
promoted oracle can still be wrong if validation data are wrong or
unrepresentative.

The locked `QCDS_FABRIC_SPEC_v1.0_*` artifacts remain outside the mutation
boundary.
