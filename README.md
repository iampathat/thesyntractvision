# The Syntract Vision

> **From uncertainty toward truth. From truth toward action.**

**Author and originator:** Patrik Sundblom  
**Project:** The Syntract Vision / QCDS / Syntract  
**Canonical architecture:** **QCDS Fabric v1.0 — locked**  
**Reference implementation:** **BUILD 14 / package 1.5.0**  
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

BUILD 14 does not replace earlier BUILDs. It adds the first **logical robot
runtime** around BUILD 13 evidence planning while keeping the complete BUILD
0–13 intelligence path active underneath it.

## Current executable path

```text
HUMAN PROBLEM / EXTERNAL SEMANTIC ADAPTER
                    ↓
           SEMANTIC PROBLEM FRAME
 entities · queries · claims · relations · rules
 ontology · source confidence · unresolved · provenance
                    ↓
             ONTOLOGY MAPPING
                    ↓
            JOINT LOGIC COMPILER
                    ↓
   CONDITIONS + EVIDENCE / RULE ORACLES
                    ↓
               QCDS FABRIC
                    ↓
          SUBSTRATE INTERFACE
       ↙                         ↘
  CLASSICAL                STATEVECTOR / GROVER
  REFERENCE            fixed m or adaptive view-local m*
       ↘                         ↙
 NULL / POSITION / ORACLE / CROSSED ROTATIONS
                    ↓
           JOINT TRUTH DISTRIBUTION
                    ↓
       ORACLE GAP DISCOVERY
 contradiction · null influence · failed prediction/expansion
                    ↓
             ORACLE GENESIS
       rival explicit oracle hypotheses
                    ↓
          ORACLE CHALLENGE LAYER
        selection + holdout cases
                    ↓
        PROMOTE? ── yes ──→ VERSION + RE-INJECT → INFER ↺
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
 WEB / PAPERS / API / DB / FILE / SIMULATION ADAPTER
            ↓
     SOURCE-ATTRIBUTED OBSERVATION
            ↓
     EVIDENCE INGESTION / CHECKPOINT WAKE
            ↓
        RECOMPILE → INFER ↺
            ↓
         SYNTRACT BIND
       ↙                ↘
 CONTRACT N→1        EXPAND 1→N
       ↘                ↓
          TEST / ORACLES
               ↓
          CONTRACT / BIND
               ↺
```

The logical robot is a body/runtime layer, not a replacement reasoning engine.
Semantic parsing, QCDS inference, oracle genesis/evolution, evidence planning and
logical observation remain separable and auditable.

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
to be missing before proposing replacements or additions.

Gap discovery combines target-blind prediction/expansion failures with internal
contradiction/null-influence diagnostics. `OracleGap` drives a bounded rival
field of explicit hypotheses, which still must pass BUILD 11 challenge. See
[`ORACLE_GENESIS.md`](ORACLE_GENESIS.md).

## BUILD 13: autonomous evidence / experiment planning

BUILD 13 adds `src/qcds_fabric/evidence_planning.py` and asks: **if oracle
hypotheses remain unresolved, what new information would best distinguish them?**

The default planner receives no challenge targets or holdout answers. It compares
current and candidate oracle populations under the same present evidence and
turns disagreement into explicit `EvidenceNeed`, `EvidenceAction` and
`EvidencePlan` structures.

`IntelligenceCheckpoint` separates `active`, `awaiting_evidence`, `quiescent` and
explicit `terminal` states. `no_oracle_gaps` and `no_promotable_hypotheses` are
therefore resumable states rather than permanent lock states, while unchanged
state does not automatically busy-loop.

See [`EVIDENCE_PLANNING.md`](EVIDENCE_PLANNING.md).

## BUILD 14: logical robot

BUILD 14 adds `src/qcds_fabric/logical_robot.py`: the first executable logical
body for the existing intelligence loop.

The runtime consumes BUILD 13 evidence plans and routes them through explicit
provider adapters. The reference capability vocabulary is:

- `search`
- `read`
- `follow`
- `query`
- `compare`
- `compute`

A future web browser, scientific index, API, database, file corpus or bounded
simulation backend can implement `LogicalRobotTool`. The QCDS package itself does
not need to become a browser or hard-code any particular information provider.

### Strategy without target leakage

`LogicalRobotRequest` contains the evidence objective, relevant query ids,
dimensions and represented candidates, but **not** the BUILD 11 challenge target,
holdout answer or expected truth value.

A BUILD 13 `independent_observation` can for example map to:

```text
SEARCH → READ → FOLLOW → COMPARE
```

If search yields only a reference, a provider may request a `read` retry. The
runtime is bounded by step, attempt and observation budgets, so strategy changes
do not become an unbounded crawl.

### Observation returns to the same QCDS machine

A successful logical observation preserves source id, confidence, capability and
optional URI/excerpt provenance. It is validated against the represented
candidate space and converted into BUILD 13 `EvidenceAcquisitionResult`.

Then:

```text
LOGICAL ROBOT OBSERVATION
        ↓
SOURCE-ATTRIBUTED EVIDENCE
        ↓
BUILD 13 RESUME
        ↓
RECOMPILE
        ↓
QCDS + GENESIS + EVOLUTION + SYNTRACT + EXPANSION
```

If no evidence is found, QCDS is not re-run on the identical state. The logical
robot returns `awaiting_sources` and remains resumable on a new source, changed
logical environment, new evidence plan, oracle change or manual resume.

BUILD 14 authorizes information observation only. It does not grant arbitrary
external side effects or physical actuation.

See [`LOGICAL_ROBOT.md`](LOGICAL_ROBOT.md).

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
| 14 | current | logical robot observation runtime + QCDS resume bridge |

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

## Contraction, expansion, evolution, information seeking and logical observation

```text
BIND → EXPAND → TEST → CONTRACT → BIND

INFER → DISCOVER GAP → GENESIS → CHALLENGE → PROMOTE/REJECT → RE-INFER

NO PROMOTION → PLAN DISCRIMINATING EVIDENCE → LOGICAL ROBOT → NEW EVIDENCE → RECOMPILE → RE-INFER
```

These loops interact while retaining separate provenance.

## Falsifiability and claim boundary

The implementation intentionally keeps failure points visible: semantic parsing
may be wrong; ontology may be incomplete; source confidence may be poorly
calibrated; an oracle gap may be spurious; generated hypotheses may miss the
mechanism; a plan may be low-value; a logical source may be wrong or stale; a
tool adapter may extract the wrong observation; challenge targets may be
unrepresentative; a simpler ablation may outperform the full Fabric; adaptive
Grover depth may overshoot; and a stable distribution or promoted oracle may
still be externally wrong.

Therefore BUILD 14 does **not** claim unrestricted web understanding, universal
autonomous causal discovery, unrestricted autonomous external action,
unrestricted self-modification, AGI/ASI, native quantum advantage or automatic
external truth. It establishes an auditable logical-robot body connected to the
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
RESUME.
EVOLVE WHAT SURVIVES.
BIND WHAT STILL HOLDS.
```

**Welcome to the end of the beginning.**

— **Patrik Sundblom**