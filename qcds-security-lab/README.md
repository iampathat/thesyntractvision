# QCDS Security Lab

**Author: Patrik Sundblom**  
**Assisted by: ChatGPT (OpenAI)**

QCDS Security Lab is a separately licensed commercial QCDS surface for system security investigation, threat modelling, attack-path inference, control-bypass analysis and evidence-bound verification.

The **target system can be anything**: software, infrastructure, a business process, an API, a network, a machine, an organization, an AI system or another operational system.

LLMs and other predictive models can assist with interpretation, question generation and candidate analysis material. They are **analysis tools**, not the target by default and not the source of truth. Security frameworks such as STRIDE, OWASP/AppSec, Identity, Action/Tool Chain, Privacy/Supply Chain and AI/GenAI are perspectives inside the investigation. QCDS remains in the reasoning loop across conditions, alternatives, perspective rotation, dimension exclusion, recursive control challenge and evidence.

> **Commercial license required.** Public visibility does not grant a right to use, copy, modify, deploy, benchmark, train on, integrate, distribute or commercialize this material.

## Consumer app v1.14.0

Q Security now opens on a focused Home screen. Create personal, business, app or
AI investigations without replacing previous cases. Each case preserves its
place in the five questions. My investigations supports independent copies,
archive/restore and complete workspace backups. Imported projects get new IDs.
Facts start unknown and example evidence is never copied into a personal case.

The web app installs to the home screen and caches its complete local engine,
workers and PDF assets for offline use. Updates require an explicit Update tap.
Android and iOS package the same assets through Capacitor, use native file sharing
and keep their own local workspace. No account or subscription backend is implied.
See [native build and store handoff](./MOBILE_RELEASE.md).

Grover auto-selection uses a 95% target and at most 40 iterations. A noisy mode
selects real density-matrix checkpoints, with explicit work limits and honest
unreachable-target reporting. Eight independent Qiskit/Aer cases verify the
selected circuits. Candidate assignments must appear in the sampled counts and
pass the original oracle. They do not become vulnerability evidence.

## Quantum execution introduced in v1.13.0

**Compare classical, ideal & noisy execution** now compiles the selected
binary oracle into H/X/RZ/CX gates, executes an ideal statevector and a noisy
density matrix, and checks the ideal answer against exact classical counts.
The comparison is inside **Run dimensional inference**, with noise settings
and detailed outcomes folded away. It exports complete comparison JSON,
OpenQASM and a readable report. The simulator is independently checked against
Qiskit 2.1.2 / Aer 0.17.1; no QPU is connected. Limits are 8 ideal / 6 noisy
interacting qubits, with explicit circuit budgets and no silent truncation.
See [QUANTUM_EXECUTION.md](./QUANTUM_EXECUTION.md) for the complete model,
coordinate reduction, resource limits and reproducible verification.

The Q introduction now stays for **3.5 seconds**, with immediate skip and
reduced-motion support.

### Designed reports (introduced in v1.12)

**Download designed PDF** creates an A4 report directly on the device. The
report includes a decision brief, a six-sector radar, framework and category
bar charts, illustrated attack paths, controls and counter-tests, current
evidence, an action register and the complete mechanism register. Radar axes
show retained candidates divided by all candidates in that sector; they are
not security scores. Framework totals can overlap and are labelled as such.
Worked cases label their evidence as synthetic throughout the report.

The same renderer supports focused perspective reports and **Project
Glasswing 1.2.0** exports of its last completed run. Glasswing is available in
the normal navigation and footer, without a floating link over mobile actions.
The local, pinned jsPDF dependency is loaded only when exporting a report.

For release QA, render the browser's PDF in Node with:

```sh
node qcds-security-lab/scripts/render-report.mjs coding output/pdf/QCDS-Coding-Deployment-Report.pdf
node --test qcds-security-lab/tests/*.test.mjs
```

**Run dimensional inference** opens a live workbench for the current system
and its generated attack vectors. It runs exact symbolic mask counts, true
coordinate exclusion, canonical orientation checks, parallel/sequential/hybrid
comparisons, finite ideal-Grover amplification, and user-defined recursive
control predicates. Observations bind to the exact resulting scope; STRIDE
and OWASP project the same changed vector states. The full run and compressed
distributions export as JSON, with a plain-language Markdown report.

The 3.5-second Q Security Lab introduction is built with CSS 3D and SVG.
It has an immediate entry button, reduced-motion behavior and an independent
timeout, so it cannot hold the workspace behind an unfinished animation.

See [DIMENSION_ENGINE.md](./DIMENSION_ENGINE.md) for execution semantics,
the difference between `?` and true absence, and the classical reference's
scope and resource budgets. Project Glasswing also includes the executable
dimensional run in its QCDS track and JSON output.

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

The core facts form a **mask**, not a three-way Cartesian search. Known `1` and `0` values are fixed. Only unresolved `?` dimensions branch. If `k` binary dimensions are unresolved, the logical mask space is `2^k`. The total number of described system dimensions can therefore be 14, 50, 500 or another value without implying `3^n` branching.

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

### Execution scale and quantum path

The browser release runs symbolic classical analysis and small ideal/noisy circuit simulations on the CPU. QCDS architecture can target other substrates, but each requires its own validated encoding and executor.

For large unresolved logical spaces, QCDS can map candidate states onto a quantum basis, apply logical Oracles to mark or phase candidate states, amplify surviving structure and combine **parallel, sequential and hybrid** inference branches before Truth-Alignment Verification. In a quantum representation, `n` qubits expose a `2^n` basis-state space; the QCDS mask and Oracles determine which parts of that space remain relevant.

This document distinguishes the execution architecture from the current browser: it now executes small Grover circuits in local CPU simulation with an explicit noise model. It does not connect to a NISQ device or claim hardware speedup.

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

Each perspective can produce a focused report view and a designed PDF download. Perspective agreement is shared analytical coverage, not independent evidence.

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

The browser release demonstrates this inspectable logic. It can simulate small Grover circuits locally, but does not run autonomous real-world scanning, automatic security verification tests or hardware QPU jobs.

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
node --test qcds-security-lab/tests/glasswing.test.mjs
```

Use Node 22 for the tests.

Project data stays in browser localStorage until exported. Evidence references are inert text. Browser-local model support is optional and depends on browser capabilities.

Detailed documents:

- [METHODOLOGY.md](./METHODOLOGY.md)
- [PERSPECTIVES.md](./PERSPECTIVES.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [LICENSE.md](./LICENSE.md)


## Project Glasswing

**Project Glasswing** is the executable comparison surface for the Security Lab. It runs the same declared system state at three visible inference depths:

- **Single pass** — compact route surfacing.
- **Recursive agent** — route → control → bypass → counter-test.
- **QCDS** — the full condition mask, Attack Vector Fabric, perspective rotation, dimension walking, recursive inference and evidence-bound verification.

Open `/qcds-security-lab/glasswing.html` or use the **Project Glasswing** launcher inside the Lab.

Glasswing is a structural comparison harness, not a vendor-model benchmark. It deliberately separates discovery coverage from verification: more candidate routes or vectors do not by themselves mean more true vulnerabilities.

See [GLASSWING.md](./GLASSWING.md) for the experiment contract.

## Licensing

Everything newly authored in this directory is governed by [LICENSE.md](./LICENSE.md).

Pre-existing QCDS material already released under earlier licenses retains those earlier grants.

Canonical QCDS attribution:

- Patrik Sundblom
- https://github.com/iampathat/QCDS
- https://zenodo.org/records/15455541
