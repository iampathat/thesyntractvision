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

## BUILD 3 — merged

A bounded recursive re-entry bridge. `DistributionOracle` carries a full
uncertainty-bearing TruthDistribution into a later Condition space, logical
`∅` is handled by marginalization, bound leaves are namespaced, and the normal
QCDS Fabric diagnostic/stabilization path can execute again without inventing a
binary label for the prior result.

## BUILD 4 — recursive execution engine

Adds automated bounded orchestration of the implemented Fabric topology:

```text
ingress bundles
    ↓
local QCDS Fabric passes
    ↓
stabilized returns
    ↓
serial contraction funnel
    ↓
bound higher-order condition
    ↓
distribution-oracle re-entry
    ↓
convergence diagnostics
    ↺ repeat until stable or cycle limit
    ↓
Syntract
```

BUILD 4 includes:

- automatic balanced funnel schedules, e.g. `8 → 4 → 2 → 1`;
- repeated `infer → stabilize → funnel → re-enter` execution;
- explicit maximum cycle and maximum re-entry width guards;
- vector convergence diagnostics: L1 distribution distance, entropy delta,
  Top-K Jaccard and peak-probability delta;
- configurable minimum cycles and consecutive-stability patience;
- full per-cycle `ReentryResult`, `BoundCondition`, provenance and contradiction trace;
- final `Syntract` binding without treating numerical convergence as external truth.

## Not yet implemented

- expansion (`1 → N`);
- explicit statevector/Grover substrate adapter;
- injected-bias and ablation benchmark suite;
- production oracle governance and external-validation boundaries;
- domain-level semantic compiler from unrestricted human problems into Conditions/oracles.

## Design rule

Every BUILD keeps diagnostic views separate from independent logical
dimensions, preserves uncertainty, and retains enough provenance to falsify the
implementation against the canonical specification. A convergence signal is an
internal stability observation, not by itself a claim of external truth.
