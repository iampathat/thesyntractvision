from pathlib import Path

from qcds_fabric.syntract_system import SyntractSystem


def test_superbuild_keeps_one_syntract_system_boundary():
    system = SyntractSystem()
    for method in (
        "run_frame",
        "run_text",
        "run_parallel",
        "run_sequence",
        "run_hybrid",
        "plan_swarm",
        "reenter_swarm",
        "mission",
    ):
        assert callable(getattr(system, method))


def test_superbuild_presentation_does_not_define_second_qcds_engine():
    root = Path(__file__).resolve().parents[1]
    assets = sorted((root / "web" / "assets").glob("syntract_super*.js"))
    assert [path.name for path in assets] == [
        "syntract_super108.js",
        "syntract_super109.js",
        "syntract_super110.js",
        "syntract_super111.js",
        "syntract_super112.js",
        "syntract_super113.js",
        "syntract_super114.js",
        "syntract_super115.js",
        "syntract_super116.js",
        "syntract_super117.js",
        "syntract_super118.js",
        "syntract_super119.js",
        "syntract_super120.js",
    ]
    joined = "\n".join(path.read_text(encoding="utf-8") for path in assets)
    assert "qcdsCoreReimplemented:false" in joined
    assert "secondInferenceEngine:false" in joined
    assert "class SuperintelligenceEngine" not in joined
    assert "class FusionEngine" not in joined
    assert "function runQCDSInference" not in joined


def test_superbuild_keeps_body_vs_intelligence_language_explicit():
    root = Path(__file__).resolve().parents[1]
    body = (root / "web" / "assets" / "syntract_super116.js").read_text(encoding="utf-8")
    assert "The robot is not the intelligence." in body
    assert "SAME QCDS / SYNTRACT CORE" in body
    recursion = (root / "web" / "assets" / "syntract_super117.js").read_text(encoding="utf-8")
    assert "NO SEPARATE FUSION ENGINE" in recursion
    assert "DistributionOracles" in recursion


def test_superbuild_keeps_claim_boundary_visible():
    root = Path(__file__).resolve().parents[1]
    claims = (root / "web" / "assets" / "syntract_super119.js").read_text(encoding="utf-8")
    assert "DEMONSTRATED NOW" in claims
    assert "NEXT" in claims
    assert "HORIZON" in claims
    assert "research software" in claims
    assert "does not claim that the current Python/browser system has already achieved AGI, ASI" in claims
