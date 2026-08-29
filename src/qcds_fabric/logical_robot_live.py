from __future__ import annotations

import argparse
import json
import threading
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Mapping, Sequence
from urllib.parse import parse_qs, urlparse

from .intelligence_growth import IntelligenceGrowthView
from .learning_moment import LearningMomentView
from .living_logical_space import LivingLogicalSpace
from .living_robot_clarity import living_robot_clarity_html
from .logical_robot_control import LogicalRobotControlPlane
from .logical_robot_observatory import LogicalRobotEventLog


class LiveRobotError(ValueError):
    pass


class LivingLogicalRobotService:
    """One observable/control surface for the same Logical Robot.

    The service composes BUILD 23-32 overlays. It never bypasses QCDS challenge,
    Reality governance, or the persistent logical stores.
    """

    def __init__(
        self,
        store_root: str | Path = "./intelligence_store",
        *,
        seed_continuous_spec: Mapping[str, Any] | None = None,
        autostart_continuous: bool = False,
    ) -> None:
        self.store_root = Path(store_root)
        self.store_root.mkdir(parents=True, exist_ok=True)
        self.events = LogicalRobotEventLog(self.store_root)
        self.control = LogicalRobotControlPlane(self.store_root)
        self.space = LivingLogicalSpace(self.store_root)
        self.growth = IntelligenceGrowthView(self.store_root)
        self.learning = LearningMomentView(self.store_root)
        self.space.record_growth_snapshot(force=True)
        if seed_continuous_spec is not None:
            existing = [item for item in self.control.frontier() if item.kind == "continuous_mission"]
            if not existing:
                self.control.seed_continuous_spec(seed_continuous_spec)
        if autostart_continuous:
            self.control.set_mode("continuous_intelligence", True)
        self.events.emit("living_logical_robot_started", {
            "manifestation": "living_logical_space",
            "local_or_remote": True,
            "truth_authority": False,
        })

    def state(self) -> dict[str, Any]:
        return {
            "observatory": self.events.state(),
            "control": self.control.state(),
            "space": self.space._snapshot_counts(),
            "provenance": {
                "builds": [26, 27, 28, 29, 30, 31, 32],
                "web_is_manifestation_only": True,
                "same_logical_robot_local_or_remote": True,
                "qcds_core_modified": False,
                "canonical_spec_modified": False,
            },
        }

    def close(self) -> None:
        self.control.stop_worker()


def _load_json(path: str | Path | None) -> Mapping[str, Any] | None:
    if path is None:
        return None
    value = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(value, Mapping):
        raise LiveRobotError("seed frontier spec must be a JSON object")
    return value


def create_live_robot_server(
    *,
    store_root: str | Path = "./intelligence_store",
    host: str = "127.0.0.1",
    port: int = 8765,
    cors_origin: str | None = None,
    seed_continuous_spec: Mapping[str, Any] | None = None,
    autostart_continuous: bool = False,
) -> ThreadingHTTPServer:
    service = LivingLogicalRobotService(
        store_root,
        seed_continuous_spec=seed_continuous_spec,
        autostart_continuous=autostart_continuous,
    )
    allowed_origin = cors_origin.strip() if cors_origin else None

    class Handler(BaseHTTPRequestHandler):
        server_version = "QCDSLivingLogicalRobot/1.4"

        def _cors(self) -> None:
            if allowed_origin:
                self.send_header("Access-Control-Allow-Origin", allowed_origin)
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("Vary", "Origin")

        def _json(self, payload: Mapping[str, Any], status: int = 200) -> None:
            body = json.dumps(dict(payload), ensure_ascii=False, sort_keys=True).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self._cors()
            self.end_headers()
            self.wfile.write(body)

        def _body_json(self) -> Mapping[str, Any]:
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError as exc:
                raise LiveRobotError("invalid Content-Length") from exc
            if length <= 0 or length > 1_000_000:
                raise LiveRobotError("invalid request size")
            try:
                value = json.loads(self.rfile.read(length).decode("utf-8"))
            except (UnicodeError, json.JSONDecodeError) as exc:
                raise LiveRobotError("invalid JSON body") from exc
            if not isinstance(value, Mapping):
                raise LiveRobotError("JSON object required")
            return value

        def do_OPTIONS(self) -> None:  # noqa: N802
            self.send_response(HTTPStatus.NO_CONTENT)
            self._cors()
            self.end_headers()

        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path == "/":
                body = living_robot_clarity_html(static_mode=False).encode("utf-8")
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self._cors()
                self.end_headers()
                self.wfile.write(body)
                return
            if parsed.path == "/api/health":
                self._json({"status": "ok", "service": "living-logical-robot", "store": str(service.store_root)})
                return
            if parsed.path == "/api/state":
                self._json(service.state())
                return
            if parsed.path == "/api/control":
                self._json(service.control.state())
                return
            if parsed.path == "/api/frontier":
                self._json({"frontier": [item.as_dict() for item in service.control.frontier()]})
                return
            if parsed.path == "/api/growth":
                self._json(service.growth.snapshot())
                return
            if parsed.path == "/api/learning":
                self._json(service.learning.snapshot())
                return
            if parsed.path == "/api/events":
                query = parse_qs(parsed.query)
                try:
                    after = int(query.get("after", ["0"])[0])
                except ValueError:
                    self._json({"error": "invalid event cursor"}, 400)
                    return
                self._json({"events": list(service.events.events(after=after, limit=500))})
                return
            if parsed.path == "/api/space":
                query = parse_qs(parsed.query)
                focus = tuple(value for raw in query.get("focus", []) for value in raw.split(",") if value.strip())
                try:
                    max_bindings = min(1500, max(1, int(query.get("bindings", ["600"])[0])))
                    max_nodes = min(2000, max(1, int(query.get("nodes", ["900"])[0])))
                except ValueError:
                    self._json({"error": "invalid projection bounds"}, 400)
                    return
                self._json(service.space.project(max_bindings=max_bindings, max_nodes=max_nodes, focus_terms=focus))
                return
            self._json({"error": "not found"}, 404)

        def do_POST(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            try:
                payload = self._body_json()
                if parsed.path == "/api/input":
                    kind = str(payload.get("kind", ""))
                    body = payload.get("payload") if isinstance(payload.get("payload"), Mapping) else {}
                    result = service.control.submit_event(kind, body)
                    self._json(result, 202)
                    return
                if parsed.path == "/api/mode":
                    result = service.control.set_mode(str(payload.get("mode", "")), bool(payload.get("active", True)))
                    self._json(result, 202)
                    return
                if parsed.path == "/api/process-one":
                    item = service.control.process_one()
                    self._json({"processed": None if item is None else item.as_dict()}, 202)
                    return
            except (ValueError, RuntimeError, LiveRobotError) as exc:
                self._json({"error": str(exc)}, 400)
                return
            self._json({"error": "not found"}, 404)

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
            return

    server = ThreadingHTTPServer((host, port), Handler)
    setattr(server, "qcds_service", service)
    return server


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run the Living Logical Robot locally or on a remote host/Codespace."
    )
    parser.add_argument("--store", default="./intelligence_store", help="Persistent intelligence-store root")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host; use 0.0.0.0 in Codespaces")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--frontier", help="Optional BUILD 25 continuous frontier JSON to seed")
    parser.add_argument("--continuous", action="store_true", help="Start bounded continuous intelligence worker")
    parser.add_argument("--cors-origin", help="Optional exact origin allowed to control/read this runtime cross-origin")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args(argv)
    try:
        seed = _load_json(args.frontier)
        server = create_live_robot_server(
            store_root=args.store,
            host=args.host,
            port=args.port,
            cors_origin=args.cors_origin,
            seed_continuous_spec=seed,
            autostart_continuous=args.continuous,
        )
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        parser.error(str(exc))
        return 2
    url_host = "127.0.0.1" if args.host in {"0.0.0.0", "::"} else args.host
    url = f"http://{url_host}:{args.port}/"
    if not args.no_browser and args.host in {"127.0.0.1", "localhost"}:
        threading.Timer(0.35, lambda: webbrowser.open(url)).start()
    print(f"Living Logical Robot: {url}")
    print("The web page is a manifestation/I-O body; QCDS and Reality remain the intelligence.")
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        service = getattr(server, "qcds_service", None)
        if service is not None:
            service.close()
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
