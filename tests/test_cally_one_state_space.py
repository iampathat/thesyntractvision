from __future__ import annotations

from tempfile import TemporaryDirectory

from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html
from qcds_fabric.robots.cally_one.robot import CallyOneService


def test_everything_is_state_with_rich_person_organization_resource_and_thing() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        organization = service.upsert_entity(
            {"kind": "organization", "label": "Bromma Hockey", "dimensions": {"type": "club"}}
        )
        person = service.upsert_person(
            {
                "name": "Patrik",
                "organization_id": organization.entity_id,
                "role": "parent",
                "team": "U14",
                "dimensions": {"language": "sv"},
            }
        )
        room = service.upsert_entity(
            {
                "kind": "resource",
                "label": "Mötesrum 1",
                "dimensions": {"type": "room", "exclusive": True, "location": "Stockholm"},
            }
        )
        bag = service.upsert_entity(
            {"kind": "thing", "label": "Matsäck", "dimensions": {"type": "food"}}
        )
        event = service.upsert_event(
            {
                "title": "Hockey",
                "start": "2026-09-03T09:00",
                "end": "2026-09-03T10:00",
                "people": [person.person_id],
                "links": [
                    {"predicate": "uses", "object_id": room.entity_id, "dimensions": {"state": "active"}},
                    {"predicate": "requires", "object_id": bag.entity_id, "dimensions": {"status": "needed"}},
                ],
            }
        )
        state = service.state()

        assert state["everything_is_state"] is True
        assert state["state_model"]["people_is_projection"] is True
        entities = {item["entity_id"]: item for item in state["entities"]}
        assert entities[person.person_id]["kind"] == "person"
        assert entities[organization.entity_id]["kind"] == "organization"
        assert entities[room.entity_id]["kind"] == "resource"
        assert entities[bag.entity_id]["kind"] == "thing"
        relations = {(r["subject_id"], r["predicate"], r["object_id"]) for r in state["relations"]}
        assert (person.person_id, "member_of", organization.entity_id) in relations
        assert (event.event_id, "participant", person.person_id) in relations
        assert (event.event_id, "uses", room.entity_id) in relations
        assert (event.event_id, "requires", bag.entity_id) in relations


def test_exclusive_resource_is_a_qcds_resolve_state_constraint() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        car = service.upsert_entity(
            {"kind": "resource", "label": "Familjebilen", "dimensions": {"type": "vehicle", "exclusive": True}}
        )
        first = service.upsert_event(
            {
                "title": "Skjuts A",
                "start": "2026-09-03T10:00",
                "end": "2026-09-03T11:00",
                "links": [{"predicate": "uses", "object_id": car.entity_id, "dimensions": {"state": "active"}}],
            }
        )
        second = service.upsert_event(
            {
                "title": "Skjuts B",
                "start": "2026-09-03T10:00",
                "end": "2026-09-03T11:00",
                "links": [{"predicate": "uses", "object_id": car.entity_id, "dimensions": {"state": "active"}}],
            }
        )

        candidates = service.placement_candidates(second.event_id)
        assert [item["candidate_id"] for item in candidates] == [
            "shift-minus-120",
            "shift-minus-60",
            "shift-zero",
            "shift-plus-60",
            "shift-plus-120",
        ]
        result = service.infer_placement(second.event_id)
        current = result["candidate_worlds"]["shift-zero"]
        assert result["mode"] == "qcds-resolve"
        assert current["coherence"] == "blocked"
        assert any(reason.startswith(f"resource:{car.entity_id}:overlap:{first.event_id}") for reason in current["reasons"])
        assert result["provenance"]["linked_resources_are_state_constraints"] is True
        assert result["provenance"]["system_boundary"] == "SyntractSystem"


def test_cally_ui_exposes_state_directory_and_qcds_resolve() -> None:
    html = cally_one_html(static_mode=True)
    assert "QCDS Resolve" in html
    assert "CALENDAR SPACE" in html
    assert "PERSON STATE" in html
    assert "Resources · uses / reserves" in html
    assert "Things · requires" in html
    assert "'/api/entity'" in html
    assert "'/api/relation'" in html
    assert "Everything-is-state" in html or "Everything represented" in html or "everything_is_state" in html
