# QCDS Security Lab — Perspective and Oracle Map

**Author: Patrik Sundblom**

QCDS does not replace useful security frameworks. It places them inside a larger inference architecture.

The system under investigation does **not** need to be an AI system. LLMs or other predictive models may assist with analysis, but that is separate from the target itself.

## One system, many lenses

A perspective is a way of asking questions. An Oracle is a constraint or test that decides whether a candidate inference survives.

~~~text
TARGET SYSTEM
     ↓
core conditions 1 / 0 / ?  ← constraints, not attack list
     ↓
attack mechanisms × variants × targets × assets
     ↓
generated attack-vector fabric
     ↓
framework projections
     ↕
QCDS rotation / constraint / recursion
     ↓
converged candidate routes
     ↓
tests and evidence
~~~

## Current perspective map

A perspective does **not** own a fixed handful of C-values. C1..Cn describe the target system. The perspective receives the surviving vector instances that map to its framework categories.

For example, the OWASP/AppSec projection currently includes categories from **OWASP Top 10:2025** and **OWASP API Security Top 10:2023**. A single modeled system can therefore yield hundreds of OWASP-mapped vector instances even though the compact core input layer has fourteen conditions.

| Lens | Typical dimension | Example Oracle |
|---|---|---|
| STRIDE | threat class | "Does this route enable spoofing, tampering, disclosure, denial or privilege misuse?" |
| OWASP / AppSec | application security | "Can input handling, application logic, an interface or data boundary fail here?" |
| Identity | principals and authority | "Is this exact principal allowed to access this resource or perform this action?" |
| Action / Tool Chain | delegated action | "Can one component cause a higher-impact action than the originating task should allow?" |
| Privacy / Supply Chain | data and dependency trust | "Can protected information or an external dependency cross the intended trust boundary?" |
| AI / GenAI | AI-specific target behavior | "If the target uses AI/ML, can model context, output, retrieval or model-influenced action cross a trust boundary?" |
| Open Search | unknown unknowns | "What route remains if the named framework assumptions are removed?" |

Additional lenses can be added, including CIA, ATT&CK-like technique views, insider, recovery, physical safety or domain-specific frameworks.

## AI / GenAI applicability

The AI / GenAI perspective is **not automatically active because the Security Lab itself uses a model assistant**.

It becomes applicable when the target condition **AI / ML component** is 1.

This distinction is deliberate:

~~~text
model helping the analyst ≠ AI inside the target system
~~~

## Cross-perspective result

A candidate can be rediscovered by different lenses.

Example for an ordinary shared customer portal:

~~~text
STRIDE: information disclosure / privilege boundary
        │
Identity: principal separation
        │
OWASP / AppSec: resource boundary
        │
Privacy: protected data exposure
        │
Open Search: alternate access path
        │
        ▼
SAME UNDERLYING ROUTE
~~~

For an AI-enabled target, the AI / GenAI perspective can join the same investigation without replacing the other lenses.

Convergence is useful, but it is not proof.

Equally useful is contradiction: one branch may show that an authorization Oracle blocks the route. QCDS preserves the contradiction and tests it rather than silently averaging the answers.

## Rotation

Perspective rotation asks a specific counterfactual question over the vector fabric:

> If this perspective is removed, which vector candidates are still supported by another active perspective and which lose their last current framework mapping?

This is different from changing a system fact.

QCDS therefore keeps two operations separate:

~~~text
PERSPECTIVE ROTATION
same system facts → remove one lens → compare result

DIMENSION EXCLUSION
same perspective set → alter one system fact for comparison → compare result
~~~

## Risk scoring is downstream

Likelihood × impact, DREAD-style dimensions or other scoring methods can be attached after a finding has survived enough scrutiny.

They do not decide whether the finding is true.

QCDS separates:

~~~text
DISCOVERY → VERIFICATION → PRIORITIZATION
~~~

A high score cannot rescue a false finding. A low score should not erase a demonstrated structural weakness.

## Open search

Named frameworks are valuable because they encode accumulated experience.

They can also create tunnel vision.

Open Search therefore reserves reasoning paths that are not bounded by a named framework:

- start from assets;
- start from permissions;
- start from flows;
- start from failure consequences;
- start from attacker goals;
- start from defender assumptions;
- remove the dominant perspective;
- change one dimension;
- reverse the direction of the path.

The purpose is not to reject frameworks.

The purpose is to prevent a framework from becoming the boundary of thought.

## License

This document is part of QCDS Security Lab and is governed by [LICENSE.md](./LICENSE.md).
