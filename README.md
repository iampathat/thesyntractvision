# The Syntract Vision

> **From uncertainty toward truth. From truth toward action.**

**Author and originator:** Patrik Sundblom  
**Project:** The Syntract Vision / QCDS / Syntract  
**Canonical architecture:** **QCDS Fabric v1.0 — locked**  
**Reference implementation:** **BUILD 16 / package 1.7.0**  
**Theory/specification:** CC BY 4.0  
**Software:** MIT

---

## What this repository is

This repository contains both the published **The Syntract Vision / QCDS
Fabric** material and a tested Python reference implementation of the locked
QCDS Fabric v1.0 architecture.

The repository intentionally separates:

1. **Canon** — the version-locked `QCDS_FABRIC_SPEC_v1.0_*` artifacts. Normative
   architecture changes require a new specification version.
2. **Implementation** — `src/qcds_fabric/`, built in falsifiable BUILD steps.

BUILD 16 does not replace any earlier BUILD. It adds the first **concrete,
runnable logical robot** above BUILD 15's persistent runtime. The robot is a body
that calls the intelligence; it is not a second reasoning core.

A future physical robot is expected to keep this logical-robot layer and add
physical sensors/actuators on top of it.

## Current executable path

```text
                    QCDS / SYNTRACT INTELLIGENCE
                              ↑     ↓
                    SuperintelligenceRuntime
                       step · observe · state
                              ↑     ↓
                      FIRST LOGICAL ROBOT
                              ↑     ↓
                 SEARCH · READ · QUERY · COMPARE
                              ↑     ↓
                      INFORMATION WORLD

Inside each runtime step:

SEMANTIC PROBLEM FRAME
        ↓
JOINT LOGIC COMPILER
        ↓
CONDITIONS + EVIDENCE / RULE ORACLES
        ↓
QCDS FABRIC
        ↓
CLASSICAL / STATEVECTOR-GROVER SUBSTRATE
        ↓
NULL / POSITION / ORACLE / CROSSED ROTATIONS
        ↓
JOINT TRUTH DISTRIBUTION
        ↓
ORACLE GAP DISCOVERY
        ↓
ORACLE GENESIS
        ↓
ORACLE CHALLENGE
 selection + holdout
        ↓
PROMOTE / REJECT / RETIRE
        ↓
PERSIST ACTIVE ORACLES + LINEAGE
        ↓
if unresolved: BUILD 13 EVIDENCE PLAN
        ↓
logical robot observes externally
        ↓
source-attributed evidence
        ↓
runtime.observe(...)
        ↓
PERSIST EVIDENCE + WAKE CHECKPOINT
        ↓
runtime.step(...)
        ↺
```

The logical robot, persistence backend, semantic parser, QCDS inference, oracle
genesis/evolution and evidence planning remain separate auditable boundaries.

## BUILD 9: human-to-logic

BUILD 9 established the first model-independent semantic boundary. Unknown
language remains explicit as `unresolved`; categorical candidates become binary
dimensions; source claims become soft `EvidenceOracle` constraints; competing
claims remain disagreement instead of a fabricated answer. See
[`SEMANTIC_INGRESS.md`](SEMANTIC_INGRESS.md).

## BUILD 10: problem-to-Syntract

BUILD 10 adds joint multi-query compilation with entities, relations, ontology,
explicit logical/causal/temporal rule provenance and partial executability. All
executable query groups share one Condition space, so explicit rules can couple
them before inference. See [`PROBLEM_TO_SYNTRACT.md`](PROBLEM_TO_SYNTRACT.md).

## BUILD 11: challenged oracle evolution

BUILD 11 adds versioned oracle-population mutation/retirement, selection +
holdout challenge, explicit promotion gates, lineage and re-injection. Proposal
generation never receives challenge targets. See
[`ORACLE_EVOLUTION.md`](ORACLE_EVOLUTION.md).

## BUILD 12: oracle genesis

BUILD 12 can identify where an oracle appears to be missing before proposing
replacements or additions. Gap discovery combines target-blind prediction /
expansion failures with internal contradiction and null-influence diagnostics.
See [`ORACLE_GENESIS.md`](ORACLE_GENESIS.md).

## BUILD 13: autonomous evidence / experiment planning

BUILD 13 asks: **if oracle hypotheses remain unresolved, what new information
would best distinguish them?** It turns disagreement into explicit
`EvidenceNeed`, `EvidenceAction` and `EvidencePlan` structures and keeps stalled
cycles resumable rather than permanently terminal. See
[`EVIDENCE_PLANNING.md`](EVIDENCE_PLANNING.md).

## BUILD 14: logical robot contract

BUILD 14 defines the provider-independent logical body contract. The capability
vocabulary is `search`, `read`, `follow`, `query`, `compare` and `compute`.
`LogicalRobotRequest` never contains BUILD 11 challenge targets or expected truth
values. Accepted observations return as source-attributed BUILD 13 evidence. See
[`LOGICAL_ROBOT.md`](LOGICAL_ROBOT.md).

## BUILD 15: persistent superintelligence runtime

BUILD 15 adds `SuperintelligenceRuntime` and the first inspectable persistence
backend:

```text
intelligence_store/
└── mission-1/
    ├── mission.csv
    ├── current_oracles.csv
    ├── oracle_history.csv
    ├── evidence.csv
    └── checkpoints.csv
```

`current_oracles.csv` exposes active evolvable oracle topology, confidence,
source and persistent stack identity directly. `oracle_history.csv` records how
that population changed. CSV is deliberately an MVP storage backend, not a
future performance claim. See [`PERSISTENT_RUNTIME.md`](PERSISTENT_RUNTIME.md).

## BUILD 16: first logical robot MVP

BUILD 16 adds `src/qcds_fabric/first_logical_robot.py` and finally gives the
runtime a concrete logical body.

The core loop is intentionally tiny:

```python
step = runtime.step(mission_id, challenge_suite)
# QCDS decides what information is missing.

# logical robot executes step.cycle.plans
runtime.observe(mission_id, acquired_evidence)

step2 = runtime.step(mission_id, challenge_suite)
```

`FirstLogicalRobot` automates that call loop but does not bypass it. If QCDS
changes its oracle population, that state transition can trigger another runtime
step. If no genuinely new evidence appears, the robot stops as resumable rather
than repeatedly inserting the same observation.

### First concrete public-web body

`PublicWebLogicalRobotTool` uses replaceable `WebSearchBackend` and
`WebReadBackend` contracts. The initial defaults are deliberately modest:

- `WikipediaSearchBackend` — key-free public search;
- `HttpWebReadBackend` — bounded read-only retrieval with an explicit domain
  allow-list;
- `CandidateMentionExtractor` — deterministic extraction over **already
  represented candidates only**.

The logical robot does not decide external truth. If separate sources support
conflicting candidates, they return as separate evidence and QCDS receives the
contradiction.

The default reader rejects local/private literal IPs, limits response size,
strips non-visible script/style content and performs no write/account operation.
This is a first observer, not a production browser-security claim.

### Run it

Package 1.7.0 installs:

```bash
python -m pip install -e '.[test]'
qcds-logical-robot examples/first_logical_robot_mvp.json --store ./intelligence_store
```

The example supplies an explicit semantic problem, BUILD 11 challenge case and a
target-blind failure signal. The first invocation creates the mission; later
invocations reuse the same BUILD 15 mission directory.

After a run, the important files remain ordinary readable files. In particular:

```text
intelligence_store/first-logical-robot-demo/current_oracles.csv
intelligence_store/first-logical-robot-demo/oracle_history.csv
intelligence_store/first-logical-robot-demo/evidence.csv
```

See [`FIRST_LOGICAL_ROBOT.md`](FIRST_LOGICAL_ROBOT.md).

## BUILD status

| BUILD | Status | Main addition |
|---|---|---|
| 0 | merged | core models, `0/?/∅`, oracle stack, null bank |
| 1 | merged | positional/oracle/crossed rotations |
| 2 | merged | family stabilization + serial funnel |
| 3 | merged | DistributionOracle recursive re-entry |
| 4 | merged | bounded recursive engine + convergence trace |
| 5 | merged | falsification, ablations, injected bias |
| 6 | merged | substrate interface + statevector/Grover simulator |
| 7 | merged | adaptive view-local Grover `m/m*` |
| 8 | merged | expansion `1→N` + test/contract/bind |
| 9 | merged | semantic ingress / human-to-logic / Syntract handoff |
| 10 | merged | joint multi-query problem-to-Syntract compiler |
| 11 | merged | challenged, versioned oracle-population evolution |
| 12 | merged | target-blind oracle gap discovery + oracle genesis |
| 13 | merged | resumable autonomous evidence / experiment planning |
| 14 | merged | provider-independent logical robot contract |
| 15 | merged | persistent runtime + human-readable intelligence store |
| 16 | current | first runnable logical robot + public-web observer MVP |

See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the exact implementation boundary.

## Code map

- `src/qcds_fabric/models.py` — core distributions, bundles and Syntract.
- `src/qcds_fabric/oracles.py` — exact, mask and DistributionOracle semantics.
- `src/qcds_fabric/semantic.py` / `semantic_ingress.py` — BUILD 9 semantic ingress.
- `src/qcds_fabric/problem.py` — BUILD 10 joint problem compiler.
- `src/qcds_fabric/oracle_evolution.py` — BUILD 11 challenged evolution.
- `src/qcds_fabric/oracle_genesis.py` — BUILD 12 target-blind gap discovery/genesis.
- `src/qcds_fabric/evidence_planning.py` — BUILD 13 information needs and resumable checkpoints.
- `src/qcds_fabric/logical_robot.py` — BUILD 14 logical-body contract and observation bridge.
- `src/qcds_fabric/intelligence_store.py` — BUILD 15 CSV intelligence persistence.
- `src/qcds_fabric/runtime.py` — BUILD 15 callable persistent superintelligence runtime.
- `src/qcds_fabric/first_logical_robot.py` — BUILD 16 first concrete logical robot and web observer.
- `src/qcds_fabric/kernel.py` — bounded classical reference inference kernel.
- `src/qcds_fabric/substrates.py` — substrate contract + statevector/Grover simulator.
- `src/qcds_fabric/grover_depth.py` — adaptive `m/m*` and overshoot diagnostics.
- `src/qcds_fabric/rotations.py` — position/oracle/crossed diagnostic views.
- `src/qcds_fabric/stabilize.py` — null and multi-family stabilization.
- `src/qcds_fabric/funnel.py` — provenance-preserving serial contraction.
- `src/qcds_fabric/reentry.py` — higher-order distribution-oracle re-entry.
- `src/qcds_fabric/engine.py` — bounded recursive execution and convergence trace.
- `src/qcds_fabric/expansion.py` — BUILD 8 expansion and re-contraction.
- `src/qcds_fabric/benchmark.py` — architecture falsification and BUILD 5 target metrics.
- `src/qcds_fabric/substrate_benchmark.py` — matched cross-substrate comparison.
- `tests/` — regression/falsification tests for every BUILD.

## Run the tests

```bash
python -m pip install -e '.[test]'
pytest -q
```

GitHub Actions runs the same suite for implementation branches, pull requests and `main`.

---

## Canonical QCDS Fabric v1.0

Start with the locked artifacts:

- [Canonical specification — Markdown](QCDS_FABRIC_SPEC_v1.0_CANONICAL.md)
- [Canonical specification — PDF](QCDS_FABRIC_SPEC_v1.0_CANONICAL.pdf)
- [Canonical specification — DOCX](QCDS_FABRIC_SPEC_v1.0_CANONICAL.docx)
- [Release lock / SHA-256](QCDS_FABRIC_SPEC_v1.0_RELEASE_LOCK.txt)
- [Frozen release package](QCDS_FABRIC_SPEC_v1.0_CANONICAL_RELEASE.zip)

The four phases remain:

1. **Condition Formation** — open represented possibility space without preselecting the answer.
2. **Conditional Evolution** — apply evidence, logic, physics, biology, experiment, safety and other constraints as oracles.
3. **Recursive Inference** — amplify, rotate, compare, re-enter, expand and recursively reshape the working TruthDistribution.
4. **Truth-Alignment / Syntract Binding** — bind what remains coherent through evidence, contradiction, composition and repeated inference.

### Core invariants retained by the implementation

- `∅` is logical absence, not `0` and not wildcard `?`.
- Comparable diagnostic channels receive the same active oracle regime.
- Diagnostic views are not counted as independent facts/dimensions.
- Stabilization happens before recursive funnel promotion.
- Disagreement and contradiction remain representable states.
- TruthDistribution is preserved instead of silently hard-collapsing early.
- Fabric logic remains separable from CPU/simulator/QPU substrate.
- External truth requires appropriate external validation.
- Oracle evolution/genesis may change challenged implementation populations, **not** the locked canonical specification.
- A stalled implementation cycle is not automatically a terminal truth state.
- A logical-robot observation is evidence with provenance, not automatic truth.
- A persisted oracle row is implementation state, not automatic external truth.
- A web page is an observation source, not an oracle merely because the robot found it.

## Contraction, expansion, evolution, information seeking and persistent observation

```text
BIND → EXPAND → TEST → CONTRACT → BIND

INFER → DISCOVER GAP → GENESIS → CHALLENGE → PROMOTE/REJECT → RE-INFER

NO PROMOTION → PLAN DISCRIMINATING EVIDENCE → LOGICAL ROBOT → NEW EVIDENCE → PERSIST → RECOMPILE → RE-INFER
```

These loops interact while retaining separate provenance.

## Falsifiability and claim boundary

The implementation intentionally keeps failure points visible: semantic parsing
may be wrong; ontology may be incomplete; source confidence may be poorly
calibrated; an oracle gap may be spurious; generated hypotheses may miss the
mechanism; a plan may be low-value; a logical source may be wrong or stale; the
first textual candidate extractor may be too weak; a tool adapter may extract the
wrong observation; persisted CSV state may be insufficient for a future oracle
type; challenge targets may be unrepresentative; a simpler ablation may
outperform the full Fabric; adaptive Grover depth may overshoot; and a stable
distribution or promoted oracle may still be externally wrong.

Therefore BUILD 16 does **not** claim unrestricted web understanding, universal
autonomous causal discovery, unrestricted autonomous external action,
unrestricted self-modification, AGI/ASI, native quantum advantage or automatic
external truth. It establishes the first runnable logical-robot MVP around the
already tested persistent QCDS information-seeking loop.

## Canonical publications

- **The Syntract Vision:** https://zenodo.org/records/22031525 — DOI `10.5281/zenodo.22031525`
- **QCDS implementation:** https://github.com/iampathat/QCDS
- **Inference Is All You Need:** https://zenodo.org/records/15455541
- **Mathematics and Logic of QCDS:** https://zenodo.org/records/15533909

## Authorship and licensing

**The Syntract Vision, Quantum Condition-Driven Synthesis (QCDS), QCDS Fabric,
and the Syntract architecture are authored by Patrik Sundblom.**

Theory/specification: **CC BY 4.0**. Reference software: **MIT**. Implementation,
editorial, visualization or AI assistance may be acknowledged separately and
does not alter conceptual authorship.

---

```text
OPEN THE POSSIBILITY SPACE.
APPLY THE ORACLES.
INFER IN PARALLEL.
NULL WHAT MUST BE QUESTIONED.
ROTATE WHAT MUST BE TESTED.
STABILIZE BEFORE YOU FUNNEL.
RECURSE.
EXPAND WHAT THE BINDING MAKES POSSIBLE.
TEST THE EXPANSION.
DISCOVER WHAT IS MISSING.
GENERATE RIVAL ORACLES.
CHALLENGE THE ORACLES.
ASK WHAT EVIDENCE WOULD DISTINGUISH THEM.
LET THE LOGICAL ROBOT SEEK.
OBSERVE WITHOUT CALLING OBSERVATION TRUTH.
RETURN EVIDENCE WITH PROVENANCE.
PERSIST WHAT EVOLVED.
RESUME.
EVOLVE WHAT SURVIVES.
BIND WHAT STILL HOLDS.
```

**Welcome to the end of the beginning.**

— **Patrik Sundblom**
