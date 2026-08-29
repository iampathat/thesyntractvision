# The Living Logical Robot

The **Living Logical Robot** is a visible and controllable manifestation of the same QCDS / Syntract intelligence already present in this repository.

It is deliberately **not a second intelligence** and the web interface is deliberately **not part of the QCDS core**.

```text
                     QCDS / SYNTRACT
                           │
                    Reality Logical Space
                           │
                     Logical Robot
                    /      |       \
              public web   I/O    other bodies
                    \      |       /
                     event/control plane
                           │
                Living Logical Space UI
```

Delete the UI and QCDS still exists. Replace the web body with a physical body and it is still the same Logical Robot.

## What you can see

The center of the page is a live projection of the represented `reality` Logical Space:

- observed logical terms;
- source-attributed logical bindings;
- governed global rules as a visually distinct overlay;
- current frontier items;
- discovery/runtime events;
- growth history for bindings, represented terms and active rules.

The visualization is **not an ontology, taxonomy, hierarchy or canonical knowledge graph**. It is a bounded projection of whatever generic logical bindings are currently represented. A different question, Syntract or projection may expose a very different view of the same underlying Logical Space.

## What you can send to the Logical Robot

The same input surface accepts different event types:

```text
Dialogue
Investigate
Explore knowledge domain
Build frontier around ...
Go to web page
```

Modes can be active at the same time:

```text
Human dialogue             ON/OFF
Public web discovery       ON/OFF
Explore knowledge domains  ON/OFF
Build own frontier         ON/OFF
Continuous intelligence    ON/OFF
```

`Pause` and `Resume` act on the control loop without changing QCDS semantics.

### Human text is not truth

Ordinary human input has **zero automatic truth effect**. Dialogue is parsed as an information/control event. If it contains a bounded query that the current semantic ingress understands, that query can be exposed. Unknown text remains unresolved rather than being silently invented into logic.

A user may therefore say:

```text
Explore quantum biology
```

without causing `quantum biology` to become an externally true fact in Reality.

## Building its own frontier

The current MVP has two bounded forms of self-expanding frontier construction.

First, the Logical Robot can turn its **own represented unresolved events** into new frontier work. For example:

```text
awaiting_identifying_evidence
        ↓
Acquire missing identifying evidence
        ↓
new frontier item
```

Conflicting evidence and quarantined changes can similarly create new challenge/investigation work.

Second, domain exploration can discover references and create new child frontier items to inspect those references:

```text
Explore: quantum biology
        ↓
public web search
        ↓
observed references
        ↓
Logical Robot creates child frontier
        ↓
read / inspect next sources
```

This is intentionally not described as unrestricted autonomous curiosity. The robot currently grows frontier from represented uncertainty and observed references. Turning arbitrary unconstrained natural-language goals into entirely new QCDS problem spaces is a later capability and is not faked here.

## Continuous intelligence

Enable **Build intelligence continuously** and the control worker repeatedly:

```text
re-evaluates represented frontier
        ↓
selects highest-priority pending work
        ↓
observes / investigates / delegates to Reality discovery
        ↓
records result
        ↓
derives new bounded frontier where justified
        ↺
```

Existing BUILD 25 missions still delegate through the existing stack:

```text
BUILD 25
  ↓
BUILD 24 public-web body
  ↓
BUILD 22 evidence-driven discovery
  ↓
BUILD 21 self-expanding Reality
  ↓
BUILD 19 rule-drift governance
```

The Living Logical Robot does not bypass challenge or governance.

## Run locally

```bash
python -m pip install -e '.[test]'

qcds-live \
  --store ./intelligence_store \
  --frontier examples/continuous_reality_growth_mvp.json
```

The browser opens automatically on `http://127.0.0.1:8765/`.

`qcds-observe` is an alias for the same Living Logical Robot entry point.

## Run remotely with GitHub Codespaces

The repository contains `.devcontainer/devcontainer.json`.

Open a Codespace from the repository, or use:

https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=1339193926&skip_quickstart=true

The Codespace:

1. installs `qcds-fabric`;
2. starts `qcds-live` on port `8765`;
3. forwards that port;
4. opens the Living Logical Robot in the browser.

The forwarded port is **private by default**. This matters because the live runtime exposes control/I-O as well as observation.

## GitHub Pages manifestation

The repository also contains `.github/workflows/pages.yml`.

Its intended public address is:

https://iampathat.github.io/thesyntractvision/

GitHub Pages is static, so it cannot itself execute the Python QCDS runtime. The Pages version therefore behaves honestly:

```text
no runtime connected
      → clearly labelled RECORDED VERIFIED PROOF

runtime connected
      → same UI reads the live runtime API
```

A static demonstration is never labelled as live intelligence.

If GitHub Pages has not yet been enabled for this repository, select **Settings → Pages → Source: GitHub Actions** once. The normal repository `GITHUB_TOKEN` can deploy Pages after that but cannot safely perform the initial account-level enablement by itself.

## Remote runtime adapter

The live service exposes a small HTTP interface:

```text
GET  /api/health
GET  /api/state
GET  /api/control
GET  /api/frontier
GET  /api/events?after=<cursor>
GET  /api/space
POST /api/input
POST /api/mode
POST /api/process-one
```

The same service can bind locally or to a remote host. Cross-origin access is disabled by default and can be explicitly enabled for one exact origin with:

```bash
qcds-live --cors-origin https://example.org
```

Do not expose a writable live runtime publicly without an access-control layer. Codespaces remains private by default for that reason.

## Verified BUILD 26–28 proof

A fresh GitHub-hosted runner started the real HTTP service, loaded a transparent Reality store, sent dialogue, requested `Explore quantum biology`, performed a real Wikipedia search and verified that the Logical Robot created child frontier items from the observed references.

The proof also exported the exact static Pages manifestation.

See [`results/BUILD26_28_LIVING_LOGICAL_ROBOT_RESULTS.md`](results/BUILD26_28_LIVING_LOGICAL_ROBOT_RESULTS.md).

## Architectural boundary

BUILD 26–28 are overlays. They do not redefine the canonical QCDS Fabric, oracle semantics, nulling/rotation topology, Logical Space semantics or Reality governance.

```text
QCDS / Fabric core
        ↑
Reality / Logical Space / governed logic
        ↑
Logical Robot
        ↑
BUILD 26–28 visualization + events + runtime manifestation
```

That boundary is intentional: the intelligence should survive every replacement of its current web body.
