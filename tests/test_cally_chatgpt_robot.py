from __future__ import annotations

from tempfile import TemporaryDirectory

from qcds_fabric.robots import cally_one
from qcds_fabric.robots import cally_chatgpt
from qcds_fabric.robots.cally_chatgpt.chatgpt_bridge import (
    CHATGPT_ROBOT_ID,
    ChatGPTLogicalRobot,
    ChatGPTWorkspaceRouter,
)
from qcds_fabric.robots.cally_chatgpt.interface import (
    CallyChatGPTInterface,
    INTERFACE_VERBS,
)


def test_chatgpt_robot_is_separate_manifestation_and_old_cally_stays_available() -> None:
    assert cally_one.CallyOneService.__module__.endswith("robots.cally_one.runtime_v3")
    assert cally_chatgpt.CallyOneService.__module__.endswith("robots.cally_chatgpt.runtime_v3")
    assert cally_one.CallyOneService is not cally_chatgpt.CallyOneService
    assert CHATGPT_ROBOT_ID == "cally-chatgpt"


def test_chatgpt_descriptor_makes_qcds_boundary_explicit() -> None:
    with TemporaryDirectory() as root:
        robot = ChatGPTLogicalRobot(root, workspace_id="family-alpha")
        descriptor = robot.descriptor()
        architecture = descriptor["architecture"]
        assert descriptor["projection"] == "calendar"
        assert architecture["chatgpt_is_adapter"] is True
        assert architecture["calendar_space_is_canonical"] is True
        assert architecture["calendar_is_projection"] is True
        assert architecture["qcds_is_sole_inference_engine"] is True
        assert architecture["parallel_inference_engine"] is False
        tools = {item["name"]: item for item in descriptor["tools"]}
        assert "get_calendar_space" in tools
        assert "resolve_with_qcds" in tools
        assert tools["resolve_with_qcds"]["qcds_inference"] is True


def test_workspace_router_isolates_calendar_spaces() -> None:
    with TemporaryDirectory() as root:
        router = ChatGPTWorkspaceRouter(root)
        alpha = router.robot("alpha")
        beta = router.robot("beta")
        assert alpha is router.robot("alpha")
        assert alpha is not beta
        assert alpha.store_root != beta.store_root
        assert alpha.workspace_id == "alpha"
        assert beta.workspace_id == "beta"


def test_get_calendar_space_marks_chatgpt_as_adapter_not_engine() -> None:
    with TemporaryDirectory() as root:
        robot = ChatGPTLogicalRobot(root, workspace_id="preview")
        result = robot.call_tool("get_calendar_space")
        provenance = result["calendar_space"]["provenance"]
        assert provenance["chatgpt_adapter"] is True
        assert provenance["calendar_is_projection"] is True
        assert provenance["parallel_inference_engine"] is False
        assert provenance["system_boundary"] == "SyntractSystem"


def test_resolve_tool_delegates_to_existing_qcds_service_boundary() -> None:
    with TemporaryDirectory() as root:
        robot = ChatGPTLogicalRobot(root, workspace_id="delegation-test")
        calls: list[tuple[str, object]] = []

        def fake_infer(event_id, candidates=None):
            calls.append((event_id, candidates))
            return {
                "truth_alignment": "TEST-DELEGATED",
                "provenance": {"system_boundary": "SyntractSystem"},
            }

        robot.service.infer_placement = fake_infer  # type: ignore[method-assign]
        result = robot.call_tool(
            "resolve_with_qcds",
            {"event_id": "event-42", "candidates": [{"start": "2030-01-01T10:00:00Z"}]},
        )
        assert calls == [("event-42", [{"start": "2030-01-01T10:00:00Z"}])]
        assert result["result"]["qcds_resolution"]["truth_alignment"] == "TEST-DELEGATED"


def test_public_interface_has_exactly_five_verbs_and_one_inference_crossing() -> None:
    assert INTERFACE_VERBS == ("read", "write", "query", "project", "resolve")
    descriptor = CallyChatGPTInterface.descriptor()
    assert descriptor["parallel_inference_engine"] is False
    verbs = {item["name"]: item for item in descriptor["verbs"]}
    assert set(verbs) == set(INTERFACE_VERBS)
    assert verbs["read"]["qcds_inference"] is False
    assert verbs["write"]["qcds_inference"] is False
    assert verbs["query"]["qcds_inference"] is False
    assert verbs["project"]["qcds_inference"] is False
    assert verbs["resolve"]["qcds_inference"] is True


def test_query_is_deterministic_state_selection_not_inference() -> None:
    with TemporaryDirectory() as root:
        robot = ChatGPTLogicalRobot(root, workspace_id="query-test")
        interface = CallyChatGPTInterface(robot)
        interface.write("upsert_entity", {"entity_id": "room-a", "kind": "room", "label": "Room A"})
        interface.write("upsert_entity", {"entity_id": "car-a", "kind": "vehicle", "label": "Car A"})
        result = interface.query({"section": "entities", "where": {"kind": "room"}})
        assert result["count"] == 1
        assert result["matches"][0]["entity_id"] == "room-a"
        assert result["interface"]["parallel_inference_engine"] is False


def test_public_resolve_port_is_only_qcds_boundary() -> None:
    with TemporaryDirectory() as root:
        robot = ChatGPTLogicalRobot(root, workspace_id="resolve-port")
        interface = CallyChatGPTInterface(robot)
        calls: list[tuple[str, object]] = []

        def fake_infer(event_id, candidates=None):
            calls.append((event_id, candidates))
            return {"truth_alignment": "PORT-DELEGATED"}

        robot.service.infer_placement = fake_infer  # type: ignore[method-assign]
        result = interface.resolve({"event_id": "event-9", "candidates": []})
        assert calls == [("event-9", [])]
        assert result["inference_engine"] == "QCDS"
        assert result["parallel_inference_engine"] is False
        assert result["result"]["qcds_resolution"]["truth_alignment"] == "PORT-DELEGATED"


def test_chatgpt_projection_contains_visible_five_port_interface() -> None:
    html = cally_chatgpt.cally_chatgpt_html(static_mode=True)
    assert 'data-cally-chatgpt-interface' in html
    assert 'logical-robot-interface/v1' in html
    for verb in ("READ", "WRITE", "QUERY", "PROJECT", "RESOLVE"):
        assert verb in html
    assert "resolve -> QCDS -> Syntract" in html
    assert "window.__callyChatGPT" in html
