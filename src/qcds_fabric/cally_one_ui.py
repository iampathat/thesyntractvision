"""Compatibility import for the canonical Cally.One Logical Robot UI.

Cally.One product UI lives inside qcds_fabric.robots.cally_one so the product
and license boundary follows the Logical Robot boundary.
"""

from __future__ import annotations

from .robots.cally_one.enhanced_ui import cally_one_html

__all__ = ["cally_one_html"]
