# Project Glasswing

**Author: Patrik Sundblom**  
**Assisted by: ChatGPT (OpenAI)**

Project Glasswing is an executable comparison surface inside QCDS Security Lab. It shows what changes when the **same declared system state** is processed at three different inference depths:

1. **Single pass** — compact route surfacing without rotation, dimension walk or recursive control challenge.
2. **Recursive agent** — follows several candidate routes through control → bypass → counter-test.
3. **QCDS** — runs the full Security Lab inference fabric: core condition mask, generated attack-vector fabric, parallel perspectives, perspective rotation, dimension walking, recursive inference and evidence-bound verification.

Glasswing is deliberately **not** a vendor-model leaderboard. The baseline and agentic tracks are deterministic reductions of the same inspectable Security Lab analysis so that the structural difference is visible without pretending that a browser-only demo has benchmarked external frontier models.

It also deliberately does **not** equate more candidates with more truth. Candidate count is discovery coverage. Evidence, counter-tests, changed assumptions and convergence determine what survives.

## Open it

Serve the repository and open:

```text
/qcds-security-lab/glasswing.html
```

The page can load the active Security Lab case from browser localStorage or use one of the worked systems.

## What the experiment exposes

- system description and attacker goal;
- protected assets;
- the 14 core 1 / 0 / ? condition coordinates;
- logical mask space from unresolved dimensions;
- generated and surviving attack-vector counts;
- route families surfaced at each inference depth;
- recursive control → challenge → counter-test chains;
- perspective-rotation comparisons;
- material dimension walks;
- QCDS Oracle states;
- clarification questions;
- evidence-bound route count.

## Safety and scope

Use Glasswing only for systems you own or are authorized to assess. The public page is an analysis demonstrator. It does not autonomously scan targets, execute exploits or certify vulnerabilities.

## Verify

```sh
node --test qcds-security-lab/tests/engine.test.mjs
node --test qcds-security-lab/tests/glasswing.test.mjs
```

## License

Project Glasswing is part of QCDS Security Lab and is governed by [LICENSE.md](./LICENSE.md).
