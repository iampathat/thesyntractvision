# QCDS Security Lab — Perspective and Oracle Map

**Author: Patrik Sundblom**

QCDS does not replace useful security frameworks. It places them inside a larger inference architecture.

## One system, many lenses

A perspective is a way of asking questions. An Oracle is a constraint or test that decides whether a candidate inference survives.

```text
Framework / domain knowledge
          ↓
   perspective lens
          ↓
 question generation
          ↓
       Oracles
          ↓
 candidate threat paths
          ↓
QCDS rotation + recursion + verification
```

## Example map

| Lens | Typical dimension | Example Oracle |
|---|---|---|
| STRIDE | threat class | "Does this path enable identity spoofing or privilege elevation?" |
| CIA | security property | "Which protected property is actually lost?" |
| OWASP GenAI | AI application failure mode | "Can untrusted content alter model behavior across a privilege boundary?" |
| Identity | principals and authority | "Is this action authorized for this exact principal and context?" |
| Tool use | agency | "Can model output directly trigger a consequential action?" |
| RAG / knowledge | retrieval | "Can this actor cause retrieval outside their permitted corpus?" |
| Supply chain | dependency provenance | "Can a dependency change the trusted execution or knowledge path?" |
| Privacy | data relationship | "Can protected information be exposed or inferred?" |
| Insider | legitimate access misuse | "What can a valid identity do that policy did not intend?" |
| Recovery | resilience | "Can the action be detected, contained and reversed?" |
| Open search | unknown unknowns | "What path remains if the named framework dimensions are excluded?" |

## Cross-perspective result

A candidate can be rediscovered by different lenses:

```text
STRIDE: Elevation of privilege
        │
Identity: confused authority
        │
Agent lens: overpowered tool token
        │
Open search: external input → model → tool
        │
        ▼
SAME UNDERLYING ATTACK PATH
```

That convergence is useful.

Equally useful is contradiction: one branch may discover that an authorization Oracle invalidates the path. QCDS should preserve the contradiction and test it rather than silently averaging the answers.

## Risk scoring is downstream

Scoring methods such as likelihood × impact or DREAD-style dimensions may be attached after a finding has survived enough scrutiny.

They do not decide whether the threat is real.

QCDS separates:

```text
DISCOVERY → VERIFICATION → PRIORITIZATION
```

A high score cannot rescue a false finding. A low score should not erase a verified structural weakness.

## Unknown-unknown search

Named frameworks are valuable because they encode accumulated experience.

They can also create tunnel vision.

For that reason QCDS should always reserve branches with no named framework at all:

- start from assets;
- start from permissions;
- start from data flows;
- start from failure consequences;
- start from attacker goals;
- start from defender assumptions;
- remove the currently dominant dimension;
- reverse the direction of the graph.

The purpose is not to reject frameworks.

The purpose is to prevent the framework from becoming the boundary of thought.

## License

This document is part of QCDS Security Lab and is governed by [LICENSE.md](./LICENSE.md).
