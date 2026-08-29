# Logical Robot Domain Labs

The Domain Lab is not a collection of separate AI products. It is the **same Logical Robot** meeting different bounded logical spaces.

The purpose is simple: give domain experts a place where they can inspect, attack and improve the inference experiment without first having to accept the larger Syntract Vision.

> Bring your domain. Bring observations. Bring falsification. Do not bring the answer as a hidden rule.

## Experimental contract

Every built-in starter lab follows these boundaries:

- starter data is synthetic, simulated or explicitly declared;
- starting a lab does **not** modify the observed `reality` universe;
- starter packs contain **zero solution rules**;
- source material and human input are evidence / conditions, not automatic truth;
- a useful result is a new reusable rule or capability that survives challenge and improves held-out resolution;
- a domain pack is an open logical space, not a required hierarchy, taxonomy or fixed ontology;
- QCDS/Fabric core semantics are unchanged by the domain pack.

## Built-in labs

| Domain | Expert audience | Starter challenge | What counts as learning? |
|---|---|---|---|
| **Materials** | materials scientists, chemists, process engineers | separate load-bearing process/material conditions from correlations | a challenged rule resolves held-out material behaviour it could not resolve before |
| **Biology** | biologists, bioinformaticians, drug-discovery researchers | distinguish competing explanations across cell/environment contexts | reusable logic generalizes to an unseen synthetic cell observation |
| **Robotics** | roboticists, control engineers | determine which observation separates rival action models | a new rule improves an unseen simulated action decision and explains why |
| **Software** | developers, formal-methods researchers | discover an invariant rather than fit one stack trace | the invariant predicts a held-out execution and rejects a plausible wrong cause |
| **Physics / Quantum** | physicists, quantum researchers | select the next discriminating measurement among rival relations | a relation predicts unseen synthetic measurements without claiming QPU advantage |
| **Law / Rules** | legal technologists, policy researchers | derive consequences while preserving declared-vs-observed identity | a new case is resolved inside a fictional declared rulebook without becoming external legal truth |

Each built-in pack currently starts with six observations and zero active rules.

## Run a starter space

From a live checkout / Codespace:

```bash
qcds-domain-lab --list
qcds-domain-lab materials --store ./intelligence_store
```

Or use **EXPLORE A LOGICAL SPACE** in the Living Logical Robot page.

`START ISOLATED SPACE` creates a separate `domain-lab-<domain>` Logical Universe. It does not write the pack into `reality`.

`EXPLORE WITH ROBOT` gives the same Logical Robot a domain exploration event through the normal control/input path. The event itself has no truth authority.

## What a serious contribution looks like

A good Domain Lab contribution should make the experiment harder or more realistic, not merely add more labels.

Useful contributions include:

- stronger observations with provenance;
- an observation body / adapter for a real dataset, simulator, instrument or public source;
- plausible rival hypotheses that are genuinely hard to distinguish;
- a stronger selection/holdout challenge;
- a contradiction case;
- source-independence checks;
- a better oracle or oracle falsification test;
- a benchmark showing the robot **does not** learn when evidence is insufficient;
- a benchmark showing that a promoted rule generalizes to unseen cases;
- evidence that an existing Domain Lab is misleading, degenerate or too easy.

## Build your own Logical Space

A Domain Lab does **not** need a hierarchy such as:

```text
biology
  → gene
    → protein
      → phenotype
```

Gene state, protein signal, cell context, environment, time and phenotype can all coexist as terms/dimensions. Which part matters should emerge under the current question, oracle regime and Syntractfilter rather than be dictated by a tree.

Start from [`domain_labs/TEMPLATE.json`](domain_labs/TEMPLATE.json). A useful pack contains:

```text
domain id
expert audience
epistemic universe mode
starter observations
an unresolved challenge
what would count as learning
an exploration prompt
source / truth boundary
```

Do **not** include the missing solution rule merely to make the demonstration pass.

## The result we ultimately want from every domain

The strongest common result is:

```text
START
observations
unresolved domain question
0 supplied solution rules

LOGICAL ROBOT
→ detects a gap
→ creates rival logic
→ chooses discriminating evidence
→ observes / experiments
→ falsifies rivals
→ governs surviving logic

END
can resolve held-out domain cases
it could not resolve at START
```

If an expert can break that result, that is useful information too.
