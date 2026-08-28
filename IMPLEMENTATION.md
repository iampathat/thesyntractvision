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

## BUILD 2 — stabilization across families + contraction funnel

Adds:

- canonicalization of null and non-null diagnostic views into one comparable coordinate space;
- stabilization across dimension-null, positional, oracle-exposure, and crossed families;
- **equal-family weighting** so a diagnostic family does not dominate merely because it contains more generated views;
- family-level entropy/agreement spread and retained-mass diagnostics;
- no hidden hard collapse and no automatic pruning;
- an auditable contraction funnel that groups `StabilizedReturn` objects into higher-order `BoundCondition` structures;
- recursive grouping schedules such as `8 → 4 → 2 → 1` while retaining every leaf distribution and its provenance.

The BUILD 2 funnel is intentionally a **binding/grouping layer**, not yet a
claim that higher-order conditions have re-entered a new local QCDS pass. Full
oracle-constrained QCDS re-entry over higher-order bound conditions is the next
implementation boundary.

## Not yet implemented

- higher-order QCDS re-entry and recursive local inference over bound conditions;
- expansion (`1 → N`);
- statevector/QPU substrate adapters;
- injected-bias and ablation benchmark suite;
- production oracle governance and external-validation boundaries.

## Design rule

Every BUILD keeps diagnostic views separate from independent logical
dimensions, preserves uncertainty, and retains enough provenance to falsify the
implementation against the canonical specification.
