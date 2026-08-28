# BUILD 14 — Logical Robot Runtime

BUILD 14 adds the first **logical robot body** around the existing QCDS / Syntract
reference implementation. It does not replace any earlier BUILD and does not
modify the locked QCDS Fabric v1.0 canon.

The purpose is to let BUILD 13 information needs be executed against external
information environments through explicit observation adapters.

```text
SUPERINTELLIGENCE / QCDS
        ↓
uncertainty / oracle gap
        ↓
BUILD 13 EvidencePlan
        ↓
BUILD 14 LOGICAL ROBOT
 SEARCH · READ · FOLLOW · QUERY · COMPARE · COMPUTE
        ↓
external information environment
 web · papers · APIs · databases · files · simulations
        ↓
LogicalObservation + source provenance
        ↓
EvidenceAcquisitionResult
        ↓
BUILD 13 resume
        ↓
recompile → QCDS → oracle genesis/evolution → Syntract
        ↺
```

## Logical robot, not replacement intelligence

BUILD 14 is deliberately a body/runtime layer. BUILD 0–13 remain active beneath
it. The logical robot does not become a second reasoning core and does not hide
QCDS behind an autonomous-agent abstraction.

Its responsibilities are bounded:

1. receive an explicit `EvidencePlan`;
2. translate each `EvidenceAction` into one or more logical observation
   capabilities;
3. route requests to registered `LogicalRobotTool` adapters;
4. preserve source identity, URI/reference metadata and provenance;
5. return observations as BUILD 13 `EvidenceAcquisitionResult` objects;
6. resume the existing QCDS loop only when genuinely new evidence exists.

## Capabilities

The reference runtime recognizes six logical observation capabilities:

- `search`
- `read`
- `follow`
- `query`
- `compare`
- `compute`

These are information operations. BUILD 14 does **not** authorize arbitrary
external side effects or physical actuation. A provider implementing `compute`
must treat it as bounded information-producing computation, not as permission to
modify external systems.

A future web browser, scientific-index connector, API connector, database
connector, local-file observer or simulation backend can implement the same
`LogicalRobotTool` protocol without changing QCDS inference.

## Strategy changes without busy-looping

An evidence action maps to a bounded capability sequence. For example an
independent observation may try:

```text
SEARCH → READ → FOLLOW → COMPARE
```

A tool can also return explicit `retry_capabilities`. If a search only discovers
a reference, the runtime can move to `read`. If no available strategy produces
usable evidence, the run ends as `awaiting_sources` rather than retrying forever.

Capability exhaustion is **not terminal**. Wake triggers include:

- a new source becoming available;
- a change in the logical information environment;
- a new evidence plan;
- an oracle-population change;
- explicit manual resume.

This extends BUILD 13's distinction between a temporary stall and permanent
termination.

## Target blindness

`LogicalRobotRequest` contains the observation objective, relevant query ids,
dimensions and represented candidate values. It contains no challenge target,
holdout answer or expected truth value.

The logical body therefore cannot solve a challenge by reading the benchmark
answer from its request. Challenge/holdout information remains in BUILD 11.

## Observation is not truth

A `LogicalObservation` contains:

- query id;
- observed candidate value;
- source id;
- capability used;
- confidence;
- optional URI/reference;
- optional excerpt and provider provenance.

The runtime checks that the observation belongs to the represented candidate
space. A genuinely new value fails closed and must go through semantic or
expansion handling instead of silently creating a new dimension.

Accepted observations become source-attributed BUILD 13 evidence. They are not
marked as external truth merely because a tool found them.

## End-to-end bridge

`run_logical_robot_cycle(...)` takes a non-terminal BUILD 13 checkpoint. It
executes pending evidence plans through logical tools. If no evidence is found,
QCDS is not re-run on the identical state. If evidence is found, it is ingested
and the BUILD 13 resume path re-enters the complete existing system.

That means BUILD 14 closes the first executable logical-robot loop:

```text
QCDS
 ↓
NEED INFORMATION
 ↓
LOGICAL ROBOT OBSERVES
 ↓
NEW EVIDENCE
 ↓
QCDS
 ↓
GENESIS / EVOLUTION / BIND / EXPAND
 ↺
```

## Claim boundary

BUILD 14 is a provider-independent logical robot runtime. The repository does
not yet ship a production web browser, unrestricted internet crawler, account
operator or autonomous external-action engine. It does not claim universal web
understanding, automatic source reliability, unrestricted self-modification,
AGI/ASI, native quantum advantage or automatic external truth.

It establishes the audited body contract through which such observation
providers can later connect to the already implemented QCDS intelligence loop.
The locked `QCDS_FABRIC_SPEC_v1.0_*` artifacts remain outside this boundary.
