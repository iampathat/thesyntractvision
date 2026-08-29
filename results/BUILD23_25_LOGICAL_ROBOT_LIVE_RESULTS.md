# BUILD 23–25 — Logical Robot Live Results

**Date:** 2026-08-29  
**Author:** Patrik Sundblom  
**Status:** implementation/proof result, not a new canonical QCDS specification

## What was tested

BUILD 23–25 adds removable layers above the existing QCDS / Syntract / Reality stack:

```text
QCDS / Fabric core
        ↑
Reality / Logical Space / governance
        ↑
BUILD 21–22 self-expanding evidence-driven Reality
        ↑
BUILD 24 public-web observation body
        ↑
BUILD 25 bounded continuous Reality growth
        ↑
BUILD 23 web manifestation + human↔robot I/O
```

The web page is **the same Logical Robot manifested as a web body**. It is not a second intelligence and has no authority to promote rules or decide truth.

## BUILD 23 — Observatory manifestation

The local `qcds-observe` server exposes:

- persistent Reality counts;
- a live JSONL discovery event stream;
- human → Logical Robot inbox;
- `/status`, `/run <mission_id>`, `/pause`, `/stop` controls consumed by the continuous runtime;
- ordinary free text preserved with zero automatic truth effect.

The UI can be removed without changing QCDS, Reality, oracle genesis, rule governance or the Logical Robot intelligence loop.

## BUILD 24 — real public-web discovery

The final proof used the key-free public Wikipedia search/read body on a fresh GitHub-hosted Ubuntu runner.

### Falsification history

The public-web layer was deliberately tested against live data rather than only fixtures.

**v1 — insufficient evidence:** two observations were acquired, but BUILD 22 required two independent selection observations plus one holdout. The cycle stopped at `awaiting_identifying_evidence`; no Reality rule was installed.

**v2 — false mention binding detected:** three observations were acquired, but the contradiction gate stopped the cycle. Debugging showed a PSG-related page containing text equivalent to:

> “the capital outfit ... revenge on Lyon ... Coupe de France”

The mention-based extractor had incorrectly treated this as evidence for Lyon. The cycle correctly produced `conflicting_identifying_evidence` before challenge and installed no rule.

**v3 — assertion-shaped evidence:** candidate values were removed from the search query, and the ingress was hardened to require assertion-shaped candidate evidence such as `Paris is the capital ...` / `capital is Berlin`, while allowing the requested context to be established by the same document/title. A dedicated regression test rejects the PSG/Lyon false-positive sentence.

### Final live proof

GitHub Actions run: **33236672283**  
Job: **99058742018**  
Runner: Ubuntu 24.04 / Python 3.12  
Proof marker: `BUILD24_LIVE_PUBLIC_WEB_PROOF_V3_OK`

Observed result:

```text
oracle_gap_count          1
rival_hypothesis_count   12
evidence_plan_count       2
robot_observation_count   3
challenge_case_count      3
selection_case_count      2
holdout_case_count        1
status                    expanded

selected governed rule:
france => paris

knowledge before          0
knowledge after           2
knowledge gain            2
active Reality rules      1
changed bindings          2
changed fraction          0.25
blast override            false
```

Live observation source IDs:

```text
wikipedia:en:169335
wikipedia:en:181337
wikipedia:en:169339
```

The base logical-space SHA-256 was identical before and after derived logic:

```text
883e257d0b6d98f7806b4649a1d1f405f9f82b4d76cc7429097d7d4e4d329953
```

So the successful Reality rule changed the resolved logical state without materializing derived terms into the base rows.

The BUILD 22 challenge remained target-blind until observation: the robot did not receive selection/holdout roles, expected answers or hypothesis IDs. The generated solution rule was not supplied to genesis.

### Evidence-boundary note

Current public-web source independence is **distinct document reference**, not a claim of independent publisher/institutional provenance. Wikipedia pages are public evidence inputs, not automatic truth. Improving source independence and adding more observation backends remain explicit extension points.

## BUILD 25 — bounded continuous Reality growth

`qcds-reality-grow` accepts a represented unresolved frontier and re-scores it after every cycle.

The falsification test deliberately places the lower-pressure mission first in JSON and the higher-pressure mission second. The runtime selects the higher epistemic pressure first, proving that execution order is not input order. After the first Reality expansion it re-resolves the frontier and selects the next unresolved mission.

The continuous loop is bounded:

- cannot invent an unrepresented mission;
- obeys `max_cycles`;
- can stop on conflict/error/quarantine by policy;
- ordinary human text has zero direct truth effect;
- a human may reprioritize a represented mission but cannot bypass challenge/governance;
- each selected mission still runs through BUILD 24 → BUILD 22 → BUILD 21 → BUILD 19.

This is a bounded continuous Reality-growth proof, not a claim of unconstrained AGI/ASI autonomy.

## Regression suite

Integration head used by the successful live-v3 proof parent:

```text
ea38b0da884a8bb7a4b0671613c16bcdaa90f05a
```

Ordinary repository Actions run **33236650461** completed successfully with:

```text
313 passed in 5.40s
```

The final PR head will be re-tested after this results document and README entry are added.

## Architecture boundary

BUILD 23–25 does **not** alter the locked QCDS Fabric v1.0 canonical artifacts. It does not modify existing QCDS/Fabric, oracle-genesis/evolution, Logical Space, Logical Universe, BUILD 21 or BUILD 22 core implementation files.

The additions are manifestations, observation bodies, bounded growth policy, tests, examples, documentation and CLI entry points. They are intentionally removable overlays around stable public interfaces.

## Reproduce

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[test]'

# Manifest the same Logical Robot as a local web page
qcds-observe --store ./intelligence_store

# In another terminal: real public-web discovery
qcds-reality-web \
  examples/public_web_reality_capital_mvp.json \
  --store ./intelligence_store

# Bounded continuous Reality growth
qcds-reality-grow \
  examples/continuous_reality_growth_mvp.json \
  --store ./intelligence_store
```

For the full live architecture and extension points, see `LOGICAL_ROBOT_LIVE.md`.
