# QCDS Fabric BUILD 10 — problem-to-Syntract

BUILD 10 extends the BUILD 9 human-to-logic boundary from one bounded semantic
question to a **joint multi-query problem space**. It does not modify the locked
QCDS Fabric v1.0 canonical artifacts.

## Why this BUILD exists

BUILD 9 proved that a human statement can be translated into explicit candidate
dimensions and source-attributed evidence oracles without making the language
parser part of QCDS itself.

BUILD 10 asks the next question:

> Can multiple questions, entities, relations and explicit cross-query rules be
> compiled into one shared Condition space and then bound into one auditable
> Syntract?

The reference path is:

```text
HUMAN / EXTERNAL MODEL / DOMAIN PARSER
                ↓
       SemanticProblemFrame
 entities · queries · claims · relations · rules
 ontology map · unresolved · provenance
                ↓
       canonicalize ontology terms
                ↓
  JOINT CONDITIONS + ORACLE STACK
                ↓
             QCDS FABRIC
                ↓
       JOINT TruthDistribution
          ↙       ↓       ↘
      query A   query B   query C ...
          ↘       ↓       ↙
          PROBLEM SYNTRACT
                ↓
         re-entry / expansion
```

## Joint multi-query logical space

Each categorical query group receives explicit candidate dimensions. Independent
query groups occupy the same local binary space.

For two questions with two candidates each:

```text
car::color      = red | blue
driver::identity = alice | bob

joint compiled width = 4 binary dimensions
joint candidate basis = 2^4
```

The one-hot oracle for each categorical group removes states that select zero or
multiple candidates inside that group. The QCDS Fabric then evaluates the joint
space under all active evidence and rule oracles.

This differs from running two independent BUILD 9 calls: BUILD 10 allows an
explicit rule to couple the groups before inference.

## Entities and relations

`SemanticEntity` is a provenance-bearing registry entry. It can represent a
person, object, sample, event, organization, location or other domain entity.

`SemanticRelation(subject, predicate, object, ...)` is compiled as an explicit
source-attributed proposition. For example:

```text
car --location--> warehouse
```

becomes a candidate proposition in the same logical machinery and its source
confidence becomes an `EvidenceOracle` weight. Relations can be marked
`relational`, `causal` or `temporal`, and optional temporal context is preserved
in the resulting Syntract.

The relation label itself is supplied by the semantic adapter. BUILD 10 does not
pretend to infer an ontology from the word alone.

## Cross-query rules

`SemanticRule` connects two explicit proposition atoms.

Supported rule transforms are deliberately small and auditable:

- `implies`: `A -> B`
- `excludes`: not `(A and B)`
- `equivalent`: `A == B`

Each rule is separately classified as:

- `logical`
- `causal`
- `temporal`

The class records semantic provenance. The `kind` defines the exact transform
actually executed by QCDS.

Example:

```text
IF car::color::red
THEN driver::identity::alice
kind = implies
relation_class = causal
```

A causal label therefore never gives the implementation permission to invent a
causal mechanism. The adapter must provide the explicit antecedent, consequent
and logical transform.

## Ontology mapping

`OntologyMap` provides an explicit translation layer for subject, predicate and
value aliases.

Example:

```text
automobile -> car
colour     -> color
scarlet    -> red
```

The compiler records every applied mapping. If an entity registry is supplied,
subject mapping targets must resolve to declared entity IDs or compilation fails
closed.

Ontology mapping is normalization/provenance, not truth inference.

## Partial executability

A large problem can contain multiple queries. BUILD 10 does not force the whole
problem to fail merely because one query lacks explicit candidates.

Instead:

- executable queries run in the joint space;
- blocked queries remain in `blocked_queries` with an explicit reason;
- unresolved semantic material is retained;
- nothing is invented to make a blocked query executable.

If no query is executable, inference fails closed.

## External semantic adapter boundary

`SemanticProblemAdapter` is a model-independent protocol:

```python
class SemanticProblemAdapter(Protocol):
    adapter_id: str
    def analyze_problem(self, text: str, *, mission_id: str) -> SemanticProblemFrame: ...
```

A future LLM, scientific parser, sensor compiler, ontology service or mission
specific frontend may implement this interface.

The adapter may propose structure. It does **not** become the QCDS inference
kernel and its output is not treated as external truth.

`run_problem_text(...)` validates that the adapter actually returns a
`SemanticProblemFrame` before compilation.

## Contradiction handling

BUILD 10 keeps semantic contradiction visible.

It records at least:

- multiple positive values asserted for one categorical group;
- positive and negative evidence for the same proposition;
- Fabric-level `all_candidate_states_rejected` when active hard constraints
  eliminate the complete represented state space.

Contradiction is therefore state/provenance, not a parser exception to hide.

## Syntract binding

The bound problem Syntract retains:

- the complete stabilized TruthDistribution;
- final dimension identities;
- query-group mapping;
- entity registry;
- relations and temporal context;
- logical/causal/temporal rules;
- ontology identity and applied mappings;
- blocked queries;
- unresolved language;
- semantic and Fabric contradiction markers;
- oracle-stack identity.

No query is silently collapsed to one answer during binding.

The resulting Syntract can enter the existing BUILD 3 re-entry path or BUILD 8
`1 -> N` expansion path without semantic retranslation.

## What BUILD 10 does not claim

BUILD 10 does **not** claim:

- unrestricted natural-language understanding;
- autonomous ontology discovery;
- that an LLM-generated frame is correct because it is syntactically valid;
- complete temporal logic or causal discovery;
- automatic external truth;
- AGI/ASI;
- quantum advantage.

It establishes a falsifiable interface where richer semantic systems can propose
structured problems while QCDS continues to perform explicit oracle-constrained
inference over the resulting Condition space.

## Main API

```python
SemanticEntity(...)
ProblemQuery(...)
SemanticRelation(...)
SemanticAtom(...)
SemanticRule(...)
OntologyMap(...)
SemanticProblemFrame(...)
compile_problem_frame(...)
run_problem_compilation(...)
bind_problem_result(...)
problem_to_syntract(...)
run_problem_text(...)
```

---

**Architecture / theory:** Patrik Sundblom  
**Reference implementation assistance:** OpenAI ChatGPT  
**Software:** MIT
