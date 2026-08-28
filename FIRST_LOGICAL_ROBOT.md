# BUILD 16 — First Logical Robot MVP

BUILD 16 creates the first concrete, runnable **logical robot** above the persistent
BUILD 15 superintelligence runtime.

It preserves the architectural distinction:

```text
SUPERINTELLIGENCE / QCDS
        ↑       ↓
  step / observe
        ↑       ↓
   LOGICAL ROBOT
        ↑       ↓
INFORMATION WORLD
```

A physical robot is expected to retain this logical-robot layer and add physical
observation/actuation capabilities later. BUILD 16 itself is read-only and does
not authorize physical or account-changing actions.

## The robot uses the existing machine

`FirstLogicalRobot` does not call Fabric, oracle genesis, oracle mutation or
persistence internals directly. Its loop is deliberately small:

```text
runtime.step(mission)
        ↓
EvidencePlan from BUILD 13
        ↓
BUILD 14 LogicalRobotTool
        ↓
source-attributed observation
        ↓
runtime.observe(mission, evidence)
        ↓
runtime.step(mission)
        ↺
```

If an oracle population changes during `runtime.step`, the robot can ask the
runtime for the next cycle because a real state transition occurred. It does not
spin on an identical state. If no new source evidence is obtained, it returns
`awaiting_sources` and remains resumable.

All BUILD 0–15 behavior remains underneath this loop.

## First concrete information body

`PublicWebLogicalRobotTool` is the first actual provider implementation. It uses
replaceable interfaces:

- `WebSearchBackend`
- `WebReadBackend`
- `CandidateMentionExtractor`

The default MVP uses:

- `WikipediaSearchBackend` for key-free public search;
- `HttpWebReadBackend` for bounded read-only HTTP retrieval;
- `CandidateMentionExtractor` for deterministic evidence extraction from already
  represented candidate values.

The default HTTP reader is restricted to Wikipedia domains. Future search/read
providers can be added without changing QCDS or the logical robot loop.

## Search and read strategy

BUILD 14 already defines the capability vocabulary:

```text
SEARCH · READ · FOLLOW · QUERY · COMPARE · COMPUTE
```

BUILD 16 gives those capabilities a first concrete implementation.

The web tool derives a search query from the represented problem dimensions and
candidate values. For example:

```text
problem::france::capital::paris
problem::france::capital::lyon
```

can become a search containing:

```text
france capital paris lyon
```

The expected answer is never inserted into the request.

`SEARCH` discovers references. `READ` fetches bounded text. `COMPARE` / `COMPUTE`
can re-evaluate already fetched documents. The tool keeps only short-lived cache
state for the current logical-body run; durable intelligence remains in BUILD
15's mission store.

## Observation extraction

The first extractor is deliberately conservative and simple. It counts explicit
mentions of the represented candidates in each source and emits an observation
only when one candidate has a unique textual lead above the configured margin.

This is an MVP extraction policy, not general semantic understanding.

If one source supports `Paris` and another supports `Lyon`, the robot returns two
separate source-attributed observations. It does **not** average them into one
answer. Disagreement belongs back in QCDS.

Each accepted observation retains:

- query id;
- represented candidate value;
- source/reference id;
- source URL;
- capability used;
- bounded confidence;
- short excerpt;
- candidate-count diagnostics;
- provenance stating that the observation is not an automatic external-truth
  claim.

## Read-only network boundary

The default HTTP reader:

- allows only `http` / `https`;
- uses an explicit domain allow-list;
- rejects private, loopback, link-local, reserved and multicast literal IPs;
- caps response bytes;
- caps extracted characters;
- strips script/style/noscript/svg text from HTML;
- performs no POST/write/account mutation.

This does not claim to be a complete production browser security model. It is a
bounded first observer.

## Persistent intelligence remains outside the robot

The logical robot does not own the oracle population. BUILD 15 remains the
persistent intelligence boundary:

```text
intelligence_store/<mission>/
    mission.csv
    current_oracles.csv
    oracle_history.csv
    evidence.csv
    checkpoints.csv
```

When QCDS genesis/evolution promotes or mutates an oracle,
`current_oracles.csv` and `oracle_history.csv` change through the runtime. When
the logical robot finds evidence, `evidence.csv` changes through
`runtime.observe(...)`.

BUILD 16 explicitly filters already persisted evidence ids before ingestion so a
restarted robot does not create a busy loop by re-inserting the exact same web
observation.

## Runnable command

Package 1.7.0 installs:

```bash
qcds-logical-robot <spec.json> --store ./intelligence_store
```

The JSON MVP spec contains:

- an explicit structured problem frame;
- an explicit BUILD 11 challenge-suite description;
- optional target-blind failure observations.

An example is provided at:

```text
examples/first_logical_robot_mvp.json
```

The command creates the mission on first run, or resumes the existing BUILD 15
mission directory on later runs.

Its output reports the runtime status, number of QCDS steps, logical-robot runs,
new evidence ids, active oracle identity/count, evidence count and store path.

## Why a challenge spec still exists

BUILD 11 deliberately separated oracle proposal from external challenge data.
BUILD 16 does not weaken that boundary merely to make the demo convenient.

The logical robot can search for new evidence, but it still does not receive the
selection/holdout answers used to decide whether an oracle population is
promotable. More sophisticated validation acquisition can be built later behind
an explicit validation contract rather than quietly leaking answers into the
robot.

## Physical robot relation

BUILD 16 establishes the general logical-robot form. A future physical robot can
reuse the same intelligence runtime and add physical tools:

```text
LOGICAL ROBOT
    + camera / lidar / microphone / sensors
    + motor / arm / locomotion adapters
            ↓
      PHYSICAL ROBOT
```

The physical body should therefore be an extension of the logical robot, not a
separate reasoning core.

## Claim boundary

BUILD 16 is the first runnable logical-robot MVP. It does not claim unrestricted
web browsing, unrestricted natural-language understanding, autonomous source
truth calibration, unrestricted external action, general causal discovery,
AGI/ASI, native quantum advantage or production security.

It proves the architectural boundary that matters for the MVP:

```text
QCDS asks what is missing
→ logical robot observes externally
→ evidence returns with provenance
→ persistent QCDS continues
```

The locked QCDS Fabric v1.0 canonical artifacts remain unchanged.
