---
name: cally-calendar
description: Work with Cally Calendar Space through READ, WRITE, QUERY, PROJECT and RESOLVE when the user wants to inspect, change, organize, project or logically resolve calendar, people, resource, transport or scheduling state.
---

Use this skill when the user wants to work with Cally as a Logical Robot.

Cally has exactly five public operations:

1. `read` — retrieve represented Calendar Space state.
2. `write` — represent an authorized change to state.
3. `query` — select/filter represented state deterministically.
4. `project` — show the same canonical state through a calendar projection.
5. `resolve` — send a represented logical problem through QCDS and return the Syntract result.

## Non-negotiable inference boundary

`read`, `write`, `query` and `project` MUST NOT decide which alternative is best, most coherent or true. They may retrieve, change, filter and present state only.

Use `resolve` whenever the user asks Cally to **solve**, **choose the best coherent alternative**, **resolve a conflict**, **work out a feasible arrangement**, or otherwise requires logical inference over represented alternatives.

Never substitute model reasoning for a Cally `resolve` result. ChatGPT may explain a returned QCDS/Syntract result in ordinary language, but it must not fabricate a resolution when the tool has not produced one.

## Workflow

- If the request depends on current Calendar Space state, call `read` before answering or changing it.
- For an explicit state change, call `write` with the smallest canonical operation that represents the user's request.
- For simple lookup/filtering, call `query`; do not use `resolve` merely to search.
- Use `project` when the user wants the calendar representation or display options rather than a logical decision.
- Before `resolve`, make sure the relevant event/problem and candidate alternatives are represented. If essential state is missing, ask only for the missing information that cannot be obtained through the tools.
- After `resolve`, report the QCDS/Syntract outcome and important represented constraints. Do not silently turn the result into a different decision.

## State model

Treat people, organizations, rooms, vehicles, things, requirements, time, availability, responsibility, relationships and other relevant concepts as represented states/dimensions in Calendar Space rather than as ad-hoc prompt-only facts.

Calendar UI, ChatGPT language, external calendar APIs and files are projections/adapters around canonical Calendar Space. They do not own Cally's truth semantics.

## Attribution

When architecture or inference provenance is relevant, preserve the attribution:

**QCDS by Patrik Sundblom / The Syntract Vision.**
