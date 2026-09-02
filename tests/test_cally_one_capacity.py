from __future__ import annotations

from tempfile import TemporaryDirectory

from qcds_fabric.robots.cally_one.runtime_v3 import CallyOneService


def _people(service: CallyOneService, count: int) -> list[str]:
    return [service.upsert_person({"name": f"Person {index}"}).person_id for index in range(1, count + 1)]


def test_mobile_car_overlap_is_planning_state_not_false_conflict() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        car = service.upsert_entity(
            {
                "kind": "resource",
                "label": "Familjebilen",
                "dimensions": {
                    "type": "car",
                    "mobility": "mobile",
                    "capacity": 4,
                    "capacity_dimension": "person",
                },
            }
        )
        people = _people(service, 5)
        first = service.upsert_event(
            {
                "title": "Training A",
                "start": "2026-09-03T10:00",
                "end": "2026-09-03T11:00",
                "people": people[:2],
                "location": "Arena A",
                "links": [{"predicate": "uses", "object_id": car.entity_id}],
            }
        )
        second = service.upsert_event(
            {
                "title": "Training B",
                "start": "2026-09-03T10:15",
                "end": "2026-09-03T11:15",
                "people": people[2:4],
                "location": "Arena B",
                "links": [{"predicate": "uses", "object_id": car.entity_id}],
            }
        )
        third = service.upsert_event(
            {
                "title": "Training C",
                "start": "2026-09-03T10:20",
                "end": "2026-09-03T11:20",
                "people": [people[4]],
                "location": "Arena C",
                "links": [{"predicate": "uses", "object_id": car.entity_id}],
            }
        )

        assert not [c for c in service.state_conflicts() if c["state_id"] == car.entity_id]
        planning = next(p for p in service.route_planning_states() if p["state_id"] == car.entity_id)
        assert planning["status"] == "needs_resolution"
        assert planning["kind"] == "mobile_route"
        assert planning["capacity"] == 4
        assert set(planning["event_ids"]) == {first.event_id, second.event_id, third.event_id}
        assert set(planning["rider_ids"]) == set(people)
        assert planning["resolution_modes"] == ["human", "qcds"]
        assert "change_riders" in planning["human_actions"]
        assert "route_segment" in planning["qcds_dimensions"]
        assert "pickup" in planning["qcds_dimensions"]
        assert "dropoff" in planning["qcds_dimensions"]
        assert "position" in planning["qcds_dimensions"]
        assert "travel_time" in planning["qcds_dimensions"]
        assert "occupancy" in planning["qcds_dimensions"]

        result = service.infer_placement(second.event_id)
        current = result["candidate_worlds"]["shift-zero"]
        assert not any(reason.startswith(f"state:{car.entity_id}:capacity:") for reason in current["reasons"])
        assert result["planning_states"]
        assert result["provenance"]["mobile_overlap_not_auto_blocked"] is True
        assert result["provenance"]["mobile_route_can_be_resolved_by_human_or_qcds"] is True
        assert result["provenance"]["system_boundary"] == "SyntractSystem"
        assert result["provenance"]["qcds_core_replaced"] is False
        assert result["truth_distribution_bound"] is True


def test_single_assigned_mobile_use_is_not_orange_by_itself() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        car = service.upsert_entity(
            {
                "kind": "resource",
                "label": "Bil 7",
                "dimensions": {"type": "car", "mobility": "mobile", "capacity": 4, "capacity_dimension": "person"},
            }
        )
        person = _people(service, 1)[0]
        event = service.upsert_event(
            {
                "title": "Träning",
                "start": "2026-09-03T18:00",
                "end": "2026-09-03T19:00",
                "people": [person],
                "links": [
                    {
                        "predicate": "uses",
                        "object_id": car.entity_id,
                        "dimensions": {"rider_ids": [person], "route_status": "assigned"},
                    }
                ],
            }
        )
        assert not service.planning_for_event(event.event_id)
        assert service.state()["state_model"]["single_mobile_assignment_is_not_automatically_a_warning"] is True


def test_person_can_leave_vehicle_without_leaving_event() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        car = service.upsert_entity(
            {
                "kind": "resource",
                "label": "Familjebilen",
                "dimensions": {"type": "car", "mobility": "mobile", "capacity": 4, "capacity_dimension": "person"},
            }
        )
        people = _people(service, 2)
        event = service.upsert_event(
            {
                "title": "Hockey",
                "start": "2026-09-03T18:00",
                "end": "2026-09-03T19:00",
                "people": people,
                "links": [
                    {
                        "predicate": "uses",
                        "object_id": car.entity_id,
                        "dimensions": {"rider_ids": people},
                    }
                ],
            }
        )
        relation = next(
            r for r in service.graph.relations.values()
            if r.subject_id == event.event_id and r.object_id == car.entity_id and r.predicate == "uses"
        )
        service.upsert_relation(
            {
                "relation_id": relation.relation_id,
                "subject_id": relation.subject_id,
                "predicate": relation.predicate,
                "object_id": relation.object_id,
                "dimensions": {**relation.dimensions, "rider_ids": [people[0]], "route_status": "needs_resolution"},
            }
        )

        assert set(service.space.events[event.event_id].people) == set(people)
        planning = next(p for p in service.route_planning_states() if p["state_id"] == car.entity_id)
        assert planning["riders_by_event"][event.event_id] == [people[0]]
        assert people[1] not in planning["rider_ids"]


def test_stationary_capacity_is_actual_conflict() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        room = service.upsert_entity(
            {
                "kind": "resource",
                "label": "Rum 1",
                "dimensions": {
                    "type": "room",
                    "mobility": "stationary",
                    "capacity": 1,
                    "capacity_dimension": "booking",
                },
            }
        )
        first = service.upsert_event(
            {
                "title": "A",
                "start": "2026-09-03T09:00",
                "end": "2026-09-03T10:00",
                "links": [{"predicate": "uses", "object_id": room.entity_id, "dimensions": {"load": 1}}],
            }
        )
        second = service.upsert_event(
            {
                "title": "B",
                "start": "2026-09-03T09:30",
                "end": "2026-09-03T10:30",
                "links": [{"predicate": "uses", "object_id": room.entity_id, "dimensions": {"load": 1}}],
            }
        )
        conflict = next(c for c in service.state_conflicts() if c["state_id"] == room.entity_id)
        assert conflict["load"] == 2
        assert conflict["capacity"] == 1
        assert conflict["severity"] == "conflict"
        assert set(conflict["event_ids"]) == {first.event_id, second.event_id}


def test_stationary_capacity_supports_arbitrary_capacity_dimensions() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        rack = service.upsert_entity(
            {
                "kind": "resource",
                "label": "Bike rack",
                "dimensions": {
                    "type": "rack",
                    "mobility": "stationary",
                    "capacity": 10,
                    "capacity_dimension": "bike",
                },
            }
        )
        service.upsert_event(
            {
                "title": "Group A",
                "start": "2026-09-03T12:00",
                "end": "2026-09-03T13:00",
                "links": [{"predicate": "uses", "object_id": rack.entity_id, "dimensions": {"load": 6}}],
            }
        )
        service.upsert_event(
            {
                "title": "Group B",
                "start": "2026-09-03T12:30",
                "end": "2026-09-03T12:45",
                "links": [{"predicate": "uses", "object_id": rack.entity_id, "dimensions": {"quantity": 5}}],
            }
        )
        conflict = next(c for c in service.state_conflicts() if c["state_id"] == rack.entity_id)
        assert conflict["capacity"] == 10
        assert conflict["load"] == 11
        assert conflict["capacity_dimension"] == "bike"
