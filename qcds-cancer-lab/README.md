# QCDS Oncology Lab — Recursive Engine — 128 → 8 → 1

> **Scientific audit (22 October 2026):** [Read the detailed audit](AUDIT_2026-10-22.md) before interpreting simulated genomic results. In one fixed-size 5+5 audit scenario, 57 of 100 null-generated cohorts had at least one apparent match under that scenario’s thresholds; signal amplification does not imply biological validation.


**Theory and creation by Patrik Sundblom**

This directory contains the current QCDS oncology research engine. It is deliberately separate from the older BRCA2 / mutation scripts so the historical work remains intact.

## Live site — run it in the browser

The new public URL is /qcds-oncology-lab/. The original /qcds-cancer-lab/ remains as a compatibility alias so existing links continue to work.

**QCDS Oncology Lab:** https://iampathat.github.io/thesyntractvision/qcds-oncology-lab/

The public surface is a runnable workbench. You can edit the 0/1/? Condition, enable or disable top-down cancer-oracle hypotheses, run the full 128 → 8 → 1 QCDS path, inspect all 128 per-lane Grover observations in the interactive inference space, select any recursive pass, inspect its eight full-distribution family binds, local and parent Grover depths, dimensional influence and the final Parent-Grover distribution.

> **License:** public to view for evaluation; company / organizational use requires a separate agreement. See [LICENSE.md](./LICENSE.md).

## What this build is

This build does **not** start from a known `target_state`.

It starts from:

- a QCDS **Condition** such as `01101001` (complete), `1111????` (partly unresolved), or `????????` (open),
- top-down cancer-oracle hypotheses,
- eight named semantic dimensions,
- recursive structure returned by the previous Parent-Grover pass.

`?` is not a third truth value and it is not required. It means that a represented binary dimension is unresolved.

Rotational exclusion is different: the excluded dimension is **absent / null in that lane**. A fixed `0` or `1` is never silently changed into `?` to fake exclusion.

## Current QCDS path

```text
Condition (0 / 1 / ?)
        ↓
top-down cancer oracle set
        ↓
16 unique balanced input rotations × 8 true-null lanes
        ↓
same fixed oracle bank on every rotated lane
        ↓
128 independent local QCDS Grover runs
        ↓
128 → 8 Rotational Syntract family binds
        ↓
8 → 1 higher-order Syntract bind
        ↓
fresh Parent Grover
        ↓
parent-marked structure becomes the next oracle
        ↓
rotate again / recursive return
        ↓
multi-signal stability gate
```

### Rotation is bandwidth bias-cancellation

The Oncology Lab rotates the **input**, not the oracle bank. The enabled oracle masks stay fixed in positional coordinates on every parallel lane. Sixteen unique rotations are used: eight forward cyclic rotations plus eight mirrored cyclic rotations. Across the full bank every semantic dimension visits every oracle position exactly twice.

That is deliberate bias resistance: position- or dimension-specific effects move as the same information passes through the same oracle system, while structure that survives the complete rotation bank remains available to the Syntract bind. True-null exclusion is a separate test: one semantic dimension is absent from each exclusion family. An oracle is never removed because a dimension was nulled; only the constraint landing on the absent position is unobserved in that lane.

### 128 → 8 → 1 does not mean majority voting

The first 128 objects are **full QCDS lane distributions**, not 128 scalar votes.

Each of the eight semantic dimensions has a true-null family containing the same sixteen unique balanced input rotations. The family is bound with the same logarithmic full-distribution operator used by the canonical `RotationalSyntractBind`.

The eight family distributions are then bound into one higher-order Syntract. That bound structure is **not the final answer**: it becomes the input to a fresh executable **Parent Grover**. The Parent-Grover marked structures form the recursive oracle for the next QCDS cycle.

There is no separate `meanDistributions()`, winner averaging or ad-hoc "consensus state" algorithm in the current engine.

## Grover

The local and parent kernels use the canonical bounded QCDS Fabric Grover implementation from:

`qcds_fabric_4_2/src/qcds_fabric_4_2/grover.py`

The iteration count is selected dynamically from the actual `N` and `M`. QCDS walks the Grover success envelope forward and stops when the alignment threshold is reached or at the first local tangent/peak. It does not chase a later periodic recurrence and it does not hard-code `m=12`.

For the canonical validation case `N=256, M=1`, that procedure happens to stop at `m=12`, with probability approximately `0.999947`. Other `N/M` ratios produce different depths—for example `N=128, M=1` stops at the first tangent `m=8`.

The browser core ports the same equations and exposes the actual local Grover range and Parent-Grover depth for every recursive cycle.

## Input invariants

A user-supplied Condition remains globally binding.

For example:

```text
1111????
```

opens the sixteen states whose first four semantic dimensions are `1111`.

True-null lanes are allowed to temporarily remove one dimension to measure its influence, but after the complementary views are rebound, states that violate the original fixed `1111` Condition are not permitted to enter the Parent-Grover candidate space.

The automated tests assert this invariant.

## Top-down cancer oracles

The included masks are research/demo hypotheses carried forward from earlier QCDS cancer work:

- `dna_repair`
- `pi3k_axis`
- `receptor_axis`
- `hr_plus_broad`
- `pi3k_hr_combo`

They are treated as **alternative top-down oracle hypotheses (union / OR)** under the hard input Condition. If a true-null lane removes a semantic dimension, the oracle remains in the fixed bank, but the positional constraint falling on the absent value is unobserved; the remaining constraints are tested. No missing bit is fabricated. This follows the browser core and its rotation regression test.

A recursive Parent-Grover return is an additional constraint on the next cycle.

These demo masks are not clinical rules.

## Quantum / NISQ boundary

The current browser build uses exact ideal bounded amplitude amplification plus balanced semantic/position rotations. It does **not** inject an invented hardware-noise calculation into the QCDS result.

That separation is intentional:

- QCDS logical semantics: Condition, oracle, true null, Grover, Syntract Bind, Parent Grover, recursion.
- physical / NISQ layer: actual qubit mapping, readout/connectivity/transpilation effects and device noise.

A future NISQ-noise pass should be driven by a declared simulator or real hardware calibration model and compared against the same ideal logical run. It should not silently alter the QCDS mathematics.

## Recursive stability

The run does not stop merely because one state happens to be top once.

The stability gate tracks the same families of signals used by QCDS Fabric:

- distribution change,
- entropy change,
- top identity,
- Top-K overlap,
- dimension-influence change.

The maximum cycle count is a safety bound. Stable recursive structure can terminate earlier once the configured gate is satisfied.

## Browser core and Python reference

The browser engine is in:

`qcds-core.js`

The Python orchestration layer is:

`engine.py`

The Python engine imports and reuses the canonical QCDS Fabric Grover and Rotational Syntract primitives already in this repository rather than carrying a separate Grover implementation.

The browser core ports those same bounded primitives so the live page can execute without a server.

## Run locally

```bash
cd qcds-cancer-lab
python run_demo.py --mask '????????'
python run_demo.py --mask '1111????'
python run_demo.py --mask '01101001'
```

Tests:

```bash
PYTHONPATH=../qcds_fabric_4_2/src python -m pytest -q tests/test_engine.py
node tests/test_core.js
```

The test suite checks, among other things:

- canonical `256 / 1` Grover peak = `m=12`,
- 128 local QCDS lanes per cancer cycle,
- eight true-null families,
- fresh Parent Grover execution,
- complete logic without `?`,
- fixed input bits such as `1111????` cannot disappear from the final output distribution.

## Research / medical boundary

This is an experimental inference architecture. It is not a diagnostic system, medical device or treatment recommendation and must not be used for clinical decision-making without appropriate validation, regulation and qualified medical oversight.

## Inference Observatory — October 22, 2026

The website now includes a **data-linked** logical space inspired by the SCC Mandelbrot observatory. The view is not a pre-rendered animation:

- Matrix = eight true-null families (rows) × sixteen balanced rotations (columns), **128 real computed local lanes per recursive pass**.
- Every cell inspects the same engine's `N`, `M`, Grover iteration count `m`, marked probability mass, highest individual probability and entropy.
- The display refreshes when each group of eight local Grover kernels completes, using the actual `onProgress.lanes` results. No made-up interpolation.
- After a run, selecting a recursive pass restores its 128 lane observations and the eight family distribution summaries. Each family shows its top canonical bit-string and associated normalized family probability.
- The Parent Grover summary shows the selected pass's actual candidate space, marked count, iterations and marked mass. The stability gate is shown independently; Grover amplification is **not** biological or mathematical truth verification.
- The visualization is plain HTML/CSS/JavaScript, keyboard-accessible for individual cells, and horizontally scrollable on small displays. Typography uses non-condensed system fonts with readable body text.

**Important computational distinction:** The 128 lanes are parallel *logical entrances / perspectives*; the current reference **browser** engine computes them sequentially in an asynchronous yielding loop to keep the UI responsive. This is not 128-way hardware parallel execution and does not demonstrate quantum advantage or a hardware speedup. The architecture can map independent lanes onto additional physical compute backends in the future; only measured backend results should be reported as physical throughput.

**Semantics:** fixed 0/1 Condition bits survive the true-null sensitivity experiment after Syntract binding; `?` represents unresolved represented input bits, while true-null means a dimension is absent from that lane. Eight exclusion families are combined using full normalized distributions (a logarithmic opinion pool), not majority votes. Stability across repeated cycles measures changes in distributions, entropy, top-state identity, top-k and dimension influence.

**Research scope:** The included cancer oracle masks are illustrative mechanistic hypotheses, not patient-derived measurements or clinically validated rules. The result is not a diagnosis, a therapy recommendation, a malignancy probability, or a medical device.

Run `node qcds-cancer-lab/tests/test_core.js` to check numerical invariants and the observation bridge. Run the Python test module for the reference implementation independently.


## Oncology research workspace — 22 October 2026

The public Oncology Lab opens directly into an **oncology-oriented research workspace**, not a marketing landing page. Its styling, evidence disclosures and reference layer are designed for scientific review. This does not imply any clinical certification.

### Two distinct layers

**1. Scientific reference material:** \`clinical-knowledge.js\` contains source-linked descriptions for five named exploratory oracle topics, eight semantic model dimensions and ten QCDS concepts. The reference drawer explains molecular pathways, illustrative genes, assays and measurements that would be necessary for clinical interpretation, key caveats, and links to sources including the National Cancer Institute and peer-reviewed literature.

**2. Executable computational rules:** \`qcds-core.js\` evaluates synthetic, eight-position \`0/1/?\` masks on ideal Grover distributions. The current masks are NOT gene variant encoders, validated cancer classifications, biomarker signatures or therapy recommendations. Editing these masks changes the mathematical demonstration only. There is **no pipeline connecting the scientific reference prose to molecular or patient evidence**. The site explicitly separates these two layers.

Click a **?** next to any oracle or model concept. The information drawer provides the current edited mask (not an outdated default), its fixed-position restrictions and the unrotated dimension reference. The interpretation is carefully qualified: during the 16 QCDS input rotations, semantic dimensions move across fixed oracle positions. An oracle name such as “DNA repair” does NOT mean its bit positions remain mapped to BRCA1/2 or measured HRD in all runs.

The eight-dimension feature dictionary always displays the current symbolic bit and offers a detailed definition. A 1 is not automatically a pathogenic variant, a 0 is not necessarily a negative clinical assay result, and ? means the symbolic dimension is unresolved—not a third clinical result class. The true-null exclusion family is a different concept: a semantic feature is **absent** for a sensitivity ablation.

### Built-in research topics (illustrative, not clinically validated)

| Named topic | Fixed legacy mask | What the help drawer explains |
| --- | --- | --- |
| DNA repair | \`11??0???\` | HRR vs MMR; BRCA1/2, PALB2, RAD51 genes; genetic/functional assay needs; non-specific mask |
| PI3K axis | \`??1?1???\` | PI3K–AKT–mTOR, PIK3CA/PTEN and pathway readouts; non-specific positional constraint |
| Receptor axis | \`???111??\` | EGFR and HER2/ERBB2; variant vs amplification vs expression; receptor not encoded by current mask |
| HR + broad | \`1??1????\` | Homologous recombination biology, HRD/HRR distinctions and unspecified ‘broad’ scope |
| PI3K + HR | \`??11????\` | Proposed cross-pathway hypothesis requiring specific causal test and independent validation |

The numbered positions P1…P8 are *positions*, not immutable gene identifiers. In unrotated order their semantic names are D1 Mutation load, D2 DNA repair, D3 Growth signal, D4 Apoptosis escape, D5 Immune evasion, D6 Target engagement, D7 Resistance and D8 Cell process.

### Review protocol

- Inspect a hypothesis's **?** reference: separate the biologically established pathway from the unvalidated computational predicate.
- Choose symbolic Condition and enabled oracles, adjust depth and run.
- Inspect local \`N\`, \`M\`, Grover iteration count, marked probability mass, entropy and the selected lane, with 16 rotations × 8 null exclusions.
- Review the full-distribution 128→8→1 bind and the Parent Grover result; inspect every recursive pass and stability gate.
- Interpret all probabilities as **conditional on the simulated oracle construction**. No outcome is cancer probability, gene pathogenicity probability, prognosis or drug benefit estimate.

For scientific validation in a later research system, separately specify tumor setting, analyte, assay, specimen, evidence provenance, observation-to-bit mapping, oracle semantics, negative controls, independent test data and endpoints. Nothing in the current application authorizes patient-level clinical use.

### Files

- \`clinical-knowledge.js\` — curated reference content and source URLs, independent of numerical rules.
- \`clinical-ui.js\` — accessible reference library and detailed scientific explanation drawer.
- \`clinical.css\` — professional editorial/clinical research UI layer and responsive controls.
- \`app.js\` — live inputs and trace rendering.
- \`qcds-core.js\` — unchanged numerical hypothesis model; no patient data.
- \`inference-room.js\` — per-lane observations and recursive trace.

All additions in this section are research documentation, **not assertions of clinical efficacy**.


## Guided reproducible examples — Oncology Lab

**Where:** open the public Oncology Lab and select **Översikt → Prova ett färdigt exempel**. Two buttons load complete configurations through \`CancerGenomePerspective.loadExample\`. The same on-screen form, 10D cohort oracle, 16→4→1 QCDS probability funnel and statistical audit are used as for a manually entered condition. No hidden answer masks or pre-rendered biological discoveries are supplied. Each example changes the actual inputs and re-executes the model. A dynamic Swedish-language explanation remains present on each of the three relevant pages: **Undersökning, Resultat och QCDS-motorn**.

- **Search for an unexpected relationship (recommended):** reproducible synthetic seed 42, structure mode, 8 fictional case profiles and 12 fictional comparators; no anchor; joint-presence relation; require ≥5/8 cases, ≤2/12 comparisons, at most six rotations, ideal amplitude simulation with no additional readout mixing. At this exact version of the model, a mathematically admissible combination emerges and the numerical stability criteria are met. The explanation obtains actual loci, support, count of rotations and verification limitations from the result. This is a purposely selected **teaching fixture**, not independent evidence of oncology causality or a fair estimate of sensitivity/precision.
- **Negative-comparison demonstration:** reproducible seed 81, null mode, otherwise the same parameters. This particular generated dataset yields zero oracle-qualified combinations and therefore must show no selected locus. Many other null datasets **can** produce accidental positives; one negative run is not a proof of general noise rejection or clinical specificity.

Both scenarios use 8+12 only as an **illustration**, not a maximum or minimum inherent to QCDS. The browser keeps independent editable sizes (2–30 in each group), symbolic 10-locus state size, and all existing advanced controls. Changing an example labels it as modified and recomputes the explanations from the current numerical result.

## Group size is a model input, not part of QCDS — updated 22 October 2026

The example of *five people with a cancer and five comparison profiles* came from one explanation. **Neither five people nor equal-sized groups are an architectural QCDS assumption.** In the Oncology Lab UI, users choose independent group sizes from 2 to 30 synthetic profiles per group; the generating module accepts 2 to 100. These are **browser/example limits**, not claims about the limits of the substrate-independent QCDS architecture. The ten-locus encoding and 16-lane 4→1 rotating funnel are also finite teaching/reference configurations, not genome-wide limits.

Regenerating a synthetic cohort updates the data matrix, individual visualization tracks, percentage-scaled cohort thresholds, full-cohort oracles, Grover distributions and the recorded statistical check. The default five-and-five dataset is retained as a **reproducible test fixture** only.

The multiple-comparison audit scales with group size. With **12 or fewer total profiles**, every assignment of the existing profiles into groups of the selected sizes is evaluated (for example, 5+5 produces C(10,5)=252 groupings). With **more than 12 total profiles**, the UI executes **399 reproducible random assignments** and displays a *Monte Carlo estimate*, not an exact enumeration. Its adjusted estimate is (1+extreme)/(1+399); this is diagnostic conditional on an already chosen model and not proof of cancer biology.

The historical audit's 57/100 null results and 22/252 reassignment statistic are **measurements of one specific 5+5 demonstration configuration**, not universal QCDS rates, fixed QCDS input bandwidth, or claims that five observations suffice for any oncology inference.

## Open cross-genome combinatorial inference — 22 October 2026

The Oncology Lab genomics panel no longer performs contiguous DNA-string matching or searches for a planted three-position answer. It demonstrates a **hypothesis-open logical search over relations between positions** in multiple synthetic profiles. The 8D Oncology Lab workbench is separate from this 10D cohort demonstrator.

### Input width, candidate space and oracles

- The illustrative 10-locus browser model now supports independently selected case and comparison group sizes (2–30 in the UI, 2–100 in the synthetic engine). The former default of 5+5 gave **100 synthetic 0/1 observations**, with chromosome labels used only for graphical perspective, not authentic genomic coordinates.
- A chosen random seed (1–1,000,000) produces reproducible but different profile matrices. The generator samples locus-specific background probabilities and group-related variation. **No winning locus mask or target combination is inserted.** Another seed or user-editable observation can change the result.
- The *null* generator has no systematic case-specific group effect. Especially with small samples and many tested combinations, it can still produce accidental associations. Thus a pattern or very high internal amplification probability is not evidence of cancer causality.
- The logical representation contains **2^10 = 1,024 possible subset states**. It evaluates every 2-, 3- and 4-locus subset: **375 candidate relations**. Subset size is not forced to three; between zero and three anchor loci can be bound and all other positions stay open.
- The first oracle checks **case support**, **maximum comparator support**, **anchor compatibility** and a *preselected relation family*: either (i) joint presence or (ii) an odd-parity interaction, where both 0 and 1 features can form a relation. These are generic, explicitly user-visible rules, not answers encoded as gene names.
- All oracle-qualified subsets are marked and processed by the actual **QCDSCore.runGrover** kernel. The shared implementation uses **alignment threshold 0.999**, stops at the **first Grover tangent/peak** rather than chasing periodic recurrences, and caps iterations at **40**.
- A second, predefined inference stage refines candidates to **the strongest measured case-vs-comparator contrast** (retaining equal-best candidates rather than pretending they are unique). A second independent Grover calculation amplifies this refined set. Neither stage receives a target state.
- The display reports both Grover iteration counts and probability masses and names the first stage's stopping reason. Where multiple relations survive, it says so. A winning locus relation is highlighted across the case profiles; for odd-parity relations both present and absent contributors are visualized with different markers.

### Robustness and source of apparent coherence

The results panel repeats the analysis under **five independent 8%-bit-perturbed synthetic inputs**, five leave-one-case-out tests, and one case/control-label reversal. It reports whether the *same leading relation* survives and whether it remains among candidate solutions.

These exercises are **sensitivity probes, not proof of bias/noise resistance**. Noise in a NISQ device involves gates, readout, decoherence and hardware topology and is not equivalent to flipping synthetic input bits. These synthetic datasets, regardless of group size, do not establish clinically validated associations or medical biomarkers. Internal stability is not clinical truth.

### Substrate and bandwidth

QCDS's substrate-independent ambition is to separate **Condition and oracle semantics** from their physical evaluation. This prototype shows one small exactly simulable search space with 100 pieces of incoming synthetic evidence, 1,024 logical subset states, independently testable relation oracles and two ideal amplitude-amplification stages. The browser performs those evaluations **classically**. It does not read complete human genomes simultaneously, perform quantum operations on hardware, demonstrate true hardware-level parallel throughput or validate an advantage over optimized classical methods.

The intended much larger system needs whole-genome data across persons, a scalable locus-and-relationship representation, validated oracle mappings, resource budgets for NISQ/noise models and higher-bandwidth substrates, reproducible measurements and independent biological validation. The present code is a small architectural example, not a measured genome-scale result.

Implementation: [genome-discovery.js](genome-discovery.js) is the parameterized cohort generator and QCDS oracle/assessment layer; [genome-perspective.js](genome-perspective.js) is the UI adapter; [tests/test_genome.js](tests/test_genome.js) covers different seeds, absence of a known answer, tangent/threshold behavior, parity, zero-solution cases and the perturbation audit. Code contains no secret target mask or prefilled winning locus IDs.

Theory and creation: **Patrik Sundblom**. Research and development support: **OpenAI / ChatGPT**.


## Rotating bandwidth funnel — 16 → 4 → 1 (October 22, 2026)

The Oncology Lab synthetic cohort panel now runs a **numerical rotating probability funnel**, rather than labeling a two-stage Grover search as QCDS. This is a transparent, substrate-independent **reference implementation** of the architecture, not a quantum-hardware execution.

**Actual data flow in each rotation**

1. **High-bandwidth Condition formation:** ten synthetic locus dimensions across N cases and M comparators (10×(N+M) invented 0/1 observations; N and M are adjustable). A Condition may select zero to three anchors; the oracle tests joint presence or odd-parity interactions with case/control thresholds.
2. **Sixteen small four-bit logical rooms:** 16 lanes are assigned different deterministic windows from the 210 four-locus windows; mapped locus positions and order rotate. Every lane performs a genuine 16-state local oracle search using QCDSCore.runGrover with the existing first-tangent/peak, 0.999 alignment threshold, and no more than 40 Grover iterations.
3. **Four 4→1 probability syntheses:** each four-lane group passes **all 16 local probabilities** as joint factors into an embedded 1024-state candidate representation by a normalized logarithmic opinion pool. No winner-only reduction.
4. **One 4→1 global bind:** a second log opinion pool binds four 1024-state group distributions into one normalized 10D distribution. Joint correlations present within each small four-locus factor can affect global ranking. Four-locus factors alone do **not** guarantee recovery of arbitrary higher-order ten-locus correlations.
5. **Rotation synthesis:** each completed rotation gives a fresh probability distribution from different dimension projections. Rotation outputs enter an equal-weight running log opinion pool; earlier results are NOT multiplied again as independent evidence. Convergence needs two successive transitions with total-variation distance <= 0.025, top-eight Jaccard >= 0.70 and entropy difference <= 0.08 bits, after at least three rotations. A user chooses a cap of 3, 6, 9 or 12 passes. Failure to converge is explicitly reported.
6. **Truth-alignment and Parent Grover:** every proposed 2–4-locus candidate is independently checked against the complete case/control matrix and the original Condition. The leading verified candidates within 80% of the leading folded probability are collectively amplified using QCDSCore.runGrover(1024, ..., 40). If multiple candidates survive, the UI says so. Zero verified outcomes are permitted. Only verified candidates produce genome highlights.

**Inspectable user interface:** sixteen computed sixteen-bin local probability visualizations per chosen rotation; four actual folded group distributions with entropy; live rotational pass selection; full-cohort-truth-gated probability ranking and selectable genome highlights; Parent Grover probability mass and iterations; editable source matrices and Condition; stability diagnostics, information loss caveat and noise-proxy selector.

**NISQ and bias limits:** A selectable 0, 8, 15 or 25% uniform mixture models *synthetic readout uncertainty* at the local probability level. This is a classical proxy, NOT a quantum-device error model (gates, coupling, relaxation, correlated noise, readout errors). Separate five-trial input bit-flip, leave-one-case-out and case/control-label inversion reports are based on a standalone full-cohort oracle, not full funnel reruns. None proves hardware NISQ resilience, immunity to bias, biological causality or a quantum advantage.

**Resource accounting:** The browser evaluates the sixteen four-bit searches **sequentially in software** on each rotation, not in quantum-hardware parallel. Four group folds and one final bind work over the 1,024-state representation. This is a finite model, not unbounded intelligence or a measured ability to search five complete genomes. Probability folding and rotation cannot automatically recover correlations discarded by marginalization. Further genomics research needs actual patient/genome data and ethically sourced provenance, scalable semantic encoding, oracles, quantum/noisy or classical backends, resource measurement, classical baselines and independent validation.

**Files:** genome-funnel.js, genome-discovery.js, genome-perspective.js, and tests/test_funnel.js. Text source is directly inspectable; no encoded script payloads.

**Theory and creation:** Patrik Sundblom. **R&D support:** OpenAI / ChatGPT.
