# The Syntract Vision

> **From uncertainty toward truth. From truth toward action.**

**Author and originator:** Patrik Sundblom  
**Project:** The Syntract Vision / QCDS / Syntract  
**Canonical architecture release:** **QCDS Fabric v1.0**  
**Reference implementation:** **BUILD 5 / package 0.6.0**  
**Theory and specification:** CC BY 4.0  
**Software:** MIT  
**Repository:** https://github.com/iampathat/thesyntractvision

---

## What this repository contains

This repository is both the publication home for **The Syntract Vision / QCDS Fabric** and a growing reference implementation of the locked QCDS Fabric v1.0 architecture.

The repository deliberately separates two things:

1. **Canonical theory/specification** — the version-locked QCDS Fabric v1.0 artifacts in the repository root. Normative architecture changes require a new specification version.
2. **Reference software implementation** — the Python package under `src/qcds_fabric/`, developed in tested BUILD steps without silently changing the canonical specification.

### Current implementation path

```text
CONDITIONS / INGRESS BUNDLES
        ↓
ORACLES PER COMPARABLE CHANNEL
        ↓
LOCAL QCDS FABRIC
        ↓
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

**BUILD 4 automated that bounded recursive loop. BUILD 5 now attacks it.**
The benchmark layer can run matched ablations, inject known execution-slot and
oracle-exposure faults, probe contradictions dimension by dimension, and perform
oracle leave-one-out analysis against an explicit synthetic external reference.
It is intentionally allowed to report that an ablation beats the full Fabric.
The purpose is falsification, not a favorable score.

Convergence is treated as **internal distribution stability**, not as automatic external truth. External validation, evidence, experiment, safety constraints and real outcomes remain separate requirements in the canonical architecture.

### Code map

- `src/qcds_fabric/models.py` — BaseBundle, ChannelView, TruthDistribution, StabilizedReturn, Syntract.
- `src/qcds_fabric/oracles.py` — exact, mask and DistributionOracle semantics.
- `src/qcds_fabric/kernel.py` — bounded classical reference inference kernel.
- `src/qcds_fabric/rotations.py` — positional, oracle-exposure and crossed rotation views.
- `src/qcds_fabric/stabilize.py` — null and multi-family stabilization.
- `src/qcds_fabric/funnel.py` — provenance-preserving serial contraction.
- `src/qcds_fabric/reentry.py` — higher-order distribution-oracle re-entry.
- `src/qcds_fabric/engine.py` — recursive execution and convergence trace.
- `src/qcds_fabric/benchmark.py` — BUILD 5 ablations, fault injection and falsification metrics.
- `tests/` — falsification-oriented regression tests for each BUILD.
- `IMPLEMENTATION.md` — concise BUILD-by-BUILD implementation status.
- `BENCHMARKS.md` — BUILD 5 benchmark semantics and interpretation rules.

### Run the implementation tests

```bash
python -m pip install -e '.[test]'
pytest -q
```

GitHub Actions runs the same test suite for implementation branches, pull requests and `main`.

---

## QCDS Fabric v1.0 — canonical technical specification

Start with the locked source material:

- **[QCDS Fabric v1.0 — Canonical Specification (Markdown)](QCDS_FABRIC_SPEC_v1.0_CANONICAL.md)**
- **[QCDS Fabric v1.0 — Fixed PDF](QCDS_FABRIC_SPEC_v1.0_CANONICAL.pdf)**
- **[QCDS Fabric v1.0 — Editable DOCX](QCDS_FABRIC_SPEC_v1.0_CANONICAL.docx)**
- **[QCDS Fabric v1.0 — Release Lock / SHA-256](QCDS_FABRIC_SPEC_v1.0_RELEASE_LOCK.txt)**
- **[QCDS Fabric v1.0 — Frozen Release Package](QCDS_FABRIC_SPEC_v1.0_CANONICAL_RELEASE.zip)**

The canonical v1.0 files are version-locked. Normative architecture changes require a new specification version.

---

# The Syntract Vision

The Syntract Vision describes an inference-first architecture in which large logical spaces are not reduced to a single opaque score or fluent answer.

Instead, conditions, evidence, constraints, contradictions, uncertainty, relations, and higher-order compositions remain active inside an evolving inference field.

The central components are:

- **QCDS** — Quantum Condition-Driven Synthesis;
- **QCDS Fabric** — the scalable execution architecture;
- **Syntract** — the meaning-bearing structure that remains bound across dimensions, evidence, contradiction, overlap, composition, and repeated inference;
- **Syntract Binding** — the process that preserves what still coheres after recursive challenge.

---

# QCDS core

QCDS is defined by four canonical phases:

1. **Condition Formation** — open the possibility space without preselecting the answer.
2. **Conditional Evolution** — apply evidence, physics, biology, logic, experiment, and other constraints as oracles.
3. **Recursive Inference** — amplify, rotate, compare, re-enter, and recursively reshape the working truth distribution.
4. **Truth-Alignment / Syntract Binding** — bind what continues to survive evidence, contradiction, overlap, composition, and repeated inference.

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

Grover-style amplification is a mechanism inside QCDS. It is not the whole architecture.

---

# QCDS Fabric

The local QCDS kernel can remain bounded while a larger mission scales through parallel channels, repeated diagnostics, stabilization, and recursive layers.

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

**Parallelism gives breadth. Recursive funneling gives depth. Syntract Binding preserves coherence.**

Width is a compile choice, not the architecture. A fabric may use 8, 16, 32, 512, or other widths according to mission and substrate.

---

## Same oracle regime before every comparable channel

For channels intended to be directly compared, the same active oracle regime is applied at the boundary of each channel before local inference.

```text
ORACLES → CHANNEL 01
ORACLES → CHANNEL 02
ORACLES → CHANNEL 03
...
ORACLES → CHANNEL N
```

Oracles may represent evidence, logic, physics, biology, causality, experiment, safety, contradiction, or mission-specific constraints.

Candidate oracles may themselves be tested, calibrated, challenged, down-weighted, or retired.

---

# Rotational Dimension Nulling

For a bundle of `B` independent dimensions, QCDS may create `B` comparison channels. Each channel removes a **different logical dimension**.

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

Comparing the returns shows how strongly each dimension changes the resulting truth distribution.

---

# Rotation is a family

QCDS Fabric does not define rotation as one single operation.

### Rotational Dimension Nulling
Rotate **which logical dimension is absent**. Purpose: dimensional influence, bias detection, and noise suppression.

### Positional Rotation
Move the same dimensions through different logical or physical slots. Purpose: detect ordering, mapping, slot, or hardware-position bias.

### Oracle Exposure Rotation
Hold a selected dimension or state while changing its exposure across oracle members, oracle positions, or oracle configurations. Purpose: test oracle sensitivity, dominance, weighting, and implementation bias.

### Physical quantum rotation
Amplitude and phase evolution inside a quantum substrate. Purpose: interference, probability shaping, and local quantum evolution.

These rotations are distinct and may be crossed when deeper diagnostics are required.

---

# Stabilize first. Funnel second.

Raw diagnostic views are not automatically promoted into independent dimensions. A Fabric layer first produces local returns, compares its diagnostic views, measures stability and influence, binds or stabilizes the result, and only then passes that result to a higher-order layer.

Geometries such as `512 → 64 → 8 → 1` or `4096 → 512 → 64 → 8 → 1` are illustrative compile topologies, not fixed QCDS constants and not claims that one current QPU must contain an equally large coherent register.

---

# Logical-space accounting

For `B` independent binary dimensions in one local channel:

```text
local basis dimension = 2^B
```

Across genuinely independent logical dimensions, composition can create an enormous candidate space. Fabric v1.0 explicitly separates independent logical dimensions, local basis size, number of channels, number of diagnostic views, and recursive composition depth.

A null, positional, or oracle rotation creates another **inference view**. It does not automatically create another independent fact or dimension.

---

# Substrate independence

QCDS is an architectural specification rather than a commitment to one hardware generation. A conforming implementation may run on CPU, GPU/HPC, numerical simulators, NISQ quantum processors, future fault-tolerant quantum processors, FPGA/specialized accelerators, or hybrid combinations.

Classical emulation may reproduce the control and inference semantics without inheriting native quantum query advantage.

---

# Syntract

A **Syntract** is a meaning-bearing binding, not merely a node, edge, label, or score. It may preserve dimensions, overlap, composition, relation, evidence, contradiction, uncertainty, temporal and causal context, process state, oracle provenance, and recursive higher-order structure.

A stable Syntract can itself become a dimension in a later inference cycle. The purpose of Syntract Binding is not to choose the loudest candidate. It is to preserve the structure that continues to hold after repeated challenge.

---

# Direction of inference

QCDS can be used in both contraction and expansion modes.

```text
N → 1
```

Contraction asks which state or structure survives the strongest coherent set of conditions.

```text
1 → N
```

Expansion asks what compatible mechanisms, consequences, designs, trajectories, or experiments become possible when a bound structure is held fixed.

The two directions can alternate:

```text
EXPAND → TEST → CONTRACT → BIND → EXPAND
```

---

# Scientific and operational scope

The architecture is intended for problems in which the difficult part is not merely storing data, but reasoning across a large compositional possibility space. Examples explored within The Syntract Vision include genomics and DNA, cancer, Alzheimer's disease, embryology, aging, materials research, plasma/tokamak control, autonomous systems, robotics, scientific discovery and large-scale evidence synthesis.

---

# Falsifiability

QCDS Fabric v1.0 is intended to be experimentally challenged. A serious implementation should compare full QCDS against matched ablations: no rotational diagnostics, no nulling, fixed position, fixed oracle exposure, flat composition, no recursive funnel, alternative stabilization/binding policies, and comparable classical/quantum substrates.

**BUILD 5 begins that program in code.** See [`BENCHMARKS.md`](BENCHMARKS.md). The current harness includes matched local diagnostic ablations, explicit external synthetic targets, known slot/order fault injection, dimension-null contradiction probes and oracle leave-one-out tests. A result is allowed to falsify a proposed benefit; the full Fabric is not declared the winner in advance.

Useful observables include probability distribution, normalized lift, entropy, agreement, Top-K stability/Jaccard, orientation sensitivity, oracle sensitivity, cross-rotation agreement, contradiction response and Syntract stability.

A peak is not “truth” merely because it is high. Truth-Alignment requires stability against evidence, contradiction and repeated inference, and external truth additionally requires appropriate external validation.

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

**The Syntract Vision, Quantum Condition-Driven Synthesis (QCDS), QCDS Fabric, and the Syntract architecture are authored by Patrik Sundblom.**

The QCDS theory, The Syntract Vision, and the canonical QCDS Fabric specification are released under **Creative Commons Attribution 4.0 International — CC BY 4.0**.

Software implementations may be distributed under their applicable software license. The reference implementation in this repository uses the repository MIT license.

Implementation, editorial, visualization, or AI assistance may be acknowledged separately. Such assistance does not alter conceptual authorship.

---

# Canonical version policy

`QCDS Fabric v1.0` is a locked architecture release. A change to the normative semantics of the four QCDS phases, oracle-per-channel topology, null semantics, dimension nulling, rotation families, stabilization, recursive funnel composition, Syntract Binding, logical-space accounting, or substrate semantics requires a new specification version.

Recommended tag: `qcds-fabric-v1.0`  
Recommended GitHub Release title: `QCDS Fabric v1.0 — Canonical Technical Specification`

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
