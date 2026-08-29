from __future__ import annotations

from http import HTTPStatus
from typing import Any
from urllib.parse import urlparse

from .domain_lab_builder import CustomDomainLabService
from .living_robot_builder import living_robot_builder_html
from . import logical_robot_live as _build33


_BUILD33_CREATE_SERVER = _build33.create_live_robot_server


def create_live_robot_server(**kwargs: Any):
    # BUILD 34 wrapper: keep BUILD 33 runtime and add custom Logical Space creation.
    server = _BUILD33_CREATE_SERVER(**kwargs)
    service = getattr(server, "qcds_service")
    builder = CustomDomainLabService(service.store_root)
    setattr(server, "qcds_domain_builder", builder)

    original_state = service.state

    def state_with_build34() -> dict[str, Any]:
        value = original_state()
        provenance = dict(value.get("provenance", {}))
        builds = list(provenance.get("builds", []))
        if 34 not in builds:
            builds.append(34)
        provenance["builds"] = builds
        provenance["custom_logical_space_builder"] = True
        value["provenance"] = provenance
        return value

    service.state = state_with_build34
    parent_handler = server.RequestHandlerClass

    class Handler(parent_handler):
        server_version = "QCDSLivingLogicalRobot/1.6"

        def do_GET(self) -> None:  # noqa: N802
            if urlparse(self.path).path != "/":
                super().do_GET()
                return
            body = living_robot_builder_html(static_mode=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self._cors()
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self) -> None:  # noqa: N802
            if urlparse(self.path).path != "/api/domain/custom-start":
                super().do_POST()
                return
            try:
                payload = self._body_json()
                result = builder.start(payload)
                service.events.emit(
                    "custom_domain_lab_started",
                    {
                        "domain_id": result["domain_id"],
                        "universe_id": result["universe_id"],
                        "truth_effect_on_reality": 0,
                        "solution_rule_supplied": False,
                        "custom": True,
                    },
                    source="human",
                )
                self._json(result, 202)
            except (ValueError, RuntimeError) as exc:
                self._json({"error": str(exc)}, 400)

    server.RequestHandlerClass = Handler
    return server


def main(argv=None) -> int:
    # Reuse the established CLI while swapping only the server factory for BUILD 34.
    previous = _build33.create_live_robot_server
    _build33.create_live_robot_server = create_live_robot_server
    try:
        return _build33.main(argv)
    finally:
        _build33.create_live_robot_server = previous


if __name__ == "__main__":
    raise SystemExit(main())
