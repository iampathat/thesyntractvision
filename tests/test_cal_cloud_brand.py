from __future__ import annotations

from qcds_fabric.cal_cloud import CalCloudService
from qcds_fabric.cal_cloud_ui import cal_cloud_html


def test_cal_cloud_is_public_identity_over_calendar_space(tmp_path) -> None:
    service = CalCloudService(tmp_path)
    state = service.state()

    assert state["product"] == "Cal.Cloud"
    assert state["space_id"] == "cal-cloud"
    assert state["provenance"]["public_identity"] == "Cal.Cloud"
    assert state["provenance"]["technical_space"] == "Calendar Space"
    assert state["provenance"]["system_boundary"] == "SyntractSystem"
    assert state["provenance"]["single_qcds_architecture"] is True


def test_cal_cloud_public_ui_uses_cal_cloud_brand() -> None:
    html = cal_cloud_html()

    assert "Cal.Cloud" in html
    assert "Cal.Cloud Tribute License 1.0" in html
    assert "Family Calendar" not in html
    assert "Calendar Space" in html
    assert "QCDS / Syntract" in html
