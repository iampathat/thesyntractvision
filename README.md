# The Syntract Vision

> **From uncertainty toward truth. From truth toward action.**

**Author and originator:** Patrik Sundblom  
**Project:** The Syntract Vision / QCDS / Syntract  
**Canonical architecture:** **QCDS Fabric v1.0 — locked**  
**Reference implementation:** **BUILD 13 / package 1.4.0**  
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

BUILD 13 does not change the canon. It adds **autonomous information-need and
evidence/experiment planning plus resumable checkpoints** around BUILD 12 oracle
genesis and BUILD 11 challenged evolution.

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
          ↙          ↓           ↘
      QUERY A     QUERY B      QUERY C ...
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
 AWAITING EVIDENCE CHECKPOINT
            ↓
 NEW OBSERVATION / EXPERIMENT RESULT
            ↓
 SOURCE-ATTRIBUTED EVIDENCE INGESTION
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

The semantic frontend, oracle discovery/proposal systems, evidence planner and
QCDS inference core remain separable. External trained models may supply semantic
parsing or oracle hypotheses, but they do not become the QCDS kernel and their
proposals are not automatically treated as truth.

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
contradiction/null-influence diagnostics. `OracleGap` then drives a bounded rival
field of explicit `implies`, `excludes` and `equivalent` hypotheses, which must
still pass the unchanged BUILD 11 challenge path. See
[`ORACLE_GENESIS.md`](ORACLE_GENESIS.md).

## BUILD 13: autonomous evidence / experiment planning

BUILD 13 adds `src/qcds_fabric/evidence_planning.py` and asks the next question:
**if several oracle hypotheses remain unresolved, what new information would
most help distinguish them?**

The default `DisagreementEvidencePlanner` receives no challenge targets or
holdout answers. It runs the current population and target-blind candidate
populations under the same present evidence, projects their query distributions,
and ranks where their predictions disagree most.

That becomes an explicit `EvidenceNeed` and one or more `EvidenceAction` plans:

- `independent_observation`
- `replicate_measurement`
- `validation_experiment`
- `dimension_probe`
- `targeted_query`

A plan contains **what to measure or observe, not what the answer should be**.
BUILD 13 does not itself execute external physical/account actions; execution and
real-world safety/authorization remain an external boundary.

Externally obtained results can return as `EvidenceAcquisitionResult` and are
re-ingested as normal source-attributed `SemanticClaim` evidence. Only already
represented candidate values are accepted by this bounded ingestion path; new
semantics require semantic/expansion handling rather than silent invention.

### Stalling is not terminal

BUILD 13 also changes the implementation-level control model around a stalled
cycle. `IntelligenceCheckpoint` explicitly distinguishes:

- `active` — the oracle population changed;
- `awaiting_evidence` — a discriminating evidence plan exists;
- `quiescent` — no useful next action is available right now;
- `terminal` — only when explicitly requested by the caller.

So `no_oracle_gaps` and `no_promotable_hypotheses` are **not permanent lock
states**. Non-terminal checkpoints remain resumable on new evidence, a new
failure observation, a new expansion result, oracle-population change or manual
resume.

At the same time, the default policy does not busy-loop on an unchanged state.
Resume requires a real new trigger or an explicit `force_replan=True`.

See [`EVIDENCE_PLANNING.md`](EVIDENCE_PLANNING.md).

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
| 13 | current | resumable autonomous evidence / experiment planning |

See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the exact implementation
boundary.

## Code map

- `src/qcds_fabric/models.py` — BaseBundle, ChannelView, TruthDistribution,
  StabilizedReturn and Syntract.
- `src/qcds_fabric/oracles.py` — exact, mask and DistributionOracle semantics.
- `src/qcds_fabric/semantic.py` — BUILD 9 semantic data model and evidence/logic oracles.
- `src/qcds_fabric/semantic_ingress.py` — bounded Controlled-English raw-text adapter.
- `src/qcds_fabric/problem.py` — BUILD 10 joint problem compiler and Syntract binding.
- `src/qcds_fabric/oracle_evolution.py` — BUILD 11 challenge, evolution, lineage and re-injection.
- `src/qcds_fabric/oracle_genesis.py` — BUILD 12 target-blind gap discovery and genesis.
- `src/qcds_fabric/evidence_planning.py` — BUILD 13 information need, action planning,
  evidence ingestion and resumable checkpoints.
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

GitHub Actions runs the same suite for implementation branches, pull requests
and `main`.

---

## Canonical QCDS Fabric v1.0

Start with the locked artifacts:

- [Canonical specification — Markdown](QCDS_FABRIC_SPEC_v1.0_CANONICAL.md)
- [Canonical specification — PDF](QCDS_FABRIC_SPEC_v1.0_CANONICAL.pdf)
- [Canonical specification — DOCX](QCDS_FABRIC_SPEC_v1.0_CANONICAL.docx)
- [Release lock / SHA-256](QCDS_FABRIC_SPEC_v1.0_RELEASE_LOCK.txt)
- [Frozen release package](QCDS_FABRIC_SPEC_v1.0_CANONICAL_RELEASE.zip)

The four phases remain:

1. **Condition Formation** — open represented possibility space without
   preselecting the answer.
2. **Conditional Evolution** — apply evidence, logic, physics, biology,
   experiment, safety and other constraints as oracles.
3. **Recursive Inference** — amplify, rotate, compare, re-enter, expand and
   recursively reshape the working TruthDistribution.
4. **Truth-Alignment / Syntract Binding** — bind what remains coherent through
   evidence, contradiction, composition and repeated inference.

### Core invariants retained by the implementation

- `∅` is logical absence, not `0` and not wildcard `?`.
- Comparable diagnostic channels receive the same active oracle regime.
- Diagnostic views are not counted as independent facts/dimensions.
- Stabilization happens before recursive funnel promotion.
- Disagreement and contradiction remain representable states.
- TruthDistribution is preserved instead of silently hard-collapsing early.
- Fabric logic remains separable from CPU/simulator/QPU substrate.
- External truth requires appropriate external validation.
- Oracle evolution/genesis may change challenged implementation populations,
  **not** the locked canonical specification.
- A stalled implementation cycle is not automatically a terminal truth state.

## Contraction, expansion, evolution and information seeking

The reference package executes both inference directions:

```text
N → 1   contraction / binding
1 → N   expansion of compatible branches
```

BUILD 8 closes:

```text
BIND → EXPAND → TEST → CONTRACT → BIND
```

BUILD 11–12 add:

```text
INFER → DISCOVER GAP → GENESIS → CHALLENGE → PROMOTE/REJECT → RE-INFER
```

BUILD 13 extends the unresolved branch:

```text
NO PROMOTION
    ↓
COMPARE HYPOTHESES
    ↓
PLAN DISCRIMINATING EVIDENCE
    ↓
CHECKPOINT / WAIT
    ↓
NEW EVIDENCE
    ↓
RECOMPILE → INFER → DISCOVER → CHALLENGE
```

These loops can interact while retaining separate provenance.

## Falsifiability and claim boundary

The implementation intentionally keeps possible failure points visible:

- semantic adapter may misunderstand or leave language unresolved;
- ontology mapping may be wrong or incomplete;
- source confidence may be poorly calibrated;
- a discovered oracle gap may be spurious;
- generated candidates may miss the actual missing mechanism;
- an evidence plan may be low-value, costly, impossible or poorly chosen;
- acquired evidence may itself be wrong or unrepresentative;
- a causal/temporal rule or evolved oracle may be false;
- challenge targets may themselves be wrong, leaked or unrepresentative;
- a candidate may overfit selection and fail holdout;
- a blocked query may remain unanswerable;
- a simpler architecture ablation may outperform full diagnostics;
- classical inference may outperform the statevector reference on a benchmark;
- adaptive Grover depth may overshoot or lose to fixed depth;
- expansion may produce branches that later fail validation;
- a stable distribution or promoted oracle may still be externally wrong.

Therefore BUILD 13 does **not** claim unrestricted natural-language
understanding, universal autonomous causal discovery, unrestricted autonomous
real-world experimentation, unrestricted self-modification, AGI/ASI, native
quantum advantage, or automatic external truth. It establishes a tested,
resumable and falsifiable path from uncertainty to a new information request and
back into QCDS inference.

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
ACQUIRE NEW EVIDENCE.
RESUME.
EVOLVE WHAT SURVIVES.
BIND WHAT STILL HOLDS.
```

**Welcome to the end of the beginning.**

— **Patrik Sundblom**
