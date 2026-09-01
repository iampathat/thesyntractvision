from __future__ import annotations

import argparse
from pathlib import Path

from .public_release_guard import validate_public_site


SUPERBUILD = 120
REQUIRED_ASSETS = (
    "syntract_super120.css",
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
)


def validate_superbuild_site(site: str | Path) -> None:
    root = Path(site)
    validate_public_site(root)
    errors: list[str] = []
    index = root / "index.html"
    html = index.read_text(encoding="utf-8")

    for asset in REQUIRED_ASSETS:
        path = root / "assets" / asset
        if not path.is_file() or path.stat().st_size == 0:
            errors.append(f"superbuild asset missing: {asset}")
        expected = f"assets/{asset}"
        if expected not in html:
            errors.append(f"superbuild asset not referenced by index: {asset}")

    joined = "\n".join(
        (root / "assets" / name).read_text(encoding="utf-8")
        for name in REQUIRED_ASSETS
        if (root / "assets" / name).is_file()
    )

    required_phrases = (
        "ONE INTELLIGENCE ARCHITECTURE",
        "Eight switches. 256 exact settings.",
        "Rules do not add lamps.",
        "Do not trust a bright result just because it is bright.",
        "The result can be a pattern, not one forced answer.",
        "what observation, measurement or experiment would distinguish them best?",
        "The same QCDS core runs again.",
        "GOVERNED INTELLIGENCE GROWTH",
        "The robot is not the intelligence.",
        "NO SEPARATE FUSION ENGINE",
        "Scale the capacity — not the number of competing intelligences.",
        "DEMONSTRATED NOW",
        "research software",
        "secondInferenceEngine:false",
        "qcdsCoreReimplemented:false",
    )
    for phrase in required_phrases:
        if phrase not in joined:
            errors.append(f"superbuild story missing contract phrase: {phrase}")

    forbidden = (
        "class SuperintelligenceEngine",
        "class FusionEngine",
        "function runQCDSInference",
        "function qcdsInferenceEngine",
    )
    for phrase in forbidden:
        if phrase in joined:
            errors.append(f"presentation layer appears to define a second inference engine: {phrase}")

    if errors:
        raise RuntimeError("superbuild release guard failed:\n- " + "\n- ".join(errors))


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate SUPERBUILD 107–120 public manifestation.")
    parser.add_argument("--site", required=True)
    args = parser.parse_args()
    validate_superbuild_site(args.site)
    print(f"SUPERBUILD RELEASE OK · BUILD {SUPERBUILD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
