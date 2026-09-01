from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_qcds_four_phase_architecture_remains_visible_and_unchanged() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    required = (
        "Condition Formation",
        "Conditional Evolution",
        "Recursive Inference",
        "Truth-Alignment / Syntract Binding",
    )
    for phase in required:
        assert phase in readme
    assert readme.index(required[0]) < readme.index(required[1]) < readme.index(required[2]) < readme.index(required[3])


def test_root_readme_keeps_architecture_diagrams_and_robot_boundary() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert readme.count("```mermaid") >= 3
    assert "Logical Robot does not contain QCDS. Logical Robot talks to QCDS." in readme
    assert "The Living Superintelligence" in readme
    assert "current reference implementation remains an experimental and falsifiable implementation" in readme
    assert "the name is not used as evidence that demonstrated ASI performance has already been achieved" in readme


def test_new_topology_is_additive_not_a_second_qcds_core() -> None:
    oracle_space = (ROOT / "src" / "qcds_fabric" / "oracle_space.py").read_text(encoding="utf-8")
    swarm = (ROOT / "src" / "qcds_fabric" / "swarm_intelligence.py").read_text(encoding="utf-8")
    central = (ROOT / "src" / "qcds_fabric" / "central_fabric.py").read_text(encoding="utf-8")

    assert "BaseBundle + OracleStack" in oracle_space
    assert "same QCDS" in swarm
    assert "FabricLayer" in central
    assert "second inference" in central
