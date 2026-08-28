# QCDS Fabric implementation status

This code tree is a software implementation companion to the locked
**QCDS Fabric v1.0 canonical specification**. It does not modify the canonical
specification.

**Architecture / theory:** Patrik Sundblom  
**Reference implementation assistance:** OpenAI ChatGPT  
**Software license:** MIT (repository license)

## BUILD 0 — merged

Core data structures, strict `0` / `?` / `∅` separation, exact/mask oracles,
versioned oracle stacks, bounded classical TruthDistribution inference,
explicit contradiction state, full dimension-null bank, transparent null
stabilization, and canonical logical-space accounting.

## BUILD 1 — merged

Positional rotation, oracle-exposure rotation, crossed rotations, canonical
position mapping, fail-closed oracle-stack validation, absence-aware oracle
normalization, rotation diagnostics, and full transformation provenance.

## BUILD 2 — merged

Family-aware stabilization across null/position/oracle/crossed views with
explicit equal-family weighting, plus a provenance-preserving serial contraction
funnel that binds stabilized returns without hard collapse.

## BUILD 3 — recursive QCDS re-entry

Adds a bounded reference mechanism for feeding bound results back into a new
Condition space:

- every `StabilizedReturn` now records its canonical dimension identities;
- `DistributionOracle` represents an uncertainty-bearing truth distribution as a soft oracle/factor;
- when one of that factor's dimensions is `∅`, the factor **marginalizes** over the absent binary dimension instead of interpreting absence as `0` or `?`;
- a `BoundCondition` can be compiled into a new namespaced BaseBundle whose values reopen as `?` while its prior bound distributions become replicated per-channel DistributionOracles;
- multiple bound leaf returns compose multiplicatively in the new bounded local space;
- the compiled higher-order bundle can execute the normal QCDS Fabric null/stabilization path again;
- a configurable `max_width` prevents accidental classical state-space explosion.

This is the first actual re-entry bridge from a bound funnel structure back to
an oracle-constrained local QCDS pass. It preserves previous uncertainty rather
than replacing it with a guessed binary label.

## Not yet implemented

- repeated automatic multi-layer `infer → stabilize → funnel → re-enter` orchestration;
- expansion (`1 → N`);
- explicit statevector/Grover substrate adapter;
- injected-bias and ablation benchmark suite;
- production oracle governance and external-validation boundaries.

## Design rule

Every BUILD keeps diagnostic views separate from independent logical
dimensions, preserves uncertainty, and retains enough provenance to falsify the
implementation against the canonical specification.
