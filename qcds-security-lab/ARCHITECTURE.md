# QCDS Security Lab — Architecture

**Author: Patrik Sundblom**

## Current implementation boundary

The browser workspace evaluates the method using eight deterministic candidate-rule families, fourteen ternary conditions and seven perspective families. It implements perspective rotation, condition ablation, composed paths, Oracle review states and snapshot-bound user-reported evidence.

It does not claim autonomous real-world discovery, automatic verification, or a quantum/Grover execution substrate in this browser release.

## Purpose

QCDS Security Lab treats security investigation as a **search, comparison and verification problem**, not as a static checklist.

The target may be any system: software, infrastructure, a process, a workflow, a machine, an organization, an AI system or another operational system.

The observable threat space can include actors and identities, assets and protected outcomes, system components, data and material flows, trust boundaries, permissions, delegated authority, connected interfaces, external dependencies, human approvals, controls, assumptions and unresolved facts. AI/ML components are included when the target actually contains them.

## Analysis roles

Three layers must not be confused.

### 1. Target system

The real system being investigated.

### 2. Model-assisted analysis

LLMs or other predictive models may help interpret descriptions, suggest candidate conditions, generate questions, propose possible routes and prepare material for security perspectives.

They are assistants. Their output is candidate material, not truth.

### 3. QCDS inference loop

QCDS keeps the investigation coherent across uncertainty, alternatives, perspectives, controls and evidence.

~~~text
ANY TARGET SYSTEM
        ↓
PLAIN DESCRIPTION / ARCHITECTURE / CODE / OBSERVATIONS
        ↓
OPTIONAL MODEL-ASSISTED INTERPRETATION
        ↓
CONDITIONS 1 / 0 / ?
        ↓
ORACLES / CONSTRAINTS
        ↓
PARALLEL SECURITY PERSPECTIVES
        ↕
QCDS ROTATION / DIMENSION EXCLUSION
        ↓
CANDIDATE ROUTES
        ↓
CONTROL / MITIGATION
        ↓
BYPASS / FAILURE QUESTION
        ↓
RECURSIVE INFERENCE
        ↓
TESTS / COUNTER-TESTS / OBSERVATIONS
        ↓
TRUTH-ALIGNMENT / SCOPED CONCLUSION
~~~

QCDS is not merely a final filter after frameworks. It remains in the loop while routes, perspectives, dimensions and controls are compared and challenged.

## Conditions

Conditions are explicit ternary system facts:

- **1** — present
- **0** — absent
- **?** — unresolved

Unknown is not an error.

The current implementation uses fourteen stable condition IDs. The final condition explicitly records whether the **target system itself** contains an AI/ML component. This prevents optional model assistance in the analysis from being confused with AI inside the target.

## Oracles

Oracles are constraint, test or evidence functions. They can retain, reject, narrow or challenge candidate paths.

Examples include questions about trust-boundary crossings, identity and authority, control effectiveness, connected-source provenance, evidence quality and whether an alternate route survives.

## Perspectives

Perspectives contribute questions; they are not the QCDS engine.

Current UI perspective families are:

- STRIDE
- OWASP / AppSec
- Identity
- Action / Tool Chain
- Privacy / Supply Chain
- AI / GenAI
- Open Search

The AI / GenAI lens is applicable only when the target is declared to contain AI/ML.

Additional perspectives such as CIA, ATT&CK-like technique views, insider, physical safety, operational resilience or domain-specific frameworks can be added without changing the underlying QCDS role.

## Discovery and recursion

Parallel analysis asks different questions about the same target.

Sequential deepening follows one candidate route through its dependencies.

Recursive inference turns a proposed control into the next question:

~~~text
ROUTE
  ↓
CONTROL
  ↓
HOW COULD THIS CONTROL FAIL?
  ↓
NEXT CONTROL
  ↓
HOW COULD THAT FAIL?
  ↓
TEST / COUNTER-TEST
~~~

A mitigation proposal is not the end of the search.

## Rotation and dimension exclusion

Perspective rotation asks whether a candidate depends on one chosen lens.

Dimension exclusion asks whether it depends on one chosen system fact.

These are different comparisons:

~~~text
same facts + remove one perspective
same perspectives + alter one condition for comparison
~~~

The saved target state remains intact.

## Target classes

The same architecture can be used for ordinary web applications, APIs and services, identity systems, payment and approval processes, business workflows, infrastructure and networks, supply chains, machines and operational systems, AI/ML systems, and mixed physical/digital systems.

AI-specific failure modes are therefore a **subset**, not the definition of the Security Lab.

## Finding contract

A useful finding carries:

1. **Claim** — what may fail or be exploitable.
2. **Path** — the system path or dependency chain.
3. **Conditions** — what must be true.
4. **Perspectives** — which question families surfaced it.
5. **Control** — what should interrupt the path.
6. **Bypass search** — how that control could fail.
7. **Evidence** — observation, source or test.
8. **Counter-test** — what could contradict the claim.
9. **Status** — unresolved, hypothesis, supported, refuted or conflicting.

## Principle

A strong model can help generate candidate material, but it is not the architecture.

QCDS supplies the inference discipline: explicit conditions, multiple directions, constraint, rotation, recursive challenge and evidence alignment.

## License

This document is part of QCDS Security Lab and is governed by [LICENSE.md](./LICENSE.md).
