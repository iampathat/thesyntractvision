# QCDS Fabric implementation status

This code tree is a software implementation companion to the locked **QCDS
Fabric v1.0 canonical specification**. It does not modify the canonical
specification.

**Architecture / theory:** Patrik Sundblom  
**Reference implementation assistance:** OpenAI ChatGPT  
**Software license:** MIT

## BUILD 0–4 — core and recursive machine

- BUILD 0: core models, strict `0/?/∅`, oracle stack, null bank and distribution output.
- BUILD 1: positional, oracle-exposure and crossed rotations with provenance.
- BUILD 2: family-aware stabilization and provenance-preserving serial contraction.
- BUILD 3: DistributionOracle re-entry without hard collapse.
- BUILD 4: bounded recursive orchestration, convergence trace and Syntract binding.

## BUILD 5 — falsification

Matched ablations, explicit external targets, injected slot/oracle bias,
contradiction probes and oracle leave-one-out. The full Fabric is not declared
the winner in advance. See `BENCHMARKS.md`.

## BUILD 6 — substrate separation

Explicit `InferenceSubstrate`, classical reference path, bounded complex
statevector/Grover simulator and matched cross-substrate benchmarking. See
`SUBSTRATES.md`.

## BUILD 7 — adaptive Grover depth

View-local empirical `m/m*`, explicit `m=0`, first-local-maximum selection,
overshoot detection and fixed-vs-adaptive falsification without leaking the
external target into depth selection. See `GROVER_DEPTH.md`.

## BUILD 8 — expansion (`1 → N`)

A bound Syntract remains a full DistributionOracle while explicit new dimensions
open a larger Condition space. Proposal/test oracles rank compatible branches;
validation can contract them into a new bound Syntract. Implements the bounded
`BIND → EXPAND → TEST → CONTRACT → BIND` cycle. See `EXPANSION.md`.

## BUILD 9 — semantic ingress / human-to-logic

Adds the model-independent bridge from human semantics to the existing Fabric:

- `SemanticFrame` is the frontend-neutral contract for a bounded query, claims,
  candidates, source confidence, polarity, unresolved text and analyzer provenance;
- `ControlledEnglishAnalyzer` proves raw-text ingress with a deliberately small
  deterministic grammar;
- unknown language is retained as `unresolved` and missing logic fails closed;
- categorical alternatives become explicit binary dimensions with a one-hot
  logic oracle when appropriate;
- source claims become soft `EvidenceOracle` constraints rather than hidden
  hard labels;
- conflicting positive source claims create explicit semantic disagreement markers;
- both baseline and stabilized candidate projections remain available so a
  diagnostic-induced ranking change cannot be hidden;
- results bind into a normal uncertainty-bearing Syntract with full semantic and
  unresolved provenance;
- the resulting Syntract can feed BUILD 8 expansion directly;
- an external LLM or other parser may later emit SemanticFrame objects without
  becoming part of the QCDS inference kernel.

See `SEMANTIC_INGRESS.md`.

## Not yet implemented

- unrestricted general natural-language semantic understanding;
- broad ontology/entity/relation induction across arbitrary domains;
- autonomous external evidence acquisition and calibrated source trust;
- production oracle governance and external-validation boundaries;
- native QPU adapter / hardware execution;
- larger public benchmark corpora and statistically powered experiment runner;
- noise-aware calibration against real quantum hardware.

## Design rule

Every BUILD preserves uncertainty and enough provenance to falsify the
implementation. Convergence, a high peak, semantic confidence, an expansion
branch, or a language-model parse is not automatically external truth. The
canonical v1.0 artifacts remain locked.
