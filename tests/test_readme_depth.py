from pathlib import Path
import re


def test_readme_keeps_easy_entry_and_full_architecture_depth() -> None:
    readme = Path("README.md").read_text(encoding="utf-8")

    # The easy door must remain.
    assert "## Start in 60 seconds" in readme
    assert "Advanced Logical Space Lab" in readme
    assert "START_HERE.md" in readme

    # The README describes the architecture, not the development diary.
    assert not re.search(r"\bBUILD\s+\d", readme)
    assert "## Specialized Logical Robots" in readme
    assert "robots/legal/sweden_housing/" in readme

    # The easy door must never replace the architecture behind it.
    required_sections = (
        "## One intelligence, many bodies",
        "## Oracle-space topology: session, external and central",
        "## How QCDS works",
        "## An expanding Logical Space",
        "## Logical Universes and rule drift",
        "## Syntractfilter and the superintelligence direction",
        "## Quantum execution target",
        "## Browser-scale execution, QCDS-driven swarm and central fabric",
        "## Research status and claim boundary",
    )
    for section in required_sections:
        assert section in readme

    # Visual architecture is part of the README, not expendable decoration.
    assert readme.count("```mermaid") >= 4
    assert "QCDS / Syntract Intelligence" in readme
    assert "Oracle Stack" in readme
    assert "Superposition / represented state" in readme
    assert "Oracles / emulated oracles" in readme

    # Keep the ambition visible while keeping the implementation claim bounded.
    assert "blueprint / research architecture for superintelligence" in readme
    assert "not a claim that the current MVP has already reached superintelligence" in readme

    # Canonical four-phase identity must remain visible in the front-door document.
    assert "Condition Formation" in readme
    assert "Conditional Evolution" in readme
    assert "Recursive Inference" in readme
    assert "Truth-Alignment / Syntract Binding" in readme

    # Resource-bounded emulation must never be confused with the quantum target.
    assert "CLASSICAL EXACT" in readme
    assert "GROVER EMULATED" in readme
    assert "QUANTUM FULL SPACE" in readme
    assert "Emulator modes may project" in readme
    assert "Quantum Full Space must not prefilter away the universe" in readme
    assert "Do not remove represented logical dimensions merely because a classical machine thinks they are irrelevant or cannot fit them in RAM" in readme
    assert "browser / Pyodide session" in readme
    assert "local MacBook-class machine" in readme
    assert "central software fabric" in readme
    assert "Quantum Full Space does not inherit these browser/MacBook/central software limits" in readme
    assert "quantum_full_space.py" in readme

    # Swarm and central topology remain subordinate to the same QCDS core.
    assert "QCDS-driven swarm loop" in readme
    assert "CentralQCDSFabric" in readme
    assert "same QCDS architecture" in readme
