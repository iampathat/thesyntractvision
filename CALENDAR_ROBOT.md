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

Cally.One treats calendar reality as one **Calendar Space**, a domain-specific Logical Space. Dates, times, people, events, places, priorities, dependencies, flexibility, language and user-defined properties are all state dimensions in that space.

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

## Open-ended dimensions

`X / Y / Z` is only an example of dimensional projection. It is **not** a fixed Cally.One model.

Calendar Space is open-ended. A use case may have a few dimensions or hundreds. The product layer must therefore discover, index and search dimensions rather than expose a fixed three-axis selector.

Built-in/common dimensions can be suggested for convenience, for example:

- Person
- Location / Plats
- Day / Week / Month / Year / Time
- Event
- Activity
- Priority
- Language / Språk
- Category / Status
- Organization / Resource
- Transport / Travel time
- Dependency / Flexibility

These suggestions do not define the ontology. Arbitrary additional dimension keys remain valid states in Calendar Space and become searchable when represented.

## Language is represented state

Language belongs in the represented state rather than being treated as an external UI-only concern.

A semantic dimension has one canonical identity while its displayed word can exist in multiple language states. For example:

```text
canonical dimension: location
representation state (en): Location
representation state (sv): Plats
```

`Location` and `Plats` therefore do not create two dimensions or two truths. They are language-dependent representations of the same semantic dimension. Events may also carry an explicit `language` state such as `sv`, `en`, `de`, or another represented language value.

## One space, many perspectives

A perspective is a projection of the same represented state, never a separate calendar.

First-class temporal/entity views include:

- Day
- Week
- Month
- Year
- Person
- Event
- Perspective

The Perspective view is an **ordered stack of arbitrary dimensions**, for example:

```text
Location / Plats
    ↓
Person
    ↓
Activity
    ↓
Priority
```

There is no architectural three-dimension limit. The UI may present a short stack at one moment while Calendar Space can contain hundreds of available dimensions.

The selected Perspective composition is directly manipulable: its dimension boxes can be reordered by drag/drop and the resulting composition can be starred/pinned as a **dedicated view in the main menu**. A pinned view stores the projection definition — and any active filter values — but does not create a second Calendar Space or duplicate events.

Filters are independent of grouping. A user can therefore project by `Location → Person` while simultaneously filtering on `Activity = hockey`, `Priority = must`, `Language = sv`, or any other represented dimension/value.

The same event can appear in multiple projections without becoming a second copy or source of truth.

## Calendar navigation and drill-down

Temporal views are navigable projections of the same state:

- Year can drill directly into a selected month or day.
- Month can drill directly into a selected day.
- The current-time control returns to the current temporal state; from Year it opens the current month, and from Month it opens the current day.
- Filters and perspective state remain projections rather than new calendars.

## Interaction model

The UI is designed for direct manipulation first:

- finger, stylus and mouse use the same pointer interaction model;
- events can be dragged between times, dates and people;
- every event exposes a small **pin/unpin control** backed by the event's `locked` state: pinned events cannot be dragged, while unpinned events can be moved;
- pinning is therefore represented Calendar Space state, not merely a visual decoration;
- event duration and arbitrary dimensions remain part of the logical state;
- event editing can attach multiple dimensions, not a single custom key/value pair;
- Perspective composition uses touch/mouse drag/drop boxes rather than fixed axis selectors;
- saved Perspective compositions can be pinned to the main view menu as dedicated projections;
- the top navigation must not force page-level horizontal scrolling on phone/tablet layouts; wide calendar bodies may scroll inside their own stage;
- touch targets remain usable on phones;
- the same interface scales through tablet and desktop to presentation displays.

## Browser / GitHub execution

The initial browser manifestation runs from the same GitHub Pages/Pyodide model used by the repository.

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

## Current build contract

The implementation provides / must preserve:

1. one Calendar Space state model;
2. arbitrary and open-ended event dimensions;
3. searchable dimension discovery with common suggestions;
4. language as represented state and localized labels resolving to one canonical dimension;
5. people and events in the same Logical Space;
6. overlap / conflict observations as oracle inputs, not UI-only warnings;
7. QCDS placement projection through `SyntractSystem`;
8. standalone Cally.One browser/runtime entry points;
9. Day, Week, Month, Year, Person, Event and arbitrary Perspective views;
10. ordered multi-dimension perspective stacks and independent multi-dimension filters;
11. touch/mouse drag/drop composition of Perspective dimensions;
12. saved/pinned dedicated Perspective views in the main menu;
13. event pin/unpin backed by the represented `locked` state;
14. Year → Month → Day drill-down and current-state navigation;
15. responsive top navigation without page-level horizontal overflow;
16. pointer-based movement suitable for touch and mouse;
17. browser execution through the packaged Python/QCDS core;
18. JSON/API seams for future calendar adapters.

Cally.One must remain one specialized Logical Robot manifestation over the shared QCDS architecture.
