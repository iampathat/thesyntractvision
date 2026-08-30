from __future__ import annotations

from pathlib import Path

from qcds_fabric.living_robot_legal_full_qcds import living_robot_legal_full_qcds_html


ROOT = Path(__file__).resolve().parents[1]


def test_full_legal_web_exposes_all_qcds_execution_modes() -> None:
    html = living_robot_legal_full_qcds_html(static_mode=True)

    for phrase in (
        "SAME QCDS · THREE EXECUTION MODES",
        "CLASSICAL EXACT",
        "GROVER · STATEVECTOR EMULATED",
        "QUANTUM FULL SPACE · TARGET",
        "resource-bounded software modes",
        "represented logical dimensions may not be removed merely to satisfy classical memory limits",
        "Probabilistic evidence",
        "Scaling / decomposition",
        "Classical projection is an emulator concession, not a QCDS quantum principle",
        "DIRECT QCDS → LEGAL SYNTRACT",
        "TRY SWEDISH LAW",
    ):
        assert phrase in html


def test_full_web_exposes_real_probabilistic_jordabalk_case() -> None:
    html = living_robot_legal_full_qcds_html(static_mode=True)
    fixture = ROOT / "robots" / "legal" / "sweden_housing" / "cases" / "jb_probabilistic_sublet_evidence_2026.json"

    assert fixture.is_file()
    assert "jb_probabilistic_sublet_evidence_2026.json" in html
    assert "Disputed independent use" in html
    assert "0.74 / 0.85 evidence pressures" in html
    assert "qcds_evidence" in fixture.read_text(encoding="utf-8")


def test_pages_exports_current_public_wrapper_chain_over_full_qcds_and_recursive_python_package() -> None:
    workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
    fix49 = (ROOT / "src" / "qcds_fabric" / "living_robot_public_fix49.py").read_text(encoding="utf-8")
    fix48 = (ROOT / "src" / "qcds_fabric" / "living_robot_public_fix48.py").read_text(encoding="utf-8")
    compact = (ROOT / "src" / "qcds_fabric" / "living_robot_public_compact.py").read_text(encoding="utf-8")

    assert "qcds_fabric.living_robot_public_fix49" in workflow
    assert "living_robot_public_fix48" in fix49
    assert "living_robot_public_compact" in fix48
    assert "living_robot_legal_full_qcds" in compact
    assert "root.rglob('*')" in workflow
    assert "path.suffix in {'.py', '.json'}" in workflow
    assert "robots/legal/sweden_housing/cases/*.json" in workflow
