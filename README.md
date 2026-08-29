# The Syntract Vision

> **From uncertainty toward truth. From truth toward action.**

The Syntract Vision is an experimental architecture for **inference-driven intelligence** built around QCDS, Logical Spaces, Syntracts and the Logical Robot.

You do **not** need to understand the whole architecture before trying it or building with it.

## Start in 60 seconds

### Try it in your browser

**https://iampathat.github.io/thesyntractvision/**

The public sandbox lets you create a temporary Logical Space and run the actual `qcds_fabric` Python core through WebAssembly/Pyodide.

```text
browser session
      ↓
Logical Robot
      ↓
QCDS Core
      ↓
Syntract / result
```

The browser does not contain a second implementation of QCDS. Session state is temporary, there is no user database, and the sandbox has **Reality effect = 0**.

### Run it locally

```bash
git clone https://github.com/iampathat/thesyntractvision.git
cd thesyntractvision
python -m pip install -e '.[test]'
qcds-live --store ./intelligence_store --frontier examples/continuous_reality_growth_mvp.json
```

Open `http://127.0.0.1:8765/`.

### Skip setup with Codespaces

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=1339193926&skip_quickstart=true)

### Change one thing

```bash
python examples/hello_logical_space.py
```

Then edit that file and run it again.

That is the recommended first code path.

**New here? → [`START_HERE.md`](START_HERE.md)**

---

## What is different here?

A conventional AI workflow often looks like:

```text
input → trained model → answer
```

The QCDS direction is different:

```text
uncertainty
    ↓
represented logical possibility space
    ↓
Conditions + oracles / evidence / constraints
    ↓
recursive inference + challenge
    ↓
coherent truth distribution
    ↓
Syntract
```

The architecture is designed around a few strong ideas:

- uncertainty remains explicit instead of being silently collapsed early;
- contradictions are representable states;
- evidence is not automatically truth;
- candidate logic can be challenged and falsified;
- inference semantics are separated from the execution substrate;
- relevant structure can emerge from an open Logical Space rather than requiring one permanent ontology;
- the same core can sit behind a browser, API, simulation, sensor or physical robot body.

The current implementation is research software. It does **not** claim that the present Python MVP has achieved AGI, ASI or demonstrated quantum advantage.

---

## The architecture in one picture

```text
QCDS / Fabric Core
        ↑
Logical Space / Logical Universes / governed logic
        ↑
Logical Robot
        ↑
web · APIs · simulations · files · sensors · robot bodies
```

The top layers communicate with the core. They do not replace it.

This boundary matters especially in the public browser sandbox: WebAssembly is an execution substrate for the same Python core, not a client-side rewrite of QCDS.

---

## What can I build?

You do not need to begin in the core.

Good contribution paths include:

| Interest | Useful starting point |
|---|---|
| Front-end / visualization | Make large Logical Spaces, Syntracts or provenance easier to inspect |
| Scientific research | Create a small falsifiable Domain Lab |
| APIs / data | Add a bounded source-attributed observation body |
| Logic / verification | Add a contradiction, leakage or oracle falsifier |
| Robotics | Connect a sensor/body without moving inference out of the core |
| Distributed systems | Explore bounded **Living Swarm Logical Robots** |
| Quantum / substrates | Test parity, rotations, Grover/oracle semantics or alternative execution |
| Benchmarks | Build something that can genuinely fail the claim being tested |

Read [`BUILD_WITH_THE_LOGICAL_ROBOT.md`](BUILD_WITH_THE_LOGICAL_ROBOT.md) when you want the deeper builder map.

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a PR.

---

## The smallest useful experiment

A strong experiment can be tiny:

```text
START
  a few source-attributed observations
  one unresolved question
  several candidate answers
  zero supplied solution rules

SYSTEM
  represents the problem
  evaluates the logical space
  preserves contradictions / uncertainty
  returns a distribution or Syntract

CHECK
  what changed?
  what remained unresolved?
  what evidence mattered?
  what would falsify the result?
```

The goal is not to create the largest demo. The goal is to make intelligence **inspectable, challengeable and reusable**.

---

## Living Logical Robot

The repository includes a visible Logical Robot runtime.

It can expose:

```text
observations
    ↓
represented logical terms
    ↓
uncertainty / oracle gaps / contradictions
    ↓
candidate logic
    ↓
challenge + governance
    ↓
promoted reusable logic
    ↓
more of the represented space can resolve
```

Human text, web content and sensor input have **zero automatic truth authority** simply because they entered the system.

See [`LIVING_LOGICAL_ROBOT.md`](LIVING_LOGICAL_ROBOT.md).

---

## Logical Spaces and Universes

Logical Spaces use generic bindings rather than forcing every domain into one fixed hierarchy.

Examples:

```text
(paris, city)
(paris, capital, france)
(france, language, french)
(stone_8421, stone_8422, distance, 7.3 mm)
```

Logical Universes can isolate different epistemic contexts:

```text
reality             observed/source-attributed logic
swedish-law-2026    declared legal logic
proposal-x          hypothetical logic
simulation-y        simulated logic
```

See [`LOGICAL_SPACE.md`](LOGICAL_SPACE.md), [`LOGICAL_UNIVERSES.md`](LOGICAL_UNIVERSES.md) and [`DOMAIN_LABS.md`](DOMAIN_LABS.md).

---

## Browser sandbox and swarm experiments

BUILD 35 added an ephemeral browser Logical Space sandbox using `sessionStorage` and the packaged QCDS Python core through Pyodide/WebAssembly.

That also makes a broader experiment possible: many temporary Logical Robots can potentially cooperate as a distributed swarm while each keeps QCDS inference in the core.

This is intentionally an optional side concept, not a replacement architecture.

See [`LIVING_SWARM_LOGICAL_ROBOTS.md`](LIVING_SWARM_LOGICAL_ROBOTS.md).

---

## Run tests

```bash
python -m pip install -e '.[test]'
pytest -q
```

The current package version is **`qcds-fabric 1.26.0`**.

GitHub Actions runs the regression/falsification suite on implementation changes.

---

## Repository map

| Path | What it is |
|---|---|
| `START_HERE.md` | shortest path from curious to building |
| `examples/hello_logical_space.py` | smallest editable executable example |
| `src/qcds_fabric/` | reference implementation |
| `tests/` | regression and falsification suite |
| `examples/` | runnable experiments |
| `DOMAIN_LABS.md` | domain-oriented Logical Space experiments |
| `BUILD_WITH_THE_LOGICAL_ROBOT.md` | deeper builder guide |
| `LIVING_LOGICAL_ROBOT.md` | runtime / manifestation guide |
| `LIVING_SWARM_LOGICAL_ROBOTS.md` | optional distributed swarm concept |
| `QCDS_FABRIC_SPEC_v1.0_CANONICAL.*` | locked canonical QCDS Fabric specification |

---

## Canonical QCDS phases

1. **Condition Formation** — open the represented possibility space without preselecting the answer.
2. **Conditional Evolution** — apply evidence, logic, rules, measurements and other constraints as oracles.
3. **Recursive Inference** — amplify, compare, rotate, null, stabilize, recurse and reshape the working truth distribution.
4. **Truth-Alignment / Syntract Binding** — bind what remains coherent through repeated inference and contradiction testing.

The canonical v1.0 artifacts are version-locked and are not casually rewritten by application or UI work.

- [`QCDS_FABRIC_SPEC_v1.0_CANONICAL.md`](QCDS_FABRIC_SPEC_v1.0_CANONICAL.md)
- [`QCDS_FABRIC_SPEC_v1.0_RELEASE_LOCK.txt`](QCDS_FABRIC_SPEC_v1.0_RELEASE_LOCK.txt)

---

## License and authorship

**Author and originator:** Patrik Sundblom  
**Canonical architecture:** QCDS Fabric v1.0 — locked  
**Reference software:** `qcds-fabric` 1.26.0  
**Theory/specification:** CC BY 4.0  
**Software:** MIT

The Syntract Vision publication is available on Zenodo: DOI **10.5281/zenodo.22031525**.

---

## If you only remember one thing

You are welcome to experiment without understanding everything.

**Start small. Keep the evidence explicit. Do not smuggle the answer into the system. Build around the core first. Make the result falsifiable.**
