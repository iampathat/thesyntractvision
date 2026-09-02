# Cally.One — Calendar Logical Robot

**Branch:** `tribute`

**Author:** Patrik Sundblom

**Architecture:** The Syntract Vision / QCDS

**Canonical robot package:** `src/qcds_fabric/robots/cally_one/`

**Product license:** [Cally.One Tribute License 1.0](src/qcds_fabric/robots/cally_one/LICENSE.md)

## Logical Robot boundary

Cally.One follows the repository's canonical Logical Robot model: **one shared QCDS / Syntract intelligence core, many replaceable manifested bodies**.

Cally.One is therefore not a second intelligence engine and does not reimplement QCDS. It is a specialized product/body above the shared core, with its own ingress, Calendar Space, event-oracle construction, interaction model, presentation surfaces, adapters and product license.

This boundary is both architectural and licensing-related:

```text
SHARED QCDS / SYNTRACT CORE
MIT / existing core license
            ↓
     SyntractSystem boundary
            ↓
CALLY.ONE LOGICAL ROBOT
Cally.One Tribute License 1.0
```

A Logical Robot may carry its own product license. Public source visibility does not make that robot layer MIT or otherwise open source. Cally.One imports and executes the shared core; it does not inherit the core license for its own product code.

## Calendar Space

Cally.One treats calendar reality as one **Calendar Space**, a domain-specific Logical Space. Dates, times, people, events, places, priorities, dependencies, flexibility and user-defined properties are all state dimensions in that space.

Events are represented as **oracle constructions / logical constraints** over possible calendar states rather than as isolated rows in a conventional calendar database.

All people, events and dimensions may therefore coexist in one Calendar Space. Separate calendars are projections when useful, not separate sources of truth.

## Canonical path

```text
Cally.One UI / ingress
    ↓
Calendar translator
    ↓
Calendar Space (Logical Space)
    ↓
Calendar event-oracle projection
    ↓
SyntractSystem
    ↓
shared QCDS core
    ↓
TruthDistribution / Calendar Syntract
    ↓
Cally.One manifestation
```

Cally.One may construct domain frames, projections, oracle logic and product-specific views, but it must not duplicate the four QCDS phases or introduce a second truth path.

## One space, many perspectives

A perspective is a projection of the same represented state, never a separate calendar. First-class perspectives are:

- Day
- Week
- Month
- Year
- Person
- Event
- Dimension X / Y / Z

The same event can appear in any projection without becoming a second copy or source of truth.

## Interaction model

The UI is designed for direct manipulation first:

- finger, stylus and mouse use the same pointer interaction model;
- events can be dragged between times, dates, people and later arbitrary compatible dimensions;
- event duration and dimensions remain part of the logical state;
- touch targets remain usable on phones;
- the same interface scales through tablet and desktop to presentation displays.

## Browser / GitHub execution

The initial browser manifestation is intended to run from the same GitHub Pages/Pyodide model already used by the repository.

The browser remains a transport, interaction and local-session surface. Cally.One QCDS inference enters the packaged Python implementation through `qcds_fabric.robots.cally_one.robot` and `SyntractSystem`; there is no second JavaScript inference engine.

## Calendar formats

External calendar formats are adapters around Calendar Space, not the internal model. Planned adapters may include:

- iCalendar / ICS
- CalDAV
- Google Calendar
- Apple Calendar
- Microsoft Outlook / Exchange
- other scheduling/calendar formats

No external format is allowed to define or limit the native logical model.

## Licensing boundary

Cally.One-specific product code is covered by the robot-local Cally.One Tribute License 1.0:

- personal / household use: free;
- academic, educational and non-commercial research use: free with Tribute / attribution;
- organizational, institutional, professional and commercial use: **EUR 99/month or EUR 990/year per organization**;
- redistribution, embedded/OEM, white-label and paid hosted services: separate written license.

The shared QCDS core keeps its own existing license.

## Initial build contract

The implementation must provide:

1. a Calendar Space state model;
2. arbitrary event dimensions;
3. people and events in the same Logical Space;
4. overlap / conflict observations as oracle inputs, not UI-only warnings;
5. QCDS placement projection through `SyntractSystem`;
6. standalone Cally.One browser/runtime entry points;
7. Day, Week, Month, Year, Person, Event and X/Y/Z perspectives;
8. pointer-based movement suitable for touch and mouse;
9. browser execution through the packaged Python/QCDS core;
10. JSON/API seams for future calendar adapters.

Cally.One must remain one specialized Logical Robot manifestation over the shared QCDS architecture.
