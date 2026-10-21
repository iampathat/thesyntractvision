# QCDS Security Lab Work

Created by Patrik Sundblom — with OpenAI / ChatGPT as research & development support.

A separate Work branch of QCDS Security Lab / Project Glasswing. Version 1.0.0.

The interface and original articulated SVG bird are new. The QCDS engine, attack-vector model, symbolic logical space, Grover policy and gate simulators are retained from `iampathat/thesyntractvision/qcds-security-lab` at commit `2aec85e0fb12655b26f0807dcc4c5d9f4eef3042` (engine 1.14.1). Relative module imports are normalized; inference semantics are preserved.

## Run

Serve `dist/` with any static HTTP server. No dependencies or compilation are required. For example:

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Projects live in a dedicated browser-local workspace; export JSON for backup or moving devices. Project JSON from the previous Lab can be imported without overwriting an existing case.

## Experience

- A separate Glasswing welcome scene with an original vector bird: shoulder, hand, feathers, head, tail, claws, node pulses and a defensive ground field. Pause, replay and reduced-motion support.
- A responsive Swedish workspace: Overview, System & conditions, Attack paths, Logical space, Evidence & actions.
- Five example systems and independent custom investigations. Example starters contain no prefilled test evidence.
- Real model results in the candidate map and metrics; worker-based calculations keep the interface responsive.
- Explicit what-if dimension changes, true coordinate exclusion, parallel/sequential/hybrid modes, orientation checks and ideal Grover with a 40-iteration cap.
- Ideal statevector and noisy density-matrix comparison, 4096 shots, deterministic seed 173; JSON exports retain the exact run.
- Scope-bound reported observations and action ownership. Reports render as an A4 print/PDF document through the browser print dialog.

## Validation

```sh
npm test
```

Includes the upstream engine and logical-space tests plus Work integration checks for scope binding, round-trip imports, gate-reference agreement and escaped report content. Desktop and 390px mobile layouts were inspected with browser QA.

The browser performs classical CPU analysis and small circuit simulations. No external target scan or QPU is connected. An active candidate or a high oracle-alignment probability is not verified vulnerability evidence. Custom conditions, system scope and reported observations determine the assessment.

## Rights

Copyright © 2026 Patrik Sundblom. All Rights Reserved. Commercial terms in `dist/LICENSE.md`; retained source notices in `dist/core/LICENSE.md`. Earlier QCDS material retains its original license.
