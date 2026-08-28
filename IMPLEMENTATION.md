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

Adds a model-independent bounded human-to-logic boundary. Unknown material stays
`unresolved`, categorical alternatives become explicit dimensions, source claims
become evidence oracles, disagreement remains visible, and the result binds into
a normal uncertainty-bearing Syntract. See `SEMANTIC_INGRESS.md`.

## BUILD 10 — problem-to-Syntract

Adds joint multi-query problem compilation with entities, relations, ontology,
explicit logical/causal/temporal rule provenance, partial executability and one
shared Condition space. External semantic adapters remain separate from QCDS.
See `PROBLEM_TO_SYNTRACT.md`.

## BUILD 11 — challenged oracle evolution

Adds versioned oracle-population mutation/retirement, explicit selection +
holdout challenge, promotion gates, lineage and re-injection. Proposal generation
never receives challenge targets. See `ORACLE_EVOLUTION.md`.

## BUILD 12 — oracle genesis / autonomous gap discovery

Adds target-blind `OracleFailureObservation`, contradiction/null-influence gap
signals, `OracleGap`, bounded rival rule genesis and a bridge back through the
unchanged BUILD 11 challenge engine. A gap can create new oracle hypotheses;
survival is still not proof of causal truth. See `ORACLE_GENESIS.md`.

## BUILD 13 — autonomous experiment / evidence acquisition planning

Adds the first explicit information-seeking layer after BUILD 12:

- `DisagreementEvidencePlanner` compares the current oracle population with
  target-blind genesis hypotheses under the same present evidence;
- it measures where predicted query distributions disagree and ranks the most
  discriminating evidence need without receiving selection/holdout targets;
- `EvidenceNeed`, `EvidenceAction` and `EvidencePlan` preserve gap, hypothesis,
  query, dimension and discrimination provenance;
- bounded action types include independent observation, replicated measurement,
  validation experiment, dimension probe and targeted query;
- `EvidenceAcquisitionResult` + `apply_evidence_results(...)` ingest externally
  obtained results as source-attributed evidence and recompile;
- `IntelligenceCheckpoint` distinguishes `active`, `awaiting_evidence`,
  `quiescent` and explicit `terminal` states;
- `no_oracle_gaps` and `no_promotable_hypotheses` are resumable checkpoints,
  not permanent dead ends;
- unchanged state does not auto-spin forever; only an explicit caller request
  creates a non-resumable terminal checkpoint.

See `EVIDENCE_PLANNING.md`.

## BUILD 14 — logical robot runtime

Adds the first logical body that can execute BUILD 13 information needs while
preserving every earlier BUILD underneath it:

- `LogicalRobotTool` is a provider-independent observation contract for logical
  environments such as web/search systems, scientific indexes, APIs, databases,
  files and bounded simulations;
- reference capabilities are `search`, `read`, `follow`, `query`, `compare` and
  `compute`;
- `LogicalRobotRequest` contains the observation objective, relevant queries,
  dimensions and represented candidates, but never challenge targets, holdout
  answers or an expected truth value;
- BUILD 13 action intent is mapped to bounded capability sequences, allowing the
  robot to change strategy when one observation path fails;
- tool adapters return `LogicalObservation` objects with source identity,
  capability, confidence and optional URI/excerpt provenance;
- observations are validated against the represented candidate space before they
  can become `EvidenceAcquisitionResult` objects;
- a new unseen semantic value fails closed and must go through semantic/expansion
  handling rather than silently changing the Condition space;
- independent-source requirements are enforced across accepted observations;
- execution is bounded by step, attempt and observation budgets;
- exhaustion produces `awaiting_sources`, never implicit terminality, with wake
  triggers for new sources, logical-environment changes, new evidence plans,
  oracle changes or manual resume;
- if no new evidence is acquired, QCDS is not re-run on an identical state;
- if evidence is acquired, `run_logical_robot_cycle(...)` feeds it back through
  the BUILD 13 resume path, which recompiles and re-enters the existing QCDS,
  genesis, evolution, binding and expansion machinery;
- BUILD 14 authorizes information observation only. It does not authorize
  arbitrary account mutations, external side effects or physical actuation;
- canon remains outside the robot/discovery/evolution boundary.

See `LOGICAL_ROBOT.md`.

## Not yet implemented

- unrestricted general natural-language semantic understanding;
- autonomous ontology discovery/induction across arbitrary domains;
- broad causal discovery from raw observations; surviving hypotheses remain
  hypotheses until supported by appropriate external validation;
- complete temporal-logic calculus or automatic event extraction;
- production web/browser/API/database provider adapters for the logical robot;
- calibrated autonomous source-trust evolution;
- physical robot runtime / sensor-actuator body;
- domain-specific optimal experimental design with real-world cost/risk models;
- production oracle governance, signed validation sources and deployment approval;
- cross-domain large-scale oracle populations with statistically powered challenge corpora;
- native QPU adapter / hardware execution;
- larger public benchmark corpora and statistically powered experiment runner;
- noise-aware calibration against real quantum hardware.

## Design rule

Every BUILD preserves uncertainty and enough provenance to falsify the
implementation. Convergence, a high peak, semantic confidence, an expansion
branch, an ontology mapping, a language-model parse, a discovered oracle gap, a
promoted oracle, a proposed experiment or a logical-robot observation is not
automatically external truth. A temporary lack of progress is not automatically
terminal either. The canonical v1.0 artifacts remain locked.
