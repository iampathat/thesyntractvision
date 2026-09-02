from __future__ import annotations

from tempfile import TemporaryDirectory

from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html
from qcds_fabric.robots.cally_one.runtime_v3 import CallyOneService


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
                "dimensions": {"type": "room", "mobility": "stationary", "capacity": 1, "capacity_dimension": "booking", "location": "Stockholm"},
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
        assert state["state_model"]["linked_state_time_intersection"] is True
        assert state["state_model"]["planning_can_be_resolved_by_human_or_qcds"] is True
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
        use = next(r for r in state["relations"] if r["subject_id"] == event.event_id and r["predicate"] == "uses")
        assert use["dimensions"]["time_start"] == event.start
        assert use["dimensions"]["time_end"] == event.end
        assert use["dimensions"]["temporal_scope"] == "event"


def test_stationary_capacity_overlap_becomes_qcds_constraint() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        room = service.upsert_entity(
            {
                "kind": "resource",
                "label": "Rum 1",
                "dimensions": {"type": "room", "mobility": "stationary", "capacity": 1, "capacity_dimension": "booking"},
            }
        )
        first = service.upsert_event(
            {
                "title": "Möte A",
                "start": "2026-09-03T10:00",
                "end": "2026-09-03T11:00",
                "links": [{"predicate": "uses", "object_id": room.entity_id, "dimensions": {"load": 1}}],
            }
        )
        second = service.upsert_event(
            {
                "title": "Möte B",
                "start": "2026-09-03T10:00",
                "end": "2026-09-03T11:00",
                "links": [{"predicate": "uses", "object_id": room.entity_id, "dimensions": {"load": 1}}],
            }
        )

        result = service.infer_placement(second.event_id)
        current = result["candidate_worlds"]["shift-zero"]
        assert result["mode"] == "qcds-resolve"
        assert current["coherence"] == "blocked"
        assert any(reason.startswith(f"state:{room.entity_id}:capacity:2/1") for reason in current["reasons"])
        assert result["provenance"]["system_boundary"] == "SyntractSystem"
        assert result["provenance"]["qcds_core_replaced"] is False

        service.move_event(second.event_id, start="2026-09-03T12:00", end="2026-09-03T13:00")
        link = next(
            r for r in service.graph.relations.values()
            if r.subject_id == second.event_id and r.object_id == room.entity_id and r.predicate == "uses"
        )
        assert link.dimensions["time_start"] == "2026-09-03T12:00"
        assert link.dimensions["time_end"] == "2026-09-03T13:00"
        moved = service.infer_placement(second.event_id)["candidate_worlds"]["shift-zero"]
        assert not any(reason.startswith(f"state:{room.entity_id}:capacity:") for reason in moved["reasons"])
        assert first.event_id in service.space.events


def test_dimensions_are_first_class_states_and_retirement_preserves_values() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        person = service.upsert_person(
            {"person_id": "p1", "name": "Person One", "dimensions": {"shoe_size": "42"}}
        )
        before = service.state()
        dims = {item["key"]: item for item in before["dimension_states"]}
        assert dims["person"]["value_kind"] == "entity:person"
        assert dims["person"]["rich_editor"] is True
        assert dims["shoe_size"]["origin"] == "discovered"
        assert before["provenance"]["dimensions_are_state"] is True

        service.upsert_dimension(
            {
                "key": "shoe_size",
                "label": "Skostorlek",
                "labels": {"sv": "Skostorlek", "en": "Shoe size"},
                "aliases": ["Size"],
            }
        )
        service.retire_dimension("shoe_size", retired=True)
        after = service.state()
        updated = {item["key"]: item for item in after["dimension_states"]}["shoe_size"]
        assert updated["label"] == "Skostorlek"
        assert updated["status"] == "retired"
        assert "Size" in updated["aliases"]
        assert service.space.people[person.person_id].dimensions["shoe_size"] == "42"

        service.retire_dimension("shoe_size", retired=False)
        restored = {item["key"]: item for item in service.state()["dimension_states"]}["shoe_size"]
        assert restored["status"] == "active"


def test_person_is_rich_state_and_can_be_edited_or_archived_without_history_loss() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        org_a = service.upsert_entity({"entity_id": "org-a", "kind": "organization", "label": "Org A"})
        org_b = service.upsert_entity({"entity_id": "org-b", "kind": "organization", "label": "Org B"})
        person = service.upsert_person(
            {
                "person_id": "p-rich",
                "name": "Anna",
                "dimensions": {"language": "sv", "note": "first"},
                "organization_id": org_a.entity_id,
                "role": "parent",
                "team": "A",
            }
        )
        event = service.upsert_event(
            {
                "event_id": "event-rich-person",
                "title": "Training",
                "start": "2026-09-03T18:00",
                "end": "2026-09-03T19:00",
                "people": [person.person_id],
            }
        )

        service.upsert_person(
            {
                "person_id": person.person_id,
                "name": "Anna Andersson",
                "dimensions": {"language": "en", "phone_label": "work"},
                "organization_id": org_b.entity_id,
                "role": "coach",
                "team": "B",
            }
        )
        relations = [r for r in service.graph.relations.values() if r.subject_id == person.person_id and r.predicate == "member_of"]
        assert len(relations) == 1
        assert relations[0].object_id == org_b.entity_id
        assert relations[0].dimensions["role"] == "coach"
        assert service.space.people[person.person_id].name == "Anna Andersson"

        service.archive_person(person.person_id, archived=True)
        assert service.space.people[person.person_id].dimensions["archived"] is True
        assert person.person_id in service.space.events[event.event_id].people
        assert service.graph.entities[person.person_id].dimensions["status"] == "archived"


def test_cally_ui_keeps_qcds_technical_detail_but_speaks_calendar_language() -> None:
    html = cally_one_html(static_mode=True)
    assert "Kolla tider" in html
    assert "Alla tider funkar lika bra" in html
    assert "Tekniska detaljer" in html
    assert "SyntractSystem → shared QCDS core" in html
    assert "TruthDistribution" in html
    assert "CALENDAR SPACE" in html
    assert "PERSON STATE" in html
    assert "Dimensions are states" in html
    assert "PERSON DIMENSION" in html
    assert "Resources · uses / reserves" in html
    assert "Things · requires" in html
    assert "Åker med" in html
    assert "Ändra själv" in html
    assert "callyNeedsResolution" in html
    assert "'/api/entity'" in html
    assert "'/api/relation'" in html
    assert "'/api/dimension'" in html
    assert "'/api/dimension/retire'" in html
    assert "'/api/person/archive'" in html
    assert "dimensionKeys.__callyStateDimensions" in html
    assert "Everything-is-state" in html or "Everything represented" in html or "everything_is_state" in html


def test_mutation_observers_do_not_rewrite_customer_label_unconditionally() -> None:
    html = cally_one_html(static_mode=True)
    assert "if (button.textContent !== label) button.textContent = label;" in html
    assert "infer.dataset.callyCustomerLabel = '1';" in html
    assert "button.dataset.callyCustomerLabel = '1';" in html
    assert "infer.textContent = 'QCDS Resolve';" not in html
