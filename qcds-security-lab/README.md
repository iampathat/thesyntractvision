# QCDS Security Lab

**Author: Patrik Sundblom**  
**Assisted by: ChatGPT (OpenAI AI Assistant)**

QCDS Security Lab is a separately licensed commercial QCDS surface for AI threat modelling, vulnerability discovery, attack-path inference, control-bypass analysis, and recursive verification.

> **Commercial license required.** Public visibility does not grant a right to use, copy, modify, deploy, benchmark, train on, integrate, distribute, or commercialize this material.

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
