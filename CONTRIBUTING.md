# Contributing to The Syntract Vision

You do **not** need to understand or agree with every part of the long-range QCDS vision before contributing something useful.

Start with a small, inspectable problem.

**First time here? Read [`START_HERE.md`](START_HERE.md) first.**

## The fastest first contribution

```bash
git clone https://github.com/iampathat/thesyntractvision.git
cd thesyntractvision
python -m pip install -e '.[test]'
python examples/hello_logical_space.py
```

Then edit `examples/hello_logical_space.py` and run it again.

If that makes sense, you already understand enough of the boundary to begin building.

---

## Pick a contribution lane

### Make the Logical Robot easier to use

Good examples:

- clearer Logical Space visualization;
- provenance inspection;
- before → after views;
- contradiction overlays;
- accessibility/mobile improvements;
- better session sandbox interaction.

The UI is a manifestation of the Logical Robot. Do not move fundamental QCDS inference or truth authority into the browser.

### Add an observation body

Examples:

- scientific API;
- simulation;
- file/paper observer;
- laboratory instrument;
- camera/sensor adapter;
- another bounded public information source.

An observation body returns source-attributed evidence. It does not declare truth or install solution rules.

### Build a small Logical Universe or Domain Lab

This is a great path if you know a domain better than you know this codebase.

Use a bounded problem where you can say what would count as success **and what would falsify it**.

Start with [`DOMAIN_LABS.md`](DOMAIN_LABS.md) and [`LOGICAL_UNIVERSE_TEMPLATE.md`](LOGICAL_UNIVERSE_TEMPLATE.md).

### Try to break an oracle or inference behavior

Useful failures include:

```text
source bias
position bias
contradictory evidence
oracle dominance
target / holdout leakage
false semantic binding
rule drift
cross-substrate mismatch
```

A test that exposes a real weakness is a successful contribution even when it turns CI red at first.

### Build a benchmark

A useful benchmark states:

- exact commit;
- workload/data;
- environment;
- assertion/falsifier;
- raw or inspectable result;
- what the result demonstrates;
- what it does **not** demonstrate.

### Explore distributed / swarm behavior

[`LIVING_SWARM_LOGICAL_ROBOTS.md`](LIVING_SWARM_LOGICAL_ROBOTS.md) is an optional playground for bounded peer exchange between Logical Robots.

It is deliberately not a replacement for QCDS or the main Logical Robot architecture.

---

## The architecture boundary

Keep this picture nearby:

```text
QCDS / Fabric Core
        ↑
Logical Space / Universes / governed logic
        ↑
Logical Robot
        ↑
web / APIs / simulations / sensors / robot bodies
```

**Build upward first.**

Changing the core is appropriate only when the capability is genuinely reusable architecture and cannot cleanly live above it.

The locked QCDS Fabric v1.0 canonical files are not ordinary feature files.

---

## Three things we do not want hidden in a contribution

1. **No automatic truth.** Human text, web pages and sensor readings are evidence/input, not truth merely because they were received.
2. **No hidden solution rule.** Do not bake the desired answer into a demo and then report that the system discovered it.
3. **No accidental second QCDS.** Do not reimplement fundamental inference in JavaScript, UI helpers or integration code just to make a feature easier.

---

## Run the checks

```bash
python -m pip install -e '.[test]'
pytest -q
```

To run the full local Logical Robot:

```bash
qcds-live --store ./intelligence_store --frontier examples/continuous_reality_growth_mvp.json
```

Or use GitHub Codespaces from the README.

---

## Pull requests

The repository includes a PR template. Keep the PR focused and tell us:

- what you tried to improve;
- which architectural layer changed;
- the shortest way to reproduce it;
- what would falsify the result;
- whether core/canonical files changed;
- the observed before → after result.

Small PRs are welcome. A five-line falsifier can be more valuable than a thousand-line feature.

If you are unsure where to begin, take the hello example, replace its toy domain with something you actually know, and make one uncertainty inspectable.
