# QCDS Security Lab

**Author: Patrik Sundblom**  
**Assisted by: ChatGPT (OpenAI AI Assistant)**

QCDS Security Lab is a separately licensed commercial QCDS surface for AI threat modelling, vulnerability discovery, attack-path inference, control-bypass analysis, and recursive verification.

> **Commercial license required.** Public visibility does not grant a right to use, copy, modify, deploy, benchmark, train on, integrate, distribute, or commercialize this material.

## Workspace v1.6

The main workspace follows five questions: the attacker's goal, possible path, control, possible control failure, and evidence. One question is shown at a time. A persistent position indicator keeps the system, path and question visible; Back and Next remain within reach. Question and finding are encoded in the URL, and the last position is kept in session storage.

At question 2 or 4, an inline perspective explorer changes the lens on the same path without navigating elsewhere or changing the saved conditions. Users can explicitly follow another matching finding or inspect a leave-one-fact-out comparison. Plain-English explanations open in a dialog and close back to the same scroll position. Detailed views remain available with an explicit return to the current question.

The QCDS trace now starts with a live walkthrough of the selected finding. It follows the same candidate path through required Conditions, matching perspectives, leave-one-perspective-out rotation, leave-one-fact-out dimension exclusion, recursive control-bypass challenge and the next evidence test. Finding chips switch the walkthrough without leaving the trace. The full oracle, rotation, dimension and chain tables remain below for detailed inspection.

Perspectives are now first-class workspace outputs. STRIDE, OWASP/GenAI, Identity, Agent/Tool Chain, Privacy/Supply Chain and Open Search each have a focused report page with current system signals, matching findings, a rotation-dependence check, Markdown export and browser Print / Save PDF.

Conditions are explicitly ternary: **1 = present, 0 = absent, ? = unknown**. A ? is valid input, not an error. QCDS carries unresolved prerequisites forward as conditional paths so the user can continue exploring without guessing. Evidence binding waits until the required system facts are resolved.

The sidebar now separates **Workflow**, **Learn**, and **Why this result?**. The last section contains Conditions, QCDS trace and Analysis overview so explanatory machinery is distinct from the work and report surfaces.

The default start experience is now **Example journeys**. Four worked cases explain the entire five-question flow before asking the user to configure anything: customer support email, internal document access, invoice approval with a real `?` dependency, and a coding/deployment agent. The first example is expanded by default; the others can preview the complete Goal → Route → Control → Bypass → Proof chain. **Walk the 5 questions** loads a clean copy of that example and keeps a plain-English coaching strip visible through the investigation.

The sidebar becomes a drawer below 1025 CSS pixels, covering both narrow phones and common unfolded Fold widths. A diagnostic fixture at `qa/fold.html` renders the actual application in 360px and 768px frames for layout and navigation checks; it is not part of the product navigation.

Three editable examples cover support, knowledge retrieval and a coding/deployment agent. Each example and the custom system retain their own local state. The Mini AI Interviewer collects a six-question brief; conditions stay Unknown until reviewed. Optional browser-local language model support and the deterministic analysis contract are unchanged.

### Implemented contract

- Eight inspectable candidate rules and six shared lens families.
- Thirteen stable condition IDs, each Yes, No or Unknown. Unknown prerequisites produce questions; explicit No excludes the matching template. No-match is never a safety certification.
- Declared authorization or approval does not establish control effectiveness.
- Rotation reruns the rules with a lens excluded. Dimension exclusion reruns with a declared Yes changed to Unknown. Lens agreement is shared-rule coverage, not independent evidence or demonstrated bias removal.
- Evidence binds to the exact system and lens selection. Changed inputs archive old observations from the current analysis without deleting them from the project.
- Supporting and refuting observations remain visible as a conflict. No record or repeated rule match automatically creates a VERIFIED finding.
- Actions track an owner, progress and next step. Completion does not verify the finding.
- Markdown and JSON export, clipboard, and a printable report with detailed evidence and actions. Imported project data is validated; supplied analysis conclusions are discarded and recalculated.

This browser evaluation does not scan a target, execute Grover amplification or a quantum circuit, run independent agent searches, or automatically perform verification tests. The broader architecture below describes the intended method, not a claim that all architectural capabilities run in this release.

### Run and verify

No application dependencies or build tool are required. Serve the repository root and open `/qcds-security-lab/`:

```sh
python3 -m http.server 8765
node --test qcds-security-lab/tests/engine.test.mjs
```

Use Node 22 for the tests. GitHub Pages copies the HTML, CSS, scripts, engine, documents and SVG assets, and runs contract tests and asset checks before publication.

Project data stays in this browser's localStorage until exported. Export JSON before clearing browser data or changing devices. Evidence references are inert text. Optional local model availability and downloads depend on the browser.

## What this directory introduces

- AI Threat Modeling
- Vulnerability Discovery
- Attack-Surface Mapping
- Parallel Attack-Hypothesis Search
- Rotation / Perspective Exclusion
- Recursive Control-Bypass Analysis
- Compound Attack-Path Discovery
- Evidence Binding and Verification
- Model-agnostic / substrate-independent execution

The goal is not a checklist. The goal is a recursive inference architecture that keeps searching, challenging, rotating, and verifying until the threat picture stabilizes.

A non-specialist can begin with five questions:

> **I am the attacker. I want to ______.**  
> **How would I try?**  
> **What would stop me?**  
> **How could I get around that?**  
> **What would prove the path is real?**

The AI interview turns those answers into QCDS Conditions. Oracles constrain candidate paths. Multiple security frameworks and attacker/defender viewpoints become parallel perspectives. Rotation and dimension exclusion reduce shared bias. Recursive inference then searches threat → control → bypass chains before Truth-Alignment Verification promotes evidence-bound findings.

Detailed documents:
- [METHODOLOGY.md](./METHODOLOGY.md) — end-to-end threat-modeling method
- [PERSPECTIVES.md](./PERSPECTIVES.md) — how STRIDE, OWASP/GenAI, identity, CIA, privacy, supply-chain and open search map into perspective and Oracle families
- [ARCHITECTURE.md](./ARCHITECTURE.md) — core architecture

## QCDS mapping

1. **Condition Formation** — map system, assets, trust boundaries, permissions, inputs and assumptions.
2. **Conditional Evolution** — generate constrained threat and vulnerability hypotheses.
3. **Recursive Inference** — search attack paths, combinations, bypasses and second-order effects.
4. **Truth-Alignment Verification** — require evidence, falsification attempts and stable convergence before a finding is promoted.

## Licensing

Everything newly authored in this directory is governed by [LICENSE.md](./LICENSE.md).

The commercial license is negotiated separately in writing. Attribution alone is not a substitute for a license.

Pre-existing QCDS material that was already released under earlier licenses remains governed by those earlier grants. This directory does **not** revoke prior CC BY 4.0 or MIT permissions already granted for earlier QCDS material. The new Security Lab text, site, architecture extensions, code and implementations in this directory are separately reserved to the extent legally protectable.

Canonical QCDS attribution:
- Patrik Sundblom
- https://github.com/iampathat/QCDS
- https://zenodo.org/records/15455541

## Commercial licensing inquiry

Open an issue in the repository with the title **QCDS Security Lab License Inquiry** to discuss scope, pricing and terms.
