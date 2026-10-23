# QCDS Oncology Lab – teknisk och vetenskaplig granskning

**Svensk granskningsversion · 23 oktober 2026**  
**Teori och skapande:** Patrik Sundblom  
**Forsknings- och utvecklingsstöd:** OpenAI / ChatGPT  

## Slutsats

Oncology Lab innehåller **verkliga numeriska beräkningar i en klassisk referensmodell**: små Grover-rum, rotationer, sammanbindning av hela sannolikhetsfördelningar, kandidatrankning och kontroll mot samma syntetiska observationsmatris. Det är inte ett kliniskt verifierat cancersystem och demonstrerar inte exekvering på NISQ-hårdvara, ett helt mänskligt genom eller kvantmässig hastighetsvinst.

Webbdemonstrationen har **tio symboliska DNA-positioner** och undersöker för närvarande 375 möjliga delmängder med två till fyra positioner. Antalet profiler i de två grupperna är **inte låst till fem eller till lika många**: användaren väljer grupperna själv inom exempelprogrammets gränser (2–30 per grupp i gränssnittet, 2–100 i datageneratorn). Dessa gränser är inte teorins gränser.

## Identifierade problem och genomförda rättelser

| Granskningspunkt | Åtgärd och kvarvarande betydelse |
| --- | --- |
| **Skenbara träffar i nolltester.** I ett bestämt test med fem syntetiska fall och fem jämförelser gav 57 av 100 reproducerbara datamängder utan inbyggd gruppskillnad ändå minst en orakelträff. | Exemplet redovisas som varning om många jämförelser i små grupper. Det är **inte** en generell felfrekvens för QCDS. |
| **Grover-förstärkning förväxlades med biologisk sannolikhet.** | Resultatvyn skiljer modellens sannolikhetsmassa från medicinsk evidens. Ett tillstånd kan uppfylla oraklet av en slump. |
| **Slutkontroll kallades oberoende verifiering.** | Den använder **samma** syntetiska observationer som sökningen. Nu benämns den som samstämmighets- och regelkontroll, inte extern biologisk validering. |
| **Startpositioner tillämpades inte fullt ut i små lokala rum.** | Den del av startvillkoret som finns i ett fyrbitarsfönster kontrolleras nu också lokalt. Resterande villkor bevaras i den större kandidatdomänen. |
| **Noll procents brus gav tidigare en dold åttaprocentig blandning.** | Den fasta blandningen har tagits bort. Noll procent innebär den idealiserade numeriska Grover-fördelningen utan extra blandning. Valbart syntetiskt brus motsvarar inte en uppmätt NISQ-felmodell. |
| **Upprepade rotationsfönster.** | Schemat ändrades till 192 olika fyrpositionsfönster vid tolv rotationspass. Det finns 210 olika möjliga fönster av fyra bland tio positioner. |
| **Numerisk stabilitet utan lösning kunde visas som framgång.** | Inga giltiga kandidater får nu inte räknas som verifierad stabil lösning. |
| **Delvisa genomträffar kunde se ut som fullständiga.** | Diagrammen skiljer mellan hela mönster och delträffar. |
| **5+5 behandlades felaktigt som en arkitekturgräns.** | Gruppstorlekarna är nu oberoende valbara indata och all presentationsstatistik anpassas. |

## Omfördelningskontrollen

Kandidaternas gruppskillnad jämförs med omfördelningar av samma syntetiska profiler. Alla möjliga gruppuppdelningar används när det totala antalet är högst tolv. För större grupper används **399 reproducerbara slumpmässiga omfördelningar** och en korrigerad Monte Carlo-uppskattning. Denna kontroll tar hänsyn till flera prövade delmängder med fast orakeltyp men inte till att orakelvillkor kan ändras efter att resultaten setts. Den bevisar inte orsakssamband.

I det tidigare **specifika 5+5-exemplet** gav 22 av 252 möjliga omfördelningar (cirka 8,7 %) minst lika stor bästa gruppskillnad. Den siffran beskriver bara den aktuella syntetiska testuppsättningen.

## Hur tratten faktiskt fungerar

För varje rotation väljs sexton olika fyrpositionsfönster. Varje lokalt orakel körs genom en ideal Grover-simulering som beräknar en fördelning över 16 tillstånd. **Alla sannolikhetsvärden**, inte bara den bästa kandidaten, används när fyra rum binds till en grupp. Därefter binds fyra gruppfördelningar till en överordnad fördelning över modellens 1 024 kodade tillstånd. Fördelningar från olika rotationer vägs samman, och stabilitet granskas via förändringar i fördelningen, entropi och rangordning.

Detta innebär **inte** att alla korrelationer som kräver fler än fyra gemensamt representerade positioner automatiskt kan återställas. Den separata slutkontrollen över 375 delmängder är fortfarande en klassisk regelberäkning. Antalet dimensioner och profiler behöver därför särskiljas från mängden tillstånd, beräkningskostnad och faktiskt insamlad information.

## Vad som återstår att demonstrera

- Inläsning och validering av verkliga patientgenom och biologiska mätningar, med etiska och rättsliga förutsättningar.
- Biologiskt definierade orakelvillkor med i förväg angivna mätmetoder, kliniska fenotyper och oberoende datamängder.
- Jämförelse med relevanta klassiska metoder, inklusive oracle-kostnad, körtid, minnesbehov och reproducerbarhet.
- Exekvering på riktig NISQ-hårdvara med explicit kretsdjup, antal kvantbitar, tillståndsförberedelse, avläsningsfel, körtider och osäkerheter.
- Mätning av vilka korrelationer rotations- och 4→1-trattstrukturen bevarar respektive förlorar, och under vilka antaganden.
- Blindad, oberoende biologisk validering innan någon medicinsk slutsats kan övervägas.

## Källor och originalrapport

Originalgranskningen och dess historiska mätningar är bevarade i [AUDIT_2026-10-22.md](AUDIT_2026-10-22.md). Läs också [svenska användarguiden](GUIDE_SV.md), [ursprunglig teknisk dokumentation](README.md) och [gällande licensvillkor](LICENSE.md).

**Teori och skapande: Patrik Sundblom. Forsknings- och utvecklingsstöd: OpenAI / ChatGPT.**
