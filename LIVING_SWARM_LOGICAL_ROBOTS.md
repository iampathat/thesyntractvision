# Living Swarm Logical Robots

> Experimental distributed capability around the unchanged QCDS core.

**Living Swarm Logical Robots** lets many independent Logical Robots cooperate while each robot continues to communicate with the same QCDS core semantics.

The swarm is **not** a replacement for QCDS, Syntract, Logical Spaces, or the Living Logical Robot architecture. It is a coordination/challenge layer around existing Logical Robots.

## Core idea

```text
Logical Robot A ─┐
Logical Robot B ─┼─► bounded swarm exchange ─► challenged shared result
Logical Robot C ─┘
        │
        └──────── each robot still talks to QCDS Core
```

A browser can act as one temporary node. Many browsers can therefore form a distributed execution mesh without moving fundamental inference logic out of the QCDS core.

Swarm traffic is narrow and epistemic rather than a shared mutable truth database. A node may exchange, for example:

- a bounded Syntract/result packet;
- an unresolved question or frontier item;
- source-attributed evidence;
- provenance needed to challenge a result;
- a contradiction or falsification result;
- an alternative oracle proposal;
- a compact verification response.

Raw browser session state does not need to be globally shared.

## Build 43 — QCDS-driven swarm intelligence

The first executable swarm loop now lives in `src/qcds_fabric/swarm_intelligence.py`.

The important direction is that the swarm is **driven by the QCDS TruthDistribution**, not by majority voting or a separate agent manager:

```text
QCDS TruthDistribution
        ↓
which live dimensions carry the most uncertainty?
        ↓
Swarm frontier tasks
        ├── seek discriminating evidence
        ├── attempt falsification
        ├── independent verification
        └── propose alternative oracle
        ↓
Logical Robots
        ↓
bounded oracle packets
        ↓
OracleStack re-entry
        ↓
SAME QCDS FABRIC
        ↓
new TruthDistribution / Syntract
```

`plan_swarm_frontier(...)` ranks currently live `?` dimensions from the QCDS distribution. `SwarmOraclePacket` carries an oracle manifestation plus source robot, work type and provenance. `compile_swarm_reentry(...)` validates universe identity and oracle identity before adding contributions to the same OracleStack. `run_swarm_reentry(...)` executes the resulting stack through the unchanged `FabricLayer`.

A packet does not become truth because it arrived, and multiple robots do not become authoritative because they agree. Their contributions become oracle pressure that must survive QCDS inference and challenge.

## Central and browser topology

A browser may host an ephemeral oracle space for test/work while a central host can mount larger shared oracle spaces for higher-capacity QCDS execution. The host does not redefine the logic: the same `BaseBundle + OracleStack` contract is transferred with universe identity and provenance intact.

```text
browser/session oracle space ─┐
external robot oracle space ──┼─► central oracle-space host ─► QCDS Fabric
lab oracle space ─────────────┘
```

Transfer does **not** automatically promote imported claims into Reality or truth. It transfers the represented oracle contract so central QCDS can challenge and integrate it under explicit universe semantics.

## Non-goals

Living Swarm Logical Robots must not:

- duplicate QCDS inference logic in JavaScript or another client layer;
- become a second intelligence architecture;
- gain automatic authority over another node's Reality;
- reduce coherence to majority voting;
- require a permanent central database;
- become a prerequisite for ordinary Logical Robot operation.

## Browser swarm direction

BUILD 35 made the substrate property visible: a browser can host an ephemeral Logical Robot session while the unchanged `qcds_fabric` core executes through Python locally or through WebAssembly/Pyodide on GitHub Pages.

Build 42 adds transferable central/session/external oracle-space contracts. Build 43 adds QCDS-driven swarm frontier selection and oracle re-entry. Build 44 adds a central high-capacity QCDS host that can execute independent spaces in parallel and explicit distribution re-entry in sequential/hybrid lanes.

```text
browser node
  → ephemeral oracle space
  → Logical Robot
  → QCDS Core
  → local TruthDistribution / Syntract
  → swarm frontier / challenge
  → oracle packet
  → central or local QCDS re-entry
  → new TruthDistribution / Syntract
```

The useful intelligence is not produced by the number of browsers alone. A swarm becomes meaningful when distributed work preserves provenance, contradiction handling, epistemic identity and QCDS/Syntract coherence.

## Status

**EXPERIMENTAL IMPLEMENTATION.**

The Build 43 coordination/re-entry core is implemented and test-covered. It is still a research layer around the more mature QCDS core and Logical Robot architecture; it does not change the canonical four QCDS phases.
