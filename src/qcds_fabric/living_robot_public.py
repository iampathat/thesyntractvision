from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Sequence

from .living_robot_public_fix49 import living_robot_public_fix49_html as _base_html


PUBLIC_BUILD = "51"


def living_robot_public_html(*, static_mode: bool = False) -> str:
    """Single stable public exporter.

    Pages and public regression tests import this exact function so tested HTML
    equals deployed HTML. Wrapper evolution here is presentation/routing only;
    the QCDS four-phase core, oracle semantics and Syntract binding are not
    modified by the public surface.
    """

    html = _base_html(static_mode=static_mode)
    html, count = re.subn(
        r'<span class="publicBuildMark">BUILD\s+\d+</span>',
        f'<span class="publicBuildMark">BUILD {PUBLIC_BUILD}</span>',
        html,
        count=1,
    )
    if count != 1:
        raise RuntimeError("public build marker changed; stable exporter cannot identify it safely")
    html = re.sub(
        r'<div class="publicAdvancedKicker">BUILD\s+\d+\s*·\s*ADVANCED</div>',
        '<div class="publicAdvancedKicker">ADVANCED</div>',
        html,
        count=1,
    )
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_public_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export the stable public QCDS surface.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
