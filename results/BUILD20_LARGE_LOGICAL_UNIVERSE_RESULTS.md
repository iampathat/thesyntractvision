# BUILD 20 — Large Logical Universe Benchmark

**Status:** PASS  
**Date:** 2026-08-28  
**Package:** `qcds-fabric 1.11.0`  
**Benchmark commit:** `bcfa083b42bd7f83057d3c973270657544fc2fa6`  
**GitHub Actions run:** `33207426189`  
**Run:** https://github.com/iampathat/thesyntractvision/actions/runs/33207426189  
**Raw result:** [`BUILD20_LARGE_LOGICAL_UNIVERSE_RESULT.json`](BUILD20_LARGE_LOGICAL_UNIVERSE_RESULT.json)  
**Reproducer:** [`../benchmarks/build20_large_universe_benchmark.py`](../benchmarks/build20_large_universe_benchmark.py)

---

## Purpose

This benchmark tests the BUILD 20 runnable Logical Universe overlay at a larger, still bounded MVP scale without modifying the QCDS/Fabric cores.

It tests five properties:

1. a global logical rule can project a new term across many represented bindings without rewriting every base binding;
2. chained rules resolve recursively in the same logical universe;
3. unrelated controls remain unaffected;
4. declared-universe rules do not leak into the observed `reality` universe;
5. persisted state survives restart without duplicate bindings or duplicate active rules.

This is a **classical Python semantic and implementation benchmark**. It is not a quantum-speed, AGI or ASI benchmark.

---

## Workload

| Item | Value |
|---|---:|
| Base logical bindings | 50,000 |
| Human bindings | 40,000 |
| Control bindings (`dog`) | 10,000 |
| Reality-isolation mirror bindings | 1,000 |
| Active declared rules | 2 |
| Rule-chain depth | 2 |

Rules:

```text
human => legal_person
legal_person => protected_subject
```

The benchmark uses a declared universe named `benchmark-lawbook-50k`. The data are synthetic and are not claims about external reality.

---

## Primary result

| Check | Result |
|---|---:|
| Humans represented | 40,000 |
| `legal_person` resolved | 40,000 |
| `protected_subject` resolved through chained rule | 40,000 |
| Controls represented | 10,000 |
| Controls receiving `protected_subject` | **0** |
| `protected_subject` leaked into `reality` | **0** |
| Duplicate bindings added after restart | **0** |
| Active rules after restart | reused, not duplicated |
| Base Logical Space rewritten by derived logic | **No** |
| Assertions passed | **14 / 14** |

**Overall: PASS.**

The two global rules changed the resolved logical view of all 40,000 represented humans while leaving all 10,000 controls unaffected. The derived terms were not materialized into the base Logical Space.

---

## Rule-drift governance

Both broad rules were correctly detected as high-impact before activation.

| Rule | Changed bindings | Changed fraction | Initial disposition reason |
|---|---:|---:|---|
| `human => legal_person` | 40,000 | 80% | changed fraction + changed-binding limits exceeded |
| `legal_person => protected_subject` | 40,000 | 80% | changed fraction + changed-binding limits exceeded |

Under the default conservative MVP policy, each candidate therefore entered quarantine before activation. Because this benchmark uses a **declared** universe, promotion was then performed through the explicit declared authority plus an explicit blast-radius override.

This is intentional: a rule capable of changing most of a logical universe should not become active silently.

---

## Non-materialization proof

The SHA-256 digest of the 50,000-row base `logical_space.csv` was captured after seeding and checked after rule promotion, resolved inference, and restart.

```text
43a339e6253170ff4f29d03b02235aa8d92e5ee764947e635bf715ec525fbf36
```

| Point in experiment | SHA-256 identical? |
|---|---|
| After rule promotion | Yes |
| After resolving 50,000 bindings | Yes |
| After restart/dedupe | Yes |

Base Logical Space size: **10,250,115 bytes**.

The result therefore demonstrates the intended semantic property: one active global rule can alter the resolved logical status of many represented objects without adding the derived term to every base row.

---

## Restart and persistence

A fresh runner was created against the same persistent store and the complete seed/rule specification was submitted again.

Results after restart:

```text
added_bindings = 0
human = 40000
legal_person = 40000
protected_subject = 40000
dog = 10000
dog_with_protected_subject = 0
```

Both existing rules were recognized as already active, and the resolved counts were identical to the first pass.

---

## Timings

Single fresh GitHub-hosted runner; wall-clock measurements from Python `time.perf_counter()`.

| Operation | Seconds |
|---|---:|
| Seed 50,000 base bindings | 2.570524 |
| Analyze + promote rule 1 | 3.222740 |
| Analyze + promote rule 2 | 4.489577 |
| Resolve all 50,000 — first pass | 8.209449 |
| Restart + re-ingest/dedupe | 2.150804 |
| Resolve all 50,000 — after restart | 8.215343 |
| Seed 1,000 `reality` isolation controls | 0.051175 |
| Total benchmark | **29.102329** |

The near-identical first and post-restart resolve times are consistent with the current MVP implementation resolving from persisted CSV/rule state rather than relying on an in-process cache.

These timings describe this implementation and runner only. They are **not** a scaling law.

---

## Environment

| Component | Value |
|---|---|
| GitHub runner OS | Ubuntu 24.04.4 LTS |
| Kernel/platform | Linux 6.17.0-1022-azure x86_64, glibc 2.39 |
| Python | 3.12.14 |
| CPU | AMD EPYC 9V74 80-Core Processor |
| Logical CPUs exposed to job | 4 |
| Architecture | x86_64 / X64 |
| Runner image | `ubuntu-24.04`, image version `20260823.283.1` |

---

## Assertions

All benchmark assertions passed:

```text
PASS seed_count_exact
PASS human_count_exact
PASS control_count_exact
PASS rule1_global_projection_exact
PASS rule2_chained_projection_exact
PASS controls_not_affected
PASS base_hash_unchanged_after_rules
PASS base_hash_unchanged_after_resolution
PASS restart_added_no_duplicate_bindings
PASS restart_reused_both_rules
PASS restart_counts_identical
PASS base_hash_unchanged_after_restart
PASS reality_isolated
PASS both_rules_were_quarantined_before_override
```

---

## What this result establishes

At 50,000 represented base bindings, the current BUILD 20 classical MVP successfully demonstrated:

- isolated Logical Universes;
- governed high-blast-radius rule activation;
- non-materialized global logical projection;
- recursive/chained logical projection;
- control selectivity;
- persistence and restart idempotence;
- no leakage from the declared benchmark universe into `reality`.

The benchmark is deliberately an **overlay test**. It does not add domain logic to the QCDS/Fabric core.

---

## What this result does not establish

This run does **not** establish quantum advantage, instantaneous billion-scale execution, an AGI/ASI capability claim, or performance superiority over another reasoning architecture. The current Python resolver scans represented bindings and rules classically.

The quantum architecture remains a separate execution/substrate question: the semantic property tested here is that global logic is represented once and applied to the resolved logical space rather than being materialized as an explicit rewrite of every affected object.

A future quantum/QPU benchmark must separately specify encoding, oracle cost, circuit depth, measurement/readout strategy, hardware/noise conditions, and a classical comparison baseline.

---

## Reproduce

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[test]'
python benchmarks/build20_large_universe_benchmark.py
```

The benchmark creates its working store in a temporary directory, prints a machine-readable JSON result, verifies every assertion, and exits non-zero if any required property fails.
