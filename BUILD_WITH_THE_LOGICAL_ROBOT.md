# Build with the Logical Robot

The fastest way to understand this project is to make one small thing **observable, falsifiable and useful** without rewriting the QCDS core.

The web page is only one body for the same Logical Robot. The intelligence lives below it in QCDS / Syntract, governed logical growth and the persistent Reality space.

## The event to understand first

```text
OBSERVATION
    ↓
ORACLE GAP / UNCERTAINTY
    ↓
COMPETING CANDIDATE LOGIC
    ↓
EVIDENCE THAT CAN DISTINGUISH THE CANDIDATES
    ↓
FALSIFICATION / CHALLENGE
    ↓
GOVERNANCE / BLAST RADIUS
    ↓
PROMOTED LOGIC
    ↓
REALITY CAN RESOLVE MORE THAN BEFORE
```

A web page, paper, human statement or sensor reading is **evidence**, not automatic truth. A candidate rule is **proposed logic**, not truth. Only logic that survives the relevant challenge and governance path becomes active reusable logic in the resolved Reality view.

## Five good ways to start building

### 1. Add an observation body

Examples: a public scientific API, a file/paper reader, a simulation, a laboratory instrument adapter, a camera/sensor adapter, or another read-only public information source.

Your body should return source-attributed observations. It should not install a rule or declare truth.

Start by reading:

- `src/qcds_fabric/public_web_reality.py`
- `src/qcds_fabric/logical_robot_control.py`
- `CONTRIBUTING.md`

A strong first test is: **can the source produce useful evidence while a misleading source still fails closed?**

### 2. Build or falsify an oracle

The most useful oracle contribution is often a falsifier, not another happy-path rule.

Try to expose:

- source bias;
- position bias;
- contradictory evidence;
- oracle dominance;
- target/holdout leakage;
- false semantic binding;
- rule drift;
- cross-substrate mismatch.

Start by reading the oracle/genesis/evolution modules and the corresponding tests. A failure that reveals a real weakness is a successful research result.

### 3. Build a bounded Logical Universe

Use `LOGICAL_UNIVERSE_TEMPLATE.md` for a domain whose rules and falsifiers can be stated clearly: an engineering specification, game, lawbook, scientific micro-domain, simulation or hypothetical world.

Do not begin by inventing a hierarchy. Represent the logic that matters in the domain and let relevant Syntracts emerge under the active Conditions/oracle regime.

### 4. Make intelligence growth easier to see

BUILD 29/30 deliberately keep the visualization read-only. Useful extensions include:

- very large logical-space projection;
- Syntract highlighting;
- time travel through Reality growth;
- provenance and evidence trails;
- oracle/null/rotation views;
- contradiction overlays;
- comparison of Reality before/after a governed logical change;
- new robot manifestations for mobile, scientific or physical environments.

Do not move inference or truth authority into the browser.

### 5. Break it with a benchmark

A good benchmark states exactly what would make the claim fail.

Publish:

- exact commit;
- workload/data;
- environment;
- assertions/falsifiers;
- raw result;
- what changed;
- what did not change;
- what the result does **not** establish.

## A small first experiment

Pick a domain you know well and make the following cycle executable:

```text
START
  a few source-attributed observations
  one unresolved question
  no supplied solution rule

SYSTEM
  identifies the gap
  forms rival candidates
  asks for distinguishing evidence
  rejects at least one plausible wrong candidate
  promotes logic only if challenge + governance pass

END
  the resolved logical space can answer something it could not answer at START
```

That last line is the important one. The goal is not merely more downloaded text. The goal is **new reusable logical capability**.

## Run it

```bash
python -m pip install -e '.[test]'
pytest -q
qcds-live --store ./intelligence_store --frontier examples/continuous_reality_growth_mvp.json
```

Or open the repository in GitHub Codespaces. The same Logical Robot runs remotely and the browser is only its manifested I/O body.

## Architecture boundary

```text
QCDS / Fabric core
        ↑
Logical Space / governed Reality / Logical Universes
        ↑
Logical Robot
        ↑
observers / bodies / applications / visualizations
```

Build upward first. Change the stable core only when the capability is genuinely reusable architecture and the falsification case requires it.
