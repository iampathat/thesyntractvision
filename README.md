# The Syntract Vision

> **From uncertainty toward truth. From truth toward action.**

**Author and originator:** Patrik Sundblom  
**Project:** The Syntract Vision / QCDS / Syntract  
**Canonical architecture release:** **QCDS Fabric v1.0**  
**Reference implementation:** **BUILD 8 / package 0.9.0**  
**Theory and specification:** CC BY 4.0  
**Software:** MIT  
**Repository:** https://github.com/iampathat/thesyntractvision

---

## What this repository contains

This repository is both the publication home for **The Syntract Vision / QCDS
Fabric** and a growing tested reference implementation of the locked QCDS
Fabric v1.0 architecture.

It deliberately separates:

1. **Canonical theory/specification** — the version-locked QCDS Fabric v1.0
   artifacts in the repository root. Normative architecture changes require a
   new specification version.
2. **Reference software implementation** — the Python package under
   `src/qcds_fabric/`, developed in falsifiable BUILD steps without silently
   changing the canonical specification.

### Current implementation path

```text
CONDITIONS / INGRESS BUNDLES
        ↓
ORACLES PER COMPARABLE CHANNEL
        ↓
LOCAL QCDS FABRIC
        ↓
SUBSTRATE INTERFACE
  ↙                         ↘
CLASSICAL               STATEVECTOR / GROVER
REFERENCE          fixed m or adaptive view-local m*
  ↘                         ↙
NULL / POSITION / ORACLE / CROSSED ROTATIONS
        ↓
TRUTH DISTRIBUTIONS
        ↓
FAMILY-AWARE STABILIZATION
        ↓
SERIAL CONTRACTION FUNNEL
        ↓
BOUND HIGHER-ORDER CONDITION
        ↓
DISTRIBUTION-ORACLE RE-ENTRY
        ↓
CONVERGENCE DIAGNOSTICS
        ↺
REPEAT
        ↓
SYNTRACT BIND
   ↙             ↘
CONTRACT N→1    EXPAND 1→N
   ↘             ↓
      TEST / ORACLES
             ↓
      CONTRACT / BIND
             ↺
```

**BUILD 4 automated the bounded recursive contraction loop. BUILD 5 attacks it.
BUILD 6 separated it from the local substrate. BUILD 7 calibrates Grover depth
`m/m*` per execution view. BUILD 8 adds the opposite `1 → N` expansion path and
closes a bounded `BIND → EXPAND → TEST → CONTRACT → BIND` cycle.**

A bound Syntract is not hard-collapsed before expansion: its complete
`TruthDistribution` is retained as a `DistributionOracle`. New expansion
dimensions are opened explicitly, proposal/test oracles constrain the larger
space, and the result is marginalized back to a probability distribution over
candidate expansion branches.

Expansion does **not** hide an unrestricted hypothesis generator inside the
Fabric core. A later semantic compiler may supply domain-specific expansion
dimensions and oracles.

A statevector simulation remains classical software and is **not** presented as
evidence of quantum advantage. Convergence, concentration and expansion rank are
internal inference results, not automatic external truth.

### Code map

- `src/qcds_fabric/models.py` — BaseBundle, ChannelView, TruthDistribution,
  StabilizedReturn, Syntract.
- `src/qcds_fabric/oracles.py` — exact, mask and DistributionOracle semantics.
- `src/qcds_fabric/kernel.py` — bounded classical reference inference kernel.
- `src/qcds_fabric/substrates.py` — substrate contract and fixed-depth
  statevector/Grover simulator.
- `src/qcds_fabric/grover_depth.py` — adaptive `m/m*` search, overshoot detection
  and depth benchmark.
- `src/qcds_fabric/expansion.py` — BUILD 8 Syntract expansion, marginal branch
  projection and expansion re-contraction.
- `src/qcds_fabric/rotations.py` — positional, oracle-exposure and crossed views.
- `src/qcds_fabric/stabilize.py` — null and multi-family stabilization.
- `src/qcds_fabric/funnel.py` — provenance-preserving serial contraction.
- `src/qcds_fabric/reentry.py` — higher-order distribution-oracle re-entry.
- `src/qcds_fabric/engine.py` — bounded recursive execution and convergence trace.
- `src/qcds_fabric/benchmark.py` — ablations, fault injection and falsification.
- `src/qcds_fabric/substrate_benchmark.py` — matched cross-substrate comparison.
- `tests/` — falsification-oriented regression tests for every BUILD.
- `IMPLEMENTATION.md` — exact BUILD-by-BUILD implementation boundary.
- `BENCHMARKS.md` — architecture ablation and fault-injection semantics.
- `SUBSTRATES.md` — substrate semantics and claim boundaries.
- `GROVER_DEPTH.md` — adaptive Grover-depth policy.
- `EXPANSION.md` — BUILD 8 `1 → N` semantics and claim boundary.

### Run the implementation tests

```bash
python -m pip install -e '.[test]'
pytest -q
```

GitHub Actions runs the same test suite for implementation branches, pull
requests and `main`.

---

## BUILD status

| BUILD | Status | Main addition |
|---|---|---|
| 0 | merged | core models, `0/?/∅`, oracle stack, null bank |
| 1 | merged | position/oracle/crossed rotations |
| 2 | merged | family stabilization + serial contraction funnel |
| 3 | merged | DistributionOracle recursive re-entry |
| 4 | merged | automatic bounded recursive Fabric engine |
| 5 | merged | falsification, ablations, injected bias |
| 6 | merged | substrate interface + statevector/Grover reference |
| 7 | merged | adaptive view-local Grover depth `m/m*` |
| 8 | current | expansion `1 → N` + test/contract/bind cycle |

See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the exact implementation
boundary.

---

## QCDS Fabric v1.0 — canonical technical specification

Start with the locked source material:

- **[QCDS Fabric v1.0 — Canonical Specification (Markdown)](QCDS_FABRIC_SPEC_v1.0_CANONICAL.md)**
- **[QCDS Fabric v1.0 — Fixed PDF](QCDS_FABRIC_SPEC_v1.0_CANONICAL.pdf)**
- **[QCDS Fabric v1.0 — Editable DOCX](QCDS_FABRIC_SPEC_v1.0_CANONICAL.docx)**
- **[QCDS Fabric v1.0 — Release Lock / SHA-256](QCDS_FABRIC_SPEC_v1.0_RELEASE_LOCK.txt)**
- **[QCDS Fabric v1.0 — Frozen Release Package](QCDS_FABRIC_SPEC_v1.0_CANONICAL_RELEASE.zip)**

The canonical v1.0 files are version-locked. Normative architecture changes
require a new specification version.

---

# QCDS core

QCDS is defined by four canonical phases:

1. **Condition Formation** — open the possibility space without preselecting the
   answer.
2. **Conditional Evolution** — apply evidence, physics, biology, logic,
   experiment and other constraints as oracles.
3. **Recursive Inference** — amplify, rotate, compare, re-enter, expand and
   recursively reshape the working truth distribution.
4. **Truth-Alignment / Syntract Binding** — bind what continues to survive
   evidence, contradiction, overlap, composition and repeated inference.

```text
CONDITIONS
    ↓
ORACLES
    ↓
RECURSIVE INFERENCE
    ↓
SYNTRACT BIND
    ↓
NEW CONDITIONS / NEW ORACLES
    ↺
```

Grover-style amplification is a mechanism inside QCDS. It is not the whole
architecture.

---

# QCDS Fabric

The local QCDS kernel can remain bounded while a larger mission scales through
parallel channels, repeated diagnostics, stabilization, recursive layers and
alternating contraction/expansion.

```text
QUESTION / CONDITIONS
        ↓
SAME ACTIVE ORACLE REGIME BEFORE EACH COMPARABLE CHANNEL
        ↓
MASSIVELY PARALLEL QCDS CHANNEL BANKS
        ↓
LOCAL CONDITION / STATE SPACES
        ↓
ROTATIONAL DIAGNOSTICS
        ↓
STABILIZED CHANNEL RETURNS
        ↓
RECURSIVE SERIAL FUNNEL
        ↓
HIGHER-ORDER CONDITIONS
        ↓
SYNTRACT BIND
        ↓
RE-ENTRY / EXPANSION
```

**Parallelism gives breadth. Recursive funneling gives depth. Syntract Binding
preserves coherence. Expansion reopens compatible possibility space around what
has already been bound.**

Width is a compile choice, not the architecture. A Fabric may use different
bounded local widths according to mission and substrate.

---

# Oracle regime and falsifiability

For channels intended to be directly compared, the same active oracle regime is
applied at the boundary before local inference. Oracles may represent evidence,
logic, physics, biology, causality, experiment, safety, contradiction or
mission-specific constraints.

Candidate oracles may themselves be tested, calibrated, challenged,
down-weighted or retired between bound cycles with provenance.

The implementation is deliberately falsifiable:

- BUILD 5 adds matched architecture ablations and injected bias;
- BUILD 6 adds matched classical/statevector substrate comparison;
- BUILD 7 adds fixed-vs-adaptive Grover-depth comparison and overshoot tests;
- BUILD 8 keeps source, proposal and validation provenance separate so an
  expansion can be tested rather than treated as a generated fact.

The full Fabric, statevector path, adaptive Grover policy or expansion path is
never declared the winner in advance.

---

# Null semantics and rotations

For a bundle of `B` independent dimensions, the core dimension-null diagnostic
creates `B` comparison views, each with a different logical dimension absent.

`∅` is **not** binary `0`.  
`∅` is **not** wildcard `?`.  
`∅` means the logical dimension is absent from that inference view.

Rotation is a family:

- **Rotational Dimension Nulling** — test dimensional influence and bias.
- **Positional Rotation** — test slot/order/mapping bias.
- **Oracle Exposure Rotation** — test oracle sensitivity and dominance.
- **Physical quantum rotation** — amplitude/phase evolution inside a quantum
  substrate.

Architectural rotations and physical quantum evolution remain distinct.
Diagnostic views are not automatically counted as new independent dimensions.

---

# Stabilize first. Funnel second.

Raw diagnostic views are not automatically promoted into higher-order facts. A
Fabric layer first compares/stabilizes its views, preserves uncertainty and
provenance, and only then passes the stabilized return into the serial funnel.

Illustrative geometries such as `512 → 64 → 8 → 1` are compile topologies, not
fixed constants and not claims that one present QPU must hold the whole logical
Fabric at once.

---

# Logical-space accounting

For `B` independent binary dimensions in one local channel:

```text
local basis dimension = 2^B
```

Execution views, channels and rotations are accounted separately from genuinely
independent dimensions.

BUILD 8 follows the same rule: if a bound source with `S` binary coordinates is
expanded by `E` genuinely new binary coordinates, the compiled local candidate
space is `2^(S+E)`, while the marginalized branch distribution is over `2^E`.

---

# Substrate independence

A conforming implementation may run on CPU, GPU/HPC, numerical simulators,
NISQ processors, future fault-tolerant quantum processors, FPGA/specialized
accelerators or hybrid combinations.

BUILD 6 makes the substrate boundary explicit. BUILD 7 adds view-local adaptive
Grover depth without changing Fabric topology. BUILD 8 uses the same
`FabricLayer`, so expansion is substrate-neutral as well.

A classical statevector simulation is not evidence of native quantum advantage.

See [`SUBSTRATES.md`](SUBSTRATES.md) and [`GROVER_DEPTH.md`](GROVER_DEPTH.md).

---

# Syntract

A **Syntract** is a meaning-bearing binding, not merely a node, label or score.
It may preserve dimensions, overlap, composition, relation, evidence,
contradiction, uncertainty, temporal/causal context, oracle provenance and
recursive higher-order structure.

The purpose of Syntract Binding is not to choose the loudest candidate. It is to
preserve the structure that continues to hold after repeated challenge.

A bound Syntract can become the source of a later re-entry or expansion cycle.

---

# Direction of inference

QCDS can operate in both directions:

```text
N → 1
```

Contraction asks which state or structure survives the strongest coherent set
of Conditions.

```text
1 → N
```

Expansion asks what compatible mechanisms, consequences, designs,
trajectories or experiments remain possible when one bound structure is held as
an active condition.

BUILD 8 implements the bounded reference expansion path:

```text
BOUND SYNTRACT
      ↓
retain full bound TruthDistribution
      ↓
open explicit expansion dimensions
      ↓
proposal / test oracles
      ↓
joint Fabric inference
      ↓
marginal branch distribution
      ↓
validation oracles
      ↓
CONTRACT → BIND
```

The directions can alternate:

```text
EXPAND → TEST → CONTRACT → BIND → EXPAND
```

See [`EXPANSION.md`](EXPANSION.md).

---

# What the reference implementation does not claim

A high peak, stable distribution or leading expansion branch is not external
truth merely because it is numerically strong.

External truth requires appropriate evidence and validation. Likewise:

- convergence is an internal stability observation;
- statevector simulation is classical computation;
- adaptive `m*` is an internal search policy;
- expansion branches are candidates under stated Conditions/oracles;
- unrestricted natural-language semantic compilation is not yet implemented;
- native QPU advantage is not claimed.

---

# Canonical publications and repositories

### The Syntract Vision
https://github.com/iampathat/thesyntractvision

Zenodo: https://zenodo.org/records/22031525  
DOI: `10.5281/zenodo.22031525`

### QCDS implementation and technical work
https://github.com/iampathat/QCDS

### Inference Is All You Need
https://zenodo.org/records/15455541

### Mathematics and Logic of QCDS
https://zenodo.org/records/15533909

---

# Authorship and licensing

**The Syntract Vision, Quantum Condition-Driven Synthesis (QCDS), QCDS Fabric,
and the Syntract architecture are authored by Patrik Sundblom.**

The QCDS theory, The Syntract Vision and the canonical QCDS Fabric specification
are released under **Creative Commons Attribution 4.0 International — CC BY
4.0**.

The reference software implementation in this repository uses the repository
MIT license. Implementation, editorial, visualization or AI assistance may be
acknowledged separately; such assistance does not alter conceptual authorship.

---

# Canonical version policy

`QCDS Fabric v1.0` is a locked architecture release. A change to normative
semantics requires a new specification version. The BUILD series implements and
tests the locked architecture; it does not silently rewrite it.

Recommended tag: `qcds-fabric-v1.0`  
Recommended GitHub Release title:
`QCDS Fabric v1.0 — Canonical Technical Specification`

---

## The shortest possible version

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
