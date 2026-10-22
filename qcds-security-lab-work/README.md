# QCDS Security Lab Work

Created by Patrik Sundblom — with OpenAI / ChatGPT as research & development support.

A separate Work branch of QCDS Security Lab / Project Glasswing. Version 1.2.0.

The interface and original articulated SVG bird are new. The QCDS engine, attack-vector model, symbolic logical space, Grover policy and gate simulators are retained from `iampathat/thesyntractvision/qcds-security-lab` at commit `2aec85e0fb12655b26f0807dcc4c5d9f4eef3042` (engine 1.14.1). Relative module imports are normalized; Boolean inference semantics are preserved. Work 1.1 adds an adaptive Grover stopping policy to the retained analytical and gate simulators.

## Run

Serve `dist/` with any static HTTP server. No dependencies or compilation are required. For example:

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Projects live in a dedicated browser-local workspace; export JSON for backup or moving devices. Project JSON from the previous Lab can be imported without overwriting an existing case.

## Experience

- A separate Glasswing welcome scene with an original vector bird: shoulder, hand, feathers, head, tail, claws, node pulses and a defensive ground field. Pause, replay and reduced-motion support.
- A guided Swedish investigation: Goal → Route → Control → Counter-test → Evidence. Examples are the first workspace screen; technical dashboards live under Further exploration.
- Five complete, loadable examples with Swedish explanations and clearly labelled synthetic worked observations/actions. The invoice example intentionally keeps its unresolved condition and has no test observation. Custom investigations start without observations.
- Real model results in the candidate map and metrics; worker-based calculations keep the interface responsive.
- Explicit what-if dimension changes, true coordinate exclusion, parallel/sequential/hybrid modes, orientation checks and ideal Grover with automatic stopping and a 40-iteration ceiling.
- Ideal statevector and noisy density-matrix comparison, 4096 shots, deterministic seed 173; JSON exports retain the exact run.
- Scope-bound reported observations and action ownership. The original designed A4 PDF report is restored, with direct download and a preview of the exact same file. Whole-assessment and individual framework reports are available.

## Reports restored in Work 1.2

The report renderer is adapted directly from the original `qcds-security-lab/report-pdf.mjs` at the source commit above. It retains the cover, decision brief, scope and condition registers, six-sector radar, framework charts, attack-path atlas, per-route controls and counter-tests, QCDS inference trace, sensitivity comparisons, scoped evidence, actions, complete mechanism register and methodology. The original portal fixture reconciles 566 modeled vectors and 235 retained candidates across 22 pages.

Work adds blue/cyan accents, navigable PDF bookmarks, a direct binary PDF download and an embedded PDF preview. Composition runs in a separate worker. Saved dimensional experiments show the actual evaluated iteration count, selected iteration, stopping reason and ceiling. Archived evidence counts use the current engine's numeric field. Very long cover text is shortened only on the cover; full descriptions and goals remain in the scope section.

The original Latin-1 report font subsets are separate binary TTF assets loaded locally, with their SIL OFL notice. No font or image payload is encoded in application source. jsPDF 4.2.1 is the vendored upstream library from the original repository, with its MIT notice. All report assets are served from this application; no CDN or remote PDF service is used. Reports retain the original English explanatory text and preserve the user's own case language.

To generate a worked-example report from the same renderer without a browser:

```sh
node scripts/export-example.mjs portal /absolute/path/report.pdf
```

## Adaptive Grover

The planner stops at 95% oracle mass, or after three steps with no material improvement over its checkpoint (0.1% relative gain). It retains the earliest best observed state and records the explored steps separately from the selected iteration. Constant predicates stop at zero. This is a performance heuristic: unitary Grover oscillates, and a later, better peak may be skipped. Noisy-backend selection uses the same stop rule on the simulated noisy distribution; a manually specified comparison iteration remains explicit. The plotted trace ends when the search stops. No speedup figure is claimed.

## Validation

```sh
npm test
```

Includes the upstream engine and logical-space tests plus Work integration checks for scope binding, round-trip imports, gate-reference agreement and escaped report controls, complete PDF generation, framework filtering, register reconciliation and scoped report evidence. Desktop and 390px mobile layouts were inspected with browser QA.

The browser performs classical CPU analysis and small circuit simulations. No external target scan or QPU is connected. An active candidate or a high oracle-alignment probability is not verified vulnerability evidence. Custom conditions, system scope and reported observations determine the assessment.

## Rights

Copyright © 2026 Patrik Sundblom. All Rights Reserved. Commercial terms in `dist/LICENSE.md`; retained source notices in `dist/core/LICENSE.md`. Earlier QCDS material retains its original license.
