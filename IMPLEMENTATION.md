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

Adds the model-independent bridge from one bounded human semantic question to
the existing Fabric:

- `SemanticFrame` carries query, claims, candidates, source confidence, polarity,
  unresolved text and analyzer provenance;
- `ControlledEnglishAnalyzer` proves raw-text ingress with a deliberately small
  deterministic grammar and bracket-aware confidence parsing;
- unknown language is retained as `unresolved` and missing logic fails closed;
- categorical alternatives become explicit binary dimensions with one-hot logic;
- source claims become soft `EvidenceOracle` constraints;
- competing source claims create explicit semantic disagreement markers;
- baseline and stabilized candidate projections remain separately visible;
- results bind into an uncertainty-bearing Syntract and can feed BUILD 8 expansion;
- an external LLM/parser may emit `SemanticFrame` objects without becoming the
  QCDS inference kernel.

See `SEMANTIC_INGRESS.md`.

## BUILD 10 — problem-to-Syntract

Extends BUILD 9 from one bounded query to a joint multi-query semantic problem:

- `SemanticProblemFrame` carries multiple queries, entities, claims, relations,
  explicit rules, ontology mapping, unresolved material and adapter provenance;
- independent query groups are compiled into one shared binary Condition space,
  so explicit rules can couple them before inference rather than after separate
  answer generation;
- `SemanticEntity` provides an auditable entity registry;
- `SemanticRelation` compiles source-attributed relations into normal evidence
  propositions and preserves relational/causal/temporal class plus temporal context;
- `SemanticRule` supports exact auditable `implies`, `excludes` and `equivalent`
  transforms, separately tagged as logical, causal or temporal;
- `OntologyMap` canonicalizes subject/predicate/value aliases and records every
  applied mapping; declared entity registries make invalid subject targets fail closed;
- partially answerable problems retain blocked queries instead of inventing candidates;
- semantic disagreement and polarity conflict remain explicit;
- `SemanticProblemAdapter` allows a future LLM, scientific parser, sensor compiler
  or domain frontend to emit structured problems without becoming the QCDS core;
- all executable queries are projected from the same baseline and stabilized
  joint TruthDistribution;
- the final problem Syntract preserves entities, relations, rules, ontology,
  blocked queries, unresolved content, contradictions and final dimensions;
- problem Syntracts re-enter or expand through the existing BUILD 3/8 paths
  without semantic retranslation.

See `PROBLEM_TO_SYNTRACT.md`.

## Not yet implemented

- unrestricted general natural-language semantic understanding;
- autonomous ontology discovery/induction across arbitrary domains;
- causal discovery from raw observations (BUILD 10 executes explicit causal rules;
  it does not invent them);
- complete temporal-logic calculus or automatic event extraction;
- autonomous external evidence acquisition and calibrated source trust;
- production oracle governance and external-validation boundaries;
- native QPU adapter / hardware execution;
- larger public benchmark corpora and statistically powered experiment runner;
- noise-aware calibration against real quantum hardware.

## Design rule

Every BUILD preserves uncertainty and enough provenance to falsify the
implementation. Convergence, a high peak, semantic confidence, an expansion
branch, an ontology mapping or a language-model parse is not automatically
external truth. The canonical v1.0 artifacts remain locked.
