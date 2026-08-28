# The Syntract Vision

> **From uncertainty toward truth. From truth toward action.**

**Author and originator:** Patrik Sundblom  
**Project:** The Syntract Vision / QCDS / Syntract  
**Canonical architecture:** **QCDS Fabric v1.0 — locked**  
**Reference implementation:** **BUILD 9 / package 1.0.0**  
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

BUILD 9 does not change the canon. It adds the first audited human-to-logic
frontend to the existing machine.

## Current executable path

```text
HUMAN QUESTION / EXTERNAL SEMANTIC PARSER
                ↓
        SEMANTIC FRAME
 claims · candidates · sources · confidence · unresolved
                ↓
        LOGIC COMPILER
                ↓
 CONDITIONS + EVIDENCE/LOGIC ORACLES
                ↓
          QCDS FABRIC
                ↓
     SUBSTRATE INTERFACE
      ↙                 ↘
 CLASSICAL        STATEVECTOR / GROVER
                  fixed m / adaptive m*
      ↘                 ↙
 NULL / POSITION / ORACLE / CROSSED ROTATIONS
                ↓
       TRUTH DISTRIBUTIONS
                ↓
       FAMILY STABILIZATION
                ↓
     SERIAL CONTRACTION FUNNEL
                ↓
        RE-ENTRY / RECURSE
                ↓
          SYNTRACT BIND
          ↙           ↘
      CONTRACT       EXPAND 1→N
          ↘           ↓
             TEST / ORACLES
                  ↓
             CONTRACT / BIND
                  ↺
```

The semantic frontend and QCDS inference core remain separable. The canonical
spec explicitly permits external trained models to supply semantic parsing,
proposed Conditions, or candidate oracles; the core inference loop does not
require training/backprop/persistent learned weights.

## BUILD 9: human-to-logic

The new `src/qcds_fabric/semantic.py` adds:

- `SemanticQuery`, `SemanticClaim`, and `SemanticFrame` as a model-independent
  semantic ingress contract;
- `ControlledEnglishAnalyzer` as a bounded deterministic raw-text demonstrator;
- explicit `unresolved` retention instead of guessing unknown language;
- categorical candidate dimensions and `OneHotOracle` logic;
- source-attributed soft `EvidenceOracle` constraints;
- semantic disagreement markers for competing source claims;
- baseline **and** stabilized candidate projections;
- semantic result → normal Syntract binding;
- direct compatibility with BUILD 8 expansion.

Example:

```text
Witness A says the car was red.
Witness B says the car was blue.
What color was the car?
```

becomes two candidate dimensions, two source-evidence oracles, one categorical
logic constraint, an explicit disagreement marker, and an uncertainty-bearing
Fabric result. Equal evidence stays tied instead of being turned into a fake
answer.

A stronger future LLM can replace the controlled parser by emitting a
`SemanticFrame`. That LLM would be a semantic supplier, not the QCDS inference
kernel.

See [`SEMANTIC_INGRESS.md`](SEMANTIC_INGRESS.md).

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
| 9 | current | semantic ingress / human-to-logic / Syntract handoff |

See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the exact implementation
boundary.

## Code map

- `src/qcds_fabric/models.py` — BaseBundle, ChannelView, TruthDistribution,
  StabilizedReturn and Syntract.
- `src/qcds_fabric/oracles.py` — exact, mask and DistributionOracle semantics.
- `src/qcds_fabric/semantic.py` — BUILD 9 semantic frame, controlled parser,
  evidence/logic oracles and human-to-Fabric bridge.
- `src/qcds_fabric/kernel.py` — bounded classical reference inference kernel.
- `src/qcds_fabric/substrates.py` — substrate contract + statevector/Grover simulator.
- `src/qcds_fabric/grover_depth.py` — adaptive `m/m*` and overshoot diagnostics.
- `src/qcds_fabric/rotations.py` — position/oracle/crossed diagnostic views.
- `src/qcds_fabric/stabilize.py` — null and multi-family stabilization.
- `src/qcds_fabric/funnel.py` — provenance-preserving serial contraction.
- `src/qcds_fabric/reentry.py` — higher-order distribution-oracle re-entry.
- `src/qcds_fabric/engine.py` — bounded recursive execution and convergence trace.
- `src/qcds_fabric/expansion.py` — BUILD 8 expansion and re-contraction.
- `src/qcds_fabric/benchmark.py` — architecture falsification harness.
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

## Contraction and expansion

The reference package now executes both directions:

```text
N → 1   contraction / binding
1 → N   expansion of compatible branches
```

BUILD 8 closes the bounded cycle:

```text
BIND → EXPAND → TEST → CONTRACT → BIND
```

BUILD 9 now lets a semantic Syntract enter that cycle directly.

## Falsifiability and claim boundary

The implementation intentionally keeps several possible failure points visible:

- semantic analyzer may misunderstand or leave language unresolved;
- source confidence may be poorly calibrated;
- a simpler architecture ablation may outperform full diagnostics;
- classical inference may outperform the statevector reference on a benchmark;
- adaptive Grover depth may overshoot or lose to fixed depth;
- expansion may produce branches that later fail validation;
- a stable distribution may still be externally wrong.

Therefore BUILD 9 does **not** claim unrestricted natural-language understanding,
AGI/ASI, native quantum advantage, or automatic external truth. It establishes a
tested and replaceable semantic-to-logic boundary that can now be attacked and
improved empirically.

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
BIND WHAT STILL HOLDS.
```

**Welcome to the end of the beginning.**

— **Patrik Sundblom**
