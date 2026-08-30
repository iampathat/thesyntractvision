from __future__ import annotations

import re
import shutil
import subprocess

import pytest

from qcds_fabric.living_robot_public_compact import living_robot_public_compact_html


def test_generated_public_inline_javascript_parses_in_node(tmp_path) -> None:
    node = shutil.which("node")
    if node is None:
        pytest.skip("node is unavailable")

    html = living_robot_public_compact_html(static_mode=True)
    scripts = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", html, flags=re.IGNORECASE | re.DOTALL)
    assert scripts, "generated public HTML contains no inline scripts"

    combined = "\n\n".join(scripts)
    target = tmp_path / "public-inline.js"
    target.write_text(combined, encoding="utf-8")

    completed = subprocess.run(
        [node, "--check", str(target)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
