from __future__ import annotations

from pathlib import Path

from qcds_fabric.living_robot_legal_full_qcds import living_robot_legal_full_qcds_html


ROOT = Path(__file__).resolve().parents[1]


def test_full_legal_web_exposes_both_qcds_execution_substrates() -> None:
    html = living_robot_legal_full_qcds_html(static_mode=True)

    for phrase in (
        "SAME QCDS · TWO EXECUTION SUBSTRATES",
        "CLASSICAL EXACT",
        "GROVER · STATEVECTOR EMULATED",
        "same BaseBundle and OracleStack",
        "Probabilistic evidence",
        "Scaling / decomposition",
        "not automatically a calibrated probability of how a court will rule",
        "DIRECT QCDS → LEGAL SYNTRACT",
        "TRY SWEDISH LAW",
    ):
        assert phrase in html


def test_pages_exports_full_qcds_surface_and_recursive_python_package() -> None:
    workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")

    assert "qcds_fabric.living_robot_legal_full_qcds" in workflow
    assert "root.rglob('*')" in workflow
    assert "path.suffix in {'.py', '.json'}" in workflow
    assert "robots/legal/sweden_housing/cases/*.json" in workflow
