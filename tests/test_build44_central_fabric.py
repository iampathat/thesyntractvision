from __future__ import annotations

import pytest

import qcds_fabric.central_fabric as central_fabric_module
from qcds_fabric.central_fabric import CentralFabricError, CentralQCDSFabric
from qcds_fabric.models import BaseBundle
from qcds_fabric.oracle_space import OracleSpace
from qcds_fabric.oracle_space_transport import export_oracle_space
from qcds_fabric.oracles import ExactOracle, OracleStack


def _space(space_id: str, universe_id: str = "u:one", target: int = 1) -> OracleSpace:
    bundle = BaseBundle(f"bundle:{space_id}", ("x", "y"), ("?", "?"))
    stack = OracleStack(
        f"stack:{space_id}",
        "1",
        (ExactOracle(f"oracle:{space_id}", {"x": target}),),
    )
    return OracleSpace(space_id, universe_id, bundle, stack, host_kind="external")


def test_central_fabric_accepts_portable_external_oracle_space_envelope() -> None:
    fabric = CentralQCDSFabric()
    browser_space = _space("browser-1")
    payload = export_oracle_space(browser_space.rehost(host_kind="session"))

    mounted = fabric.transfer_payload(payload, space_id="central-browser-1", note="browser to central")
    result = fabric.run("central-browser-1")

    assert mounted.host_kind == "central"
    assert mounted.universe_id == browser_space.universe_id
    assert mounted.oracle_stack.oracle_ids == browser_space.oracle_stack.oracle_ids
    assert mounted.provenance["truth_promoted_by_transfer"] is False
    assert result.suite.stabilized_return.stabilized_distribution.support


def test_central_fabric_runs_multiple_oracle_spaces_in_parallel_through_same_core() -> None:
    fabric = CentralQCDSFabric()
    fabric.transfer_in(_space("a"))
    fabric.transfer_in(_space("b", target=0))

    results = fabric.run_parallel(("a", "b"), max_workers=2)

    assert set(results) == {"a", "b"}
    assert all(result.suite.stabilized_return.stabilized_distribution.support for result in results.values())
    assert {row["space_id"] for row in fabric.mounted_manifest()} == {"a", "b"}


def test_parallel_topology_uses_threadless_transport_on_pyodide(monkeypatch: pytest.MonkeyPatch) -> None:
    fabric = CentralQCDSFabric()
    fabric.transfer_in(_space("browser-a"))
    fabric.transfer_in(_space("browser-b", target=0))

    monkeypatch.setattr(central_fabric_module.sys, "platform", "emscripten")

    class ThreadsMustNotStart:
        def __init__(self, *args: object, **kwargs: object) -> None:
            raise AssertionError("ThreadPoolExecutor must not be constructed on Pyodide")

    monkeypatch.setattr(central_fabric_module, "ThreadPoolExecutor", ThreadsMustNotStart)
    results = fabric.run_parallel(("browser-a", "browser-b"), max_workers=2)

    assert set(results) == {"browser-a", "browser-b"}
    assert all(result.suite.stabilized_return.stabilized_distribution.support for result in results.values())


def test_sequence_uses_distribution_oracle_reentry_not_answer_copying() -> None:
    fabric = CentralQCDSFabric()
    fabric.transfer_in(_space("stage-1"))
    fabric.transfer_in(_space("stage-2"))

    runs = fabric.run_sequence(("stage-1", "stage-2"))

    assert len(runs) == 2
    assert runs[1].reentered_from_space_id == "stage-1"
    assert "+reentry" in runs[1].oracle_stack_identity


def test_sequence_fails_closed_across_universe_identity() -> None:
    fabric = CentralQCDSFabric()
    fabric.transfer_in(_space("u1", universe_id="universe:1"))
    fabric.transfer_in(_space("u2", universe_id="universe:2"))

    with pytest.raises(CentralFabricError, match="Logical Universe"):
        fabric.run_sequence(("u1", "u2"))


def test_hybrid_executes_parallel_lanes_with_explicit_sequence_inside_each_lane() -> None:
    fabric = CentralQCDSFabric()
    for space_id in ("a1", "a2", "b1", "b2"):
        fabric.transfer_in(_space(space_id))

    result = fabric.run_hybrid({"lane-a": ("a1", "a2"), "lane-b": ("b1", "b2")}, max_workers=2)

    assert set(result) == {"lane-a", "lane-b"}
    assert all(len(lane.runs) == 2 for lane in result.values())
    assert result["lane-a"].runs[1].reentered_from_space_id == "a1"
    assert result["lane-b"].runs[1].reentered_from_space_id == "b1"


def test_hybrid_topology_uses_threadless_transport_on_pyodide(monkeypatch: pytest.MonkeyPatch) -> None:
    fabric = CentralQCDSFabric()
    for space_id in ("a1", "a2", "b1", "b2"):
        fabric.transfer_in(_space(space_id))

    monkeypatch.setattr(central_fabric_module.sys, "platform", "emscripten")

    class ThreadsMustNotStart:
        def __init__(self, *args: object, **kwargs: object) -> None:
            raise AssertionError("ThreadPoolExecutor must not be constructed on Pyodide")

    monkeypatch.setattr(central_fabric_module, "ThreadPoolExecutor", ThreadsMustNotStart)
    result = fabric.run_hybrid({"lane-a": ("a1", "a2"), "lane-b": ("b1", "b2")}, max_workers=2)

    assert set(result) == {"lane-a", "lane-b"}
    assert all(len(lane.runs) == 2 for lane in result.values())
