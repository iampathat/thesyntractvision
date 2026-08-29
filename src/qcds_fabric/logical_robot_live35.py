from __future__ import annotations

from http import HTTPStatus
from typing import Any
from urllib.parse import urlparse

from .living_robot_session import living_robot_session_html
from .session_sandbox_core import run_session
from . import logical_robot_live34 as _build34


_BUILD34_CREATE_SERVER = _build34.create_live_robot_server


def create_live_robot_server(**kwargs: Any):
    """BUILD 35 wrapper around the established Logical Robot runtime.

    The new session endpoint is stateless: it does not write the submitted room
    or its result into the persistent intelligence store. The request is passed
    directly to the existing qcds_fabric problem -> Fabric -> Syntract core.
    """

    server = _BUILD34_CREATE_SERVER(**kwargs)
    service = getattr(server, "qcds_service")

    original_state = service.state

    def state_with_build35() -> dict[str, Any]:
        value = original_state()
        provenance = dict(value.get("provenance", {}))
        builds = list(provenance.get("builds", []))
        if 35 not in builds:
            builds.append(35)
        provenance["builds"] = builds
        provenance["public_session_sandbox"] = True
        provenance["session_persistence"] = False
        provenance["browser_core_substrate"] = "webassembly"
        provenance["qcds_core_duplicated_in_client"] = False
        value["provenance"] = provenance
        return value

    service.state = state_with_build35
    parent_handler = server.RequestHandlerClass

    class Handler(parent_handler):
        server_version = "QCDSLivingLogicalRobot/1.7"

        def do_GET(self) -> None:  # noqa: N802
            if urlparse(self.path).path != "/":
                super().do_GET()
                return
            body = living_robot_session_html(static_mode=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self._cors()
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self) -> None:  # noqa: N802
            if urlparse(self.path).path != "/api/session/run":
                super().do_POST()
                return
            try:
                payload = self._body_json()
                result = run_session(payload)
                self._json(result, 200)
            except (ValueError, RuntimeError) as exc:
                self._json({"error": str(exc)}, 400)

    server.RequestHandlerClass = Handler
    return server


def main(argv=None) -> int:
    previous = _build34.create_live_robot_server
    _build34.create_live_robot_server = create_live_robot_server
    try:
        return _build34.main(argv)
    finally:
        _build34.create_live_robot_server = previous


if __name__ == "__main__":
    raise SystemExit(main())
