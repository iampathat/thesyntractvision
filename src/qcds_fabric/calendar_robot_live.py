from __future__ import annotations

# Cally.One Tribute License 1.0 — see robots/cally_one/LICENSE.md

import argparse
import json
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Mapping, Sequence
from urllib.parse import urlparse

from .cally_one import CallyOneService
from .cally_one_ui import cally_one_html
from .calendar_robot import CalendarRobotError


def create_calendar_server(
    *,
    store_root: str | Path = "./calendar_store",
    host: str = "127.0.0.1",
    port: int = 8790,
) -> ThreadingHTTPServer:
    service = CallyOneService(store_root)

    class Handler(BaseHTTPRequestHandler):
        server_version = "QCDSCallyOne/0.4"

        def _json(self, payload: Mapping[str, Any], status: int = 200) -> None:
            body = json.dumps(dict(payload), ensure_ascii=False, sort_keys=True).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _body_json(self) -> Mapping[str, Any]:
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError as exc:
                raise CalendarRobotError("invalid Content-Length") from exc
            if length <= 0 or length > 1_000_000:
                raise CalendarRobotError("invalid request size")
            try:
                value = json.loads(self.rfile.read(length).decode("utf-8"))
            except (UnicodeError, json.JSONDecodeError) as exc:
                raise CalendarRobotError("invalid JSON body") from exc
            if not isinstance(value, Mapping):
                raise CalendarRobotError("JSON object required")
            return value

        def _html(self) -> None:
            body = cally_one_html().encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _event_payload(self, event_id: str) -> dict[str, Any]:
            return {
                "conflicts": service.conflicts_for_event(event_id),
                "planning_states": service.planning_for_event(event_id),
                "state": service.state(),
            }

        def do_GET(self) -> None:  # noqa: N802
            path = urlparse(self.path).path
            if path == "/":
                self._html()
                return
            if path == "/api/health":
                self._json(
                    {
                        "status": "ok",
                        "service": "cally-one-logical-robot",
                        "product": "Cally.One",
                        "system_boundary": "SyntractSystem",
                        "single_qcds_architecture": True,
                        "everything_is_state": True,
                        "dimensions_are_state": True,
                        "store": str(service.space.store_root),
                    }
                )
                return
            if path == "/api/state":
                self._json(service.state())
                return
            self._json({"error": "not found"}, 404)

        def do_POST(self) -> None:  # noqa: N802
            path = urlparse(self.path).path
            try:
                payload = self._body_json()
                if path == "/api/person":
                    person = service.upsert_person(payload)
                    self._json({"person": person.as_dict(), "state": service.state()}, 201)
                    return
                if path == "/api/person/archive":
                    person = service.archive_person(
                        str(payload.get("person_id") or ""),
                        archived=bool(payload.get("archived", True)),
                    )
                    self._json({"person": person.as_dict(), "state": service.state()}, 202)
                    return
                if path == "/api/entity":
                    entity = service.upsert_entity(payload)
                    self._json({"entity": entity.as_dict(), "state": service.state()}, 201)
                    return
                if path == "/api/relation":
                    relation = service.upsert_relation(payload)
                    self._json({"relation": relation.as_dict(), "state": service.state()}, 201)
                    return
                if path == "/api/dimension":
                    dimension = service.upsert_dimension(payload)
                    self._json({"dimension": dimension.as_dict(), "state": service.state()}, 201)
                    return
                if path == "/api/dimension/retire":
                    dimension = service.retire_dimension(
                        str(payload.get("key") or ""),
                        retired=bool(payload.get("retired", True)),
                    )
                    self._json({"dimension": dimension.as_dict(), "state": service.state()}, 202)
                    return
                if path == "/api/event":
                    event = service.upsert_event(payload)
                    body = {"event": event.as_dict(), **self._event_payload(event.event_id)}
                    self._json(body, 201)
                    return
                if path == "/api/event/move":
                    event_id = str(payload.get("event_id") or "")
                    people = payload.get("people")
                    if people is not None and not isinstance(people, (list, tuple)):
                        raise CalendarRobotError("people must be an array")
                    event = service.move_event(
                        event_id,
                        start=str(payload.get("start") or ""),
                        end=None if payload.get("end") is None else str(payload.get("end")),
                        people=None if people is None else tuple(str(item) for item in people),
                    )
                    body = {"event": event.as_dict(), **self._event_payload(event.event_id)}
                    self._json(body, 202)
                    return
                if path == "/api/event/delete":
                    event_id = str(payload.get("event_id") or "")
                    service.delete_event(event_id)
                    self._json({"deleted": event_id, "state": service.state()}, 202)
                    return
                if path == "/api/infer":
                    event_id = str(payload.get("event_id") or "")
                    candidates = payload.get("candidates")
                    if candidates is not None and not isinstance(candidates, list):
                        raise CalendarRobotError("candidates must be an array")
                    result = service.infer_placement(event_id, candidates)
                    self._json(result)
                    return
            except (CalendarRobotError, ValueError, RuntimeError) as exc:
                self._json({"error": str(exc)}, 400)
                return
            self._json({"error": "not found"}, 404)

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
            return

    server = ThreadingHTTPServer((host, port), Handler)
    setattr(server, "calendar_service", service)
    return server


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run Cally.One, the Calendar Logical Robot.")
    parser.add_argument("--store", default="./calendar_store", help="Calendar Space storage directory")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8790)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args(argv)

    server = create_calendar_server(store_root=args.store, host=args.host, port=args.port)
    url = f"http://{args.host}:{args.port}/"
    if not args.no_browser and args.host in {"127.0.0.1", "localhost"}:
        webbrowser.open(url)
    try:
        print(f"Cally.One Logical Robot: {url}")
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


__all__ = ["create_calendar_server", "main"]
