# QCDS Fabric 4.2

## Rotational Bias-Resistant Parallel / Sequential Quantum Inference

**Architecture and theory: Patrik Sundblom**  
**System: QCDS / Syntract**  
**Implementation assistance: ChatGPT**  
**Status: executable research build — 4.2.0-alpha.1**

> **Why 4.2 and not 4.3?** This directory implements the canonical Fabric 4.2 specification. A higher version would be premature until the full held-out adversarial suite and cross-substrate validation have been completed. The version number follows the architecture actually under test, not the amount of code written.

---

### Current proof surface

| Gate | Result | What was actually exercised |
|---|---:|---|
| 256-state Grover envelope | **PASS** | full `m = 0…40` ideal envelope, not a 3-iteration shortcut |
| Peak location, `N=256, M=1` | **m = 12** | marked mass `0.9999470421` |
| Explicit 40-iteration execution | **PASS** | actual iteration 40 executed and recorded |
| Rotational ingress | **PASS** | 8 semantic dimensions → 8 true leave-one-out 7D spaces |
| Parallel Grover bank | **PASS** | independent lane oracle + full 128-state return per lane |
| Rotational Syntract | **PASS** | full-distribution binding, influence, necessity, contradiction surface |
| Parent inference | **PASS** | fresh parent state space consumes the bound distribution |
| Recursive re-entry | **PASS** | multi-bank recursion with explicit oracle versions |
| Dynamic Fabric scheduler | **PASS** | 512-wide / 12-layer bounded schedule, fan-in and re-expansion |
| Stability engine | **PASS** | termination gates are distribution/top/Top-K/influence/contradiction based |
| NISQ mapping abstraction | **PASS** | semantics rotate across physical slots; substrate attribution is explicit |
| Adaptive rotation | **PASS** | targeted first/second-order exclusion requests |
| Held-out adversarial suite | **OPEN** | required before a stronger 4.2 completion claim |
| Hardware-QPU validation | **OPEN** | no hardware equivalence claim is made here |

The machine-readable run is in [`results/validation.json`](results/validation.json), with a human summary in [`results/VALIDATION.md`](results/VALIDATION.md).

---

## The architecture

The local 4.2 cell is deliberately **parallel first, sequential second**:

```text
                         SAME SEMANTIC QUESTION
                                  │
                      rotate + true exclusion
                                  │
          ┌────────┬────────┬─────┼─────┬────────┬────────┐
          ▼        ▼        ▼     ▼     ▼        ▼        ▼
         L0       L1       L2    ...   L5       L6       L7
       7 dims   7 dims   7 dims       7 dims   7 dims   7 dims
          │        │        │           │        │        │
          ▼        ▼        ▼           ▼        ▼        ▼
         G0       G1       G2    ...   G5       G6       G7
     independent Grover / amplitude-amplification processes
          │        │        │           │        │        │
          └────────┴────────┴─────┬─────┴────────┴────────┘
                                  ▼
                    ROTATIONAL SYNTRACT BIND
                      full distributions + lineage
                                  │
                                  ▼
                         FRESH PARENT ORACLE
                                  │
                                  ▼
                            PARENT GROVER
                                  │
                                  ▼
                    recursive return / new bank
```

This **8→1 cell is not the Fabric**. It is one reusable bias-resistance primitive inside a much larger graph.

```text
Parallel width × Sequential depth × Rotational breadth
× Recursive depth × Quantum state-space width
× Syntract connectivity × Oracle evolution
```

The scheduler in this directory explicitly exercises a 12-layer graph with a maximum width of 512 and with re-expansion after contraction. It does **not** describe those independent local registers as a single coherent global quantum register.

---

## What changed from the earlier bounded implementation

Fabric 4.2 treats rotation as part of **Condition Formation**, not as an after-the-fact diagnostic. Each complementary view has a genuine blind spot: if dimension `D` is excluded, `D` does not exist in that lane's local state space and oracle clauses requiring `D` become inactive.

The result is not reduced to eight votes. Every lane returns its complete probability distribution. `RotationalSyntractBind` lifts those distributions back into canonical semantic space while preserving ignorance about the excluded bit, then exposes a stable core, sensitive shell, dimension influence, dimensional necessity and contradiction structure.

Grover is likewise not a one-shot primitive. It appears in local lanes, parent inference and later recursive cycles. The iteration policy is bounded by a declared maximum but is **not hard-coded to three**. The reference proof scans the complete `0…40` envelope and locates the one-target, 256-state peak at iteration 12.

---

## Directory map

```text
qcds_fabric_4_2/
├── README.md                         ← this page
├── pyproject.toml                    ← isolated install/test boundary
├── src/qcds_fabric_4_2/
│   ├── rotation.py                   ← 4.2A rotational ingress + true exclusion
│   ├── oracle.py                     ← semantic oracle compilation
│   ├── grover.py                     ← bounded exact amplitude amplification
│   ├── engine.py                     ← 4.2B parallel lane execution
│   ├── bind.py                       ← 4.2C Rotational Syntract
│   ├── parent.py                     ← 4.2D parent inference
│   ├── recursive.py                  ← 4.2E recursive re-entry/oracle versions
│   ├── topology.py                   ← 4.2F wide/deep bounded scheduler
│   ├── stability.py                  ← 4.2G stability gates
│   ├── nisq.py                       ← 4.2H logical/physical mapping
│   └── adaptive.py                   ← 4.2I targeted higher-order rotation
├── tests/                            ← executable regression/falsification guards
├── examples/run_validation.py        ← regenerates the proof record
├── results/validation.json           ← machine-readable measured result
├── results/VALIDATION.md             ← human-readable result + claim boundary
├── docs/CANONICAL_SPEC.md            ← canonical Fabric 4.2 build specification
├── docs/ARCHITECTURE.md              ← implementation map and invariants
└── proof/                             ← polished browser proof surface
```

Everything lives below this directory so the existing locked QCDS Fabric v1.0 canonical material and established runtime remain untouched.

---

## Run it

```bash
cd qcds_fabric_4_2
python -m pip install -e .
python -m pytest
python examples/run_validation.py
```

Expected regression result for this commit:

```text
15 passed
```

The validation runner writes a new `results/validation.json`. The browser proof at [`proof/index.html`](proof/index.html) reads that result and renders the 40-iteration Grover envelope, architecture gates and claim boundary.

---

## Claim discipline

This build demonstrates **implemented mechanisms and bounded validation**, not achieved superintelligence and not automatic truth.

It does **not** claim that rotation automatically removes bias, that a high Grover peak proves an oracle is true, that independent emulated lanes are one coherent global quantum register, or that synthetic NISQ attribution equals hardware-QPU validation. Those are explicit falsification boundaries, not footnotes.

The target claim under test is narrower and stronger because it can fail:

> Systematic semantic rotation and complementary dimension exclusion, combined with independent local inference, full-distribution Syntract binding, parent inference, oracle evolution and recursive re-entry, can expose and reduce dependence on dimensional, positional and substrate-specific bias without sacrificing global parallel width or sequential depth.

---

## Attribution

**QCDS / Syntract architecture and theory: Patrik Sundblom.**  
Software in this directory follows the repository's MIT license. The canonical specification retains its own stated attribution/licensing terms.
