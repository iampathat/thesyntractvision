# QCDS Fabric BUILD 9 — semantic ingress / human-to-logic

BUILD 9 implements the first audited bridge from a human problem into the tested
QCDS Fabric reference implementation. The locked **QCDS Fabric v1.0** canonical
artifacts remain unchanged.

## Why this layer is separate

The canonical specification allows trained external models to supply semantic
parsing, proposed Conditions, or candidate oracles, while the core four-phase
inference loop remains inference-first and does not require gradient training or
persistent learned weights.

BUILD 9 therefore separates:

```text
HUMAN LANGUAGE / EXTERNAL DATA
            ↓
     SEMANTIC ANALYZER
            ↓
       SemanticFrame
            ↓
      LOGIC COMPILER
            ↓
 BaseBundle + OracleStack
            ↓
       QCDS FABRIC
            ↓
 TruthDistribution / Syntract
```

A future LLM, ontology engine, scientific parser, sensor translator, or other
semantic frontend can replace the first box by emitting the same `SemanticFrame`
contract. It does not become the QCDS inference kernel.

## Fail-closed rule

BUILD 9 follows one hard rule:

> **Text that is not understood must remain visible as unresolved.**

The compiler does not silently delete a sentence and does not invent a missing
fact, candidate, oracle, or relation to make a problem executable.

If there is no bounded question or no candidate space, the compilation is marked
non-executable and `run_semantic_compilation(...)` fails closed.

## SemanticFrame

The model-independent ingress contract contains:

- mission id;
- original raw text;
- one bounded query;
- source-attributed claims;
- candidate values when supplied explicitly;
- source confidence;
- polarity / negation;
- unresolved text;
- analyzer identity and provenance.

This is deliberately richer than passing a final answer from an LLM into QCDS.
QCDS receives propositions, uncertainty and source structure instead.

## Controlled-English reference analyzer

`ControlledEnglishAnalyzer` proves that raw text can enter the pipeline without
requiring an LLM. Its grammar is intentionally small.

Recognized examples include:

```text
Witness A says the car was red.
Witness B says the car was blue.
What color was the car?
```

Optional source confidence is written as:

```text
Witness A [0.90] says the car was red.
```

Direct statements such as:

```text
The sensor is active.
```

are also recognized, although a bounded question is still required for an
executable human-problem run.

The controlled grammar is **not** presented as unrestricted natural-language
understanding. Unrecognized sentences are retained in `unresolved`.

## Logic compilation

For each semantic property group, candidate values become explicit binary
Conditions. Example:

```text
car.color = red   → sem::car::color::red
car.color = blue  → sem::car::color::blue
```

When a group contains two or more categorical alternatives, a `OneHotOracle`
enforces one selected candidate in the active view.

Source statements become `EvidenceOracle` objects. Evidence is soft by default:

```text
matching claim    → confidence
non-matching      → 1 - confidence
```

A confidence of `1.0` is hard evidence; lower confidence leaves competing states
alive. This lets conflicting witnesses produce a split distribution instead of
an arbitrary winner.

## Contradiction and disagreement

If different positive claims assert different values for the same semantic
group, BUILD 9 records an explicit marker such as:

```text
semantic_disagreement:car::color:blue|red
```

That marker is separate from a kernel-level contradiction such as
`all_candidate_states_rejected`. Semantic disagreement is evidence about the
input; it is not an execution failure.

## Baseline and stabilized answer projections

The semantic layer projects both:

- the pre-diagnostic baseline TruthDistribution;
- the stabilized TruthDistribution after Fabric diagnostics.

onto the candidate dimensions for the human question.

Both are retained because a null/rotation diagnostic is allowed to change a
ranking. The implementation records whether stabilization changed the leading
candidate set rather than hiding the difference.

A leading candidate remains an internal inference result, not automatic external
truth.

## Binding and BUILD 8 handoff

`bind_semantic_result(...)` creates a normal Syntract and preserves:

- compiled dimension ids;
- source/oracle provenance;
- raw text;
- semantic conflicts;
- unresolved language;
- uncertainty-bearing TruthDistribution.

Because the bound Syntract exposes `final_dimension_ids`, it can immediately feed
BUILD 8 expansion:

```text
HUMAN PROBLEM
    ↓
SEMANTIC FRAME
    ↓
CONDITIONS + ORACLES
    ↓
QCDS FABRIC
    ↓
SYNTRACT
    ↓
EXPAND 1 → N
    ↓
TEST → CONTRACT → BIND
```

No second ad-hoc translation step is required between BUILD 9 and BUILD 8.

## What BUILD 9 does not claim

BUILD 9 does **not** claim:

- unrestricted natural-language understanding;
- autonomous discovery of correct world semantics;
- that source confidence is objectively calibrated;
- that a semantic compiler output is external truth;
- AGI or ASI;
- native quantum advantage.

The significant implementation result is narrower and testable: the repository
now has a model-independent, provenance-preserving path from human semantic
inputs into the same Conditions/oracles/Fabric/Syntract machinery used by the
previous BUILDs.

## Main API

```python
SemanticQuery(...)
SemanticClaim(...)
SemanticFrame(...)
ControlledEnglishAnalyzer(...)
compile_semantic_frame(...)
human_to_logic(...)
run_semantic_compilation(...)
bind_semantic_result(...)
run_human_problem(...)
```

---

**Architecture / theory:** Patrik Sundblom  
**Reference implementation assistance:** OpenAI ChatGPT  
**Software:** MIT
