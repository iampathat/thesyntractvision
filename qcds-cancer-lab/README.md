# QCDS Cancer Lab — Recursive Engine — 128 → 8 → 1

**Theory and creation by Patrik Sundblom**

This directory contains a research implementation of the current QCDS cancer architecture. It is separate from the older BRCA2 / mutation scripts so the historical work remains intact.

> **License:** public to view for evaluation; company / organizational use requires a separate agreement. See [LICENSE.md](./LICENSE.md).

## What changed

This engine does **not** start from a known `target_state`.

It starts from a **Syntract**:

- a logical condition such as `01101001` (already complete), or `10?10???` / `????????` (partly or fully unresolved),
- top-down candidate oracles built from data, domain knowledge, hypotheses, or an LLM,
- a set of named dimensions.

`?` is not required. It means a dimension is unresolved and therefore opens compatible binary states. A fully bound state works without any `?`.

## The engine

```text
logic / evidence
      ↓
Syntract
      ↓
top-down candidate oracles
      ↓
128 parallel perspectives
  - dimension exclusion
  - logical→physical qubit rotation
  - repeated NISQ-like sampling
      ↓
8 exclusion families
      ↓
1 consensus Syntract
      ↓
recursive oracle generated from what survived
      ↺ next depth
```

### Why 128 → 8 → 1

For the current eight-dimensional demonstrator, 128 parallel branches are grouped into eight families. Each family removes one logical dimension and rotates the remaining logical structure across physical qubit positions. This exposes **dimension influence** and positional/noise sensitivity instead of trusting one fixed orientation.

The eight family distributions are merged into one consensus distribution. Stable structure becomes a new oracle for the next recursion depth.

## Intelligence bandwidth

The design does not equate intelligence with qubit count.

The working concept is that inference capacity depends on the combination of:

- representational richness,
- the number of live alternatives,
- parallel perspectives and rotations,
- sequential funnel depth,
- recursive oracle growth.

Bits/qubits define part of the substrate. Syntract defines interpretation. Rotation tests dimensions. The funnel converts breadth into depth. Recursion makes the next pass logically stronger.

## Quantum / NISQ emulation

`engine.py` currently emulates:

1. uniform amplitude over states compatible with the current logic,
2. oracle marking based on the current oracle set rather than a hard-coded answer,
3. Grover-style phase inversion + diffusion inside that compatible subspace,
4. logical-to-physical rotation,
5. reproducible per-physical-qubit bit-flip noise and finite-shot measurement.

This is **not claimed to be execution on quantum hardware or proof of quantum advantage**. It is an emulator for developing and testing the QCDS architecture against increasingly realistic inputs.

## Recursive oracle growth

```text
O₀ (human / data / LLM hypotheses)
   ↓ QCDS
S₁ (surviving Syntract)
   ↓
O₁ (derived oracle)
   ↓ QCDS
S₂
   ↓
O₂ ...
```

An LLM can help create, translate or explain candidate oracles. It does not decide which oracle is true. QCDS tests them through exclusion, rotation, amplification, convergence and recursive return.

## Cancer case

The included masks are research/demo hypotheses carried forward from earlier QCDS cancer work (`dna_repair`, `pi3k_axis`, `receptor_axis`, `hr_plus_broad`, `pi3k_hr_combo`). They are not clinical rules.

The research objective is to test whether a large unresolved logical space can be narrowed into stable mechanistic structure, and whether the surviving structure can recursively create better oracles.

This is not a diagnostic or treatment system and must not be used for clinical decisions.

## Run

```bash
python run_demo.py
python run_demo.py --complete
python -m pytest -q
```

Default open case: `????????` → 256 compatible logical states before oracle constraints.

Complete-logic test: `01101001` → exactly one compatible state; no `?` is required.
