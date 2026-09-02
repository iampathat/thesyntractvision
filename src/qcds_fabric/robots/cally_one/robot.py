"""Canonical Cally.One Logical Robot implementation.

Cally.One is a product/body above the shared QCDS / Syntract core. Everything
represented here is state: events, people, organizations, resources, things,
requirements and the relations between them.

License: Cally.One Tribute License 1.0 — see LICENSE.md in this package.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping, Sequence

from ...calendar_robot import CalendarEvent, CalendarRobotError, CalendarRobotService, _cmp_dt
from ...problem import ProblemQuery, SemanticAtom, SemanticProblemFrame, SemanticRule
from ...semantic import SemanticClaim
from ...syntract_system import SyntractSystem
from .state_space import CallyOneStateGraph, StateEntity, StateRelation


class CallyOneService(CalendarRobotService):
    """Cally.One manifestation over one shared QCDS / Syntract core."""

    def __init__(self, store_root: str | Path = "./calendar_store") -> None:
        super().__init__(store_root)
        self.system = SyntractSystem(default_universe_id="cally-one")
        self.graph = CallyOneStateGraph(store_root)
        self._ensure_legacy_states()

    def _ensure_legacy_states(self) -> None:
        """Project older person/event storage into the unified state graph."""
        for person in self.space.people.values():
            if person.person_id not in self.graph.entities:
                self.graph.ensure_person(person.person_id, person.name, person.dimensions)
        existing = {(r.subject_id, r.predicate, r.object_id) for r in self.graph.relations.values()}
        for event in self.space.events.values():
            for person_id in event.people:
                key = (event.event_id, "participant", person_id)
                if key not in existing:
                    self.graph.upsert_relation(
                        {
                            "subject_id": event.event_id,
                            "predicate": "participant",
                            "object_id": person_id,
                            "dimensions": {"role": "participant"},
                        }
                    )
                    existing.add(key)

    def state(self) -> dict[str, Any]:
        state = super().state()
        graph = self.graph.snapshot()
        state.update(graph)
        state["product"] = "Cally.One"
        state["space_id"] = "cally-one"
        state["state_model"] = {
            "everything_is_state": True,
            "events": "temporal state entities",
            "entities": "person / organization / resource / thing / arbitrary state entities",
            "relations": "state-to-state relations with their own dimensions",
            "people_is_projection": True,
        }
        provenance = dict(state.get("provenance") or {})
        provenance.update(
            {
                "product": "Cally.One",
                "public_identity": "Cally.One",
                "technical_space": "Calendar Space",
                "logical_robot": True,
                "robot_package": "qcds_fabric.robots.cally_one",
                "system_boundary": "SyntractSystem",
                "shared_qcds_core": True,
                "single_qcds_architecture": True,
                "qcds_core_modified": False,
                "everything_is_state": True,
                "license": "Cally.One Tribute License 1.0",
            }
        )
        state["provenance"] = provenance
        return state

    def upsert_person(self, payload: Mapping[str, Any]):
        """Person gets richer UX, but remains an ordinary state entity."""
        person = self.space.upsert_person(payload)
        self.graph.ensure_person(person.person_id, person.name, person.dimensions)
        organization_id = str(payload.get("organization_id") or "").strip()
        if organization_id:
            self.graph.remove_relations(subject_id=person.person_id, predicate="member_of")
            self.graph.upsert_relation(
                {
                    "subject_id": person.person_id,
                    "predicate": "member_of",
                    "object_id": organization_id,
                    "dimensions": {
                        "role": str(payload.get("role") or "").strip(),
                        "team": str(payload.get("team") or "").strip(),
                    },
                }
            )
        return person

    def upsert_entity(self, payload: Mapping[str, Any]) -> StateEntity:
        return self.graph.upsert_entity(payload)

    def upsert_relation(self, payload: Mapping[str, Any]) -> StateRelation:
        return self.graph.upsert_relation(payload)

    def upsert_event(self, payload: Mapping[str, Any]) -> CalendarEvent:
        event = self.space.upsert_event(payload)
        self.graph.remove_relations(subject_id=event.event_id, predicate="participant")
        for person_id in event.people:
            self.graph.upsert_relation(
                {
                    "subject_id": event.event_id,
                    "predicate": "participant",
                    "object_id": person_id,
                    "dimensions": {"role": "participant"},
                }
            )
        links = payload.get("links")
        if links is not None:
            if not isinstance(links, list):
                raise CalendarRobotError("event links must be an array")
            replace_predicates = {str(item.get("predicate") or "related_to") for item in links if isinstance(item, Mapping)}
            for predicate in replace_predicates:
                self.graph.remove_relations(subject_id=event.event_id, predicate=predicate)
            for item in links:
                if not isinstance(item, Mapping):
                    raise CalendarRobotError("event link must be an object")
                self.graph.upsert_relation(
                    {
                        "subject_id": event.event_id,
                        "predicate": str(item.get("predicate") or "related_to"),
                        "object_id": str(item.get("object_id") or ""),
                        "dimensions": dict(item.get("dimensions") or {}),
                    }
                )
        return event

    def delete_event(self, event_id: str) -> None:
        self.space.delete_event(event_id)
        self.graph.remove_relations(subject_id=event_id)
        self.graph.remove_relations(object_id=event_id)

    def hydrate(self, state: Mapping[str, Any]) -> dict[str, Any]:
        people = state.get("people") or []
        events = state.get("events") or []
        entities = state.get("entities") or []
        relations = state.get("relations") or []
        if not all(isinstance(items, list) for items in (people, events, entities, relations)):
            raise CalendarRobotError("Cally.One state arrays are invalid")
        with self.space._lock:
            self.space.people.clear()
            self.space.events.clear()
            self.space._save()
        self.graph.clear()
        for person in people:
            if not isinstance(person, Mapping):
                raise CalendarRobotError("person state must be an object")
            self.upsert_person(person)
        for event in events:
            if not isinstance(event, Mapping):
                raise CalendarRobotError("event state must be an object")
            self.upsert_event(event)
        for entity in entities:
            if not isinstance(entity, Mapping):
                raise CalendarRobotError("entity state must be an object")
            self.upsert_entity(entity)
        for relation in relations:
            if not isinstance(relation, Mapping):
                raise CalendarRobotError("relation state must be an object")
            self.upsert_relation(relation)
        self._ensure_legacy_states()
        return self.state()

    def _linked_resource_reasons(self, event_id: str, candidate: CalendarEvent) -> list[str]:
        reasons: list[str] = []
        resource_links = [
            relation
            for relation in self.graph.relations.values()
            if relation.subject_id == event_id and relation.predicate in {"uses", "reserves"}
        ]
        for link in resource_links:
            resource = self.graph.entities.get(link.object_id)
            if resource is None or resource.kind != "resource":
                continue
            exclusive = resource.dimensions.get("exclusive", True)
            if exclusive is False:
                continue
            for other_link in self.graph.relations.values():
                if other_link.object_id != resource.entity_id or other_link.subject_id == event_id:
                    continue
                if other_link.predicate not in {"uses", "reserves"}:
                    continue
                other = self.space.events.get(other_link.subject_id)
                if other is None:
                    continue
                start = max(_cmp_dt(candidate.start), _cmp_dt(other.start))
                end = min(_cmp_dt(candidate.end), _cmp_dt(other.end))
                if start < end:
                    reasons.append(f"resource:{resource.entity_id}:overlap:{other.event_id}")
        return reasons

    def _build_resolve_frame(
        self,
        event_id: str,
        candidates: Sequence[Mapping[str, Any]],
    ) -> tuple[SemanticProblemFrame, dict[str, dict[str, Any]]]:
        current = self.space.events.get(event_id)
        if current is None:
            raise CalendarRobotError(f"unknown event: {event_id}")
        if not 2 <= len(candidates) <= 8:
            raise CalendarRobotError("QCDS Resolve requires 2 to 8 represented candidate states")

        worlds: dict[str, dict[str, Any]] = {}
        rules: list[SemanticRule] = []
        for index, raw in enumerate(candidates, start=1):
            candidate_id = str(raw.get("candidate_id") or f"candidate-{index}")
            if candidate_id in worlds:
                raise CalendarRobotError("candidate ids must be unique")
            merged = current.as_dict()
            merged.update({key: value for key, value in raw.items() if key != "candidate_id"})
            candidate = CalendarEvent.from_mapping(merged, event_id=current.event_id)
            blocked, reasons = self.space._candidate_blocked(event_id, candidate)
            reasons = list(reasons) + self._linked_resource_reasons(event_id, candidate)
            blocked = bool(reasons)
            coherence = "coherent" if not blocked else "blocked"
            worlds[candidate_id] = {
                "candidate_id": candidate_id,
                "start": candidate.start,
                "end": candidate.end,
                "people": list(candidate.people),
                "location": candidate.location,
                "dimensions": dict(candidate.dimensions),
                "coherence": coherence,
                "reasons": reasons,
            }
            rules.append(
                SemanticRule(
                    rule_id=f"cally:{event_id}:{candidate_id}:coherence",
                    antecedent=SemanticAtom(event_id, "placement", candidate_id),
                    consequent=SemanticAtom(event_id, "coherence", coherence),
                    kind="implies",
                    relation_class="temporal",
                    confidence=1.0,
                    source_id=f"calendar-space:{event_id}",
                    original_text=f"Placement {candidate_id} is {coherence} under represented Calendar Space state constraints.",
                )
            )

        frame = SemanticProblemFrame(
            mission_id=f"cally-resolve-{event_id}",
            raw_text=f"Which represented placement for {current.title} remains coherent in Calendar Space?",
            queries=(
                ProblemQuery(
                    query_id="placement",
                    subject=event_id,
                    predicate="placement",
                    candidate_values=tuple(worlds.keys()),
                    original_text="Which represented event placement remains coherent?",
                ),
                ProblemQuery(
                    query_id="coherence",
                    subject=event_id,
                    predicate="coherence",
                    candidate_values=("coherent", "blocked"),
                    original_text="Does the placement remain coherent under represented state constraints?",
                ),
            ),
            claims=(
                SemanticClaim(
                    subject=event_id,
                    predicate="coherence",
                    value="coherent",
                    source_id=f"calendar-space:{event_id}:required-coherence",
                    confidence=1.0,
                    polarity=True,
                    original_text="The selected placement must remain coherent under represented Calendar Space constraints.",
                ),
            ),
            rules=tuple(rules),
            analyzer_id="cally_one_calendar_space_v2",
            provenance={
                "calendar_space": True,
                "everything_is_state": True,
                "events_are_oracle_constructions": True,
                "linked_resources_are_state_constraints": True,
                "candidate_states": len(worlds),
                "single_qcds_architecture": True,
                "qcds_core_replaced": False,
            },
        )
        return frame, worlds

    def infer_placement(
        self,
        event_id: str,
        candidates: Sequence[Mapping[str, Any]] | None = None,
    ) -> dict[str, Any]:
        candidate_values = list(candidates or self.placement_candidates(event_id))
        frame, worlds = self._build_resolve_frame(event_id, candidate_values)
        execution = self.system.run_frame(
            frame,
            universe_id="cally-one",
            space_id=f"calendar-space:{event_id}",
            syntract_id=f"syntract:cally-one:{event_id}",
        )
        baseline = execution.inference.baseline_queries.get("placement", ())
        stabilized = execution.inference.stabilized_queries.get("placement", ())
        leaders = execution.inference.leading_candidates("placement")
        return {
            "event_id": event_id,
            "mode": "qcds-resolve",
            "logical_width": execution.logical_width,
            "raw_state_count": 2 ** execution.logical_width,
            "candidate_worlds": worlds,
            "baseline": [{"value": str(item.value), "probability": float(item.probability)} for item in baseline],
            "stabilized": [{"value": str(item.value), "probability": float(item.probability)} for item in stabilized],
            "leaders": list(leaders),
            "syntract_id": execution.syntract.syntract_id,
            "truth_distribution_bound": execution.syntract.bound_distribution is execution.truth_distribution,
            "provenance": {
                "product": "Cally.One",
                "logical_robot": True,
                "system_boundary": "SyntractSystem",
                "shared_qcds_core": True,
                "calendar_space": True,
                "everything_is_state": True,
                "events_are_oracle_constructions": True,
                "linked_resources_are_state_constraints": True,
                "single_qcds_architecture": True,
                "qcds_core_replaced": False,
            },
        }


_BROWSER_SERVICE: CallyOneService | None = None


def _browser_service() -> CallyOneService:
    global _BROWSER_SERVICE
    if _BROWSER_SERVICE is None:
        _BROWSER_SERVICE = CallyOneService("/tmp/cally_one_browser")
    return _BROWSER_SERVICE


def run_cally_one(payload: Mapping[str, Any]) -> dict[str, Any]:
    service = _browser_service()
    action = str(payload.get("action") or "state")
    result: Any = None

    if action == "state":
        pass
    elif action == "hydrate":
        incoming = payload.get("state") or {}
        if not isinstance(incoming, Mapping):
            raise CalendarRobotError("hydrate state must be an object")
        service.hydrate(incoming)
    elif action == "person":
        body = payload.get("payload") or {}
        if not isinstance(body, Mapping):
            raise CalendarRobotError("person payload must be an object")
        result = {"person": service.upsert_person(body).as_dict()}
    elif action == "entity":
        body = payload.get("payload") or {}
        if not isinstance(body, Mapping):
            raise CalendarRobotError("entity payload must be an object")
        result = {"entity": service.upsert_entity(body).as_dict()}
    elif action == "relation":
        body = payload.get("payload") or {}
        if not isinstance(body, Mapping):
            raise CalendarRobotError("relation payload must be an object")
        result = {"relation": service.upsert_relation(body).as_dict()}
    elif action == "event":
        body = payload.get("payload") or {}
        if not isinstance(body, Mapping):
            raise CalendarRobotError("event payload must be an object")
        event = service.upsert_event(body)
        result = {"event": event.as_dict(), "conflicts": [item.as_dict() for item in service.space.conflicts()]}
    elif action == "move":
        body = payload.get("payload") or {}
        if not isinstance(body, Mapping):
            raise CalendarRobotError("move payload must be an object")
        people = body.get("people")
        if people is not None and not isinstance(people, (list, tuple)):
            raise CalendarRobotError("people must be an array")
        event = service.space.move_event(
            str(body.get("event_id") or ""),
            start=str(body.get("start") or ""),
            end=None if body.get("end") is None else str(body.get("end")),
            people=None if people is None else tuple(str(item) for item in people),
        )
        result = {"event": event.as_dict(), "conflicts": [item.as_dict() for item in service.space.conflicts()]}
    elif action == "delete":
        body = payload.get("payload") or {}
        if not isinstance(body, Mapping):
            raise CalendarRobotError("delete payload must be an object")
        event_id = str(body.get("event_id") or "")
        service.delete_event(event_id)
        result = {"deleted": event_id}
    elif action == "infer":
        body = payload.get("payload") or {}
        if not isinstance(body, Mapping):
            raise CalendarRobotError("infer payload must be an object")
        candidates = body.get("candidates")
        if candidates is not None and not isinstance(candidates, list):
            raise CalendarRobotError("candidates must be an array")
        result = service.infer_placement(str(body.get("event_id") or ""), candidates)
    else:
        raise CalendarRobotError(f"unknown Cally.One action: {action}")

    return {
        "product": "Cally.One",
        "logical_robot": True,
        "action": action,
        "result": result,
        "state": service.state(),
    }


def run_cally_one_json(payload_json: str) -> str:
    try:
        payload = json.loads(payload_json)
    except json.JSONDecodeError as exc:
        raise CalendarRobotError("invalid Cally.One JSON payload") from exc
    if not isinstance(payload, Mapping):
        raise CalendarRobotError("Cally.One payload must be an object")
    return json.dumps(run_cally_one(payload), ensure_ascii=False, sort_keys=True)


__all__ = ["CallyOneService", "run_cally_one", "run_cally_one_json"]
