# QCDS Fabric implementation status

This directory tree is a software implementation companion to the locked
**QCDS Fabric v1.0 canonical specification**. It does not modify the canonical
specification.

**Architecture / theory:** Patrik Sundblom  
**Reference implementation assistance:** OpenAI ChatGPT  
**Software license:** MIT (repository license)

## BUILD 0 scope

Implemented:

- `BaseBundle`, `ChannelView`, `TruthDistribution`, `StabilizedReturn`, `Syntract` data structures;
- strict logical distinction between `0`, wildcard `?`, and absent `∅`;
- immutable/versioned `OracleStack` identity replicated to every comparable null view;
- exact and mask oracle primitives;
- bounded classical reference inference kernel with uncertainty-bearing distribution output;
- explicit contradiction state when all candidates are rejected;
- full Rotational Dimension Nulling bank (`B` views, one different absent dimension per view);
- marginalization-based lifting of null views back to canonical coordinates;
- first transparent distribution stabilizer with no automatic pruning;
- canonical logical-space accounting (`D = G×B`, `E = G×Vd×Vp×Vo`).

Not yet implemented:

- positional rotation;
- oracle-exposure rotation;
- crossed rotations;
- recursive multi-layer funnel / higher-order binding;
- expansion (`1 → N`);
- QPU/statevector substrate adapters;
- empirical ablation harness and injected-bias benchmark suite;
- production oracle governance and external validation boundaries.

## Design rule

BUILD 0 deliberately favors explicit provenance and falsifiability over hidden
heuristics. No derived diagnostic view is counted as an independent dimension,
and no disagreement is silently collapsed to a hard answer.
