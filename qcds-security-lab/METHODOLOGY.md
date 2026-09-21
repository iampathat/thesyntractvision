# QCDS Security Lab — Threat Modeling Method

**Author: Patrik Sundblom**

## Start with human language

The entry point is deliberately simple.

> **I am the attacker. I want to ______.**  
> **How would I try?**  
> **What would stop me?**  
> **How could I get around that control?**  
> **What evidence would prove that the path is real?**

A non-specialist should be able to start a QCDS threat model without knowing STRIDE, ATT&CK, OWASP or security taxonomy.

The AI interviewer turns plain answers into a structured logical space.

## The interview becomes Conditions

The model asks adaptive questions:

- What are you building?
- Who can reach it?
- What enters the system?
- Who controls that input?
- What can the AI or software read?
- What can it write, send, delete, execute or approve?
- Which identities and permissions exist?
- What is sensitive?
- What assumptions are you relying on?
- What happens if one component lies, fails or is manipulated?
- Which actions require a human?
- Can the human independently verify the underlying evidence?
- What logging, rollback and recovery exist?

Each answer creates or refines **Conditions**.

Examples:

```text
C1  External users can submit arbitrary text
C2  The model reads untrusted web content
C3  The model can call a ticketing tool
C4  The tool token can create and close tickets
C5  Internal documents are retrievable through RAG
C6  Authorization is enforced before retrieval
C7  High-impact actions require independent approval
C8  Tool calls are logged and reversible
```

The Conditions define the observable problem space. They are not the conclusion.

## Oracles

An **Oracle** is a constraint, test or evidence function applied to candidate threat paths.

It can ask questions such as:

- Does this path cross a trust boundary?
- Does untrusted data become executable instruction?
- Does the path require a permission the actor does not possess?
- Can the control be independently verified?
- Is there evidence that the component actually exposes the capability?
- Does a second control block the path?
- Can the same outcome be reached through another route?
- Does the hypothesis survive a changed perspective?

An Oracle may reject, retain, weight or narrow candidate paths.

A framework can supply Oracle families, but no framework owns the search.

## Perspective lenses are inputs, not the engine

QCDS can instantiate many parallel perspectives:

| Perspective lens | Example questions it contributes |
|---|---|
| STRIDE | Can identity be spoofed? Can data be tampered with? Can actions be repudiated? Can information leak? Can service be denied? Can privilege be elevated? |
| CIA | What breaks confidentiality, integrity or availability? |
| OWASP / GenAI | Where can model, prompt, retrieval, output or tool boundaries fail? |
| ATT&CK-like technique view | Which known adversary techniques resemble this path? |
| Identity / privilege | Where does authority expand, confuse or cross principals? |
| Supply chain | Which dependency, model, package, dataset or service can become the weak link? |
| Privacy | Can data be inferred, linked, exposed or retained beyond intent? |
| Insider | What can a legitimate but malicious or careless user do? |
| Agent / tool chain | Can one model decision trigger a higher-impact action downstream? |
| Recovery | Can the system detect, contain, undo and learn from failure? |
| Unknown / open search | What plausible path is not represented by any named framework? |

STRIDE is therefore **one perspective**. It is useful, but it is not the boundary of the threat model.

## Parallel inference

Different branches should be allowed to disagree.

```text
                 SAME SYSTEM
                      │
      ┌───────────────┼────────────────┐
      ▼               ▼                ▼
 Prompt / data     Identity /       Tool-chain
 manipulation      privilege        authority
      │               │                │
      └───────────────┼────────────────┘
                      ▼
              cross-examination
```

One branch may claim prompt injection is central. Another may show that the real failure is excessive tool authority. A third may find that retrieval authorization already kills the original path.

The disagreement is useful evidence.

## Rotation and dimension exclusion

If every branch starts from the same assumptions, parallelism can reproduce the same bias.

QCDS therefore rotates perspective and can temporarily exclude one dimension:

```text
Run A: all dimensions
Run B: remove prompt-injection lens
Run C: remove identity lens
Run D: remove tool-authority lens
Run E: reverse attacker/defender priority
Run F: start from asset loss instead of attack technique
```

A finding that only appears when one favored lens is present is weaker than a finding rediscovered through independent paths.

Rotation is not random decoration. It is a bias-control mechanism.

## Sequential deepening

Promising paths are then narrowed.

```text
THREAT
  ↓
ATTACK PATH
  ↓
REQUIRED CONDITIONS
  ↓
CONTROL
  ↓
CAN THE CONTROL FAIL?
  ↓
BYPASS PATH
  ↓
SECOND CONTROL
  ↓
COUNTER-TEST
  ↓
EVIDENCE
```

This continues recursively.

The system should not stop merely because it has found a mitigation.

The next question is:

> **What has to be true for this mitigation to fail?**

## The four QCDS phases

### 1. Condition Formation

Turn interviews, architecture, code, permissions, data flows and assumptions into explicit Conditions.

### 2. Conditional Evolution

Apply Oracles and perspective families to generate and constrain candidate threat paths.

### 3. Recursive Inference

Deepen retained paths, search combinations, rotate dimensions, challenge mitigations and generate bypass hypotheses.

### 4. Truth-Alignment Verification

Bind surviving claims to evidence, counter-tests and reproducible conditions. Findings that do not survive challenge are downgraded or rejected.

## Convergence

The objective is not "the AI produced a list."

The objective is a state where repeated perspective rotation, counter-testing and recursive search produce diminishing material novelty and the surviving findings are evidence-bound.

```text
SYSTEM
  ↓
INTERVIEW / EVIDENCE
  ↓
CONDITIONS
  ↓
ORACLE FAMILIES
  ↓
PARALLEL PERSPECTIVES
  ↓
ROTATION / DIMENSION EXCLUSION
  ↓
SEQUENTIAL DEEPENING
  ↓
RECURSIVE ATTACK ↔ CONTROL SEARCH
  ↓
EVIDENCE + FALSIFICATION
  ↓
STABLE VERIFIED THREAT MODEL
```

## The output

A useful QCDS threat model should not be a flat spreadsheet of scary nouns.

It should preserve:

- the system fact that created the concern;
- the attack path;
- the Conditions required for the path;
- the perspective(s) that discovered it;
- the Oracles that retained or rejected it;
- the control and bypass attempts;
- the evidence;
- the counter-evidence;
- the confidence / status;
- unresolved questions;
- the next test required.

That makes the result inspectable by both specialists and non-specialists.

## License

This document is part of QCDS Security Lab and is governed by [LICENSE.md](./LICENSE.md). Use beyond the stated evaluation permission requires a separate commercial license.
