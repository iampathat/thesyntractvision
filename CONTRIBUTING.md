# Contributing to The Syntract Vision

**New here? Start with [`BUILD_WITH_THE_LOGICAL_ROBOT.md`](BUILD_WITH_THE_LOGICAL_ROBOT.md)** for a short map from “what am I looking at?” to a first falsifiable contribution.

The fastest way to contribute is **not** to rewrite the QCDS core.

The repository is intentionally layered so new experiments can be built around a stable inference architecture and then falsified independently.

## Good first contribution paths

### Build a new Logical Robot body / observer

Examples:

```text
public data API
scientific instrument adapter
file / paper observer
simulation observer
camera or other physical sensor adapter
```

A body observes and returns source-attributed evidence. It does not become a new intelligence and it does not get authority to declare truth.

### Build a small Logical Universe

Use [`LOGICAL_UNIVERSE_TEMPLATE.md`](LOGICAL_UNIVERSE_TEMPLATE.md) to define a bounded lawbook, game, engineering specification, scientific micro-domain, simulation or hypothetical world.

Small universes are especially useful when their truth conditions and falsifiers are explicit.

### Falsify an oracle or inference behavior

Strong contributions are tests that can make an implementation fail for a meaningful reason:

```text
source bias
position bias
oracle dominance
contradiction
holdout regression
rule drift
cross-substrate mismatch
false semantic binding
```

A failing falsifier that reveals a real weakness is more valuable than a decorative green test.

### Improve the Living Logical Robot

The web page is only a manifestation of the same Logical Robot. Useful contributions include:

- better large-space projection;
- time travel through Reality growth;
- Syntract highlighting;
- oracle/null/rotation visualization;
- provenance inspection;
- accessibility/mobile interaction;
- additional safe observation bodies;
- remote-runtime adapters.

Do not move inference or truth decisions into the browser merely to make the visualization easier.

### Add a benchmark

Benchmarks should publish:

- exact commit;
- environment;
- input/workload;
- assertions/falsifiers;
- raw or inspectable result;
- what the result demonstrates;
- what it does **not** demonstrate.

## Architecture boundary

The locked QCDS Fabric v1.0 canonical artifacts are not ordinary implementation files.

Do not change canonical files as part of an unrelated feature or MVP.

New bodies, interfaces, benchmarks and application experiments should normally live above the existing architecture:

```text
QCDS / Fabric core
        ↑
Logical Space / Universes / governed logic
        ↑
Logical Robot
        ↑
observers / bodies / applications / visualizations
```

## Claims

Please distinguish implementation results from research claims.

A successful Python benchmark does not by itself establish AGI/ASI, quantum advantage, external truth or production correctness. A web source is evidence, not truth merely because it was retrieved.

## Run everything

```bash
python -m pip install -e '.[test]'
pytest -q
```

To see the running system:

```bash
qcds-live \
  --store ./intelligence_store \
  --frontier examples/continuous_reality_growth_mvp.json
```

Or open the repository in GitHub Codespaces; the Living Logical Robot starts on the forwarded port automatically.

## Pull requests

Prefer a focused branch and a non-draft PR with:

- the problem being tested;
- the architectural layer being changed;
- explicit falsifiers;
- the observed result;
- confirmation of whether canonical/core files changed.

The project values inspectability, falsification and clean architectural boundaries over feature count.
