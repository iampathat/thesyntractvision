from __future__ import annotations

from qcds_fabric.cally_one import CallyOneService
from qcds_fabric.cally_one_ui import cally_one_html


def test_cally_one_is_public_identity_over_calendar_space(tmp_path) -> None:
    service = CallyOneService(tmp_path)
    state = service.state()

    assert state["product"] == "Cally.One"
    assert state["space_id"] == "cally-one"
    assert state["provenance"]["public_identity"] == "Cally.One"
    assert state["provenance"]["technical_space"] == "Calendar Space"
    assert state["provenance"]["system_boundary"] == "SyntractSystem"
    assert state["provenance"]["single_qcds_architecture"] is True


def test_cally_one_public_ui_uses_cally_one_brand() -> None:
    html = cally_one_html()

    assert "Cally.One" in html
    assert "Cally.One Tribute License 1.0" in html
    assert "Family Calendar" not in html
    assert "Cal.Cloud" not in html
    assert "Calendar Space" in html
    assert "QCDS / Syntract" in html
