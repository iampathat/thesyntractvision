from __future__ import annotations

import argparse
import csv
import json
import threading
import time
import webbrowser
from dataclasses import dataclass
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Mapping, Sequence
from urllib.parse import parse_qs, urlparse


class ObservatoryError(ValueError):
    """Raised when the BUILD 23 manifestation receives invalid I/O."""


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(value, dict):
                rows.append(value)
    return rows


def _append_jsonl(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(dict(payload), ensure_ascii=False, sort_keys=True) + "\n")


def _csv_count(path: Path, *, active_only: bool = False) -> int:
    if not path.exists():
        return 0
    try:
        with path.open("r", encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle))
    except (OSError, csv.Error):
        return 0
    if not active_only:
        return len(rows)
    return sum(str(row.get("status", "active")).strip().lower() == "active" for row in rows)


@dataclass
class LogicalRobotEventLog:
    """Transparent event/I/O surface for the same Logical Robot.

    This is a manifestation layer only. It does not infer, promote rules, mutate
    QCDS state, or decide what is true. Intelligence remains in the existing
    runtime and Reality-growth layers.
    """

    store_root: Path

    def __init__(self, store_root: str | Path = "./intelligence_store") -> None:
        self.store_root = Path(store_root)
        self.store_root.mkdir(parents=True, exist_ok=True)
        self.events_path = self.store_root / "logical_robot_events.jsonl"
        self.inbox_path = self.store_root / "logical_robot_inbox.jsonl"
        self._lock = threading.Lock()

    def emit(
        self,
        event_type: str,
        payload: Mapping[str, Any] | None = None,
        *,
        source: str = "logical_robot",
        mission_id: str | None = None,
    ) -> dict[str, Any]:
        event_type = event_type.strip()
        if not event_type:
            raise ObservatoryError("event_type must be non-empty")
        with self._lock:
            event_id = len(_read_jsonl(self.events_path)) + 1
            event = {
                "event_id": event_id,
                "timestamp": _utc_now(),
                "event_type": event_type,
                "source": source,
                "mission_id": mission_id,
                "payload": dict(payload or {}),
                "provenance": {
                    "build": 23,
                    "manifestation_only": True,
                    "qcds_core_modified": False,
                    "truth_authority": False,
                },
            }
            _append_jsonl(self.events_path, event)
        return event

    def events(self, *, after: int = 0, limit: int = 250) -> tuple[dict[str, Any], ...]:
        if after < 0 or limit <= 0:
            raise ObservatoryError("invalid event cursor")
        rows = [row for row in _read_jsonl(self.events_path) if int(row.get("event_id", 0)) > after]
        return tuple(rows[: min(limit, 1000)])

    def enqueue_human_input(self, text: str, *, metadata: Mapping[str, Any] | None = None) -> dict[str, Any]:
        text = " ".join(text.split())
        if not text:
            raise ObservatoryError("human input must be non-empty")
        if len(text) > 20_000:
            raise ObservatoryError("human input exceeds 20,000 characters")
        with self._lock:
            input_id = len(_read_jsonl(self.inbox_path)) + 1
            item = {
                "input_id": input_id,
                "timestamp": _utc_now(),
                "text": text,
                "metadata": dict(metadata or {}),
                "consumed": False,
            }
            _append_jsonl(self.inbox_path, item)
        self.emit("human_input", {"input_id": input_id, "text": text}, source="human")
        return item

    def inbox(self, *, after: int = 0) -> tuple[dict[str, Any], ...]:
        return tuple(row for row in _read_jsonl(self.inbox_path) if int(row.get("input_id", 0)) > after)

    def state(self) -> dict[str, Any]:
        events = _read_jsonl(self.events_path)
        conflict_types = {"conflict", "contradiction", "conflicting_identifying_evidence"}
        quarantined_types = {"quarantined", "rule_quarantined", "cycle_quarantined"}
        oracle_count = sum(_csv_count(path) for path in self.store_root.rglob("current_oracles.csv"))
        return {
            "manifestation": "logical_robot_observatory",
            "reality": {
                "bindings": _csv_count(self.store_root / "logical_space.csv"),
                "active_rules": _csv_count(self.store_root / "logical_rules.csv", active_only=True),
                "oracles": oracle_count,
                "conflicts_seen": sum(row.get("event_type") in conflict_types for row in events),
                "quarantined_seen": sum(row.get("event_type") in quarantined_types for row in events),
            },
            "io": {
                "human_inputs": len(_read_jsonl(self.inbox_path)),
                "events": len(events),
            },
            "latest_event": events[-1] if events else None,
            "provenance": {
                "build": 23,
                "web_page_is_a_logical_robot_manifestation": True,
                "web_page_is_not_the_intelligence": True,
                "qcds_core_modified": False,
                "canonical_spec_modified": False,
            },
        }


_OBSERVATORY_HTML = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Logical Robot — Observatory</title>
<style>
:root{color-scheme:dark;background:#08111c;color:#e9f0f7;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 15% 5%,#15304a 0,#08111c 38%,#060b12 100%);min-height:100vh}
header{padding:28px 30px 18px;border-bottom:1px solid #294158;background:#091522cc;backdrop-filter:blur(10px);position:sticky;top:0;z-index:2}
h1{font-size:25px;margin:0 0 6px;font-weight:720}.sub{color:#9db2c6;font-size:13px}.pulse{display:inline-block;width:9px;height:9px;border-radius:50%;background:#7ee0a3;box-shadow:0 0 18px #7ee0a3;margin-right:8px}
main{display:grid;grid-template-columns:minmax(280px,.75fr) minmax(420px,1.65fr);gap:16px;padding:16px;max-width:1500px;margin:auto}
.card{border:1px solid #274057;background:#0b1724e8;border-radius:16px;padding:18px;box-shadow:0 14px 45px #0004}.card h2{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#8facbf;margin:0 0 14px}
.metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.metric{background:#0e2031;border:1px solid #233f56;border-radius:12px;padding:13px}.metric b{font-size:24px;display:block}.metric span{font-size:11px;color:#91a8bb}
textarea{width:100%;min-height:98px;border-radius:12px;border:1px solid #34536a;background:#08131e;color:#edf6ff;padding:12px;resize:vertical}button{margin-top:10px;background:#d7f7e2;color:#092016;border:0;border-radius:10px;padding:10px 15px;font-weight:700;cursor:pointer}button:hover{filter:brightness(1.05)}
.timeline{height:640px;overflow:auto;display:flex;flex-direction:column;gap:9px}.event{border-left:3px solid #4a7899;background:#0a1b29;border-radius:9px;padding:10px 12px}.event.newlogic{border-left-color:#7ee0a3}.event.warn{border-left-color:#f1bc6c}.event .meta{font-size:10px;color:#7892a7;margin-bottom:4px}.event .type{font-weight:700;font-size:13px}.event pre{white-space:pre-wrap;word-break:break-word;color:#bcd0df;font-size:11px;margin:6px 0 0}.note{font-size:12px;color:#9cb2c4;line-height:1.5;margin-top:12px}.io-status{font-size:11px;color:#92aabd;margin-left:8px}
@media(max-width:900px){main{grid-template-columns:1fr}.timeline{height:420px}}
</style>
</head>
<body>
<header><h1><span class="pulse"></span>The Logical Robot</h1><div class="sub">Manifested as this web page · the page is a body/I/O surface, not the intelligence</div></header>
<main>
<section>
<div class="card"><h2>Reality space</h2><div class="metrics">
<div class="metric"><b id="bindings">0</b><span>base bindings</span></div><div class="metric"><b id="rules">0</b><span>active governed rules</span></div>
<div class="metric"><b id="oracles">0</b><span>persisted oracles</span></div><div class="metric"><b id="conflicts">0</b><span>conflicts observed</span></div>
</div><div class="note">Counts reflect the persistent store. Derived logic is not materialized into base bindings merely to make this display.</div></div>
<div class="card" style="margin-top:16px"><h2>Human ↔ Logical Robot I/O</h2><textarea id="input" placeholder="Ask, direct, or provide an observation. Commands such as /status or /run <mission> may be consumed by a continuous Reality runtime."></textarea><button onclick="sendInput()">Send to robot inbox</button><span id="ioStatus" class="io-status"></span><div class="note">Input is queued transparently. This UI never promotes a rule or decides truth by itself.</div></div>
</section>
<section class="card"><h2>Discovery timeline</h2><div id="timeline" class="timeline"></div></section>
</main>
<script>
let cursor=0;
function esc(v){return String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
async function refreshState(){const s=await fetch('/api/state').then(r=>r.json());const x=s.reality;bindings.textContent=x.bindings;rules.textContent=x.active_rules;oracles.textContent=x.oracles;conflicts.textContent=x.conflicts_seen;}
async function refreshEvents(){const rows=await fetch('/api/events?after='+cursor).then(r=>r.json());for(const e of rows.events){cursor=Math.max(cursor,e.event_id);const d=document.createElement('div');const warn=/conflict|quarant|awaiting/.test(e.event_type);const good=/promot|expanded|knowledge/.test(e.event_type);d.className='event '+(warn?'warn':good?'newlogic':'');d.innerHTML='<div class="meta">#'+e.event_id+' · '+esc(e.timestamp)+' · '+esc(e.source)+'</div><div class="type">'+esc(e.event_type)+'</div><pre>'+esc(JSON.stringify(e.payload,null,2))+'</pre>';timeline.prepend(d);}}
async function sendInput(){const t=input.value.trim();if(!t)return;ioStatus.textContent='sending…';const r=await fetch('/api/io',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:t})});const j=await r.json();ioStatus.textContent=r.ok?'queued #'+j.input_id:(j.error||'error');if(r.ok)input.value='';}
async function tick(){try{await Promise.all([refreshState(),refreshEvents()]);}catch(e){}setTimeout(tick,1000)}tick();
</script>
</body></html>"""


def create_observatory_server(
    *,
    store_root: str | Path = "./intelligence_store",
    host: str = "127.0.0.1",
    port: int = 8765,
) -> ThreadingHTTPServer:
    log = LogicalRobotEventLog(store_root)

    class Handler(BaseHTTPRequestHandler):
        server_version = "QCDSLogicalRobotObservatory/1.0"

        def _json(self, payload: Mapping[str, Any], status: int = 200) -> None:
            body = json.dumps(dict(payload), ensure_ascii=False, sort_keys=True).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path == "/":
                body = _OBSERVATORY_HTML.encode("utf-8")
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
                return
            if parsed.path == "/api/state":
                self._json(log.state())
                return
            if parsed.path == "/api/events":
                query = parse_qs(parsed.query)
                try:
                    after = int(query.get("after", ["0"])[0])
                except ValueError:
                    self._json({"error": "invalid after cursor"}, 400)
                    return
                self._json({"events": list(log.events(after=after))})
                return
            if parsed.path == "/api/inbox":
                self._json({"inbox": list(log.inbox())})
                return
            self._json({"error": "not found"}, 404)

        def do_POST(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path != "/api/io":
                self._json({"error": "not found"}, 404)
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = 0
            if length <= 0 or length > 65_536:
                self._json({"error": "invalid request size"}, 400)
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                if not isinstance(payload, dict):
                    raise ObservatoryError("JSON object required")
                item = log.enqueue_human_input(str(payload.get("text", "")), metadata={"transport": "observatory"})
            except (UnicodeError, json.JSONDecodeError, ObservatoryError) as exc:
                self._json({"error": str(exc)}, 400)
                return
            self._json(item, 202)

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
            return

    server = ThreadingHTTPServer((host, port), Handler)
    server.logical_robot_event_log = log  # type: ignore[attr-defined]
    return server


def serve_observatory(
    *,
    store_root: str | Path = "./intelligence_store",
    host: str = "127.0.0.1",
    port: int = 8765,
    open_browser: bool = True,
) -> None:
    server = create_observatory_server(store_root=store_root, host=host, port=port)
    actual_host, actual_port = server.server_address[:2]
    url = f"http://{actual_host}:{actual_port}/"
    log: LogicalRobotEventLog = server.logical_robot_event_log  # type: ignore[attr-defined]
    log.emit("observatory_started", {"url": url}, source="logical_robot_body")
    if open_browser:
        threading.Timer(0.35, lambda: webbrowser.open(url)).start()
    print(url)
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        log.emit("observatory_stopped", {}, source="logical_robot_body")
        server.server_close()


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Manifest the Logical Robot as a local live Observatory web page.")
    parser.add_argument("--store", default="./intelligence_store", help="Persistent intelligence-store root")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: loopback only)")
    parser.add_argument("--port", type=int, default=8765, help="Bind port; use 0 for an ephemeral test port")
    parser.add_argument("--no-browser", action="store_true", help="Do not open the system browser")
    args = parser.parse_args(argv)
    if args.port < 0 or args.port > 65535:
        parser.error("port must be in [0, 65535]")
    serve_observatory(
        store_root=args.store,
        host=args.host,
        port=args.port,
        open_browser=not args.no_browser,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
