# QCDS Oncology Lab — arkitekturtrogen mätning

**Teori och skapande:** Patrik Sundblom  
**FoU-stöd:** OpenAI / ChatGPT  
**Start:** 23 oktober 2026  
**Status:** Körbar mätinstrumentering mot originalkoden. Inga uppmätta kvantfördelar har ännu fastställts.

## Varför det tidigare benchmarktestet inte kan användas

En separat NumPy-port av Grover-sökning är varken QCDS:s fyrfassyntes eller en representativ kostnadsmodell för QCDS på kvantsubstrat. Resultat från en sådan port kan inte användas för påståenden om QCDS totalekonomi, intelligens eller fördel gentemot klassiska AI-system.

QCDS fyra övergripande faser är:

1. **Condition Formation** — bygg, avgränsa och motivera villkor/orakler.
2. **Conditional Evolution** — sök i logiska rum under villkoren; Grover är en del av detta.
3. **Recursive Inference** — rotation, sammanbindning av hela fördelningar och ny överordnad Grover med återföring.
4. **Truth-Alignment Verification** — kontrollera stabilitet, att hårda villkor hålls och resultatens giltighet; numerisk stabilitet är inte oberoende vetenskaplig sanning.

## De två verkliga implementationerna — blandas inte ihop

**8D: 128 → 8 → 1:** Åtta semantiska dimensioner, 16 balanserade rotationsbanker × 8 sanna nulldimensioner = 128 lokala processer per cykel; fullfördelningsbindning per familj och därefter mellan familjer, Parent Grover och rekursiv återföring. Källa: \`qcds-core.js\`, Python-versionen \`engine.py\`, fabric-primitiverna.

**10D: 16 → 4 → 1:** Tio symboliska loci, 16 fyrbitarsrum per pass, 4 grupper × 4 lokala fördelningar, logaritmisk sammanbindning, rotationer mellan pass och global kontroll av hela kohorten före Parent Grover. Källa: \`genome-discovery.js\` och \`genome-funnel.js\`. Denna version använder för närvarande klassisk enumeration av de möjliga 2–4-locus-kombinationerna som del av full-kohort-kontrollen.

Båda är klassiskt körda idealamplitudreferenser. Logiskt parallella perspektiv är **inte ännu fysiskt parallella kvantkörningar**.

## Vad instrumenteringen faktiskt mäter

Kör från repots rot:

\`\`\`sh
node qcds-cancer-lab/benchmark_architecture.js --repeats=7
\`\`\`

Utdata lagras som JSON i \`qcds-cancer-lab/results/\`. Varje resultat innehåller maskin/Node-information, kodfilernas SHA-256, median/p95 för väggtid, median CPU-tid, kontroll av numeriska invarianten och en arbetslogg:

- Antal utförda QCDS-cykler, rotationer, familjer och lokala processer.
- Antal idealiserade Grover-iterationer i **alla** lokala processer och Parent Grover tillsammans.
- Antal tillstånd i lokala respektive globala rum och antal kvalificerade kandidater.
- Om hårda Condition-villkor bevaras, om slutdistributionen normaliseras, om resultatet är stabilt och om tomt resultat rapporteras som tomt.
- För 10D jämförs den fullständiga mängden kvalificerade tillstånd med en **separat klassisk uppräkning** av samma behörighetsregler. Detta är en kontroll av urvalsvillkoren, inte en identisk reproduktion av hela sannolikhetssyntesen.

## Rättvist jämförelseprotokoll

### A: Klassisk referensexekvering

Mät ovanstående originalkod med samma inputs, samma kvalitetskrav, samma hårda villkor och samma utdataformat över flera körningar. Klassisk enumeration är en viktig kontroll och kan vara billigare för små symboliska rum. Men eftersom enumeration **inte** returnerar samma rekursivt bundna sannolikhetsstruktur får dess kortare tid inte presenteras som en total hastighetskvot.

### B: Kvantens idealiserade frågekomplexitet

För ett **svartlådsorakel** med \`N\` möjliga tillstånd och \`M\` markerade tillstånd finns en teoretisk jämförelse mellan ungefär \`O(sqrt(N/M))\` Grover-orakelfrågor och \`O(N/M)\` klassiska frågor vid lämpligt sökproblem. Detta gäller inte automatiskt för ett problem vars svar eller fulla markeringsmängd redan beräknats vid orakelkonstruktionen.

Den totala idealiserade QCDS-resursräkningen måste omfatta **alla** lokala Grover-processer, Parent Grover, antal shots, omstarter, beredning av kvanttillstånd och återföring mellan rekursiva cykler. Ett sekventiellt och ett fysiskt parallellt schema ska redovisas separat.

### C: Fysisk NISQ-implementation

Den avgörande undersökningen kräver kodad reversibel orakelfunktion, kretsar med gate-count, depth, connectivity/transpilation, felmodell och kalibrerad eller fysisk backend. Även kostnaden för data-loading, markering, mätning, klassisk bindning och verifikation måste ingå. Först här kan användbart svar per sekund, energi och SEK/svar mätas och jämföras med optimerad klassisk motsvarighet.

**Viktigt:** Den nuvarande QCDS-JavaScriptkoden beräknar vilka tillstånd som ska markeras klassiskt. Det är inte en färdig kvantkrets som kostnadsfritt känner till \`M\` eller den markerade mängden. Den klassiska kostnaden måste bokföras om exakt samma oracle inte finns som effektiv kvantkrets.

### D: AI-ekonomi

QCDS-motorn tränar inte vikter genom backpropagation. Det är en reell arkitekturskillnad. Men en rättvis kostnadsjämförelse med traditionell AI kräver **samma uppgift och samma krav på svarskvalitet**, med kostnader för modellträning, inferens och drift bokförda för respektive väg. En liten syntetisk sökdemonstration är inte en jämförbar ersättning för en modern språkmodell.

## Resultat som vi inte får hitta på

- Ej demonstrerat: att QCDS slår väloptimerad klassisk sökning i väggtid på en CPU.
- Ej demonstrerat: kvantfördel på verklig NISQ-hårdvara.
- Ej demonstrerat: lägre SEK per kvalificerat AI-svar än ett LLM-system.
- Ej demonstrerat: klinisk sanningsverifiering eller kausal cancerbiologi.
- Inte heller tillåtet: använda Grovers markerade sannolikhetsmassa som sannolikhet att en medicinsk hypotes är sann.

**Nästa tekniksteg:** Exekvera instrumenteringen; granska mätloggarna; skapa och testa en verklig reversibel orakelkonstruktion som uppfyller samma villkor; jämför dess gate-/shot-kostnad och svarskvalitet mot optimerade klassiska metoder. Ingen fördefinierad vinst.
