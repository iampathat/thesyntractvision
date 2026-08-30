from __future__ import annotations

from qcds_fabric.models import BaseBundle
from qcds_fabric.oracles import ExactOracle, OracleStack
from qcds_fabric.oracle_space import OracleSpace, OracleSpaceHost, transfer_oracle_space


def _space(host_kind: str = "session") -> OracleSpace:
    bundle = BaseBundle("session-bundle", ("fact:a", "conclusion:b"), (1, "?"))
    stack = OracleStack("session-stack", "1", (ExactOracle("o:a", {"fact:a": 1}),))
    return OracleSpace(
        space_id="browser-session-1",
        universe_id="experiment:one",
        bundle=bundle,
        oracle_stack=stack,
        host_kind=host_kind,
        provenance={"source": "browser-session"},
        syntract_ids=("syntract:session:1",),
    )


def test_session_space_can_transfer_to_central_without_changing_logical_contract() -> None:
    session = _space()
    central = OracleSpaceHost("central-fabric", "central")

    imported = transfer_oracle_space(session, central, note="promote capacity, not truth")

    assert imported.host_kind == "central"
    assert imported.universe_id == session.universe_id
    assert imported.bundle is session.bundle
    assert imported.oracle_stack is session.oracle_stack
    assert imported.logical_contract_identity == session.logical_contract_identity
    assert imported.provenance["truth_promoted_by_transfer"] is False
    assert imported.provenance["qcds_semantics_changed_by_transfer"] is False


def test_central_host_keeps_external_universe_identity_isolated() -> None:
    central = OracleSpaceHost("central-fabric", "central")
    imported = central.transfer_in(_space("external"), space_id="external-copy")

    manifest = central.manifest()
    assert imported.space_id == "external-copy"
    assert imported.universe_id == "experiment:one"
    assert manifest[0]["universe_id"] == "experiment:one"
    assert manifest[0]["oracle_stack_identity"] == "session-stack@1"


def test_hosting_layer_contains_no_second_qcds_engine() -> None:
    space = _space()
    central = OracleSpaceHost("central-fabric", "central")
    central.mount(space.rehost(host_kind="central"))

    assert central.get(space.space_id).oracle_stack.oracle_ids == ("o:a",)
    assert not hasattr(central, "infer")
    assert not hasattr(central, "reason")
