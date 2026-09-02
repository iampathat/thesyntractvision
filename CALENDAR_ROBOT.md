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

## Everything is state

Cally.One does not maintain a second ontology for “calendar objects”. Everything represented by the robot is state, including:

- events;
- people;
- organizations;
- locations;
- rooms, cars and other resources;
- things and requirements such as food, clothing or equipment;
- dimensions themselves;
- relations between states;
- properties of those relations.

The product layer may give some state kinds richer editors because humans handle them differently, but **special UI does not create a special ontology**.

Examples:

```text
Patrik → member_of → Bromma Hockey
Hockey → participant → Patrik
Hockey → uses → Familjebilen
Hockey → reserves → Omklädningsrum 3
Utflykt → requires → Matsäck
Simning → requires → Badkläder
```

`member_of`, `participant`, `uses`, `reserves` and `requires` are represented relations and may themselves carry dimensions such as `role`, `team`, `status`, `state`, priority or other future properties.

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

## Dimensions are states

A dimension definition is itself represented state. Its **canonical key is stable identity** while the following may change as state:

- displayed label;
- labels in different languages;
- aliases;
- whether it is a common suggestion;
- whether its values are scalar, temporal or rich entity states;
- whether it is active, hidden or retired.

For example, the canonical identity `location` can be displayed as `Location`, `Plats` or another language representation without creating a new dimension.

Removing a dimension from normal use is therefore a **retirement state**, not destructive erasure. Existing events, people and relations that already contain values for that dimension keep those historical states. A retired dimension can be restored. A future destructive purge, if supported, must be a separate explicit operation.

Cally.One also auto-discovers previously unseen dimension keys from represented event, person, entity and relation state and registers them as dimension states. This allows Calendar Space to grow to hundreds of dimensions without a fixed schema.

## Rich dimensions: Person, Event and other entity-backed state

Some dimensions have values that are themselves rich states.

`Person` is the canonical example. The Person dimension is still a dimension state, but each person value can carry its own properties and relations:

```text
Person: Anna
  language = sv
  role = coach
  team = U14
  member_of → Organization: Bromma Hockey
```

Cally.One therefore gives Person a dedicated manager with search, add, edit, organization membership, role, team/group, arbitrary extra dimensions and archive/restore.

Archiving a person is also non-destructive state. Historical events can continue to refer to that person. The same pattern can be used for other rich dimensions such as Organization, Resource and Thing.

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

## QCDS Resolve

**Resolve with QCDS is an operation, not a second engine.**

It means: represent alternative states for a scheduling question, compile the currently represented Calendar Space constraints/oracles, and execute those alternatives through the same `SyntractSystem` / QCDS core to determine which represented alternatives remain coherent.

The current implementation is deliberately narrow: for one event it generates a small set of nearby placement states, presently focused primarily on time shifts, and evaluates represented constraints such as person overlap, temporal bounds and exclusive linked-resource overlap.

It must not be described as “QCDS solves the whole calendar” yet.

The same operation can later broaden candidate state construction across arbitrary Calendar Space dimensions, for example:

```text
time × person × location × vehicle × room × preparation-state
```

without introducing another inference engine. The search space changes; the QCDS architecture does not.

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
2. everything represented as state, including dimensions and relations;
3. arbitrary and open-ended event/person/entity/relation dimensions;
4. searchable dimension discovery with common suggestions;
5. dimension definitions as editable state with stable canonical identity, multilingual labels, aliases and active/retired lifecycle;
6. non-destructive dimension retirement that preserves historical values;
7. language as represented state and localized labels resolving to one canonical dimension;
8. Person as a rich entity-backed dimension with dedicated search/edit/organization/team/role/arbitrary-dimension handling;
9. person archive/restore without destroying historical event references;
10. people, organizations, resources, things and events in the same Logical Space;
11. linked resources and requirements as state relations;
12. overlap / conflict observations as oracle inputs, not UI-only warnings;
13. QCDS Resolve through `SyntractSystem`, currently over represented nearby placement states and represented constraints;
14. standalone Cally.One browser/runtime entry points;
15. Day, Week, Month, Year, Person, Event and arbitrary Perspective views;
16. ordered multi-dimension perspective stacks and independent multi-dimension filters;
17. touch/mouse drag/drop composition of Perspective dimensions;
18. saved/pinned dedicated Perspective views in the main menu;
19. event pin/unpin backed by the represented `locked` state;
20. Year → Month → Day drill-down and current-state navigation;
21. responsive top navigation without page-level horizontal overflow;
22. pointer-based movement suitable for touch and mouse;
23. browser execution through the packaged Python/QCDS core;
24. JSON/API seams for future calendar adapters.

Cally.One must remain one specialized Logical Robot manifestation over the shared QCDS architecture.
