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
        "## How QCDS works",
        "## An expanding Logical Space",
        "## Logical Universes and rule drift",
        "## Syntractfilter and the superintelligence direction",
        "## Quantum execution target",
        "## Browser-scale execution and Living Swarm Logical Robots",
        "## Research status and claim boundary",
    )
    for section in required_sections:
        assert section in readme

    # Visual architecture is part of the README, not expendable decoration.
    assert readme.count("```mermaid") >= 3
    assert "QCDS / Syntract Intelligence" in readme
    assert "Oracle Stack" in readme
    assert "Superposition / represented state" in readme

    # Keep the ambition visible while keeping the implementation claim bounded.
    assert "blueprint / research architecture for superintelligence" in readme
    assert "not a claim that the current MVP has already reached superintelligence" in readme

    # Canonical four-phase identity must remain visible in the front-door document.
    assert "Condition Formation" in readme
    assert "Conditional Evolution" in readme
    assert "Recursive Inference" in readme
    assert "Truth-Alignment / Syntract Binding" in readme
