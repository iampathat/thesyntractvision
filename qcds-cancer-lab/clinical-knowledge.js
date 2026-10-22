/* Cancer Lab oncology reference.
 * Public reference material for research orientation, not diagnostic logic.
 * All masks are synthetic, fixed-position QCDS examples, NOT clinical classifiers.
 * © 2026 Patrik Sundblom — R&D support OpenAI / ChatGPT.
 */
(function(root){
  "use strict";
  const sources={
  "biomarkers": {
    "label": "NCI · Biomarker testing for cancer treatment",
    "url": "https://www.cancer.gov/about-cancer/treatment/types/biomarker-testing-cancer-treatment"
  },
  "brca": {
    "label": "NCI · BRCA gene changes and testing",
    "url": "https://www.cancer.gov/about-cancer/causes-prevention/genetics/brca-fact-sheet"
  },
  "hrr": {
    "label": "NCI · Homologous recombination repair pathway",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/homologous-recombination-repair-pathway"
  },
  "mmr": {
    "label": "NCI · Mismatch repair deficiency",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/mismatch-repair-deficiency"
  },
  "pi3k": {
    "label": "Janku et al. · PI3K pathway in cancer · Nat Rev Clin Oncol (2018)",
    "url": "https://www.nature.com/articles/nrclinonc.2018.28"
  },
  "pi3kr": {
    "label": "PI3K/AKT/mTOR pathway review · Molecular Cancer (2023)",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10436543/"
  },
  "egfr": {
    "label": "NCI · EGFR gene",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/egfr-gene"
  },
  "her2": {
    "label": "NCI · HER2 protein",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/her2"
  },
  "htest": {
    "label": "NCI · HER2 testing",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/her2-test"
  },
  "pdl1": {
    "label": "NCI · PD-L1 and immune checkpoint biology",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/pd-l1"
  },
  "apoptosis": {
    "label": "NCI · Apoptosis",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/apoptosis"
  },
  "sitc": {
    "label": "SITC · PD-(L)1 resistance consensus review (2024)",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11261685/"
  }
};
  const dimensions=[
  {
    "name": "Mutation load",
    "type": "Genomic burden",
    "summary": "Burden and pattern of somatic alterations in tumor material; not simply ‘a mutation is present’.",
    "biology": "Tumor mutational burden (TMB) is commonly measured as somatic variants per megabase of examined DNA, subject to assay definition, filtering and sample quality. Mutation signatures and individual drivers are distinct from total burden.",
    "genes": "No single defining gene. Context-dependent examples: POLE, POLD1 and DNA mismatch-repair genes MLH1, MSH2, MSH6, PMS2.",
    "evidence": "Validated sequencing assay, variant calling method, specimen quality, tumor purity, units, and tumor-type-specific interpretation.",
    "caution": "This demo has no raw sequence, assay cutoff or TMB calibration. Assigning 1/0 cannot establish high/low TMB or imply sensitivity to immunotherapy.",
    "sourceKeys": [
      "biomarkers",
      "mmr"
    ]
  },
  {
    "name": "DNA repair",
    "type": "DNA damage response",
    "summary": "Ability of a defined DNA repair pathway to repair specified classes of damage.",
    "biology": "Multiple repair systems exist. Homologous recombination repair (HRR), mismatch repair (MMR), nucleotide-excision repair and others cannot be collapsed into one clinically equivalent axis without a stated construct.",
    "genes": "BRCA1, BRCA2, PALB2, RAD51C/RAD51D (HRR examples); MLH1, MSH2, MSH6 and PMS2 (MMR examples).",
    "evidence": "Tumor and/or germline variant annotation, copy-number/second-hit status, HRD or MMR assay where appropriate, and tumor-context interpretation.",
    "caution": "A BRCA variant, an HRD score and functional HRR deficiency are different pieces of evidence. This binary state is not a molecular diagnosis.",
    "sourceKeys": [
      "brca",
      "hrr",
      "mmr"
    ]
  },
  {
    "name": "Growth signal",
    "type": "Oncogenic signaling",
    "summary": "Downstream proliferative signaling from receptor and intracellular signaling networks.",
    "biology": "EGFR/HER2, RAS–RAF–MEK–ERK and PI3K–AKT–mTOR are related but distinguishable mechanisms; alterations are highly context and variant specific.",
    "genes": "EGFR, ERBB2 (HER2), KRAS, NRAS, BRAF, PIK3CA, AKT1, PTEN, MTOR.",
    "evidence": "Gene and variant context, amplification/copy number, expression, phosphoprotein measurements and pathway functional evidence when available.",
    "caution": "Expression or mutation does not alone quantify pathway activity, drug dependence or treatment selection.",
    "sourceKeys": [
      "egfr",
      "her2",
      "pi3k"
    ]
  },
  {
    "name": "Apoptosis escape",
    "type": "Cell-death regulation",
    "summary": "Reduced susceptibility to regulated cell death (apoptosis) in a defined biological context.",
    "biology": "The balance of pro- and anti-apoptotic signaling depends on TP53 regulation, BCL-2 family proteins and upstream stress or receptor signaling. Assays are not interchangeable.",
    "genes": "TP53, BCL2, BCL2L1, MCL1, BAX, BAK1 and CASP genes are illustrative pathway participants.",
    "evidence": "Tumor genotype, relevant protein activity, functional apoptosis assays, context and perturbation response.",
    "caution": "No apoptotic phenotype was measured here; 0 or 1 represents a symbolic modeling assumption only.",
    "sourceKeys": [
      "apoptosis",
      "biomarkers"
    ]
  },
  {
    "name": "Immune evasion",
    "type": "Tumor–immune interface",
    "summary": "Mechanisms reducing immune recognition, infiltration, activation or effector response.",
    "biology": "PD-1/PD-L1 checkpoint interaction is one mechanism among antigen-presentation changes, immunosuppressive signaling and microenvironmental effects.",
    "genes": "CD274 (PD-L1), PDCD1 (PD-1), B2M and HLA class I loci are mechanistic examples, not a mandatory clinical panel.",
    "evidence": "Tumor-type-appropriate immunohistochemistry and scoring, immune context, sequencing, and tumor microenvironment measurements.",
    "caution": "PD-L1 level does not equal a full immune-evasion state, and its meaning differs by tumor and assay.",
    "sourceKeys": [
      "pdl1",
      "biomarkers"
    ]
  },
  {
    "name": "Target engagement",
    "type": "Pharmacology / pharmacodynamics",
    "summary": "Whether an intervention reaches and engages a specific molecular target in the relevant compartment.",
    "biology": "An actionable gene alteration, drug exposure, target occupancy and measurable pathway inhibition are four distinct concepts.",
    "genes": "Depends on the intervention. Examples of targets include EGFR, HER2, PI3K or PARP; these are not one equivalent measurement.",
    "evidence": "Assay of exposure, occupancy or suitable pharmacodynamic marker, time since dose, target and tissue context.",
    "caution": "No drug, dose, concentration or pharmacodynamic assay is entered in this demo. A 1 does not demonstrate drug effect.",
    "sourceKeys": [
      "biomarkers",
      "egfr",
      "htest"
    ]
  },
  {
    "name": "Resistance",
    "type": "Treatment response / adaptation",
    "summary": "Failure of response from the outset or loss of benefit after an earlier response, for a specified therapy.",
    "biology": "Resistance may involve on-target changes, alternative signaling, phenotypic adaptation or immune mechanisms. Definitions depend on treatment modality and disease context.",
    "genes": "Examples only: EGFR or downstream RAS/PI3K pathway alterations; mechanisms differ substantially by drug and tumor.",
    "evidence": "Drug/regimen and timeline, serial assessment, relevant biopsy or ctDNA where clinically indicated and properly interpreted.",
    "caution": "Without a treatment, time course and response criterion, a binary ‘resistance’ dimension cannot be interpreted clinically.",
    "sourceKeys": [
      "sitc",
      "biomarkers"
    ]
  },
  {
    "name": "Cell process",
    "type": "Composite biological state",
    "summary": "A broad placeholder for cell-cycle, metabolism, stress, chromatin and phenotype programs.",
    "biology": "Cell process is not one defined pathway. It spans distinct mechanisms whose readouts, causal relationships and timescales vary.",
    "genes": "Examples depend on what is modeled: CDK4/6, RB1, CCND1, MYC, MTOR, HIF1A and other pathway members.",
    "evidence": "Specify a particular process, assay, sampling time and rule mapping assay evidence into the model.",
    "caution": "A clinically interpretable implementation must split this heterogeneous placeholder into separately operationalized dimensions.",
    "sourceKeys": [
      "biomarkers",
      "pi3kr"
    ]
  }
];
  const oracles=[
  {
    "id": "dna-repair",
    "name": "DNA repair",
    "category": "DNA damage response",
    "summary": "Exploratory, legacy-position mask labeled for DNA repair; not a demonstrated HRR or MMR classifier.",
    "biology": "DNA damage response includes multiple mechanistically distinct processes. BRCA1/2/PALB2 participate in homologous-recombination repair, whereas MLH1/MSH2/MSH6/PMS2 participate in mismatch repair. A disease-specific oracle would require separately defined predicates for the assayed alteration, functional consequence, sample type and tumor context.",
    "genes": "BRCA1 · BRCA2 · PALB2 · RAD51C/RAD51D · MLH1/MSH2/MSH6/PMS2",
    "evidence": "Examples of candidate evidence: clinically interpreted sequencing, relevant second-hit evidence, HRD testing or MMR IHC/MSI where contextually appropriate. None are loaded here.",
    "limitations": "The original mask 11??0??? fixes three positional bits. This is a synthetic test constraint; even in the unrotated orientation it mixes mutation burden, DNA repair and immune evasion. It does not prove or quantify DNA repair deficiency.",
    "question": "What exact repair mechanism and assay-backed predicate is this oracle supposed to represent?",
    "sourceKeys": [
      "brca",
      "hrr",
      "mmr",
      "biomarkers"
    ]
  },
  {
    "id": "pi3k",
    "name": "PI3K axis",
    "category": "Proliferation / survival signaling",
    "summary": "Hypothesis label for PI3K–AKT–mTOR signaling. The current mask is a positional toy, not a pathway activation test.",
    "biology": "Receptor or genomic alterations can activate the PI3K–AKT–mTOR axis, influencing survival, growth and metabolism. PIK3CA and PTEN alterations have different biochemical meanings. Pathway activation can depend on compensatory signaling, tissue and treatment context.",
    "genes": "PIK3CA · PIK3R1 · PTEN · AKT1 · MTOR · TSC1/TSC2",
    "evidence": "Variant- or copy-number-aware tumor profiling together with suitable activity/functional readouts where available; tumor-specific knowledge bases and evidence tiers should be assessed separately.",
    "limitations": "The existing mask ??1?1??? fixes positional bits 3 and 5. There is no demonstrated measurement model linking those positions to PI3K activation or immune evasion.",
    "question": "Is the intended predicate a PIK3CA alteration, PTEN loss, phosphorylated pathway activity or sensitivity to a specific perturbation?",
    "sourceKeys": [
      "pi3k",
      "pi3kr",
      "biomarkers"
    ]
  },
  {
    "id": "receptor",
    "name": "Receptor axis",
    "category": "Receptor tyrosine kinase signaling",
    "summary": "Exploratory label covering receptor-driven signaling; receptor identity and alteration type are not yet encoded.",
    "biology": "EGFR and HER2/ERBB2 are receptor tyrosine kinases. Activating EGFR variants or HER2 overexpression/amplification can be meaningful in particular cancers, but the relevant assays, thresholds and therapeutic implications are indication-specific.",
    "genes": "EGFR (ERBB1) · ERBB2 (HER2) · ERBB3 · MET · FGFR family",
    "evidence": "Specified receptor and alteration, variant annotation, IHC/ISH or sequencing readout as appropriate, tumor type and pre-defined evidence rule.",
    "limitations": "The current mask ???111?? fixes positions 4, 5 and 6, which are not a receptor-specific gene panel. Rotations further change which biological dimensions occupy each fixed position.",
    "question": "Which receptor, which alteration and which tumor-specific interpretation should be represented?",
    "sourceKeys": [
      "egfr",
      "her2",
      "htest",
      "biomarkers"
    ]
  },
  {
    "id": "hr-broad",
    "name": "HR + broad",
    "category": "Homologous recombination / composite",
    "summary": "Composite exploratory label; ‘HR’ is intended as homologous recombination, not a measured HRD status.",
    "biology": "Homologous recombination repair is a DNA double-strand-break repair process involving BRCA1/2 and other proteins. Functional deficiency, germline predisposition and a tumor genomic scar are separate notions. ‘Broad’ has no formal domain definition in this prototype.",
    "genes": "BRCA1 · BRCA2 · PALB2 · RAD51C · RAD51D · ATM (context-dependent)",
    "evidence": "Define HRR alteration versus measured HRD; specify broader features, combining rule, negative controls and tumor setting.",
    "limitations": "The legacy mask 1??1???? binds positions 1 and 4 in the unrotated orientation (mutation load and apoptosis escape), not directly HRR. It must not be read as HRD positive.",
    "question": "What is the pre-specified meaning of broad, and what independently validates the HRR component?",
    "sourceKeys": [
      "hrr",
      "brca",
      "biomarkers"
    ]
  },
  {
    "id": "pi3k-hr",
    "name": "PI3K + HR",
    "category": "Cross-pathway interaction",
    "summary": "Exploratory cross-domain hypothesis combining a growth-signaling concept with DNA-repair biology.",
    "biology": "PI3K signaling and DNA damage-response pathways can interact in specific biological contexts, but a causal interaction cannot be inferred from a generic two-bit conjunction. A testable model needs an explicit molecular hypothesis and an independent measured endpoint.",
    "genes": "PIK3CA · PTEN · AKT1 · BRCA1 · BRCA2 · PALB2 (illustrative, not a validated combined signature)",
    "evidence": "Orthogonal pathway assays, alteration annotations, controlled perturbation or cohort analysis, pre-specified comparator and reproducibility.",
    "limitations": "The existing mask ??11???? binds positions 3 and 4 (growth signal / apoptosis escape) in the unrotated order, not a molecular demonstration of PI3K–HR co-dependency.",
    "question": "What directional relationship, causal mechanism, and independent validation endpoint are being proposed?",
    "sourceKeys": [
      "pi3k",
      "hrr",
      "biomarkers"
    ]
  }
];
  const methods=[
  {
    "id": "state",
    "name": "0 / 1 / ? · Logical condition",
    "category": "Model semantics",
    "summary": "In this prototype, 0 and 1 fix a bit; ? leaves it unresolved. These values are NOT clinical result categories.",
    "biology": "A cancer feature needs an explicit operational definition, assay, threshold, specimen and tumor context before an encoded bit could be interpreted as absent/present or low/high. Without that mapping, bits are only symbolic constraints.",
    "limitations": "1 is not automatically pathogenic, activated or favorable; 0 is not automatically wild type, inactive or negative. ? is not a third measured biological result.",
    "sourceKeys": [
      "biomarkers"
    ]
  },
  {
    "id": "mask",
    "name": "Oracle masks / fixed positions",
    "category": "Model semantics",
    "summary": "An eight-symbol pattern constraints positions; ? is a wildcard.",
    "biology": "The present engine evaluates OR across enabled oracle masks. It rotates the semantic input across a fixed positional oracle bank. As a result, an oracle named after a pathway does not retain a fixed semantic gene mapping in every rotation. Each rule must be separately mapped and validated for clinical meaning.",
    "limitations": "The example masks are synthetic hypotheses; the code does not infer gene-variant pathogenicity or clinical actionability.",
    "sourceKeys": [
      "biomarkers"
    ]
  },
  {
    "id": "null",
    "name": "True-null exclusion",
    "category": "Sensitivity analysis",
    "summary": "A named dimension is absent from a lane; it is not assigned an unknown clinical status.",
    "biology": "Each of the eight exclusion families removes one semantic dimension at a time, repeats all sixteen balanced rotations and measures how distributions change. This is an internal ablation test.",
    "limitations": "A large effect shows sensitivity to model structure, not clinical importance or biomarker validation.",
    "sourceKeys": []
  },
  {
    "id": "rotation",
    "name": "Rotation · 16 balanced views",
    "category": "Algorithm",
    "summary": "Eight forward and eight mirrored position mappings cycle the semantic input across fixed oracle positions.",
    "biology": "Each semantic dimension visits each fixed oracle position twice. The bank checks positional bias and alternative logical perspectives, rather than proving a biological mechanism.",
    "limitations": "Positional balance does not substitute for external calibration, biological independence or prospective clinical validation.",
    "sourceKeys": []
  },
  {
    "id": "lanes",
    "name": "128 logical entrances / 8 families",
    "category": "Algorithm",
    "summary": "16 rotations × 8 true-null exclusions = 128 independently defined local search spaces.",
    "biology": "Each local 7-bit lane has N=128 states; the browser evaluates lanes sequentially while yielding UI updates. Sixteen lane distributions per exclusion family are bound before 8→1 synthesis.",
    "limitations": "This is logical breadth, not 128 simultaneously executing hardware threads or evidence of a quantum speedup.",
    "sourceKeys": []
  },
  {
    "id": "grover",
    "name": "Grover iterations, N, M, marked mass",
    "category": "Algorithm",
    "summary": "Amplitude amplification increases the measurement probability of states selected by the current oracle.",
    "biology": "N is the local state count, M the number of oracle-marked states, and m the number of bounded amplification iterations. A success or marked-mass probability is conditional on the constructed model and oracle.",
    "limitations": "A 99% marked mass is not a 99% probability of cancer, a driver mutation or treatment response.",
    "sourceKeys": []
  },
  {
    "id": "syntract",
    "name": "Syntract 128→8→1 binding",
    "category": "Algorithm",
    "summary": "Full normalized lane distributions are combined by a logarithmic pooling operator.",
    "biology": "The binding retains distributions, not just winning votes. Eight family distributions are rebound to the input Condition; Parent Grover then explores the candidate structure.",
    "limitations": "Coherence is a property of the defined inference system. It is not independent confirmation of an oncologic mechanism.",
    "sourceKeys": []
  },
  {
    "id": "parent",
    "name": "Parent Grover / recursive return",
    "category": "Algorithm",
    "summary": "A new amplification step runs after the eight-family bind and returns selected canonical states as subsequent constraints.",
    "biology": "A parent probability belongs to a model-specific distribution. Recursive feedback can alter subsequent eligible states and should be audited for selection bias and dependence.",
    "limitations": "A leading state, even if amplified, cannot be labeled biomarker-positive or verified without external evidence.",
    "sourceKeys": []
  },
  {
    "id": "stability",
    "name": "Stability / Truth alignment",
    "category": "Algorithm audit",
    "summary": "Internal consistency across cycles is checked using multiple numerical indicators.",
    "biology": "The current gate inspects distribution drift (TVD), entropy, leading state, top-k Jaccard and dimensional influence. Consistency is one necessary audit property, not evidence of clinical validity.",
    "limitations": "‘Stable’ is NOT a clinical validity certification; noisy or incorrect rules can also converge stably.",
    "sourceKeys": []
  },
  {
    "id": "provenance",
    "name": "Provenance / validation status",
    "category": "Research governance",
    "summary": "Distinguish curated biological context from unvalidated modeling assumptions and from measured engine output.",
    "biology": "A model-ready clinical feature needs analyte definition, assay method, specimen, analytical validation, evidence classification and intended tumor/decision context.",
    "limitations": "These five built-in oracle masks are legacy demo templates. The page does not contain patient-level datasets, molecular annotations, external validation or an approved clinical interpretation pipeline.",
    "sourceKeys": [
      "biomarkers"
    ]
  }
];
  root.CancerLabKnowledge=Object.freeze({sources,dimensions,oracles,methods});
})(globalThis);
