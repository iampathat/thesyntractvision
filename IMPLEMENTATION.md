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

## BUILD 4 — merged

Automated bounded orchestration of the implemented Fabric topology: local
Fabric passes, stabilization, contraction funnel, distribution-oracle re-entry,
vector convergence diagnostics, repeated cycles, full trace and final Syntract
binding. Convergence remains an internal stability observation, not an external
truth claim.

## BUILD 5 — falsification / benchmark harness

Adds matched ablations and deliberate fault injection around the reference
implementation:

- matched `no_diagnostics`, `null_only`, `null_plus_position`,
  `null_plus_oracle`, and `full_diagnostics` variants;
- L1 and KL distance to an explicit external synthetic target, entropy,
  agreement, peak/target-mode and contradiction metrics;
- pairwise distribution-spread diagnostics for rotation banks;
- synthetic execution-slot and oracle-exposure/order bias injection;
- dimension-null contradiction localization;
- oracle leave-one-out analysis for deliberately bad oracles;
- explicit provenance that no variant is assumed superior and no oracle is
  automatically retired.

See `BENCHMARKS.md`.

## Not yet implemented

- expansion (`1 → N`);
- explicit statevector/Grover substrate adapter;
- production oracle governance and external-validation boundaries;
- domain-level semantic compiler from unrestricted human problems into Conditions/oracles;
- larger public benchmark corpora and statistically powered experiment runner.

## Design rule

Every BUILD keeps diagnostic views separate from independent logical
dimensions, preserves uncertainty, and retains enough provenance to falsify the
implementation against the canonical specification. A convergence signal is an
internal stability observation, not by itself a claim of external truth.
