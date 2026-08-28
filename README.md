# The Syntract Vision

> **From uncertainty toward truth. From truth toward action.**

**Author and originator:** Patrik Sundblom  
**Project:** The Syntract Vision / QCDS / Syntract  
**Canonical architecture:** **QCDS Fabric v1.0 — locked**  
**Reference implementation:** **BUILD 11 / package 1.2.0**  
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

BUILD 11 does not change the canon. It adds the first bounded **challenged oracle
self-evolution loop** around the existing problem-to-Syntract machine.

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

The semantic frontend, oracle proposal system and QCDS inference core remain
separable. External trained models may supply semantic parsing or oracle
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

A `SemanticProblemFrame` can contain:

- multiple `ProblemQuery` objects;
- an explicit `SemanticEntity` registry;
- source-attributed claims;
- `SemanticRelation` structures;
- cross-query `SemanticRule` constraints;
- explicit `OntologyMap` aliases;
- unresolved semantic material and adapter provenance.

Multiple query groups are compiled into the **same local binary space**. An
explicit rule can therefore couple them before inference. Rules support bounded
`implies`, `excludes` and `equivalent` transforms, separately tagged as
`logical`, `causal` or `temporal` provenance.

Ontology mappings are explicit and auditable. Partly answerable problems keep
`blocked_queries`; no candidate is invented merely to make a query executable.

See [`PROBLEM_TO_SYNTRACT.md`](PROBLEM_TO_SYNTRACT.md).

## BUILD 11: challenged oracle evolution

BUILD 11 adds `src/qcds_fabric/oracle_evolution.py` and closes a new bounded
feedback loop around BUILD 10.

### Proposal and challenge are separate

`OracleProposalGenerator` receives only the active oracle population and the
generation number. **Challenge targets are not arguments to the proposal
interface.** Hypotheses are generated first; only then are they evaluated.

The built-in `SemanticRuleMutationGenerator` can generate competing versions of
BUILD 10 `SemanticRuleOracle` objects, including alternate explicit rule
transforms. It does not mutate source-evidence confidence by default.

`OracleRetirementGenerator` turns removal into an explicit hypothesis. Oracle
retirement is therefore a challenged generalization of BUILD 5 leave-one-out,
not silent pruning.

### Selection and holdout

An `OracleChallengeSuite` contains externally checkable cases. Each case keeps:

- its own bounded Condition bundle;
- case-specific fixed evidence/context oracles;
- an explicit target distribution;
- selection or holdout role;
- provenance.

The evolving oracle population is separate from those case-specific contexts.
This lets the same proposed oracle be tested under multiple evidence conditions.

Default promotion gates require selection improvement, holdout non-regression,
no single-case regression, no extra contradiction markers and at least one
observable distribution effect. These are explicit reference-implementation
policy defaults, not new QCDS canon.

### Versioned lineage and re-entry

Every promotion records generation, generator, mutation, replaced oracle id,
new oracle id (or retirement), resulting stack version and challenge suite.

BUILD 10 integration is explicit:

```text
ProblemCompilation
      ↓
extract evolvable SemanticRuleOracle population
      ↓
challenge / evolve
      ↓
apply evolved population back to fresh compilation
      ↓
run normal QCDS Fabric again
```

So the machine now has a tested bounded loop:

```text
PROBLEM → INFER → CHALLENGE ORACLES → EVOLVE → RE-INFER → ...
```

The canonical v1.0 specification is outside this mutation boundary and is never
automatically rewritten.

See [`ORACLE_EVOLUTION.md`](ORACLE_EVOLUTION.md).

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
| 11 | current | challenged, versioned oracle-population evolution |

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
- `src/qcds_fabric/oracle_evolution.py` — BUILD 11 hypothesis generation,
  selection/holdout challenges, promotion/retirement, lineage and re-injection.
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
- Oracle evolution may change a challenged implementation population, **not**
  the locked canonical specification.

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

BUILD 11 adds a second bounded feedback loop:

```text
INFER → PROPOSE ORACLES → CHALLENGE → PROMOTE/REJECT → RE-INFER
```

These loops can interact while preserving their provenance separately.

## Falsifiability and claim boundary

The implementation intentionally keeps possible failure points visible:

- semantic adapter may misunderstand or leave language unresolved;
- ontology mapping may be wrong or incomplete;
- source confidence may be poorly calibrated;
- a causal/temporal rule or evolved oracle may be false;
- challenge targets may themselves be wrong, leaked or unrepresentative;
- a candidate may overfit selection and fail holdout;
- a blocked query may remain unanswerable;
- a simpler architecture ablation may outperform full diagnostics;
- classical inference may outperform the statevector reference on a benchmark;
- adaptive Grover depth may overshoot or lose to fixed depth;
- expansion may produce branches that later fail validation;
- a stable distribution or promoted oracle may still be externally wrong.

Therefore BUILD 11 does **not** claim unrestricted natural-language
understanding, autonomous universal causal discovery, unrestricted
self-modification, AGI/ASI, native quantum advantage, or automatic external
truth. It establishes a tested, reversible and falsifiable path for evolving
oracle populations under explicit challenge pressure.

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
CHALLENGE THE ORACLES.
EVOLVE WHAT SURVIVES.
BIND WHAT STILL HOLDS.
```

**Welcome to the end of the beginning.**

— **Patrik Sundblom**