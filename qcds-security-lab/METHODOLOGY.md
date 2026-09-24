# QCDS Security Lab — Threat Modelling Method

**Author: Patrik Sundblom**

## Start with human language

The entry point is deliberately simple.

> **I am the attacker. I want to ______.**  
> **How would I try?**  
> **What would stop me?**  
> **How could I get around that control?**  
> **What evidence would support or refute the path?**

A non-specialist should be able to begin without knowing STRIDE, ATT&CK, OWASP or security taxonomy.

The target may be any system. Optional LLM or predictive-model assistance can help turn a plain-language description into candidate questions and structure. It does not decide which facts are true.

## The description becomes Conditions

The investigation asks questions such as:

- What are you building or operating?
- Who or what can reach it?
- What enters the system?
- Who controls that input?
- What information can be read or changed?
- What connected interfaces, services, APIs, actuators or components can be invoked?
- Which identities, roles and permissions exist?
- What is sensitive, safety-relevant or consequential?
- Which third parties or connected sources are trusted?
- Which actions require a human?
- Can the human independently verify the underlying source and exact action?
- What logging, containment, rollback and recovery exist?
- Does the **target system itself** contain AI/ML?

Each answer creates or refines a **Condition**.

In v1.10, the interview can form condition proposals from the user's own words. Each inferred value carries a reason and confidence marker. The user can override it. Values that cannot be supported remain **?**; they are not converted to No. Those unknowns are ranked by how many surviving conditional routes depend on them, producing the next clarification queue.

Conditions are ternary:

- **1** = present
- **0** = absent
- **?** = unresolved

Examples for a conventional web portal:

~~~text
C1  External users can submit input
C2  Some input is lower-trust
C3  No connected data source is used
C4  Personal records are reachable
C5  Many principals share the service boundary
C6  Connected APIs/actions exist
C9  Authorization is enforced at the resource boundary
C12 Security-relevant activity is logged
C14 The target itself does not contain AI/ML
~~~

For an AI-enabled target, C14 becomes 1 and the AI / GenAI perspective can become applicable.

The core Conditions define compact coordinates in the observable problem space. They are not the conclusion **and they are not the attack-vector list**.

After Condition Formation, QCDS expands attack mechanisms across route variants, targets and modeled assets. The resulting vector fabric is constrained by the current 1 / 0 / ? state. A vector whose required facts contain `?` remains **conditional** rather than being guessed away.

## Model-assisted analysis

A language model or another predictive model may assist with:

- clarifying the system description;
- suggesting candidate Conditions;
- proposing questions;
- generating possible paths to investigate;
- producing material for STRIDE, OWASP/AppSec, Identity and other perspectives;
- summarizing evidence already supplied by the user.

Model output remains **candidate analytical material**. QCDS and the evidence workflow are what keep that material constrained, compared, challenged and testable.

## Oracles

An **Oracle** is a constraint, test or evidence function applied to candidate paths.

It can ask questions such as:

- Does this path cross a trust boundary?
- Does lower-trust input gain higher trust?
- Does the path require authority the actor does not possess?
- Can the proposed control be independently verified?
- Is there evidence that the component exposes the claimed capability?
- Does another control block the route?
- Can the same outcome be reached another way?
- Does the hypothesis survive a changed perspective?

An Oracle may reject, retain, weight or narrow candidate paths.

A framework can supply Oracle families, but no framework owns the search.

## Attack Vector Fabric

The Security Lab separates **system facts** from **attack vectors**.

~~~text
C1..Cn CORE FACTS
     ↓
mechanism × entry boundary × route variant × target × asset × consequence
     ↓
ATTACK-VECTOR FABRIC
     ↓
1 / 0 / ? constraints
     ↓
surviving active + conditional vectors
~~~

The browser ships with a finite mechanism catalog plus an Open Search lattice. The latter expands with the modeled system, so the vector count is not a fixed “14”, “140” or other universal number.

A larger catalog, architecture graph, code model, imported security corpus or model-assisted candidate generator can feed additional vector material into the same QCDS loop. The inference architecture is not tied to the present browser catalog.

## Perspective lenses are projections, not the engine

QCDS can instantiate many parallel perspectives over the same surviving vector fabric. A framework does not receive four private C-values; it receives the vector instances relevant to its categories and questions.

| Perspective lens | Example questions it contributes |
|---|---|
| STRIDE | Can identity be spoofed? Can information be altered or exposed? Can service be denied? Can privilege be elevated? |
| OWASP / AppSec | Where can application input, business logic, interfaces, data handling or trust boundaries fail? |
| Identity / privilege | Where does authority expand, confuse or cross principals? |
| Action / Tool Chain | What connected component can cause the next consequential action, and with whose authority? |
| Privacy / Supply Chain | Which data, provider or dependency can become the weak link? |
| AI / GenAI | If the target uses AI/ML, where can model context, generated output, retrieval or model-influenced actions cross a boundary? |
| CIA | What breaks confidentiality, integrity or availability? |
| ATT&CK-like technique view | Which known adversary techniques resemble this path? |
| Insider | What can a legitimate but malicious or careless user do? |
| Recovery | Can the system detect, contain, undo and learn from failure? |
| Open Search | What plausible path is not represented by any named framework? |

STRIDE is **one perspective**, not the boundary of the threat model.

The AI / GenAI lens is a specialized target-dependent perspective. Using an LLM to assist the analysis does not make this lens automatically applicable.

## Parallel inference

Different branches are allowed to disagree.

~~~text
                 SAME SYSTEM
                      │
      ┌───────────────┼────────────────┐
      ▼               ▼                ▼
 Application       Identity /        Action /
 security          privilege         tool chain
      │               │                │
      └───────────────┼────────────────┘
                      ▼
              cross-examination
~~~

One branch may emphasize input handling. Another may show that the real issue is identity. A third may find that the action boundary already blocks the route.

The disagreement is useful.

## Rotation and dimension exclusion

If every branch starts from the same assumptions, parallelism can reproduce the same bias.

QCDS therefore changes perspective and can temporarily alter one dimension for comparison.

~~~text
Run A: all applicable perspectives
Run B: remove OWASP / AppSec
Run C: remove Identity
Run D: remove Action / Tool Chain
Run E: start from the consequence instead of the attack technique
Run F: set one declared fact to ? for a comparison
~~~

These operations answer different questions:

- **Perspective rotation:** does the result depend on this lens?
- **Dimension exclusion:** does the result depend on this system fact?

## Sequential deepening

Promising paths are then narrowed.

~~~text
THREAT / FAILURE
  ↓
ROUTE
  ↓
REQUIRED CONDITIONS
  ↓
CONTROL
  ↓
CAN THE CONTROL FAIL?
  ↓
BYPASS PATH
  ↓
SECOND CONTROL
  ↓
COUNTER-TEST
  ↓
EVIDENCE
~~~

The process continues recursively.

The system should not stop merely because it found a mitigation.

The next question is:

> **What has to be true for this mitigation to fail?**

## The four QCDS phases

### 1. Condition Formation

Turn descriptions, architecture, code, permissions, flows, observations and assumptions into explicit Conditions.

### 2. Conditional Evolution

Apply Oracles and perspective families to generate and constrain candidate paths.

### 3. Recursive Inference

Deepen retained paths, search combinations, rotate perspectives, alter dimensions for comparison, challenge mitigations and generate bypass hypotheses.

### 4. Truth-Alignment Verification

Bind surviving claims to evidence, counter-tests and reproducible conditions. Findings that do not survive challenge are downgraded or rejected.

## Convergence

The objective is not "the model produced a list."

The objective is a state where perspective rotation, counter-testing and recursive search produce diminishing material novelty and the surviving claims are evidence-bound.

~~~text
SYSTEM
  ↓
DESCRIPTION / CODE / OBSERVATIONS
  ↓
OPTIONAL MODEL-ASSISTED ANALYSIS
  ↓
CORE CONDITIONS 1 / 0 / ?
  ↓
ATTACK-VECTOR FABRIC
  ↓
ORACLES
  ↓
PARALLEL PERSPECTIVE PROJECTIONS
  ↕
QCDS ROTATION / DIMENSION EXCLUSION
  ↓
SEQUENTIAL DEEPENING
  ↓
RECURSIVE ROUTE ↔ CONTROL SEARCH
  ↓
EVIDENCE + FALSIFICATION
  ↓
SCOPED, INSPECTABLE RESULT
~~~

## The output

A useful QCDS threat model should preserve:

- the system fact that created the concern;
- the route;
- the Conditions required for the route;
- the perspective(s) that surfaced it;
- the Oracles that retained or rejected it;
- the control and bypass attempts;
- the evidence;
- the counter-evidence;
- unresolved questions;
- the next test required.

That makes the result inspectable by both specialists and non-specialists.

## License

This document is part of QCDS Security Lab and is governed by [LICENSE.md](./LICENSE.md).
