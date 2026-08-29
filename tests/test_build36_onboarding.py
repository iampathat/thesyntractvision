from __future__ import annotations

import runpy
from pathlib import Path

from qcds_fabric.session_sandbox_core import run_session


def test_hello_logical_space_example_uses_real_core_without_persistence() -> None:
    namespace = runpy.run_path(str(Path("examples/hello_logical_space.py")))
    request = namespace["demo_request"]()
    result = run_session(request)

    assert result["status"] == "ok"
    assert result["core_execution"] == "qcds_fabric.problem.problem_to_syntract"
    assert result["session_only"] is True
    assert result["persistent_state"] is False
    assert result["database_used"] is False
    assert result["truth_effect_on_reality"] == 0
    assert result["generic_bindings_promoted_to_semantic_evidence"] == 0
    assert result["explicit_evidence_count"] == 1
    assert result["candidate_binary_space"] == "2^2"


def test_onboarding_files_point_to_the_smallest_executable_path() -> None:
    readme = Path("README.md").read_text(encoding="utf-8")
    start = Path("START_HERE.md").read_text(encoding="utf-8")

    assert "python examples/hello_logical_space.py" in readme
    assert "python examples/hello_logical_space.py" in start
    assert "START_HERE.md" in readme
    assert "You do **not** need to understand" in start
