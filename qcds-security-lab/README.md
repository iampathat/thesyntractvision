# QCDS Security Lab

**Author: Patrik Sundblom**  
**Assisted by: ChatGPT (OpenAI)**

QCDS Security Lab is a separately licensed commercial QCDS surface for system security investigation, threat modelling, attack-path inference, control-bypass analysis and evidence-bound verification.

The **target system can be anything**: software, infrastructure, a business process, an API, a network, a machine, an organization, an AI system or another operational system.

LLMs and other predictive models can assist with interpretation, question generation and candidate analysis material. They are **analysis tools**, not the target by default and not the source of truth. Security frameworks such as STRIDE, OWASP/AppSec, Identity, Action/Tool Chain, Privacy/Supply Chain and AI/GenAI are perspectives inside the investigation. QCDS remains in the reasoning loop across conditions, alternatives, perspective rotation, dimension exclusion, recursive control challenge and evidence.

> **Commercial license required.** Public visibility does not grant a right to use, copy, modify, deploy, benchmark, train on, integrate, distribute or commercialize this material.

## Workspace v1.10

The workspace follows five human-facing questions:

1. What unwanted outcome are we investigating?
2. How could it happen?
3. What should stop it?
4. How could that protection fail?
5. What would support or refute the path?

The user does not need to know QCDS or a security framework to start.

### Core Conditions are constraints — not the attack catalog

The browser keeps fourteen stable **core system conditions** as compact starting coordinates:

- **1** = present / known true
- **0** = absent / known false
- **?** = unresolved

A question mark is valid input. Interview answers can form condition proposals with a visible reason and confidence marker.

These C-values are **not fourteen attack vectors** and they do not define the size of the security search. They constrain a separate generated **Attack Vector Fabric**.

With fourteen ternary core dimensions there are `3^14 = 4,782,969` possible core assignments. A run evaluates the current target state and QCDS counterfactuals rather than claiming that all 4.78 million assignments were brute-forced.

### Attack Vector Fabric

v1.10 adds a separate vector layer:

~~~text
CORE SYSTEM FACTS 1 / 0 / ?
        ↓ constraints
ATTACK MECHANISMS
        × route variants
        × target surfaces
        × modeled assets
        ↓
GENERATED ATTACK-VECTOR FABRIC
        ↓ QCDS pruning / uncertainty
ACTIVE + CONDITIONAL VECTORS
        ↓
STRIDE / OWASP / IDENTITY / ... projections
        ↓
CONVERGED ROUTE CLUSTERS
        ↓
CONTROL → BYPASS → COUNTER-TEST → EVIDENCE
~~~

The built-in catalog contains multiple attack-mechanism seeds and a system-specific **Open Search lattice**. The lattice expands over modeled entry boundaries, assets, consequences and route variants, so a larger modeled system produces a larger vector space.

For example, the current Customer Records Portal generates **more than 500 attack-vector candidates** from its modeled assets and boundaries before current constraints reject or retain them.

The catalog is extensible and finite. It is an implementation surface for QCDS, not a claim that a fixed number of vectors defines the theoretical QCDS search space.

### Perspectives are projections over the vector fabric

Current perspective families are:

- STRIDE
- OWASP / AppSec
- Identity
- Action / Tool Chain
- Privacy / Supply Chain
- AI / GenAI
- Open Search

AI / GenAI is active only when the target system is declared to contain AI/ML. A conventional portal, process or service is not silently treated as an AI system.

Each perspective now projects the **same surviving attack-vector fabric** into its own categories. OWASP/AppSec, for example, can show hundreds of vector instances across OWASP Top 10:2025 and OWASP API Security Top 10:2023 categories instead of displaying four C-values as if they were the attack space.

Each perspective can produce a focused report view and Print / Save PDF output. Perspective agreement is shared analytical coverage, not independent evidence.

### Worked examples

Worked examples are continuous workspaces, not a separate tutorial surface. Loading one keeps the same system selected through the complete product:

1. Goal
2. Route
3. Control
4. Bypass
5. Proof
6. System & 1 / 0 / ? inputs
7. Perspectives
8. Results & explanation
9. Reports & export

The first case is deliberately a conventional non-AI customer records portal. Additional examples include AI-assisted support, internal knowledge access, invoice approval with a real `?` dependency and a coding/deployment agent.

Portal, support, knowledge and coding include clearly labelled **synthetic worked-example evidence** so Proof, Results and Report are populated. Invoice intentionally remains conditional to demonstrate how unresolved context should look.

### Navigation

The sidebar now makes the hierarchy explicit:

- **Start here** — the currently loaded worked example or a chooser
- **The 5-step flow** — Goal, Route, Control, Bypass, Proof as direct links
- **Explore the same example/system** — inputs, perspectives, results, report
- **Learn** — plain-English method

The example is the data being worked on; it is not a disconnected menu section.

### QCDS trace

The trace follows the same candidate route through:

- Condition Formation
- Conditional Evolution
- perspective rotation
- dimension exclusion
- Recursive Inference
- control → bypass challenge
- Truth-Alignment Verification

The browser release demonstrates this inspectable logic. It does not execute Grover amplification, autonomous real-world scanning or automatic verification tests.

## Implemented contract

- Fourteen ternary **core system conditions** used as starting constraints, with interview-to-condition formation and provenance for inferred values.
- A separate generated **Attack Vector Fabric** expanded from attack mechanisms across route variants, target surfaces and modeled assets.
- A system-specific Open Search lattice that makes the candidate count grow with the modeled asset/boundary surface rather than remaining a fixed list.
- Active, conditional and rejected attack-vector states under the current ternary constraints.
- Eight high-level route families retained as **convergence / investigation clusters**, not as the full attack catalog.
- Seven perspective families, including a target-specific AI / GenAI lens, each projecting the same vector fabric into framework categories.
- A ranked clarification queue generated from the ? conditions that affect surviving routes.
- Perspective rotation reruns the surviving route space with one lens excluded.
- Dimension walking changes one declared 1 to ? and records which routes become weaker, remain stable or disappear.
- Recursive branches carry each surviving route through conditions → control → bypass → counter-test.
- Evidence binds only to active routes and to the exact system snapshot and perspective selection.
- Changed inputs archive prior observations from the current analysis without deleting them.
- Supporting and refuting observations remain visible as conflicts.
- Actions can track owner, status and next control/counter-test.
- Markdown, JSON and printable report export are supported.
- Imported projects are validated and conclusions are recalculated.

## What models do here

A language model or predictive model can help:

- interpret a plain-language system description;
- suggest candidate system facts;
- suggest questions and possible routes;
- generate material for STRIDE, OWASP/AppSec or other perspectives;
- help organize an investigation.

It does **not** automatically establish that a threat is real. QCDS keeps candidate routes, uncertainty, controls and perspective changes in the loop until claims can be connected to observations and tests.

## QCDS mapping

1. **Condition Formation** — map system facts, assets, actors, boundaries, permissions, inputs and assumptions.
2. **Conditional Evolution** — apply Oracles and perspectives to generate and constrain candidate paths.
3. **Recursive Inference** — deepen paths, rotate perspectives, exclude dimensions and challenge controls.
4. **Truth-Alignment Verification** — bind surviving claims to evidence, counter-tests and scoped conclusions.

## Run and verify

No application dependencies or build tool are required. Serve the repository root and open `/qcds-security-lab/`:

```sh
python3 -m http.server 8765
node --test qcds-security-lab/tests/engine.test.mjs
```

Use Node 22 for the tests.

Project data stays in browser localStorage until exported. Evidence references are inert text. Browser-local model support is optional and depends on browser capabilities.

Detailed documents:

- [METHODOLOGY.md](./METHODOLOGY.md)
- [PERSPECTIVES.md](./PERSPECTIVES.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [LICENSE.md](./LICENSE.md)

## Licensing

Everything newly authored in this directory is governed by [LICENSE.md](./LICENSE.md).

Pre-existing QCDS material already released under earlier licenses retains those earlier grants.

Canonical QCDS attribution:

- Patrik Sundblom
- https://github.com/iampathat/QCDS
- https://zenodo.org/records/15455541
