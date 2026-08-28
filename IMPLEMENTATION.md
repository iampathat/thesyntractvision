# QCDS Fabric implementation status

This code tree is a software implementation companion to the locked
**QCDS Fabric v1.0 canonical specification**. It does not modify the canonical
specification.

**Architecture / theory:** Patrik Sundblom  
**Reference implementation assistance:** OpenAI ChatGPT  
**Software license:** MIT (repository license)

## BUILD 0 — merged

- core data structures and provenance;
- strict `0` / `?` / `∅` separation;
- exact and mask oracle primitives;
- versioned oracle stacks replicated per comparable channel;
- bounded classical TruthDistribution kernel;
- explicit contradiction state;
- full Rotational Dimension Nulling bank;
- transparent null-view stabilization with no automatic pruning;
- canonical logical-space accounting.

## BUILD 1 — rotation family and provenance

Adds the remaining architectural rotation surfaces without changing the
locked v1.0 semantics:

- positional rotation as explicit canonical-dimension → execution-slot maps;
- inverse-safe canonical state semantics: position changes never rename facts;
- oracle-exposure rotation as an ordering / exposure map over the same immutable oracle stack;
- crossed null × position × oracle views;
- strict fail-closed validation that a view uses the declared oracle-stack version and an exact permutation of that stack's oracle identities;
- non-applicable oracles are excluded from scoring and agreement normalization when all of their constrained dimensions are absent from the view;
- rotation-bank diagnostics expose entropy and oracle-agreement spread without claiming that spread is automatically bias;
- provenance for every transformation axis.

The unbiased classical reference kernel is intentionally invariant under
pure positional and oracle-order rotations. A later benchmark layer will inject
controlled slot/oracle bias to test whether these rotations detect it.

## Not yet implemented

- stabilization that jointly consumes positional/oracle/crossed banks;
- recursive multi-layer funnel / higher-order binding;
- expansion (`1 → N`);
- statevector/QPU substrate adapters;
- empirical ablation harness and injected-bias benchmark suite;
- production oracle governance and external-validation boundaries.

## Design rule

Every BUILD keeps diagnostic views separate from independent logical
dimensions, preserves uncertainty, and retains enough provenance to falsify the
implementation against the canonical specification.
