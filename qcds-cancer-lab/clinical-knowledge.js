/* Oncology Lab oncology reference.
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
    "name": "Mutationsbörda",
    "type": "Genomisk mutationsbelastning",
    "summary": "Mängden och mönstret av somatiska förändringar i en tumör; inte bara om en mutation finns eller saknas.",
    "biology": "Tumörmutationsbörda (TMB) anges ofta som antalet somatiska varianter per megabas undersökt DNA. Resultatet påverkas av mätmetod, filtrering och provkvalitet. Mutationssignaturer och enskilda drivande förändringar skiljer sig från den totala bördan.",
    "genes": "Ingen enskild gen definierar detta. Exempel beroende på sammanhang: POLE, POLD1 och reparationsgenerna MLH1, MSH2, MSH6 och PMS2.",
    "evidence": "Validerad sekvenseringsmetod, metod för variantbestämning, provkvalitet, tumörandel, enheter och tolkning för aktuell tumörtyp.",
    "caution": "Exemplet saknar råsekvens, gränsvärde och TMB-kalibrering. Ett symboliskt 1/0 visar inte hög eller låg TMB och säger inget säkert om effekt av immunterapi.",
    "sourceKeys": [
      "biomarkers",
      "mmr"
    ]
  },
  {
    "name": "DNA-reparation",
    "type": "Svar på DNA-skador",
    "summary": "Förmågan hos en definierad reparationsmekanism att åtgärda särskilda slags DNA-skador.",
    "biology": "Det finns flera skilda DNA-reparationssystem. Homolog rekombinationsreparation (HRR), felparningsreparation (MMR) och nukleotidexcision kan inte behandlas som en enda kliniskt likvärdig egenskap utan en uttrycklig definition.",
    "genes": "Exempel inom HRR: BRCA1, BRCA2, PALB2, RAD51C och RAD51D. Exempel inom MMR: MLH1, MSH2, MSH6 och PMS2.",
    "evidence": "Tolkade tumör- och/eller ärftliga varianter, kopietal och eventuell andra träff, relevanta HRD- eller MMR-analyser samt tumörspecifik kontext.",
    "caution": "En BRCA-variant, ett HRD-värde och verkligt nedsatt HRR-funktion är olika slags evidens. Den symboliska biten är ingen molekylär diagnos.",
    "sourceKeys": [
      "brca",
      "hrr",
      "mmr"
    ]
  },
  {
    "name": "Tillväxtsignalering",
    "type": "Onkogen signalering",
    "summary": "Signaler som driver celldelning via receptorer och intracellulära nätverk.",
    "biology": "EGFR/HER2, RAS–RAF–MEK–ERK och PI3K–AKT–mTOR hänger samman men är skilda mekanismer. Förändringarnas betydelse beror på variant, tumörtyp och biologiskt sammanhang.",
    "genes": "EGFR, ERBB2 (HER2), KRAS, NRAS, BRAF, PIK3CA, AKT1, PTEN och MTOR.",
    "evidence": "Gen och variant, genamplifiering eller kopietal, uttryck, fosfoproteiner och funktionella mätningar av signalvägen där sådana finns.",
    "caution": "Uttryck eller mutation räcker inte för att kvantifiera signalvägens aktivitet, läkemedelsberoende eller behandlingsval.",
    "sourceKeys": [
      "egfr",
      "her2",
      "pi3k"
    ]
  },
  {
    "name": "Undvikande av apoptos",
    "type": "Reglering av celldöd",
    "summary": "Minskad känslighet för reglerad celldöd (apoptos) i ett bestämt biologiskt sammanhang.",
    "biology": "Balansen mellan pro- och antiapoptotiska signaler beror bland annat på TP53, BCL-2-proteiner, cellstress och receptorsignalering. Olika mätmetoder är inte utbytbara.",
    "genes": "Exempel på deltagande gener: TP53, BCL2, BCL2L1, MCL1, BAX, BAK1 och CASP-gener.",
    "evidence": "Tumörens genotyp, relevant proteinaktivitet, funktionella apoptostester, biologiskt sammanhang och svar på påverkan.",
    "caution": "Ingen apoptotisk egenskap har mätts här. 0 eller 1 är enbart ett antagande i den symboliska modellen.",
    "sourceKeys": [
      "apoptosis",
      "biomarkers"
    ]
  },
  {
    "name": "Immunflykt",
    "type": "Samspel mellan tumör och immunförsvar",
    "summary": "Mekanismer som minskar immunförsvarets förmåga att upptäcka, nå eller angripa en tumör.",
    "biology": "PD-1/PD-L1-systemet är en mekanism bland flera. Även antigenpresentation, immundämpande signaler och tumörens mikromiljö spelar roll.",
    "genes": "Exempel: CD274 (PD-L1), PDCD1 (PD-1), B2M och HLA klass I. Detta är ingen obligatorisk klinisk genpanel.",
    "evidence": "Tumöranpassad immunhistokemi och poängsättning, immunologiskt sammanhang, sekvensering och mätningar av tumörens mikromiljö.",
    "caution": "PD-L1-nivån beskriver inte ensam immunflykt. Tolkningen varierar mellan tumörer och metoder.",
    "sourceKeys": [
      "pdl1",
      "biomarkers"
    ]
  },
  {
    "name": "Målbindning",
    "type": "Farmakologi / farmakodynamik",
    "summary": "Om en åtgärd når fram till och binder sitt avsedda molekylära mål i rätt vävnad eller cellfack.",
    "biology": "En behandlingsbar genförändring, exponering för ett läkemedel, bindning till målet och mätbar hämning av en signalväg är fyra olika saker.",
    "genes": "Beror på åtgärden. Exempel på mål: EGFR, HER2, PI3K och PARP; de är inte ett enda likvärdigt mätvärde.",
    "evidence": "Mätning av exponering, målbindning eller lämplig farmakodynamisk markör, tid sedan dosering samt vävnads- och målkontext.",
    "caution": "Inga läkemedel, doser, koncentrationer eller farmakodynamiska tester finns i exemplet. En etta bevisar ingen läkemedelseffekt.",
    "sourceKeys": [
      "biomarkers",
      "egfr",
      "htest"
    ]
  },
  {
    "name": "Behandlingsresistens",
    "type": "Behandlingssvar / anpassning",
    "summary": "Uteblivet svar från början eller förlorad effekt efter ett tidigare svar på en bestämd behandling.",
    "biology": "Resistens kan bero på förändringar i målmolekylen, alternativa signalvägar, cellanpassning eller immunologiska mekanismer. Definitionen beror på behandling och sjukdom.",
    "genes": "Bara exempel: EGFR och förändringar nedströms i RAS/PI3K-system. Mekanismerna skiljer sig mellan läkemedel och tumörtyper.",
    "evidence": "Behandling och tidslinje, upprepade utvärderingar samt relevanta biopsier eller ctDNA där sådana är motiverade och rätt tolkade.",
    "caution": "Utan behandling, tidsförlopp och fastställda svarskriterier kan en binär resistensdimension inte tolkas kliniskt.",
    "sourceKeys": [
      "sitc",
      "biomarkers"
    ]
  },
  {
    "name": "Cellprocesser",
    "type": "Sammansatt biologiskt tillstånd",
    "summary": "En bred platshållare för cellcykel, ämnesomsättning, stress, kromatin och andra cellprogram.",
    "biology": "Cellprocess är inte en enda definierad signalväg. Begreppet täcker skilda mekanismer med olika mätningar, orsakssamband och tidsskalor.",
    "genes": "Beror på vald process. Exempel: CDK4/6, RB1, CCND1, MYC, MTOR och HIF1A.",
    "evidence": "Ange exakt process, mätmetod, provtidpunkt och hur mätresultatet översätts till modellens regler.",
    "caution": "För en kliniskt begriplig modell måste denna breda platshållare delas upp i separat definierade dimensioner.",
    "sourceKeys": [
      "biomarkers",
      "pi3kr"
    ]
  }
];
  const oracles=[
  {
    "id": "dna-repair",
    "mask": "11??0???",
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
    "mask": "??1?1???",
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
    "mask": "???111??",
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
    "mask": "1??1????",
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
    "mask": "??11????",
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
