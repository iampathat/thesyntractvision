from __future__ import annotations

from qcds_fabric.calendar_robot import CalendarRobotService, CalendarSpace
from qcds_fabric.calendar_robot_ui import calendar_robot_html


def test_calendar_space_keeps_people_events_and_dimensions_in_one_space(tmp_path) -> None:
    space = CalendarSpace(tmp_path)
    parent = space.upsert_person({"person_id": "p1", "name": "Parent", "dimensions": {"role": "adult"}})
    child = space.upsert_person({"person_id": "p2", "name": "Child", "dimensions": {"role": "child"}})

    event = space.upsert_event(
        {
            "event_id": "football",
            "title": "Football",
            "start": "2026-09-02T17:00",
            "end": "2026-09-02T18:30",
            "people": [parent.person_id, child.person_id],
            "location": "Pitch",
            "dimensions": {"activity": "sport", "priority": "high"},
        }
    )

    state = space.snapshot()
    assert state["logical_space"] is True
    assert state["space_id"] == "family-calendar"
    assert state["events"][0]["event_id"] == event.event_id
    assert "activity" in state["dimensions"]
    assert "priority" in state["dimensions"]
    assert "person" in state["dimensions"]


def test_calendar_conflicts_are_state_observations(tmp_path) -> None:
    space = CalendarSpace(tmp_path)
    space.upsert_person({"person_id": "p1", "name": "Parent"})
    space.upsert_event(
        {
            "event_id": "a",
            "title": "A",
            "start": "2026-09-02T17:00",
            "end": "2026-09-02T18:00",
            "people": ["p1"],
        }
    )
    space.upsert_event(
        {
            "event_id": "b",
            "title": "B",
            "start": "2026-09-02T17:30",
            "end": "2026-09-02T18:30",
            "people": ["p1"],
        }
    )

    conflicts = space.conflicts()
    assert len(conflicts) == 1
    assert conflicts[0].people == ("p1",)


def test_calendar_placement_is_projected_through_syntract_system(tmp_path) -> None:
    service = CalendarRobotService(tmp_path)
    service.space.upsert_person({"person_id": "p1", "name": "Parent"})
    service.space.upsert_event(
        {
            "event_id": "fixed",
            "title": "Fixed",
            "start": "2026-09-02T17:00",
            "end": "2026-09-02T18:00",
            "people": ["p1"],
            "locked": True,
        }
    )
    service.space.upsert_event(
        {
            "event_id": "movable",
            "title": "Movable",
            "start": "2026-09-02T16:00",
            "end": "2026-09-02T17:00",
            "people": ["p1"],
        }
    )

    result = service.infer_placement(
        "movable",
        [
            {"candidate_id": "blocked", "start": "2026-09-02T17:00", "end": "2026-09-02T18:00"},
            {"candidate_id": "clear", "start": "2026-09-02T18:00", "end": "2026-09-02T19:00"},
        ],
    )

    assert result["provenance"]["system_boundary"] == "SyntractSystem"
    assert result["provenance"]["single_qcds_architecture"] is True
    assert result["provenance"]["qcds_core_replaced"] is False
    assert result["candidate_worlds"]["blocked"]["fit"] == "blocked"
    assert result["candidate_worlds"]["clear"]["fit"] == "clear"
    assert result["truth_distribution_bound"] is True
    assert result["logical_width"] > 0


def test_calendar_ui_has_all_first_class_perspectives_and_pointer_dragging() -> None:
    html = calendar_robot_html()
    for view in ("day", "week", "month", "year", "person", "event", "dimension"):
        assert f'data-view="{view}"' in html
    assert "Dimension X · Y · Z" in html
    assert "pointerdown" in html
    assert "data-drop-date" in html
    assert "data-drop-person" in html
    assert "QCDS fit" in html
    assert "Calendar Tribute License 1.0" in html
