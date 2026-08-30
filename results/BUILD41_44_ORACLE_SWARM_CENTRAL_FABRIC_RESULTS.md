# Builds 41–44 — Oracle-space, swarm and central QCDS fabric

These builds are additive. They do **not** modify the canonical QCDS four-phase architecture:

1. Condition Formation
2. Conditional Evolution
3. Recursive Inference
4. Truth-Alignment / Syntract Binding

They also do not move QCDS semantics into Logical Robot bodies, browsers, swarm coordination, or host topology.

## Build 41 — Architecture and regression hardening

Implemented:

- architecture guard tests for all four QCDS phases;
- guard that the root README retains its Mermaid architecture diagrams;
- guard that `Logical Robot does not contain QCDS. Logical Robot talks to QCDS.` remains visible;
- exact classical reuse for mathematically invariant position/oracle-order rotations while preserving every rotation view and every candidate state;
- CI stale-run cleanup;
- deterministic four-way pytest sharding after a fast Build 41–44 architecture smoke gate.

No Logical Space is pruned by the CI/performance work. It removes redundant classical recomputation only.

## Build 42 — Central / session / external oracle-space topology

Implemented in `src/qcds_fabric/oracle_space.py`.

A Logical Universe may be manifested by the same `BaseBundle + OracleStack` contract on different hosts:

```text
session/browser ─┐
external robot ──┼─► transferable oracle-space contract
lab/runtime ─────┘
                         ↓
                   central host
                         ↓
                     QCDS Fabric
```

Host kinds are `session`, `external`, and `central`. Rehosting preserves:

- Logical Universe identity;
- BaseBundle identity;
- OracleStack identity;
- source provenance;
- Syntract references.

Transfer explicitly records that it does not promote truth and does not modify QCDS semantics.

## Build 43 — QCDS-driven swarm intelligence

Implemented in `src/qcds_fabric/swarm_intelligence.py`.

The swarm is driven from a QCDS `TruthDistribution`. Live dimensions are ranked by uncertainty and become bounded frontier tasks for Logical Robots. Robot results return as source-attributed oracle manifestations.

```text
TruthDistribution
      ↓
uncertain live dimensions
      ↓
Logical Robot work
      ↓
evidence / falsification / verification / alternative oracle
      ↓
SwarmOraclePacket
      ↓
OracleStack re-entry
      ↓
SAME QCDS Fabric
      ↓
new TruthDistribution / Syntract
```

Majority voting is explicitly not used. Cross-universe packets fail closed.

## Build 44 — Central high-capacity QCDS Fabric

Implemented in `src/qcds_fabric/central_fabric.py`.

`CentralQCDSFabric` mounts multiple oracle spaces and delegates every inference run to the unchanged `FabricLayer`.

Supported execution topology:

- **parallel** — independent oracle spaces execute concurrently;
- **sequential** — a prior TruthDistribution is re-entered through `DistributionOracle` when canonical dimensions and Logical Universe identity are compatible;
- **hybrid** — sequential lanes execute concurrently.

The central fabric does not silently merge incompatible universes or invent semantic mappings. Different dimension spaces require an explicit QCDS/Syntract semantic expansion/re-entry mapping rather than an infrastructure shortcut.

## Architecture boundary

```text
LOGIC
  ↓
ORACLES / EMULATED ORACLES
  ↓
QCDS (canonical four phases)
  ↓
TruthDistribution
  ↓
Syntract
  ↓
Logical Robot / swarm / external action
  ↓
new evidence or oracle manifestations
  ↺
```

Centralization is an execution/capacity topology. It is not a replacement for oracle semantics, QCDS, Logical Spaces, or Syntract.
