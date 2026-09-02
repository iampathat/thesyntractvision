from __future__ import annotations

from tempfile import TemporaryDirectory

from qcds_fabric.robots.cally_one.runtime import CallyOneService


def _people(service: CallyOneService, count: int) -> list[str]:
    return [service.upsert_person({"name": f"Person {index}"}).person_id for index in range(1, count + 1)]


def test_vehicle_capacity_four_accepts_four_people_and_rejects_five_as_conflict_state() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        car = service.upsert_entity(
            {
                "kind": "resource",
                "label": "Familjebilen",
                "dimensions": {
                    "type": "car",
                    "capacity": 4,
                    "capacity_dimension": "person",
                    "conflict_policy": "warn",
                },
            }
        )
        people = _people(service, 5)
        first = service.upsert_event(
            {
                "title": "Trip A",
                "start": "2026-09-03T10:00",
                "end": "2026-09-03T11:00",
                "people": people[:2],
                "links": [{"predicate": "uses", "object_id": car.entity_id}],
            }
        )
        second = service.upsert_event(
            {
                "title": "Trip B",
                "start": "2026-09-03T10:15",
                "end": "2026-09-03T10:45",
                "people": people[2:4],
                "links": [{"predicate": "uses", "object_id": car.entity_id}],
            }
        )
        assert not [c for c in service.state_conflicts() if c["state_id"] == car.entity_id]

        third = service.upsert_event(
            {
                "title": "Trip C",
                "start": "2026-09-03T10:20",
                "end": "2026-09-03T10:30",
                "people": [people[4]],
                "links": [{"predicate": "uses", "object_id": car.entity_id}],
            }
        )
        conflicts = [c for c in service.state_conflicts() if c["state_id"] == car.entity_id]
        assert conflicts
        conflict = conflicts[0]
        assert conflict["capacity"] == 4
        assert conflict["load"] == 5
        assert conflict["capacity_dimension"] == "person"
        assert set(conflict["event_ids"]) == {first.event_id, second.event_id, third.event_id}
        assert conflict["status"] == "unresolved"
        assert conflict["policy"] == "warn"


def test_capacity_one_is_generic_exclusive_state_and_qcds_remains_engine() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        room = service.upsert_entity(
            {
                "kind": "resource",
                "label": "Rum 1",
                "dimensions": {"capacity": 1, "capacity_dimension": "booking"},
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
        assert set(conflict["event_ids"]) == {first.event_id, second.event_id}

        result = service.infer_placement(second.event_id)
        assert result["provenance"]["system_boundary"] == "SyntractSystem"
        assert result["provenance"]["qcds_core_replaced"] is False
        assert result["provenance"]["generic_capacity_state_constraints"] is True
        assert result["truth_distribution_bound"] is True


def test_explicit_relation_load_supports_non_person_capacity_dimensions() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        rack = service.upsert_entity(
            {
                "kind": "resource",
                "label": "Bike rack",
                "dimensions": {"capacity": 10, "capacity_dimension": "bike"},
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
