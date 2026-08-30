from __future__ import annotations

import shutil
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from qcds_fabric.living_robot_public import export_static
from qcds_fabric.public_release_guard import validate_public_site


ROOT = Path(__file__).resolve().parents[1]


def test_exact_pages_artifact_passes_release_guard(tmp_path) -> None:
    site = tmp_path / "site"
    case_target = site / "legal" / "cases"
    case_target.mkdir(parents=True)

    export_static(site / "index.html")
    shutil.copy2(ROOT / "web" / "session_core_worker.js", site / "session_core_worker.js")
    for path in (ROOT / "robots" / "legal" / "sweden_housing" / "cases").glob("*.json"):
        shutil.copy2(path, case_target / path.name)

    package_root = ROOT / "src" / "qcds_fabric"
    with ZipFile(site / "qcds_fabric.zip", "w", compression=ZIP_DEFLATED) as archive:
        for path in sorted(package_root.rglob("*")):
            if path.is_file() and path.suffix in {".py", ".json"}:
                archive.write(path, path.relative_to(ROOT / "src"))

    validate_public_site(site)


def test_pages_runs_release_guard_before_upload() -> None:
    workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")

    guard = workflow.index("python -m qcds_fabric.public_release_guard --site _site")
    upload = workflow.index("uses: actions/upload-pages-artifact@v4")
    assert guard < upload


def test_public_stabilization_does_not_rewrite_locked_qcds_theory() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")

    assert "**Canonical architecture:** QCDS Fabric v1.0 — locked" in readme
    phases = (
        "1. **Condition Formation** — open the represented possibility space without preselecting the answer.",
        "2. **Conditional Evolution** — apply evidence, logic, rules, measurements and other constraints as oracles.",
        "3. **Recursive Inference** — amplify, compare, rotate, null, stabilize, recurse and reshape the working truth distribution.",
        "4. **Truth-Alignment / Syntract Binding** — bind what remains coherent through repeated inference and contradiction testing.",
    )
    for phase in phases:
        assert phase in readme
    assert readme.index(phases[0]) < readme.index(phases[1]) < readme.index(phases[2]) < readme.index(phases[3])
    assert "applies logical and evidential constraints as **oracles**" in readme
    assert "probability mass / coherence in the represented logical universe under the supplied oracle semantics" in readme
