# QCDS Security Lab — Architecture

**Author: Patrik Sundblom**

## Purpose

QCDS Security Lab treats AI security as a search-and-verification problem rather than a static checklist.

The core object is the **observable threat space**: system components, data flows, trust boundaries, identities, permissions, tools, model context, external inputs, controls and assumptions.

## Discovery loop

```text
SYSTEM / CODE / APIS / DATA / AGENTS
                ↓
        CONDITION FORMATION
                ↓
       ATTACK-SURFACE GRAPH
                ↓
   PARALLEL THREAT HYPOTHESES
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
  EVIDENCE + FALSIFICATION TEST
                ↓
 TRUTH-ALIGNMENT / STABILIZATION
```

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
