# QCDS Cancer Lab — Recursive Engine — 128 → 8 → 1

**Theory and creation by Patrik Sundblom**

This directory contains the current QCDS cancer research engine. It is deliberately separate from the older BRCA2 / mutation scripts so the historical work remains intact.

## Live site — run it in the browser

**QCDS Cancer Lab:** https://iampathat.github.io/thesyntractvision/qcds-cancer-lab/

The public surface is a runnable workbench. You can edit the 0/1/? Condition, enable or disable top-down cancer-oracle hypotheses, run the full 128 → 8 → 1 QCDS path, inspect the local and parent Grover depths, dimensional influence, recursive return and the final Parent-Grover distribution.

> **License:** public to view for evaluation; company / organizational use requires a separate agreement. See [LICENSE.md](./LICENSE.md).

## What this build is

This build does **not** start from a known `target_state`.

It starts from:

- a QCDS **Condition** such as `01101001` (complete), `1111????` (partly unresolved), or `????????` (open),
- top-down cancer-oracle hypotheses,
- eight named semantic dimensions,
- recursive structure returned by the previous Parent-Grover pass.

`?` is not a third truth value and it is not required. It means that a represented binary dimension is unresolved.

Rotational exclusion is different: the excluded dimension is **absent / null in that lane**. A fixed `0` or `1` is never silently changed into `?` to fake exclusion.

## Current QCDS path

```text
Condition (0 / 1 / ?)
        ↓
top-down cancer oracle set
        ↓
16 balanced rotation banks × 8 true-null lanes
        ↓
128 independent local QCDS Grover runs
        ↓
128 → 8 Rotational Syntract family binds
        ↓
8 → 1 higher-order Syntract bind
        ↓
fresh Parent Grover
        ↓
parent-marked structure becomes the next oracle
        ↓
rotate again / recursive return
        ↓
multi-signal stability gate
```

### 128 → 8 → 1 does not mean majority voting

The first 128 objects are **full QCDS lane distributions**, not 128 scalar votes.

Each of the eight semantic dimensions has a true-null family containing sixteen balanced rotations. The family is bound with the same logarithmic full-distribution operator used by the canonical `RotationalSyntractBind`.

The eight family distributions are then bound into one higher-order Syntract. That bound structure is **not the final answer**: it becomes the input to a fresh executable **Parent Grover**. The Parent-Grover marked structures form the recursive oracle for the next QCDS cycle.

There is no separate `meanDistributions()`, winner averaging or ad-hoc "consensus state" algorithm in the current engine.

## Grover

The local and parent kernels use the canonical bounded QCDS Fabric Grover implementation from:

`qcds_fabric_4_2/src/qcds_fabric_4_2/grover.py`

The iteration count is selected by evaluating the exact ideal Grover success envelope from `m = 0 ... 40` and choosing its best peak for the actual `N` and `M`.

For the canonical validation case `N=256, M=1`, the selected peak is `m=12`, with probability approximately `0.999947`.

The browser core ports the same equations and exposes the actual local Grover range and Parent-Grover depth for every recursive cycle.

## Input invariants

A user-supplied Condition remains globally binding.

For example:

```text
1111????
```

opens the sixteen states whose first four semantic dimensions are `1111`.

True-null lanes are allowed to temporarily remove one dimension to measure its influence, but after the complementary views are rebound, states that violate the original fixed `1111` Condition are not permitted to enter the Parent-Grover candidate space.

The automated tests assert this invariant.

## Top-down cancer oracles

The included masks are research/demo hypotheses carried forward from earlier QCDS cancer work:

- `dna_repair`
- `pi3k_axis`
- `receptor_axis`
- `hr_plus_broad`
- `pi3k_hr_combo`

They are treated as **alternative top-down oracle hypotheses (union / OR)** under the hard input Condition. If a true-null lane removes a semantic dimension required by a particular hypothesis, that hypothesis is inactive in that lane rather than being evaluated with fabricated data.

A recursive Parent-Grover return is an additional constraint on the next cycle.

These demo masks are not clinical rules.

## Quantum / NISQ boundary

The current browser build uses exact ideal bounded amplitude amplification plus balanced semantic/position rotations. It does **not** inject an invented hardware-noise calculation into the QCDS result.

That separation is intentional:

- QCDS logical semantics: Condition, oracle, true null, Grover, Syntract Bind, Parent Grover, recursion.
- physical / NISQ layer: actual qubit mapping, readout/connectivity/transpilation effects and device noise.

A future NISQ-noise pass should be driven by a declared simulator or real hardware calibration model and compared against the same ideal logical run. It should not silently alter the QCDS mathematics.

## Recursive stability

The run does not stop merely because one state happens to be top once.

The stability gate tracks the same families of signals used by QCDS Fabric:

- distribution change,
- entropy change,
- top identity,
- Top-K overlap,
- dimension-influence change.

The maximum cycle count is a safety bound. Stable recursive structure can terminate earlier once the configured gate is satisfied.

## Browser core and Python reference

The browser engine is in:

`qcds-core.js`

The Python orchestration layer is:

`engine.py`

The Python engine imports and reuses the canonical QCDS Fabric Grover and Rotational Syntract primitives already in this repository rather than carrying a separate Grover implementation.

The browser core ports those same bounded primitives so the live page can execute without a server.

## Run locally

```bash
cd qcds-cancer-lab
python run_demo.py --mask '????????'
python run_demo.py --mask '1111????'
python run_demo.py --mask '01101001'
```

Tests:

```bash
PYTHONPATH=../qcds_fabric_4_2/src python -m pytest -q tests/test_engine.py
node tests/test_core.js
```

The test suite checks, among other things:

- canonical `256 / 1` Grover peak = `m=12`,
- 128 local QCDS lanes per cancer cycle,
- eight true-null families,
- fresh Parent Grover execution,
- complete logic without `?`,
- fixed input bits such as `1111????` cannot disappear from the final output distribution.

## Research / medical boundary

This is an experimental inference architecture. It is not a diagnostic system, medical device or treatment recommendation and must not be used for clinical decision-making without appropriate validation, regulation and qualified medical oversight.
