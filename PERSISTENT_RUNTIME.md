# BUILD 15 — Persistent Superintelligence Runtime

BUILD 15 turns the BUILD 0–14 reference implementation into a small restartable
MVP runtime without turning QCDS into the logical robot itself.

The separation is intentional:

```text
LOGICAL ROBOT / OTHER CALLER
          ↓
SuperintelligenceRuntime
          ↓
QCDS BUILD 0–14
          ↓
CsvIntelligenceStore
          ↓
human-readable mission files
```

The logical robot is a body/caller. QCDS remains the intelligence engine.

## Human-readable intelligence store

The first persistence backend is deliberately simple. Each mission gets an
ordinary directory:

```text
intelligence_store/
└── <mission_id>/
    ├── mission.csv
    ├── current_oracles.csv
    ├── oracle_history.csv
    ├── evidence.csv
    └── checkpoints.csv
```

This is an MVP storage choice, not a claim that CSV is an appropriate future
high-performance representation. The storage interface is separate so a future
backend can move closer to FPGA/QPU/accelerator or distributed execution without
changing the logical-robot call boundary.

### `current_oracles.csv`

This is the most important inspection file. It is a snapshot of the active
evolvable oracle population. BUILD 15 keeps the represented rule fields flat:

- oracle id and type;
- active status;
- runtime generation/cycle;
- antecedent dimension;
- consequent dimension;
- logical transform (`implies`, `excludes`, `equivalent`);
- relation class;
- confidence;
- source id;
- persistent stack id and version.

No pickle, Python object dump or opaque `parameters` blob is used for the active
BUILD 15 rule population. The current backend fails closed if an evolvable oracle
type cannot be represented by its explicit CSV schema.

### `oracle_history.csv`

History is append-only. It records initialization and promoted BUILD 11/12
lineage as readable events such as:

```text
INITIAL
GENESIS_PROMOTED
MUTATED
RETIRED
```

with cycle index, local evolution generation, hypothesis/generator identity,
replaced/new oracle ids, resulting challenge identity and challenge suite.

`current_oracles.csv` answers **what the intelligence is using now**.
`oracle_history.csv` answers **how that oracle population got there**.

## Mission and evidence reconstruction

`mission.csv` stores the structured semantic problem frame: queries, claims,
entities, relations, explicit rules, ontology mappings and unresolved material.
Nested metadata is used only where a CSV cell needs to carry a tuple/provenance
value; the active oracle table itself stays flat.

`evidence.csv` preserves externally acquired evidence results and source
identity. `checkpoints.csv` preserves the resumable BUILD 13 control state and
cycle number.

On restart the store:

1. reloads `mission.csv`;
2. recompiles the ordinary BUILD 10 problem;
3. removes the frame's compile-time `SemanticRuleOracle` population;
4. injects the active population from `current_oracles.csv`;
5. retains fixed evidence/one-hot/context oracles from normal compilation;
6. resumes the next QCDS cycle from the persisted mission state.

This keeps persistence outside the QCDS canonical semantics.

## Callable runtime

`SuperintelligenceRuntime` exposes the small boundary needed by a logical robot
or another system:

```python
store = CsvIntelligenceStore("./intelligence_store")
runtime = SuperintelligenceRuntime(store)

runtime.create_mission(frame)
step = runtime.step("mission-1", challenge_suite)

# An external logical robot can inspect step.cycle.plans, acquire evidence,
# then call back into the same intelligence:
runtime.observe("mission-1", evidence_results)
step2 = runtime.step("mission-1", challenge_suite)
```

The robot therefore does not need to know how Fabric, nulling, stabilization,
oracle genesis, challenge or persistence are implemented.

BUILD 15 also provides `run_logical_robot_once(...)` as a convenience proof of
the complete boundary:

```text
runtime.step
   ↓
BUILD 13 EvidencePlan
   ↓
BUILD 14 LogicalRobotTool(s)
   ↓
source-attributed observations
   ↓
runtime.observe
   ↓
runtime.step
```

Real logical robots can instead call `step()` and `observe()` independently.

## Restart test

The MVP regression suite explicitly checks:

```text
create mission
→ QCDS discovers/promotes oracle
→ write CSV state
→ destroy runtime object
→ create new runtime on same directory
→ reconstruct active oracle population
→ preserve evidence/checkpoint cycle
→ continue
```

The current oracle snapshot is overwritten atomically as a snapshot; history,
evidence and checkpoints remain append-oriented audit files.

## Persistent versioning

BUILD 11's internal generation numbering is local to an evolution call. BUILD 15
therefore gives the persisted runtime population its own monotonic version chain.
A successful runtime promotion extends the prior persisted version with the
runtime cycle and promotion count. A no-change cycle preserves the previous
persistent population identity instead of resetting it merely because the QCDS
process was restarted.

## What is not claimed

BUILD 15 does not claim that CSV is scalable storage, that an oracle must be
represented as a software row in a future implementation, or that persisted
oracles are automatically true. It does not grant the logical robot arbitrary
external action rights and does not change the locked QCDS Fabric v1.0 canon.

The persistent representation is an inspectable MVP implementation boundary.
Future oracle execution may use quantum circuits, FPGA logic, accelerator memory
or other substrates while retaining the same higher-level provenance and runtime
contract where appropriate.
