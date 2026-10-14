# CREDEMIA™ — QCDS Scientific Credit Lab
### An evidence-first Logical World inside The Syntract Vision

**Live (after Pages deployment):** https://iampathat.github.io/thesyntractvision/credemia/

**Motto: VERITAS VINCET — Truth Shall Prevail / Sanningen ska segra.**

**Domain reserved by author:** credemia.org (DNS / Site connection pending).  
**Repository:** https://github.com/iampathat/thesyntractvision/tree/main/credemia  
**License:** separate, non-open-source evaluation permission, see [LICENSE.md](LICENSE.md).

CREDEMIA addresses the scientific-credit and research-priority problem: how to distinguish documented precedence, genuine technical overlap, independent derivation, appropriate attribution, possible access and unresolved counterevidence. It does not presume that a later similar paper copied an earlier one.

## First two published investigations

| Dossier | Published source record | Questions |
| --- | --- | --- |
| [001 — Navier–Stokes](cases/navier-stokes.json) | Clay's problem definition, OpenAI announcement September 8, 2026, Clay statement September 11, 2026 | Exact theorem match, competing Euler/Navier claims, provenance, historical "drawer" assertions, independent proof checks |
| [002 — QCDS](cases/qcds.json) | Patrik Sundblom's 2025 [QCDS archive](https://zenodo.org/records/15455541), [mathematics archive](https://zenodo.org/records/15533909), [2026 PPPL PRL paper](https://doi.org/10.1103/mmc9-nzfx) | Which exact mechanisms predate which publications, precise derivation versus generic analogy, independent development and credit |

Both dossiers retain all seven conditions as **?** until independently supported observations are provided. Their source timelines contain verifiable primary records and explicitly labeled statements of involved parties; a press release is not itself a formal verification of a proof. The QCDS dossier's PPPL comparison is a *research question*, not a claim of copying.

[**Open dossier 001**](https://iampathat.github.io/thesyntractvision/credemia/?case=navier-stokes#case-library) · [**Open dossier 002**](https://iampathat.github.io/thesyntractvision/credemia/?case=qcds#case-library)

**ChatGPT Sites fallback:** [static, results-only CREDEMIA edition](sites/index.html). Use it as the standalone public-facing summary without running canonical QCDS. The full workbench must remain on the original QCDS-capable host unless the Python WebAssembly core is also carried across. Detailed migration instructions are in [SITES_HANDOFF.md](SITES_HANDOFF.md).

## Purpose

A credible analysis must distinguish at least five independent questions:

1. **When was a specific contribution documented?** Check actual publication records; a DOI date alone does not establish date of invention.
2. **What exactly overlaps?** Compare techniques, derivations, oracle definitions, equations, experimental designs or other testable features, not slogans.
3. **Could one team access the other work?** A route of access is evidence about opportunity, not a finding of reuse.
4. **Was the relevant work credited?** An omitted or included citation does not by itself resolve whether the underlying scientific contribution was derivative.
5. **Is an independent development path supported?** Dated counterevidence must remain visible.

The *CREDEMIA* name is satirical. This workbench is a neutral scientific-priority evidence tool, **not** a blacklist of researchers or institutions.

## Architecture: real QCDS, not a fake JavaScript model

The page references the exact Python core already shipped by the main site:

- ../session_core_worker.js
- ../qcds_fabric.zip
- qcds_fabric.session_sandbox_core.run_session_json
- qcds_fabric.problem.problem_to_syntract

Every non-unknown mask forms an explicit, source-labelled SemanticClaim; an unknown mask supplies **no positive or negative evidence**. Each of the seven dimensions runs as an independently inspectable probe through canonical QCDS Fabric, returning baseline and stabilized distributions, entropy, conflict markers and a Syntract identifier. No training, fine-tuning, hidden inference model or artificial QCDS output is added by this frontend. All core calls run via Pyodide in the browser.

The seven independently probed dimensions are: chronology, technical overlap, access, appropriate credit, independent derivation, primary records, contradictory evidence.

The **overall evidence summary is deliberately interpretive, not an eighth QCDS run**. It describes known gaps and conditional findings; it never emits a copy/plagiarism verdict. Separate source assertions entered for separate dimensions are *not* presumed independent or true just because the interface can evaluate them.

**Important limitation:** independent probes cannot themselves resolve dependency structure, and the displayed conditional probabilities are not empirically calibrated probabilities of dishonesty. The application is a research prototype, not a calibrated attribution model. The next phase may implement a joined cross-claim Syntract with explicit source-dependence oracles, source-authenticity verification, source-version histories and measured benchmarks.

## Evidence provenance and DOI verification

Crossref / DataCite REST API lookups retrieve publication metadata only. Zenodo DOIs usually resolve through DataCite. Day precision is required for the automatic A-before-B chronology oracle; a year-only Crossref record cannot be assumed to prove ordering within that year. A manual date is a user assertion. A source link is not proof its content was inspected or authenticated.

Crossref source: https://www.crossref.org/documentation/retrieve-metadata/rest-api/

The sample Meridian/Apex case is **fictional** and contains no DOI citations or verified real-world facts. The preselected masks demonstrate a realistic central problem: priority and claimed technical similarity without a documented dependence path.

## Workflow

1. Enter two identifiable works; add DOIs and use the Crossref metadata lookup if available.
2. Describe the *specific* technical contribution being compared.
3. For every relevant condition select **1 / 0 / ?**, supply the primary evidence link and assign a strength to the entered assertion.
4. Run QCDS. Inspect conditional outcomes, unknowns and conflicts without treating scores as misconduct probabilities.
5. Export a Markdown evidence report or a JSON case snapshot. Case files can be re-imported, but old lookups must be reverified.

No case database or tracking service is used by CREDEMIA. A Crossref lookup sends the entered DOI to Crossref. The browser can export data to local files.

## Running locally

Serve the complete repository's GitHub Pages output directory from a local HTTP server. Opening index.html directly as a file is insufficient: Web Workers and the package must be available at the documented relative paths. The main Pages workflow copies the self-contained credemia/ directory and publishes the canonical qcds_fabric.zip at the site root.

Run core smoke checks from the repository root:

    python credemia/tests/test_qcds_contract.py

Validate JavaScript syntax:

    node --check credemia/app.js

## Scientific and ethical boundaries

- A prior public record is not automatically an original idea.
- An independent date comparison is not proof of conceptual copying.
- Absence of a citation is not automatically plagiarism.
- Current claims of influence or academic misconduct must not be generated without source-level verification and a proper right of reply.
- Retractions, corrections, related work, code histories and counterarguments can materially change the evidentiary picture.
- Noble-prize nomination confidentiality is a different issue from scientific attribution. Useful historical background: [Nobel Foundation Statutes](https://www.nobelprize.org/statutes-of-the-nobel-foundation/).

## Credits

**Theory and creation by Patrik Sundblom**  
**with OpenAI / ChatGPT as research & development support**

Pre-existing QCDS: https://github.com/iampathat/QCDS  
Research record: https://zenodo.org/records/15455541

Original CREDEMIA product material: **All rights reserved. Separate license required for reuse.**
