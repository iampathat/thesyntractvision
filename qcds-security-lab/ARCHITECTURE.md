# QCDS Security Lab — Architecture

**Author: Patrik Sundblom**

## Purpose

QCDS Security Lab treats AI security as a search-and-verification problem rather than a static checklist.

The core object is the **observable threat space**: system components, data flows, trust boundaries, identities, permissions, tools, model context, external inputs, controls and assumptions.

## Discovery loop

```text
PLAIN-LANGUAGE INTERVIEW / CODE / ARCHITECTURE / EVIDENCE
                           ↓
                    CONDITIONS
                           ↓
               ORACLES / CONSTRAINTS
                           ↓
              ATTACK-SURFACE GRAPH
                           ↓
              PARALLEL PERSPECTIVES
                           ↓
          ROTATION / DIMENSION EXCLUSION
                           ↓
               ATTACK-PATH INFERENCE
                           ↓
                 CONTROL / MITIGATION
                           ↓
               BYPASS / FAILURE SEARCH
                           ↓
                RECURSIVE INFERENCE
                           ↓
             EVIDENCE + FALSIFICATION
                           ↓
          TRUTH-ALIGNMENT / STABILIZATION
```

The human-facing entry point is intentionally simple:

> I am the attacker. I want to ______.  
> How would I try?  
> What would stop me?  
> How could I bypass that?  
> What would prove the path is real?

The AI interviewer converts the answers into explicit Conditions. Oracles then test candidate paths. Parallel perspectives generate competing hypotheses. Rotation and dimension exclusion reduce shared bias. Recursive inference challenges controls and searches for bypasses. Truth-Alignment Verification binds the surviving findings to evidence.

See [METHODOLOGY.md](./METHODOLOGY.md) for the full flow and [PERSPECTIVES.md](./PERSPECTIVES.md) for the framework-to-Oracle mapping.

## Conditions, Oracles and perspectives

**Conditions** represent the observable facts and assumptions of the system: assets, actors, permissions, data flows, tool capabilities, trust boundaries and controls.

**Oracles** are constraint, test or evidence functions. They may reject, retain, weight or narrow candidate threat paths.

**Perspectives** generate questions and candidate paths. STRIDE, CIA, OWASP/GenAI, identity, privacy, supply-chain, insider, agent/tool-chain and open-search views are examples. They are not the QCDS engine; they are lenses the engine can combine, rotate, exclude and challenge.

The architecture always reserves open-search branches so named frameworks do not become the boundary of thought.

## Target classes

The architecture is intended to reason across:

- prompt and indirect-prompt injection;
- excessive or confused tool authority;
- privilege and trust-boundary violations;
- data leakage and cross-context exposure;
- unsafe model-to-tool transitions;
- poisoned or adversarial knowledge sources;
- compound vulnerabilities that emerge only from component combinations;
- control bypasses and brittle mitigations;
- missing observability, recovery and verification.

## Finding contract

A promoted finding should carry:

1. **Claim** — what may be vulnerable.
2. **Path** — the system path or dependency chain involved.
3. **Conditions** — what must be true for the finding to matter.
4. **Evidence** — source, observation, test or reproducible basis.
5. **Counter-test** — attempt to falsify the finding.
6. **Control** — mitigation or boundary intended to stop it.
7. **Bypass search** — attempt to challenge that control.
8. **Status** — hypothesis, supported, verified, rejected or unresolved.

## Principle

A strong base model is useful, but it is not the architecture.

QCDS Security Lab is designed so the model can be replaced while the inference discipline remains: parallel search, rotation, recursive narrowing, falsification and truth-alignment verification.

## License

This document is part of QCDS Security Lab and is governed by [LICENSE.md](./LICENSE.md). Commercial use requires a separate written license agreement.
