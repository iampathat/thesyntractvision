# QCDS Oncology Lab – användarguide

**Språk:** Svenska  
**Teori och skapande:** Patrik Sundblom  
**Forsknings- och utvecklingsstöd:** OpenAI / ChatGPT  
**Status:** Syntetisk forskningsdemonstration, inte ett medicinskt test.

## Vad är Oncology Lab?

Oncology Lab låter dig utforska hur QCDS kan pröva villkor och hitta kombinationer mellan symboliska DNA-positioner i flera profiler. Det är en beräkningsmodell där oraklen kan markera kandidater, idealiserad Grover förstärker tillstånd och sannolikhetsfördelningar från många små rum binds ihop.

Den nuvarande webbdemonstrationen använder **tio påhittade positioner**, som representeras av värdena 0 och 1. Dessa positioner är inte sekvenserade mänskliga genom, verkliga genloci eller verifierade cancerfynd. Antalet personer är en **indataparameter**: välj själv 2–30 syntetiska profiler per grupp i gränssnittet. De inbyggda gränserna är praktiska begränsningar för demonstrationsprogrammet, inte för QCDS-arkitekturens mål.

## Så använder du de sex vyerna

**Översikt** förklarar projektet och har knappar för färdiga exempel. Börja gärna med det rekommenderade.

**Undersökning** låter dig välja hur många profiler som finns i varje grupp. Du kan lämna alla DNA-positioner öppna eller ange upp till tre startpositioner. I de avancerade inställningarna väljer du bland annat typ av logiskt samband, krav på hur många profiler som uppfyller mönstret, reproducerbart slumptalsfrö och generator för exempeldata. Tryck på knappen för att hitta DNA-samband.

**Resultat** visar vad modellen beräknade, vilka symboliska positioner som pekades ut och hur många profiler i vardera gruppen som uppfyller hela mönstret. Grönt betyder att **hela** mönstret uppfylls hos personen, medan ljusblått kan vara en delträff. Guld visar dina valda startpositioner. Ingen kandidat är också ett tillåtet resultat. Läs osäkerhetstexten; intern stabilitet och hög Grover-förstärkning är inte medicinsk bekräftelse.

**QCDS-motorn** visar hur sexton små Grover-sökningar beräknas per rotation. De sexton fördelningarna förs samman fyra och fyra och därefter till en överordnad fördelning (**16 → 4 → 1**). Du kan studera beräknade rotationer, entropi och den slutliga kandidatrankningen. Alla lokala sannolikheter förs vidare, inte bara den högst rankade kandidaten.

**8-bitarslab** är en äldre, **separat** metoddemonstration. Den använder åtta symboliska dimensioner och 128 lokala logiska sökningar per rekursivt pass (**128 → 8 → 1**). Den ska inte förväxlas med den tiodimensionella undersökningen av syntetiska genomprofiler.

**Kunskapsbank** innehåller svenska förklaringar av modellbegrepp, molekylärbiologiska mekanismer, gener, möjliga mätmetoder och modellens begränsningar. De publicerade källornas ursprungliga identitet och länkar är bevarade.

## Färdiga exempel

**1. Sök ett oväntat DNA-samband.** Programmet laddar reproducerbar syntetisk data med **8 fallprofiler och 12 jämförelseprofiler**, tio symboliska DNA-positioner och fördefinierade *sökregler*, men **inget förprogrammerat svar**. Modellen får själv rangordna möjliga kombinationer. Förklaringen på respektive vy visar faktiskt utfall och kan ändras när du ändrar indata.

**2. Kontroll: när inget samband behöver finnas.** Samma antal profiler används, men datageneratorn har ingen inbyggd systematisk gruppskillnad. Med just detta testexempel och dessa regler finns ingen giltig träff. Andra slumpgenererade nolltest kan ge skenbara träffar; ett enskilt negativt exempel bevisar inte generell tillförlitlighet.

**Observera:** 8+12 och det tidigare 5+5-exemplet är valda illustrationer, inte fasta antaganden. Du kan byta gruppstorlekarna och villkoren.

## Om modellen och vad resultaten betyder

1. **Indata:** En matris av syntetiska 0/1-observationer, logiska startvillkor och sökregler.
2. **Små logiska rum:** Sexton fyrbitarsfönster per rotationspass; varje fönster innehåller 16 möjliga tillstånd.
3. **Grover:** Det valda oraklet markerar tillstånd och idealiserad Grover förstärker deras mätbara sannolikhet, till första topp eller vald tröskel, med högst 40 iterationer per sökning.
4. **Tratt och rotationer:** Fyra lokala sannolikhetsfördelningar bildar en gruppfördelning. Fyra grupper binds därefter till en större fördelning. Efterföljande rotationspass ger nya logiska perspektiv och en gemensam fördelning.
5. **Samma-datakontroll:** Kandidaterna prövas mot hela den syntetiska gruppen. Detta är en intern regelkontroll, **inte** oberoende biologisk validering.
6. **Osäkerhetsgranskning:** För små grupper kan möjliga omfördelningar av gruppetiketter räknas uttömmande. När det blir fler än tolv profiler totalt används 399 reproducerbara slumpmässiga omfördelningar som en **uppskattning**. Detta säger inget säkert om medicinska samband.

## Viktiga begränsningar

Den nuvarande demonstrationen körs på webbläsarens klassiska processor. De logiskt parallella rummen exekveras inte parallellt på verklig kvantmaskinvara. Varken kvantfördel, NISQ-brustålighet eller obegränsat sökutrymme har demonstrerats experimentellt här. Sannolikhetsfördelningar från fyrbitarsfönster kan förlora korrelationer som kräver fler samtidiga dimensioner. Programmet prövar 375 tillåtna kombinationer av två till fyra av de tio symboliska positionerna; **hela genom söks inte här**.

Använd aldrig modellens utdata för cancerdiagnos, prognos, behandling eller beslut om patientvård.

## Läs mer

- [Svensk teknisk och vetenskaplig granskning](GRANSKNING_SV.md)
- [Källkod och ursprunglig teknisk README](README.md)
- [Gällande licensvillkor i original](LICENSE.md)

**Teori och skapande: Patrik Sundblom. Forsknings- och utvecklingsstöd: OpenAI / ChatGPT.**
