from pathlib import Path

from qcds_fabric.robots.legal.sweden_housing import (
    SwedishHousingAssessmentRobot,
    SwedishHousingLegalRobot,
)


def test_sweden_housing_robot_has_stable_domain_namespace() -> None:
    assert SwedishHousingAssessmentRobot.__name__ == "SwedishHousingAssessmentRobot"
    assert SwedishHousingLegalRobot.__name__ == "SwedishHousingLegalRobot"


def test_large_domain_robot_material_is_not_scattered_at_repo_root() -> None:
    home = Path("robots/legal/sweden_housing")
    assert (home / "README.md").exists()
    assert (home / "ASSESSMENT_MODEL.md").exists()
    assert (home / "cases/new_private_let_2026.json").exists()
    assert (home / "cases/legacy_private_let_2026.json").exists()
    assert (home / "cases/jordabalk_12_fallback_2026.json").exists()
    assert not Path("LEGAL_LOGICAL_ROBOT_ASSESSMENT.md").exists()


def test_public_cli_routes_through_domain_namespace() -> None:
    pyproject = Path("pyproject.toml").read_text(encoding="utf-8")
    assert 'qcds-legal-robot = "qcds_fabric.robots.legal.sweden_housing.robot:main"' in pyproject
