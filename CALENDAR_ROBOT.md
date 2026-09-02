# Family Calendar Logical Robot

**Branch:** `tribute`

**Author:** Patrik Sundblom

**Architecture:** The Syntract Vision / QCDS

**Product license:** [Calendar Tribute License 1.0](LICENSE_CALENDAR_TRIBUTE.md)

## Purpose

The Family Calendar Logical Robot is a standalone product manifestation over the same QCDS / Syntract core used by the rest of the repository. It is not a second intelligence engine and must not reimplement QCDS.

The product treats calendar reality as one **Calendar Space**, a domain-specific Logical Space. Dates, times, people, events, places, priorities, dependencies, flexibility and user-defined properties are all state dimensions in that space.

Events are represented as **oracle constructions / logical constraints** over possible calendar states rather than as isolated rows in a conventional calendar database.

## Canonical path

```text
Family Calendar UI
    ↓
Calendar ingress / event translator
    ↓
Calendar Space (Logical Space)
    ↓
Calendar oracle projection
    ↓
SyntractSystem
    ↓
QCDS core
    ↓
TruthDistribution / Calendar Syntract
    ↓
Calendar UI projection
```

`SyntractSystem` is the system boundary. Calendar code may construct frames, projections, event-oracle logic and product-specific views, but it must not duplicate the four QCDS phases or introduce a second truth path.

## One space, many perspectives

A perspective is a projection of the same state, never a separate calendar. First-class perspectives are:

- Day
- Week
- Month
- Year
- Person
- Event
- Dimension X / Y / Z

The same event can therefore appear in any projection without copying or transforming it into another source of truth.

## Interaction model

The UI is designed for direct manipulation first:

- finger, stylus and mouse input use the same pointer interaction model;
- events can be dragged between times, dates and people;
- event duration and dimensions remain part of the logical state;
- touch targets must remain usable on phones;
- the same interface must scale through tablet and desktop to presentation displays.

## Calendar formats

External calendar formats are adapters around Calendar Space, not the internal model. Future adapters may include:

- iCalendar / ICS
- CalDAV
- Google Calendar
- Apple Calendar
- Microsoft Outlook / Exchange
- other calendar and scheduling formats

No external format is allowed to define or limit the logical model.

## Licensing boundary

The shared QCDS core keeps its existing license. Calendar-specific product files are covered by the Calendar Tribute License 1.0:

- personal / household use: free;
- academic, educational and non-commercial research use: free with Tribute / attribution;
- organizational, institutional, professional and commercial use: EUR 99/month or EUR 990/year per organization;
- redistribution, embedded/OEM, white-label and paid hosted services: separate written license.

## Initial build contract

The first implementation must provide:

1. a persistent Calendar Space state model;
2. arbitrary event dimensions;
3. people and events in the same logical space;
4. overlap / conflict observations as oracle inputs, not UI-only warnings;
5. a QCDS placement projection through `SyntractSystem`;
6. a standalone HTTP entry point and page;
7. Day, Week, Month, Year, Person, Event and X/Y/Z dimension perspectives;
8. pointer-based event movement suitable for touch and mouse;
9. JSON API seams for future format adapters.

The Calendar Product must remain a manifestation over one QCDS architecture.
