from __future__ import annotations

from http import HTTPStatus
from typing import Any
from urllib.parse import urlparse

from .living_robot_invite38 import living_robot_invite38_html
from . import logical_robot_live35 as _build35


_BUILD35_CREATE_SERVER = _build35.create_live_robot_server


def create_live_robot_server(**kwargs: Any):
    """BUILD 38 presentation wrapper around the unchanged BUILD 35 core runtime."""

    server = _BUILD35_CREATE_SERVER(**kwargs)
    service = getattr(server, "qcds_service")
    original_state = service.state

    def state_with_build38() -> dict[str, Any]:
        value = original_state()
        provenance = dict(value.get("provenance", {}))
        builds = list(provenance.get("builds", []))
        for build in (37, 38):
            if build not in builds:
                builds.append(build)
        provenance["builds"] = builds
        provenance["quick_start_invitation"] = True
        provenance["advanced_lab_preserved"] = True
        provenance["quick_start_four_candidate_spaces"] = True
        provenance["quick_start_baseline_to_stabilized_view"] = True
        value["provenance"] = provenance
        return value

    service.state = state_with_build38
    parent_handler = server.RequestHandlerClass

    class Handler(parent_handler):
        server_version = "QCDSLivingLogicalRobot/1.9"

        def do_GET(self) -> None:  # noqa: N802
            if urlparse(self.path).path != "/":
                super().do_GET()
                return
            body = living_robot_invite38_html(static_mode=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self._cors()
            self.end_headers()
            self.wfile.write(body)

    server.RequestHandlerClass = Handler
    return server


def main(argv=None) -> int:
    previous = _build35.create_live_robot_server
    _build35.create_live_robot_server = create_live_robot_server
    try:
        return _build35.main(argv)
    finally:
        _build35.create_live_robot_server = previous


if __name__ == "__main__":
    raise SystemExit(main())
