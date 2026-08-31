from __future__ import annotations

import argparse
import re
from pathlib import Path
from zipfile import ZipFile

from .living_robot_public import PUBLIC_BUILD


CRITICAL_IDS = (
    "public-overview",
    "public-syntract-teaser",
    "try-logical-robot",
    "public-legal-question",
    "public-robotics",
    "q75Canvas",
    "q75Status",
    "q75OracleList",
    "q79Emulating",
    "public-syntracts",
    "public-advanced",
    "publicLegalQuestionText",
    "publicLegalContext",
    "publicLegalRun",
    "publicLegalInlineStatus",
    "publicLegalQuickResult",
    "publicSyntractStatus",
    "publicSyntractResult",
    "quickResult",
    "swedish-legal-robot",
)

PUBLIC_LEGAL_CASES = (
    "jb_unauthorized_sublet_forfeiture_2026.json",
    "jb_late_rent_recovery_2026.json",
    "jb_extension_renovation_balance_2026.json",
    "jb_second_hand_permission_2026.json",
    "material_defect_praxis_2026.json",
    "jb_excess_second_hand_rent_2026.json",
    "new_private_let_2026.json",
    "legacy_private_let_2026.json",
)

REQUIRED_PACKAGE_FILES = (
    "qcds_fabric/session_sandbox_core.py",
    "qcds_fabric/problem.py",
    "qcds_fabric/parallel_syntracts.py",
    "qcds_fabric/syntract_parallel_demos.py",
    "qcds_fabric/robotics_playground.py",
    "qcds_fabric/robotics_playground_system.py",
    "qcds_fabric/robotics_route_qcds.py",
    "qcds_fabric/living_robot_public_robotics79.py",
    "qcds_fabric/syntract_system.py",
    "qcds_fabric/fabric.py",
    "qcds_fabric/oracles.py",
    "qcds_fabric/robots/legal/sweden_housing/quick_question.py",
    "qcds_fabric/robots/legal/sweden_housing/question_ingress.py",
)


def validate_public_site(site: str | Path) -> None:
    root = Path(site)
    errors: list[str] = []

    index = root / "index.html"
    worker_path = root / "session_core_worker.js"
    package = root / "qcds_fabric.zip"

    if not index.is_file():
        errors.append("index.html missing")
    if not worker_path.is_file():
        errors.append("session_core_worker.js missing")
    if not package.is_file():
        errors.append("qcds_fabric.zip missing")
    if errors:
        raise RuntimeError("public release guard failed: " + "; ".join(errors))

    html = index.read_text(encoding="utf-8")
    worker = worker_path.read_text(encoding="utf-8")

    marker = f'<span class="publicBuildMark">BUILD {PUBLIC_BUILD}</span>'
    if marker not in html:
        errors.append(f"current public build marker missing: BUILD {PUBLIC_BUILD}")

    for element_id in CRITICAL_IDS:
        count = len(re.findall(rf'id="{re.escape(element_id)}"', html))
        if count != 1:
            errors.append(f"critical id {element_id!r} occurs {count} times")

    for phrase in (
        "question/material → translator → Logical Space → oracle filters → QCDS four phases → TruthDistribution → Syntract",
        "QCDS four phases remain unchanged",
        "legal_question_run",
        "syntract_demo_run",
        "robotics_playground_run",
        "RUN QUESTION →",
        "TRY QCDS",
        "LEGAL ROBOT",
        "ROBOTICS PLAYGROUND",
        "Draw reality. Watch the robot re-infer the route.",
        "Every drawn cell becomes an explicit obstacle oracle",
        "QCDS EMULATING…",
        "The previous route binding is invalid",
        "8 binary QCDS Conditions",
        "SyntractSystem",
        "SYNTRACTS · NEW",
        "OPEN SYNTRACT DEMOS →",
        "NEW CAPABILITY · PARALLEL SYNTRACTS",
        "ADVANCED",
        "No voting. No hard collapse. No separate fusion engine.",
    ):
        if phrase not in html:
            errors.append(f"public HTML missing contract phrase: {phrase}")

    for message_type in ("run", "legal_question_run", "legal_run", "syntract_demo_run", "robotics_playground_run"):
        if message_type not in worker:
            errors.append(f"worker missing message route: {message_type}")

    for symbol in (
        "run_session_json",
        "run_swedish_housing_question_json",
        "run_swedish_housing_case_json",
        "run_syntract_demo_json",
        "run_robotics_playground_json",
        "robotics_playground_system",
    ):
        if symbol not in worker:
            errors.append(f"worker missing Python bridge: {symbol}")

    case_root = root / "legal" / "cases"
    for filename in PUBLIC_LEGAL_CASES:
        if not (case_root / filename).is_file():
            errors.append(f"public legal case missing: {filename}")

    try:
        with ZipFile(package) as archive:
            names = set(archive.namelist())
    except Exception as exc:  # pragma: no cover - defensive release error path
        errors.append(f"qcds_fabric.zip unreadable: {exc}")
        names = set()
    for path in REQUIRED_PACKAGE_FILES:
        if path not in names:
            errors.append(f"public Python package missing: {path}")

    if errors:
        raise RuntimeError("public release guard failed:\n- " + "\n- ".join(errors))


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate the exact static public QCDS release before Pages upload.")
    parser.add_argument("--site", required=True, help="Built static site directory")
    args = parser.parse_args()
    validate_public_site(args.site)
    print(f"PUBLIC RELEASE OK · BUILD {PUBLIC_BUILD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
