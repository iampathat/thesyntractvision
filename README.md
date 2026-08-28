# The Syntract Vision

> **From uncertainty toward truth. From truth toward action.**

**Author and originator:** Patrik Sundblom  
**Project:** The Syntract Vision / QCDS / Syntract  
**Canonical architecture:** **QCDS Fabric v1.0 — locked**  
**Reference implementation:** **BUILD 12 / package 1.3.0**  
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

BUILD 12 does not change the canon. It adds **oracle gap discovery + oracle
genesis** ahead of BUILD 11's challenged oracle-population evolution.

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
    PROPOSE → TEST → PROMOTE / REJECT
                    ↓
       VERSIONED ORACLE POPULATION
                    ↓
            RE-INJECT / INFER
                    ↺
                    ↓
             SYNTRACT BIND
              ↙          ↘
        CONTRACT N→1    EXPAND 1→N
              ↘          ↓
                TEST / ORACLES
                     ↓
                CONTRACT / BIND
                     ↺
```

The semantic frontend, oracle discovery/proposal systems and QCDS inference core
remain separable. External trained models may supply semantic parsing or oracle
hypotheses, but they do not become the QCDS kernel and their proposals are not
automatically treated as truth.

## BUILD 9: human-to-logic

BUILD 9 established the first model-independent semantic boundary:

- `SemanticQuery`, `SemanticClaim` and `SemanticFrame` define a bounded semantic
  ingress contract;
- `ControlledEnglishAnalyzer` in `semantic_ingress.py` proves deterministic
  raw-text ingress and preserves `[0.90]`-style source confidence correctly;
- unknown language remains explicit as `unresolved`;
- categorical candidates become binary dimensions with `OneHotOracle` logic;
- claims become soft, source-attributed `EvidenceOracle` constraints;
- competing claims remain explicit disagreement rather than a fabricated answer;
- semantic results bind into a normal uncertainty-bearing Syntract.

See [`SEMANTIC_INGRESS.md`](SEMANTIC_INGRESS.md).

## BUILD 10: problem-to-Syntract

BUILD 10 adds `src/qcds_fabric/problem.py` and moves from one query to a joint
semantic problem.

A `SemanticProblemFrame` can contain multiple queries, entities, claims,
relations, cross-query rules, ontology mappings, unresolved material and adapter
provenance. Multiple query groups are compiled into the **same local binary
space**, so explicit rules can couple them before inference.

Rules support bounded `implies`, `excludes` and `equivalent` transforms,
separately tagged as `logical`, `causal` or `temporal` provenance. Ontology
mappings are explicit and auditable. Partly answerable problems retain
`blocked_queries`; candidates are not invented merely to make a query executable.

See [`PROBLEM_TO_SYNTRACT.md`](PROBLEM_TO_SYNTRACT.md).

## BUILD 11: challenged oracle evolution

BUILD 11 adds `src/qcds_fabric/oracle_evolution.py` and closes a bounded feedback
loop around BUILD 10.

`OracleProposalGenerator` does not receive challenge targets. Hypotheses are
generated first and only then evaluated against explicit selection/holdout cases.
The built-in mutation generator can challenge existing BUILD 10 rule transforms;
retirement is an explicit leave-one-out hypothesis rather than silent pruning.

Promotion can require selection improvement, holdout non-regression, bounded
worst-case regression, no contradiction increase and an observable distribution
effect. Every promotion records versioned lineage and can be re-injected into a
fresh `ProblemCompilation` for ordinary Fabric inference.

See [`ORACLE_EVOLUTION.md`](ORACLE_EVOLUTION.md).

## BUILD 12: oracle genesis

BUILD 12 adds `src/qcds_fabric/oracle_genesis.py` and moves one step earlier:
**the system can now identify where an oracle appears to be missing before it
starts proposing replacements or additions.**

Gap discovery can combine:

- a baseline contradiction that clears under dimension nulling;
- material null-influence on agreement or entropy;
- externally observed `prediction_failure` signals;
- externally observed `expansion_failure` signals.

External failure observations are deliberately **target-blind**. They identify
the affected query/dimensions and severity but contain no expected answer or
target distribution. Correct outcomes remain inside BUILD 11 challenge cases.

Signals are aggregated into `OracleGap` objects with affected dimensions,
bounded context, severity and provenance. The built-in
`PairwiseSemanticRuleGenesisGenerator` then emits a bounded rival field of new
cross-group `SemanticRuleOracle` hypotheses using explicit `implies`, `excludes`
and `equivalent` transforms. It labels those candidates `logical`; surviving a
challenge is not treated as proof of causality.

`run_oracle_genesis_cycle(...)` closes the tested loop:

```text
INFER
  ↓
DISCOVER GAP
  ↓
GENERATE RIVAL ORACLES
  ↓
BUILD 11 SELECTION + HOLDOUT CHALLENGE
  ↓
PROMOTE / REJECT
  ↓
RE-INJECT EVOLVED POPULATION
  ↓
INFER / BIND
  ↺
```

If no gap is detected, evolution stops. If a gap is detected but no hypothesis
survives challenge, the population remains unchanged instead of mutating for its
own sake.

See [`ORACLE_GENESIS.md`](ORACLE_GENESIS.md).

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
| 12 | current | target-blind oracle gap discovery + oracle genesis |

See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the exact implementation
boundary.

## Code map

- `src/qcds_fabric/models.py` — BaseBundle, ChannelView, TruthDistribution,
  StabilizedReturn and Syntract.
- `src/qcds_fabric/oracles.py` — exact, mask and DistributionOracle semantics.
- `src/qcds_fabric/semantic.py` — BUILD 9 semantic data model, evidence/logic
  oracles and one-query semantic compiler.
- `src/qcds_fabric/semantic_ingress.py` — bounded Controlled-English raw-text
  adapter and public `human_to_logic(...)` helpers.
- `src/qcds_fabric/problem.py` — BUILD 10 entities, relations, ontology mapping,
  multi-query joint compiler, cross-query rules and problem Syntract binding.
- `src/qcds_fabric/oracle_evolution.py` — BUILD 11 hypothesis mutation,
  selection/holdout challenge, promotion/retirement, lineage and re-injection.
- `src/qcds_fabric/oracle_genesis.py` — BUILD 12 target-blind gap discovery,
  genesis hypotheses and BUILD 11 challenge bridge.
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

## Contraction, expansion and oracle evolution

The reference package executes both inference directions:

```text
N → 1   contraction / binding
1 → N   expansion of compatible branches
```

BUILD 8 closes:

```text
BIND → EXPAND → TEST → CONTRACT → BIND
```

BUILD 11 adds:

```text
INFER → PROPOSE ORACLES → CHALLENGE → PROMOTE/REJECT → RE-INFER
```

BUILD 12 extends that loop to:

```text
INFER → DISCOVER GAP → GENESIS → CHALLENGE → PROMOTE/REJECT → RE-INFER
```

These loops can interact while retaining separate provenance.

## Falsifiability and claim boundary

The implementation intentionally keeps possible failure points visible:

- semantic adapter may misunderstand or leave language unresolved;
- ontology mapping may be wrong or incomplete;
- source confidence may be poorly calibrated;
- a discovered oracle gap may be spurious;
- generated candidates may miss the actual missing mechanism;
- a causal/temporal rule or evolved oracle may be false;
- challenge targets may themselves be wrong, leaked or unrepresentative;
- a candidate may overfit selection and fail holdout;
- a blocked query may remain unanswerable;
- a simpler architecture ablation may outperform full diagnostics;
- classical inference may outperform the statevector reference on a benchmark;
- adaptive Grover depth may overshoot or lose to fixed depth;
- expansion may produce branches that later fail validation;
- a stable distribution or promoted oracle may still be externally wrong.

Therefore BUILD 12 does **not** claim unrestricted natural-language
understanding, universal autonomous causal discovery, unrestricted
self-modification, AGI/ASI, native quantum advantage, or automatic external
truth. It establishes a tested, reversible and falsifiable path from a detected
constraint gap to newly generated oracle hypotheses and challenged population
updates.

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
EVOLVE WHAT SURVIVES.
BIND WHAT STILL HOLDS.
```

**Welcome to the end of the beginning.**

— **Patrik Sundblom**