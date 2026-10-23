/* Oncology Lab oncology reference.
 * Public reference material for research orientation, not diagnostic logic.
 * All masks are synthetic, fixed-position QCDS examples, NOT clinical classifiers.
 * © 2026 Patrik Sundblom — R&D support OpenAI / ChatGPT.
 */
(function(root){
  "use strict";
  const sources={
  "biomarkers": {
    "label": "NCI · Biomarkörtester vid cancerbehandling",
    "url": "https://www.cancer.gov/about-cancer/treatment/types/biomarker-testing-cancer-treatment"
  },
  "brca": {
    "label": "NCI · BRCA-genförändringar och tester",
    "url": "https://www.cancer.gov/about-cancer/causes-prevention/genetics/brca-fact-sheet"
  },
  "hrr": {
    "label": "NCI · Reparationsväg för homolog rekombination",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/homologous-recombination-repair-pathway"
  },
  "mmr": {
    "label": "NCI · Bristande DNA-felparningsreparation",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/mismatch-repair-deficiency"
  },
  "pi3k": {
    "label": "Janku m.fl. · PI3K-signalering vid cancer · Nat Rev Clin Oncol (2018)",
    "url": "https://www.nature.com/articles/nrclinonc.2018.28"
  },
  "pi3kr": {
    "label": "Översikt av signalvägen PI3K/AKT/mTOR · Molecular Cancer (2023)",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10436543/"
  },
  "egfr": {
    "label": "NCI · EGFR-genen",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/egfr-gene"
  },
  "her2": {
    "label": "NCI · HER2-proteinet",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/her2"
  },
  "htest": {
    "label": "NCI · HER2-tester",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/her2-test"
  },
  "pdl1": {
    "label": "NCI · PD-L1 och immunologiska kontrollpunkter",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/pd-l1"
  },
  "apoptosis": {
    "label": "NCI · Apoptos",
    "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/apoptosis"
  },
  "sitc": {
    "label": "SITC · Översikt av resistens mot PD-(L)1-behandling (2024)",
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
    "name": "DNA-reparation",
    "category": "Svar på DNA-skador",
    "summary": "Äldre utforskande positionsmask med etiketten DNA-reparation; ingen bevisad klassificerare för HRR eller MMR.",
    "biology": "Svaret på DNA-skador består av flera skilda mekanismer. BRCA1/2 och PALB2 deltar i homolog rekombinationsreparation, medan MLH1, MSH2, MSH6 och PMS2 deltar i felparningsreparation. Ett sjukdomsspecifikt orakel behöver separata, mätbara villkor för förändring, funktionell följd, provtyp och tumörkontext.",
    "genes": "BRCA1 · BRCA2 · PALB2 · RAD51C/RAD51D · MLH1/MSH2/MSH6/PMS2",
    "evidence": "Exempel på underlag: kliniskt tolkad sekvensering, belägg för andra träff, HRD-test eller MMR-analys med immunhistokemi/MSI när sammanhanget motiverar det. Inget sådant finns inläst.",
    "limitations": "Masken 11??0??? låser tre positionsbitar. Det är ett syntetiskt testvillkor som även utan rotation blandar mutationsbörda, DNA-reparation och immunflykt. Det bevisar inte nedsatt DNA-reparation.",
    "question": "Vilken reparationsmekanism och vilket mätbart, verifierat villkor ska oraklet egentligen representera?",
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
    "name": "PI3K-axeln",
    "category": "Signalering för tillväxt och överlevnad",
    "summary": "Hypotesetikett för PI3K–AKT–mTOR. Masken är ett positionsbaserat räkneexempel, inte ett test av signalvägens aktivering.",
    "biology": "Receptorförändringar och genomiska förändringar kan aktivera PI3K–AKT–mTOR och påverka tillväxt, överlevnad och ämnesomsättning. PIK3CA- och PTEN-förändringar har olika betydelser. Signalvägens aktivitet beror också på vävnad, kompensatorisk signalering och behandling.",
    "genes": "PIK3CA · PIK3R1 · PTEN · AKT1 · MTOR · TSC1/TSC2",
    "evidence": "Tumörprofilering med hänsyn till genvarianter och kopietal samt funktionella aktivitetsmätningar där de finns. Tumörspecifika kunskapskällor och evidensnivåer behöver bedömas separat.",
    "limitations": "Masken ??1?1??? låser positionerna 3 och 5. Det finns ingen demonstrerad mätmodell som knyter dessa positioner till PI3K-aktivering eller immunflykt.",
    "question": "Avses en PIK3CA-förändring, PTEN-förlust, fosforyleringsaktivitet eller känslighet för en bestämd påverkan?",
    "sourceKeys": [
      "pi3k",
      "pi3kr",
      "biomarkers"
    ]
  },
  {
    "id": "receptor",
    "mask": "???111??",
    "name": "Receptoraxeln",
    "category": "Signalering via receptortyrosinkinaser",
    "summary": "Utforskande etikett för receptordriven signalering; varken receptoridentitet eller förändringstyp är ännu kodad.",
    "biology": "EGFR och HER2/ERBB2 är receptortyrosinkinaser. Aktiverande EGFR-varianter eller överuttryck/amplifiering av HER2 kan vara viktiga vid vissa cancerformer, men tester, tröskelvärden och behandlingsföljder beror på diagnos.",
    "genes": "EGFR (ERBB1) · ERBB2 (HER2) · ERBB3 · MET · FGFR-familjen",
    "evidence": "Specificerad receptor och förändring, varianttolkning, IHC/ISH eller sekvensering när lämpligt, tumörtyp och i förväg bestämd evidensregel.",
    "limitations": "Masken ???111?? låser positionerna 4, 5 och 6. Dessa bildar ingen receptorspecifik genpanel. Rotationer ändrar dessutom vilka biologiska dimensioner som möter positionerna.",
    "question": "Vilken receptor och förändring avses, och hur ska den tolkas för den aktuella tumörtypen?",
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
    "name": "Homolog rekombination + brett villkor",
    "category": "Homolog rekombination / sammansatt egenskap",
    "summary": "Sammansatt utforskande etikett. HR betyder homolog rekombination, inte uppmätt HRD-status.",
    "biology": "Homolog rekombinationsreparation är en mekanism som lagar dubbelsträngsbrott i DNA, bland annat via BRCA1/2. Funktionell brist, ärftlig predisposition och genomiska ärr i en tumör är skilda företeelser. 'Brett' har ingen formell definition i prototypen.",
    "genes": "BRCA1 · BRCA2 · PALB2 · RAD51C · RAD51D · ATM (beroende på sammanhang)",
    "evidence": "Definiera HRR-förändring respektive uppmätt HRD, bredden på andra egenskaper, sammanbindningsregel, negativa kontroller och tumörkontext.",
    "limitations": "Den äldre masken 1??1???? låser positionerna 1 och 4 utan rotation (mutationsbörda och undvikande av apoptos), inte HRR direkt. Den får inte läsas som positiv HRD.",
    "question": "Vad betyder 'brett' i förväg, och vad validerar HRR-komponenten oberoende?",
    "sourceKeys": [
      "hrr",
      "brca",
      "biomarkers"
    ]
  },
  {
    "id": "pi3k-hr",
    "mask": "??11????",
    "name": "PI3K + homolog rekombination",
    "category": "Samverkan mellan biologiska signalvägar",
    "summary": "Utforskande hypotes som kombinerar tillväxtsignalering med DNA-reparationsbiologi.",
    "biology": "PI3K-signalering och svaret på DNA-skador kan samverka i särskilda biologiska sammanhang. Men ett orsakssamband följer inte av att två generiska bitar båda är ett. Ett test kräver en uttrycklig molekylär hypotes och ett oberoende uppmätt utfall.",
    "genes": "PIK3CA · PTEN · AKT1 · BRCA1 · BRCA2 · PALB2 (illustrativa exempel, ingen validerad gemensam signatur)",
    "evidence": "Oberoende signalvägsanalyser, varianttolkning, kontrollerad påverkan eller gruppanalys, i förväg bestämd jämförelse och reproducerbarhet.",
    "limitations": "Masken ??11???? binder positionerna 3 och 4 (tillväxtsignalering och apoptosflykt) utan rotation, inte ett molekylärt bevis på PI3K–HR-beroende.",
    "question": "Vilket riktat samband, vilken orsaksmekanism och vilket oberoende verifieringsmått föreslås?",
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
    "name": "0 / 1 / ? · Logiskt villkor",
    "category": "Modellens betydelse",
    "summary": "I prototypen låser 0 och 1 en bit, medan ? lämnar den öppen. Dessa värden är INTE kategorier för kliniska provsvar.",
    "biology": "En egenskap vid cancer måste ha en exakt definition, mätmetod, gränsvärde, provtyp och tumörkontext innan en bit kan tolkas som frånvarande/närvarande eller låg/hög. Utan en sådan koppling är bitarna bara symboliska villkor.",
    "limitations": "1 betyder inte automatiskt sjukdomsframkallande, aktiverad eller gynnsam; 0 betyder inte automatiskt normaltyp, inaktiv eller negativ. ? är inget tredje uppmätt biologiskt resultat.",
    "sourceKeys": [
      "biomarkers"
    ]
  },
  {
    "id": "mask",
    "name": "Orakelmasker / fasta positioner",
    "category": "Modellens betydelse",
    "summary": "Ett åttateckensmönster ställer positionsvillkor; ? är ett jokertecken.",
    "biology": "Motorn kombinerar aktiva orakelmasker med logiskt ELLER. Semantiska indata roteras över en bank med fasta positionsorakel. Ett orakel som fått namn efter en signalväg behåller därför inte samma genspecifika betydelse vid varje rotation. Varje regel måste kopplas till en mätbar biologisk innebörd och valideras separat.",
    "limitations": "Exempelmaskerna är syntetiska hypoteser. Koden bedömer inte automatiskt genvarianters sjukdomsbetydelse eller kliniska handlingsbarhet.",
    "sourceKeys": [
      "biomarkers"
    ]
  },
  {
    "id": "null",
    "name": "Uteslutning av en dimension",
    "category": "Känslighetsanalys",
    "summary": "En namngiven dimension tas bort från ett logiskt rum; det betyder inte att den får okänd klinisk status.",
    "biology": "Var och en av de åtta familjerna utesluter en semantisk dimension i taget. Sexton balanserade rotationer upprepas, och fördelningarnas förändring mäts. Detta är en intern uteslutningsanalys.",
    "limitations": "En stor förändring visar modellkänslighet, inte klinisk betydelse eller validering av en biomarkör.",
    "sourceKeys": []
  },
  {
    "id": "rotation",
    "name": "Rotation · 16 balanserade perspektiv",
    "category": "Algoritm",
    "summary": "Åtta framåtriktade och åtta spegelvända positionskopplingar för indata genom oraklets fasta positioner.",
    "biology": "Varje semantisk dimension besöker varje fast orakelposition två gånger. Banken testar positionssnedvridning och olika logiska perspektiv, inte en biologisk mekanism.",
    "limitations": "Balanserade positioner ersätter inte extern kalibrering, biologiskt oberoende eller prospektiv klinisk validering.",
    "sourceKeys": []
  },
  {
    "id": "lanes",
    "name": "128 logiska ingångar / 8 familjer",
    "category": "Algoritm",
    "summary": "16 rotationer × 8 uteslutna dimensioner = 128 separat definierade lokala sökrum.",
    "biology": "Varje lokalt sjubitarsrum har N=128 tillstånd. Webbläsaren beräknar rummen sekventiellt och uppdaterar gränssnittet under tiden. Sexton fördelningar per uteslutningsfamilj binds innan 8→1-syntesen.",
    "limitations": "Detta är logisk bredd, inte 128 samtidiga hårdvarutrådar och inget bevis för kvantmässig hastighetsvinst.",
    "sourceKeys": []
  },
  {
    "id": "grover",
    "name": "Grover-iterationer, N, M och markerad massa",
    "category": "Algoritm",
    "summary": "Amplitudförstärkning ökar sannolikheten att mäta tillstånd som markerats av det aktuella oraklet.",
    "biology": "N är antalet lokala tillstånd, M antalet orakelmarkerade tillstånd och m antalet förstärkningsiterationer. Sannolikheten för markerad massa gäller den konstruerade modellen och oraklet.",
    "limitations": "99 % markerad massa innebär inte 99 % sannolikhet för cancer, drivande mutation eller behandlingssvar.",
    "sourceKeys": []
  },
  {
    "id": "syntract",
    "name": "Syntract-sammanbindning 128→8→1",
    "category": "Algoritm",
    "summary": "Fullständiga normaliserade fördelningar från logiska rum kombineras med en logaritmisk sammanbindningsoperator.",
    "biology": "Sammanbindningen bevarar fördelningarna, inte bara vinnarröster. Åtta familjefördelningar knyts tillbaka till indatavillkoret, varefter överordnad Grover söker vidare i kandidatstrukturen.",
    "limitations": "Koherens är en egenskap hos det definierade inferenssystemet, inte en oberoende bekräftelse på en onkologisk mekanism.",
    "sourceKeys": []
  },
  {
    "id": "parent",
    "name": "Överordnad Grover / rekursiv återföring",
    "category": "Algoritm",
    "summary": "Ett nytt förstärkningssteg utförs efter sammanbindningen av de åtta familjerna och återför utvalda tillstånd som nya villkor.",
    "biology": "Sannolikheten på huvudnivån tillhör en modellspecifik fördelning. Rekursiv återkoppling kan ändra vilka tillstånd som återstår och behöver granskas för urvalssnedvridning och beroenden.",
    "limitations": "Ett ledande tillstånd är inte en positiv eller verifierad biomarkör utan extern evidens, även om det förstärkts.",
    "sourceKeys": []
  },
  {
    "id": "stability",
    "name": "Stabilitet / sanningsinriktning",
    "category": "Granskning av algoritmen",
    "summary": "Intern samstämmighet mellan cykler granskas med flera numeriska indikatorer.",
    "biology": "Kontrollen granskar fördelningsförändring (TVD), entropi, ledande tillstånd, topp-k-Jaccard och dimensionernas påverkan. Samstämmighet är ett nödvändigt granskningsmått, inte ett bevis på klinisk giltighet.",
    "limitations": "'Stabil' är INTE en klinisk giltighetscertifiering. Även felaktiga eller brusiga regler kan stabiliseras.",
    "sourceKeys": []
  },
  {
    "id": "provenance",
    "name": "Källursprung / valideringsstatus",
    "category": "Forskningsstyrning",
    "summary": "Skilj mellan granskad biologisk bakgrund, oprövade modellantaganden och faktiskt uppmätta motorresultat.",
    "biology": "En modellklar klinisk egenskap behöver en definition av analyten, provmetoden, provmaterialet, analytisk validering, evidensklass och tänkt tumör- och beslutsområde.",
    "limitations": "De fem inbyggda orakelmaskerna är äldre demomallar. Sidan innehåller inga patientdataset, molekylära annoteringar, extern validering eller godkänt system för klinisk tolkning.",
    "sourceKeys": [
      "biomarkers"
    ]
  }
];
  root.CancerLabKnowledge=Object.freeze({sources,dimensions,oracles,methods});
})(globalThis);
