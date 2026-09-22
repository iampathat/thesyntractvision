# QCDS Security Lab

**Author: Patrik Sundblom**  
**Assisted by: ChatGPT (OpenAI AI Assistant)**

QCDS Security Lab is a separately licensed commercial QCDS surface for AI threat modelling, vulnerability discovery, attack-path inference, control-bypass analysis, and recursive verification.

> **Commercial license required.** Public visibility does not grant a right to use, copy, modify, deploy, benchmark, train on, integrate, distribute, or commercialize this material.

## Workspace v1.0

Six connected views replace the long landing page: Overview, System & conditions, Findings & evidence, QCDS trace, Report & export, and How it works.

Three editable examples cover customer support, read-only knowledge retrieval and a coding/deployment agent. Each example and the custom system retain their own local state. The Mini AI Interviewer collects a six-question brief; conditions remain Unknown until explicitly reviewed. A compatible browser can optionally provide its local language model through the [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api). Guided mode works without a language model, API key or cloud inference service.

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
