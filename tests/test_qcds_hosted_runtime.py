from __future__ import annotations

from tempfile import TemporaryDirectory

from qcds_fabric.hosted_robotics import ROBOTICS_HOSTED_ROBOT_ID, hosted_robotics_adapter
from qcds_fabric.hosted_runtime import HOSTED_RUNTIME_CONTRACT, HostedQCDSRuntime
from qcds_fabric.robots.cally_chatgpt.hosted_adapter import CALLY_HOSTED_ROBOT_ID, hosted_cally_adapter
from qcds_fabric.robots.cally_chatgpt.hosted_interface import HostedCallyChatGPTInterface
from qcds_fabric.robots.cally_chatgpt.chatgpt_bridge import ChatGPTLogicalRobot
from qcds_fabric.robots.cally_chatgpt.runtime_v3 import CallyOneService


def _calendar_state(root: str) -> dict:
    service = CallyOneService(root)
    service.upsert_event(
        {
            "event_id": "event-1",
            "title": "Training",
            "start": "2030-01-02T17:00:00+01:00",
            "end": "2030-01-02T18:00:00+01:00",
            "people": [],
        }
    )
    return service.state()


def test_hosted_runtime_is_one_syntract_system_with_two_robot_adapters() -> None:
    runtime = HostedQCDSRuntime()
    runtime.register(hosted_cally_adapter())
    runtime.register(hosted_robotics_adapter())

    descriptor = runtime.descriptor()
    assert descriptor["contract"] == HOSTED_RUNTIME_CONTRACT
    assert descriptor["system_boundary"] == "SyntractSystem"
    assert descriptor["single_qcds_architecture"] is True
    assert descriptor["parallel_inference_engine"] is False
    assert {item["robot_id"] for item in descriptor["robots"]} == {
        CALLY_HOSTED_ROBOT_ID,
        ROBOTICS_HOSTED_ROBOT_ID,
    }


def test_cally_resolves_through_hosted_runtime_without_hosted_state_store() -> None:
    runtime = HostedQCDSRuntime()
    runtime.register(hosted_cally_adapter())
    with TemporaryDirectory() as source_root:
        state = _calendar_state(source_root)
        output = runtime.resolve(
            CALLY_HOSTED_ROBOT_ID,
            {
                "calendar_space": state,
                "event_id": "event-1",
                "candidates": [
                    {
                        "candidate_id": "early",
                        "start": "2030-01-02T16:00:00+01:00",
                        "end": "2030-01-02T17:00:00+01:00",
                    },
                    {
                        "candidate_id": "late",
                        "start": "2030-01-02T18:00:00+01:00",
                        "end": "2030-01-02T19:00:00+01:00",
                    },
                ],
            },
        )

    result = output["result"]
    assert result["mode"] == "qcds-resolve"
    assert result["provenance"]["uses_hosted_syntract_system"] is True
    assert result["provenance"]["hosted_runtime_stateful"] is False
    assert result["provenance"]["system_boundary"] == "SyntractSystem"
    assert output["runtime"]["single_qcds_architecture"] is True


def test_robotics_resolves_through_same_host_contract() -> None:
    runtime = HostedQCDSRuntime()
    runtime.register(hosted_robotics_adapter())
    output = runtime.resolve(
        ROBOTICS_HOSTED_ROBOT_ID,
        {
            "width": 20,
            "height": 12,
            "start": [1, 6],
            "goal": [18, 6],
            "blocked": [[9, 6]],
        },
    )
    result = output["result"]
    assert result["reachable"] is True
    assert result["provenance"]["uses_hosted_system_fabric"] is True
    assert result["provenance"]["separate_pathfinder"] is False
    assert result["provenance"]["system_boundary"] == "SyntractSystem"


def test_mcp_five_port_interface_moves_only_resolve_across_hosted_boundary() -> None:
    with TemporaryDirectory() as root:
        robot = ChatGPTLogicalRobot(root, workspace_id="hosted-interface")
        robot.service.upsert_event(
            {
                "event_id": "event-2",
                "title": "Pickup",
                "start": "2030-02-01T15:00:00+01:00",
                "end": "2030-02-01T16:00:00+01:00",
                "people": [],
            }
        )
        runtime = HostedQCDSRuntime()
        interface = HostedCallyChatGPTInterface(robot, runtime)

        read = interface.read({"sections": ["events"]})
        assert read["verb"] == "read"
        assert interface.descriptor()["resolve_transport"] == "HostedQCDSRuntime"

        resolved = interface.resolve(
            {
                "event_id": "event-2",
                "candidates": [
                    {
                        "candidate_id": "a",
                        "start": "2030-02-01T14:00:00+01:00",
                        "end": "2030-02-01T15:00:00+01:00",
                    },
                    {
                        "candidate_id": "b",
                        "start": "2030-02-01T16:00:00+01:00",
                        "end": "2030-02-01T17:00:00+01:00",
                    },
                ],
            }
        )
        assert resolved["verb"] == "resolve"
        assert resolved["inference_engine"] == "QCDS"
        assert resolved["hosted_qcds"]["runtime"]["contract"] == HOSTED_RUNTIME_CONTRACT
        assert resolved["parallel_inference_engine"] is False
