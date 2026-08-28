# The Syntract Vision

> **From uncertainty toward truth. From truth toward action.**

**Author and originator:** Patrik Sundblom  
**Project:** The Syntract Vision / QCDS / Syntract  
**Canonical architecture release:** **QCDS Fabric v1.0**  
**Reference implementation:** **BUILD 7 / package 0.8.0**  
**Theory and specification:** CC BY 4.0  
**Software:** MIT  
**Repository:** https://github.com/iampathat/thesyntractvision

---

## What this repository contains

This repository is both the publication home for **The Syntract Vision / QCDS
Fabric** and a growing reference implementation of the locked QCDS Fabric v1.0
architecture.

It deliberately separates:

1. **Canonical theory/specification** — the version-locked QCDS Fabric v1.0
   artifacts in the repository root. Normative architecture changes require a
   new specification version.
2. **Reference software implementation** — the Python package under
   `src/qcds_fabric/`, developed in tested BUILD steps without silently changing
   the canonical specification.

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
SYNTRACT
```

**BUILD 4 automated the bounded recursive loop. BUILD 5 attacks it. BUILD 6
separated it from the local substrate. BUILD 7 now calibrates Grover depth
`m/m*` per execution view and explicitly detects overshoot.**

The current code can run the same logical Fabric topology through the classical
reference kernel, a bounded fixed-depth statevector/Grover simulator, or an
adaptive statevector/Grover simulator. The adaptive selector never receives the
external benchmark target; external targets are used only for post-hoc
falsification.

A statevector simulation remains classical software and is **not** presented as
evidence of quantum advantage.

Convergence is treated as **internal distribution stability**, not as automatic
external truth. External validation, evidence, experiment, safety constraints
and real outcomes remain separate requirements in the canonical architecture.

### Code map

- `src/qcds_fabric/models.py` — BaseBundle, ChannelView, TruthDistribution,
  StabilizedReturn, Syntract.
- `src/qcds_fabric/oracles.py` — exact, mask and DistributionOracle semantics.
- `src/qcds_fabric/kernel.py` — bounded classical reference inference kernel.
- `src/qcds_fabric/substrates.py` — substrate contract and fixed-depth
  statevector/Grover simulator.
- `src/qcds_fabric/grover_depth.py` — BUILD 7 adaptive `m/m*` search,
  overshoot detection and depth benchmark.
- `src/qcds_fabric/rotations.py` — positional, oracle-exposure and crossed
  rotation views.
- `src/qcds_fabric/stabilize.py` — null and multi-family stabilization.
- `src/qcds_fabric/funnel.py` — provenance-preserving serial contraction.
- `src/qcds_fabric/reentry.py` — higher-order distribution-oracle re-entry.
- `src/qcds_fabric/engine.py` — recursive execution and convergence trace.
- `src/qcds_fabric/benchmark.py` — BUILD 5 ablations, fault injection and
  falsification metrics.
- `src/qcds_fabric/substrate_benchmark.py` — matched cross-substrate comparison
  under one Fabric topology.
- `tests/` — falsification-oriented regression tests for every BUILD.
- `IMPLEMENTATION.md` — BUILD-by-BUILD implementation status.
- `BENCHMARKS.md` — architecture ablation and fault-injection semantics.
- `SUBSTRATES.md` — substrate semantics and claim boundaries.
- `GROVER_DEPTH.md` — BUILD 7 depth-selection policy and benchmark separation.

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
| 2 | merged | family stabilization + serial funnel |
| 3 | merged | DistributionOracle recursive re-entry |
| 4 | merged | automatic bounded recursive Fabric engine |
| 5 | merged | falsification, ablations, injected bias |
| 6 | merged | substrate interface + statevector/Grover reference |
| 7 | current | adaptive view-local Grover depth `m/m*` |

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

# The Syntract Vision

The Syntract Vision describes an inference-first architecture in which large
logical spaces are not reduced to a single opaque score or fluent answer.

Instead, conditions, evidence, constraints, contradictions, uncertainty,
relations, and higher-order compositions remain active inside an evolving
inference field.

The central components are:

- **QCDS** — Quantum Condition-Driven Synthesis;
- **QCDS Fabric** — the scalable execution architecture;
- **Syntract** — the meaning-bearing structure that remains bound across
  dimensions, evidence, contradiction, overlap, composition, and repeated
  inference;
- **Syntract Binding** — the process that preserves what still coheres after
  recursive challenge.

---

# QCDS core

QCDS is defined by four canonical phases:

1. **Condition Formation** — open the possibility space without preselecting the
   answer.
2. **Conditional Evolution** — apply evidence, physics, biology, logic,
   experiment, and other constraints as oracles.
3. **Recursive Inference** — amplify, rotate, compare, re-enter, and recursively
   reshape the working truth distribution.
4. **Truth-Alignment / Syntract Binding** — bind what continues to survive
   evidence, contradiction, overlap, composition, and repeated inference.

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
parallel channels, repeated diagnostics, stabilization, and recursive layers.

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
RE-ENTRY
```

**Parallelism gives breadth. Recursive funneling gives depth. Syntract Binding
preserves coherence.**

Width is a compile choice, not the architecture. A fabric may use 8, 16, 32,
512, or other widths according to mission and substrate.

---

## Same oracle regime before every comparable channel

For channels intended to be directly compared, the same active oracle regime is
applied at the boundary of each channel before local inference.

```text
ORACLES → CHANNEL 01
ORACLES → CHANNEL 02
ORACLES → CHANNEL 03
...
ORACLES → CHANNEL N
```

Oracles may represent evidence, logic, physics, biology, causality, experiment,
safety, contradiction, or mission-specific constraints.

Candidate oracles may themselves be tested, calibrated, challenged,
down-weighted, or retired between bound cycles with provenance.

---

# Rotational Dimension Nulling

For a bundle of `B` independent dimensions, QCDS creates `B` comparison
channels. Each channel removes a **different logical dimension**.

Example with `B = 8`:

```text
CH01   [ ∅ ][b1][b2][b3][b4][b5][b6][b7]   ← b0 absent
CH02   [b0][ ∅ ][b2][b3][b4][b5][b6][b7]   ← b1 absent
CH03   [b0][b1][ ∅ ][b3][b4][b5][b6][b7]   ← b2 absent
CH04   [b0][b1][b2][ ∅ ][b4][b5][b6][b7]   ← b3 absent
CH05   [b0][b1][b2][b3][ ∅ ][b5][b6][b7]   ← b4 absent
CH06   [b0][b1][b2][b3][b4][ ∅ ][b6][b7]   ← b5 absent
CH07   [b0][b1][b2][b3][b4][b5][ ∅ ][b7]   ← b6 absent
CH08   [b0][b1][b2][b3][b4][b5][b6][ ∅ ]   ← b7 absent
```

`∅` is **not** binary `0`.  
`∅` is **not** wildcard `?`.  
`∅` means that the logical dimension is absent from that inference view.

---

# Rotation is a family

### Rotational Dimension Nulling
Rotate **which logical dimension is absent**. Purpose: dimensional influence,
bias detection, redundancy and noise diagnostics.

### Positional Rotation
Move the same dimensions through different logical or physical slots. Purpose:
detect ordering, mapping, slot, or hardware-position bias.

### Oracle Exposure Rotation
Change exposure across oracle members or oracle positions while retaining the
same active oracle regime. Purpose: test sensitivity, dominance and
implementation bias.

### Physical quantum rotation
Amplitude and phase evolution inside a quantum substrate. Purpose:
interference, probability shaping and local quantum evolution.

Architectural rotations and physical quantum rotation are distinct and may be
crossed when deeper diagnostics are required.

---

# Stabilize first. Funnel second.

Raw diagnostic views are not automatically promoted into independent
dimensions. A Fabric layer first produces local returns, compares required
views, measures stability and influence, stabilizes the result, and only then
passes that result to a higher-order layer.

Geometries such as `512 → 64 → 8 → 1` or
`4096 → 512 → 64 → 8 → 1` are compile topologies, not fixed QCDS constants.

---

# Logical-space accounting

For `B` independent binary dimensions in one local channel:

```text
local basis dimension = 2^B
```

A null, positional, oracle, or crossed rotation creates another **inference
view**. It does not automatically create another independent fact or dimension.

---

# Substrate independence

QCDS Fabric is an architecture rather than a commitment to one hardware
generation. A conforming implementation may run on CPU, GPU/HPC, numerical
simulators, NISQ quantum processors, future fault-tolerant quantum processors,
FPGA/specialized accelerators, or hybrid combinations.

**BUILD 6 makes this boundary explicit in code.**

**BUILD 7 adds adaptive statevector/Grover depth without changing the Fabric
topology.** A baseline view may select one empirical `m*` while a null or rotated
view selects another. The chosen depth and overshoot evidence remain in
provenance.

See [`SUBSTRATES.md`](SUBSTRATES.md) and
[`GROVER_DEPTH.md`](GROVER_DEPTH.md).

---

# Syntract

A **Syntract** is a meaning-bearing binding, not merely a node, edge, label, or
score. It may preserve dimensions, overlap, composition, relation, evidence,
contradiction, uncertainty, temporal and causal context, process state, oracle
provenance, and recursive higher-order structure.

A stable Syntract can itself become a dimension in a later inference cycle. The
purpose of Syntract Binding is not to choose the loudest candidate. It is to
preserve the structure that continues to hold after repeated challenge.

---

# Direction of inference

QCDS can be used in both contraction and expansion modes.

```text
N → 1
```

Contraction asks which state or structure survives the strongest coherent set
of conditions.

```text
1 → N
```

Expansion asks what compatible mechanisms, consequences, designs,
trajectories, or experiments become possible when a bound structure is held
fixed.

The two directions can alternate:

```text
EXPAND → TEST → CONTRACT → BIND → EXPAND
```

Expansion remains a future implementation boundary in this reference package.

---

# Falsifiability

QCDS Fabric v1.0 is intended to be experimentally challenged.

**BUILD 5** adds architecture ablations, deliberate fault injection,
contradiction probes and oracle leave-one-out analysis.

**BUILD 6** adds matched substrate comparison.

**BUILD 7** adds Grover-depth calibration tests. Fixed values of `m` and the
adaptive selector can be compared against the same external target. The
adaptive selector itself does not receive that target.

A benchmark is allowed to show that:

- a simpler ablation beats full diagnostics;
- the classical reference beats the statevector path;
- a fixed Grover depth beats adaptive depth;
- amplification overshoots;
- amplification provides no useful improvement;
- an oracle or dimension is damaging rather than helpful.

The implementation does not predeclare a winner.

Useful observables include probability distribution, normalized lift, entropy,
agreement, Top-K stability/Jaccard, orientation sensitivity, oracle
sensitivity, cross-rotation agreement, contradiction response, Grover-depth
response and Syntract stability.

A peak is not “truth” merely because it is high. Truth-Alignment requires
stability against evidence, contradiction and repeated inference, and external
truth additionally requires appropriate external validation.

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

The QCDS theory, The Syntract Vision, and the canonical QCDS Fabric
specification are released under **Creative Commons Attribution 4.0
International — CC BY 4.0**.

Software implementations may be distributed under their applicable software
license. The reference implementation in this repository uses the repository
MIT license.

Implementation, editorial, visualization, or AI assistance may be acknowledged
separately. Such assistance does not alter conceptual authorship.

---

# Canonical version policy

`QCDS Fabric v1.0` is a locked architecture release. A change to the normative
semantics of the four QCDS phases, oracle-per-channel topology, null semantics,
dimension nulling, rotation families, stabilization, recursive funnel
composition, Syntract Binding, logical-space accounting, or substrate semantics
requires a new specification version.

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
BIND WHAT STILL HOLDS.
```

**Welcome to the end of the beginning.**

— **Patrik Sundblom**
