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

Adds the first logical body contract that can execute BUILD 13 information needs
while preserving every earlier BUILD underneath it:

- `LogicalRobotTool` is a provider-independent observation contract for logical
  environments such as web/search systems, scientific indexes, APIs, databases,
  files and bounded simulations;
- reference capabilities are `search`, `read`, `follow`, `query`, `compare` and
  `compute`;
- `LogicalRobotRequest` contains the observation objective, relevant queries,
  dimensions and represented candidates, but never challenge targets, holdout
  answers or an expected truth value;
- BUILD 13 action intent maps to bounded capability sequences;
- observations preserve source identity, capability, confidence and URI/excerpt
  provenance;
- observations are validated against the represented candidate space before they
  become `EvidenceAcquisitionResult` objects;
- exhaustion produces `awaiting_sources`, never implicit terminality;
- information observation is authorized, arbitrary side effects and physical
  actuation are not;
- canon remains outside the robot/discovery/evolution boundary.

See `LOGICAL_ROBOT.md`.

## BUILD 15 — persistent superintelligence runtime

Adds the first restartable MVP shell around BUILD 0–14 without moving reasoning
into the robot body:

- `SuperintelligenceRuntime` exposes create/load mission, `step(...)`,
  `observe(...)` and state inspection;
- `CsvIntelligenceStore` uses one ordinary directory per mission;
- `current_oracles.csv` is the active evolvable oracle snapshot with readable
  rule topology, confidence, source and persistent stack identity;
- `oracle_history.csv` is append-only lineage for initialization, promoted
  genesis, mutation and retirement events;
- `mission.csv`, `evidence.csv` and `checkpoints.csv` preserve problem,
  observations and resumable control state;
- active oracle state is never persisted with pickle;
- restart reconstructs normal fixed oracles and re-injects the persisted
  evolvable oracle population;
- persistent runtime oracle versions extend across successful promotion cycles
  rather than resetting on process restart;
- the logical robot can call `step(...)`, execute a BUILD 13 plan and call
  `observe(...)` without knowing Fabric/genesis/store internals;
- CSV is an inspectable MVP backend, not a future high-performance storage claim;
- canon remains unchanged.

See `PERSISTENT_RUNTIME.md`.

## BUILD 16 — first runnable logical robot

Adds the first concrete logical robot that actually uses the BUILD 15 runtime as
its intelligence boundary:

- `FirstLogicalRobot` calls `runtime.step(...)`, executes returned BUILD 13 plans
  through BUILD 14 tools, returns new evidence with `runtime.observe(...)`, then
  calls the same persistent runtime again;
- it never calls Fabric, oracle genesis, oracle evolution or CSV internals as a
  reasoning shortcut;
- a changed oracle population is a legitimate reason to continue to another
  runtime cycle, while an identical state is not busy-looped;
- already persisted web evidence ids are filtered before re-ingestion, allowing
  the robot to stop/resume cleanly across process restarts;
- `PublicWebLogicalRobotTool` is the first concrete information body;
- `WikipediaSearchBackend` provides key-free public search for the MVP;
- `HttpWebReadBackend` performs bounded read-only HTTP retrieval through an
  explicit domain allow-list and rejects local/private literal IPs;
- `CandidateMentionExtractor` is intentionally conservative: it only observes
  already represented candidates and requires a unique textual lead;
- conflicting sources remain separate evidence rather than being collapsed by
  the logical robot;
- source URL, excerpt, candidate counts and target-blind provenance survive the
  observation bridge;
- package 1.7.0 installs the `qcds-logical-robot` command;
- `examples/first_logical_robot_mvp.json` supplies a runnable mission/challenge
  example;
- the logical robot remains the general body form; a future physical robot is
  expected to extend it with sensor/actuator capabilities rather than replacing
  the intelligence core;
- no external write/account/physical actuation permission is added;
- canon remains unchanged.

See `FIRST_LOGICAL_ROBOT.md`.

## Not yet implemented

- unrestricted general natural-language semantic understanding;
- autonomous ontology discovery/induction across arbitrary domains;
- broad causal discovery from raw observations; surviving hypotheses remain
  hypotheses until supported by appropriate external validation;
- complete temporal-logic calculus or automatic event extraction;
- production-grade unrestricted browser/search provider set;
- network/service transport around the callable superintelligence runtime;
- high-performance or hardware-near oracle persistence/execution backend;
- calibrated autonomous source-trust evolution;
- physical sensor/actuator robot body;
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
promoted oracle, a proposed experiment, a logical-robot observation, a web page
or a persisted oracle row is not automatically external truth. A temporary lack
of progress is not automatically terminal either. The canonical v1.0 artifacts
remain locked.
