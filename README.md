# The Syntract Vision

> **From uncertainty toward truth. From truth toward action.**

**Author and originator:** Patrik Sundblom  
**Project:** The Syntract Vision / QCDS / Syntract  
**Canonical architecture:** **QCDS Fabric v1.0 — locked**  
**Reference implementation:** **BUILD 15 / package 1.6.0**  
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

BUILD 15 does not replace earlier BUILDs. It adds a small **persistent
superintelligence runtime** and human-readable intelligence store above the
complete BUILD 0–14 machine. The logical robot remains a body/caller rather than
becoming the reasoning core.

## Current executable path

```text
LOGICAL ROBOT / OTHER CALLER
            ↓
  SUPERINTELLIGENCE RUNTIME
     step · observe · state
            ↓
HUMAN PROBLEM / EXTERNAL SEMANTIC ADAPTER
            ↓
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
    ORACLE CHALLENGE LAYER
     selection + holdout
            ↓
 PROMOTE? ─ yes → VERSION + RE-INJECT → INFER ↺
     │
     no
     ↓
 HYPOTHESIS DISAGREEMENT
     ↓
 INFORMATION NEED
     ↓
 EVIDENCE / EXPERIMENT PLAN
     ↓
 LOGICAL ROBOT
 SEARCH · READ · FOLLOW · QUERY · COMPARE · COMPUTE
     ↓
 SOURCE-ATTRIBUTED OBSERVATION
     ↓
 runtime.observe(...)
     ↓
 PERSIST EVIDENCE + ACTIVE ORACLES + CHECKPOINT
     ↓
 runtime.step(...)
     ↓
 RECOMPILE → QCDS ↺
     ↓
 SYNTRACT BIND / CONTRACT / EXPAND / TEST
```

The logical robot, persistence backend, semantic parser, QCDS inference,
oracle genesis/evolution and evidence planning remain separate boundaries.

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

BUILD 12 moves one step earlier: the machine can identify where an oracle appears
to be missing before proposing replacements or additions. Gap discovery combines
target-blind prediction/expansion failures with internal contradiction/null
influence diagnostics. See [`ORACLE_GENESIS.md`](ORACLE_GENESIS.md).

## BUILD 13: autonomous evidence / experiment planning

BUILD 13 asks: **if oracle hypotheses remain unresolved, what new information
would best distinguish them?** It turns disagreement into explicit
`EvidenceNeed`, `EvidenceAction` and `EvidencePlan` structures and keeps stalled
cycles resumable rather than permanently terminal. See
[`EVIDENCE_PLANNING.md`](EVIDENCE_PLANNING.md).

## BUILD 14: logical robot

BUILD 14 adds `src/qcds_fabric/logical_robot.py`: the first executable logical
body for the existing intelligence loop. The reference capability vocabulary is
`search`, `read`, `follow`, `query`, `compare` and `compute`.

A future web browser, scientific index, API, database, file corpus or bounded
simulation backend can implement `LogicalRobotTool`. `LogicalRobotRequest` never
contains BUILD 11 challenge targets or expected truth values. Accepted
observations return as source-attributed BUILD 13 evidence. If no evidence is
found, the robot returns `awaiting_sources` rather than forcing an identical QCDS
rerun or terminal state. See [`LOGICAL_ROBOT.md`](LOGICAL_ROBOT.md).

## BUILD 15: persistent superintelligence runtime

BUILD 15 adds `src/qcds_fabric/runtime.py` and
`src/qcds_fabric/intelligence_store.py`.

The main callable boundary is intentionally small:

```python
store = CsvIntelligenceStore("./intelligence_store")
runtime = SuperintelligenceRuntime(store)

runtime.create_mission(frame)
step = runtime.step("mission-1", challenge_suite)

# logical robot acquires evidence from step.cycle.plans
runtime.observe("mission-1", evidence_results)
step2 = runtime.step("mission-1", challenge_suite)
```

The logical robot therefore does not need to know how Fabric, rotations,
stabilization, oracle genesis, challenge or persistence work internally.

### Human-readable intelligence

The first backend is deliberately ordinary CSV:

```text
intelligence_store/
└── mission-1/
    ├── mission.csv
    ├── current_oracles.csv
    ├── oracle_history.csv
    ├── evidence.csv
    └── checkpoints.csv
```

`current_oracles.csv` is the live evolvable oracle population. Its active rule
rows expose oracle id, antecedent, consequent, logical transform, relation class,
confidence, source and persistent stack version directly as columns. It does not
pickle Python objects or hide the active rule in an opaque parameter blob.

`oracle_history.csv` is append-oriented and records initialization,
`GENESIS_PROMOTED`, `MUTATED` and `RETIRED` lineage events. This makes the current
logic and the path by which it evolved inspectable with an ordinary text editor,
Numbers or Excel.

`mission.csv` reconstructs the structured problem frame; `evidence.csv` preserves
source-attributed observations; `checkpoints.csv` preserves runtime cycle/status
history.

The backend is explicitly an MVP. CSV is not presented as the future
high-performance representation of oracle logic. The persistence boundary is
separate so later implementations can move oracle execution/state toward FPGA,
QPU, accelerator or distributed substrates without changing the logical-robot
runtime call shape.

BUILD 15 also includes `run_logical_robot_once(...)` as a convenience proof that
BUILD 13 → BUILD 14 → evidence → runtime → QCDS can execute end-to-end. Real
logical robots can instead call `step()` and `observe()` independently.

See [`PERSISTENT_RUNTIME.md`](PERSISTENT_RUNTIME.md).

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
| 14 | merged | logical robot observation runtime + QCDS resume bridge |
| 15 | current | persistent runtime + human-readable intelligence store |

See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the exact implementation boundary.

## Code map

- `src/qcds_fabric/models.py` — core distributions, bundles and Syntract.
- `src/qcds_fabric/oracles.py` — exact, mask and DistributionOracle semantics.
- `src/qcds_fabric/semantic.py` / `semantic_ingress.py` — BUILD 9 semantic ingress.
- `src/qcds_fabric/problem.py` — BUILD 10 joint problem compiler.
- `src/qcds_fabric/oracle_evolution.py` — BUILD 11 challenged evolution.
- `src/qcds_fabric/oracle_genesis.py` — BUILD 12 target-blind gap discovery/genesis.
- `src/qcds_fabric/evidence_planning.py` — BUILD 13 information needs, evidence plans and resumable checkpoints.
- `src/qcds_fabric/logical_robot.py` — BUILD 14 logical body/runtime and observation-to-evidence bridge.
- `src/qcds_fabric/intelligence_store.py` — BUILD 15 CSV intelligence persistence.
- `src/qcds_fabric/runtime.py` — BUILD 15 callable persistent superintelligence runtime.
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
mechanism; a plan may be low-value; a logical source may be wrong or stale; a
tool adapter may extract the wrong observation; persisted CSV state may be
insufficient for a future oracle type; challenge targets may be unrepresentative;
a simpler ablation may outperform the full Fabric; adaptive Grover depth may
overshoot; and a stable distribution or promoted oracle may still be externally
wrong.

Therefore BUILD 15 does **not** claim unrestricted web understanding, universal
autonomous causal discovery, unrestricted autonomous external action,
unrestricted self-modification, AGI/ASI, native quantum advantage or automatic
external truth. It establishes an inspectable restartable MVP runtime around the
already tested QCDS information-seeking loop.

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
LET THE LOGICAL ROBOT OBSERVE.
RETURN EVIDENCE WITH PROVENANCE.
PERSIST WHAT EVOLVED.
RESUME.
EVOLVE WHAT SURVIVES.
BIND WHAT STILL HOLDS.
```

**Welcome to the end of the beginning.**

— **Patrik Sundblom**