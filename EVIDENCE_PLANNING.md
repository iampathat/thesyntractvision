# BUILD 13 — Autonomous Experiment / Evidence Acquisition Planning

BUILD 13 adds a bounded **evidence acquisition planning + resumable intelligence
loop** around BUILD 12 oracle genesis. It does not modify the locked QCDS Fabric
v1.0 canon.

The key design rule is that **a stalled inference cycle is not a permanent stop**.
`no_oracle_gaps`, `no_promotable_hypotheses`, or a lack of sufficiently useful
experiments are checkpoint states. They remain resumable when new evidence, a
new failure observation, an expansion result, an oracle-population change, or an
explicit manual resume arrives.

Only an explicit caller request can create a terminal checkpoint.

## Executable loop

```text
PROBLEM / SYNTRACT
       ↓
QCDS INFERENCE
       ↓
ORACLE GAP DISCOVERY                     BUILD 12
       ↓
RIVAL ORACLE HYPOTHESES
       ↓
BUILD 11 CHALLENGE
       ↓
PROMOTE? ── yes ──→ RE-INJECT → INFER → next cycle
   │
   no
   ↓
HYPOTHESIS DISAGREEMENT ANALYSIS         BUILD 13
   ↓
INFORMATION NEED
   ↓
EVIDENCE / EXPERIMENT PLAN
   ↓
AWAITING EVIDENCE CHECKPOINT
   ↓
NEW OBSERVATION / EXPERIMENT RESULT
   ↓
SOURCE-ATTRIBUTED EVIDENCE INGESTION
   ↓
RECOMPILE → QCDS → GENESIS → CHALLENGE
   ↺
```

## No answer leakage into planning

The default `DisagreementEvidencePlanner` does **not** receive an
`OracleChallengeSuite` or any target distribution. It receives only:

- the current compiled problem;
- a discovered target-blind `OracleGap`;
- the current evolvable oracle population;
- already-generated oracle hypotheses;
- the ordinary Fabric substrate used to compare their predictions.

It runs the current population and candidate populations under the same current
evidence and measures where their predicted query distributions disagree. The
query with the strongest mean pairwise L1 disagreement becomes the highest-value
place to acquire new evidence.

The resulting `EvidencePlan` contains no expected answer and no target state.
It asks what should be observed, measured, replicated, validated or queried —
not what the result should be.

## Planning actions

The bounded reference planner emits structured actions such as:

- `independent_observation` for prediction failures;
- `validation_experiment` for failed expansion branches;
- `replicate_measurement` for contradiction-resolution gaps;
- `dimension_probe` for strong null-influence diagnostics;
- `targeted_query` as a generic fallback.

An `EvidenceAction` records the affected queries/dimensions, objective,
expected discrimination score, source-independence requirement and execution
authorization requirement.

BUILD 13 **plans** actions. It does not automatically operate laboratory,
physical, financial, medical or other external systems. An external executor can
consume the plan under its own authorization and safety policy.

## Evidence ingestion

`EvidenceAcquisitionResult` represents an externally obtained result with:

- result id;
- query id;
- observed value;
- source id;
- confidence;
- polarity;
- provenance.

`apply_evidence_results(...)` converts valid results into ordinary
source-attributed `SemanticClaim` evidence and recompiles the problem. BUILD 13
only accepts values already represented in the current query candidate set. A
new semantic value must go through semantic/expansion handling rather than being
silently inserted into the logical space.

## Resumable checkpoints

`IntelligenceCheckpoint.status` is one of:

- `active` — the oracle population changed; another inference/discovery cycle is useful;
- `awaiting_evidence` — an explicit discriminating evidence plan exists;
- `quiescent` — no useful action is currently available, but the state is resumable;
- `terminal` — only when explicitly requested by the caller.

Non-terminal checkpoints always expose resume triggers. The default policy
includes:

```text
new_evidence
new_failure_observation
new_expansion_result
oracle_population_change
manual_resume
```

The default policy also refuses to busy-loop on an unchanged state. Resume
requires a new trigger/evidence item or `force_replan=True`. This prevents both
failure modes: permanent lock-up and meaningless infinite self-repetition.

## Claim boundary

BUILD 13 establishes a tested path for **autonomous information-need detection,
experiment/evidence planning, evidence ingestion, and resumable inference**.

It does not establish unrestricted autonomous experimentation, automatic access
to external systems, guaranteed optimal experimental design, universal causal
discovery, unrestricted self-modification, AGI/ASI, quantum advantage, or
automatic external truth.

A plan can be poor. New evidence can be misleading. An oracle can pass a weak
challenge corpus and still be wrong. Those failure modes remain explicit and
falsifiable.

The locked `QCDS_FABRIC_SPEC_v1.0_*` artifacts remain outside the mutation
boundary.