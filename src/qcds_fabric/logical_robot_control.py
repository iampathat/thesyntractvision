from __future__ import annotations

import json
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence
from urllib.parse import urlparse

from .continuous_reality import run_continuous_reality_spec
from .first_logical_robot import HttpWebReadBackend, WebReference, WikipediaSearchBackend
from .logical_robot_observatory import LogicalRobotEventLog
from .semantic_ingress import ControlledEnglishAnalyzer


CONTROL_MODES = (
    "dialogue",
    "public_web",
    "explore_domains",
    "build_own_frontier",
    "continuous_intelligence",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_text(value: Any, *, limit: int = 20_000) -> str:
    text = " ".join(str(value or "").split())
    if len(text) > limit:
        raise ValueError(f"text exceeds {limit} characters")
    return text


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
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


@dataclass(frozen=True)
class FrontierItem:
    frontier_id: int
    created_at: str
    kind: str
    goal: str
    status: str
    priority: float
    source: str
    parent_id: int | None = None
    url: str | None = None
    payload: Mapping[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "frontier_id": self.frontier_id,
            "created_at": self.created_at,
            "kind": self.kind,
            "goal": self.goal,
            "status": self.status,
            "priority": self.priority,
            "source": self.source,
            "parent_id": self.parent_id,
            "url": self.url,
            "payload": dict(self.payload),
        }


@dataclass
class LogicalRobotControlPlane:
    """BUILD 27 event/control overlay for the same Logical Robot.

    Human input, web navigation, domain exploration and continuous operation are
    control/evidence events. This layer has no authority to promote a rule or
    turn arbitrary text into external truth.
    """

    store_root: Path

    def __init__(self, store_root: str | Path = "./intelligence_store") -> None:
        self.store_root = Path(store_root)
        self.store_root.mkdir(parents=True, exist_ok=True)
        self.events = LogicalRobotEventLog(self.store_root)
        self.state_path = self.store_root / "logical_robot_control.json"
        self.frontier_path = self.store_root / "logical_robot_frontier.jsonl"
        self.frontier_updates_path = self.store_root / "logical_robot_frontier_updates.jsonl"
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._ensure_state()

    def _ensure_state(self) -> None:
        if self.state_path.exists():
            return
        self._write_state({
            "modes": {
                "dialogue": True,
                "public_web": True,
                "explore_domains": True,
                "build_own_frontier": True,
                "continuous_intelligence": False,
            },
            "paused": False,
            "updated_at": _utc_now(),
            "provenance": {
                "build": 27,
                "control_plane_only": True,
                "human_text_is_truth": False,
                "qcds_core_modified": False,
            },
        })

    def _read_state(self) -> dict[str, Any]:
        self._ensure_state()
        try:
            value = json.loads(self.state_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            value = {}
        modes = value.get("modes") if isinstance(value.get("modes"), dict) else {}
        value["modes"] = {name: bool(modes.get(name, False)) for name in CONTROL_MODES}
        value.setdefault("paused", False)
        return value

    def _write_state(self, value: Mapping[str, Any]) -> None:
        temporary = self.state_path.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(dict(value), ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
        temporary.replace(self.state_path)

    def state(self) -> dict[str, Any]:
        state = self._read_state()
        items = self.frontier()
        state["frontier"] = {
            "total": len(items),
            "pending": sum(item.status == "pending" for item in items),
            "running": sum(item.status == "running" for item in items),
            "completed": sum(item.status == "completed" for item in items),
            "blocked": sum(item.status == "blocked" for item in items),
        }
        state["worker_running"] = bool(self._thread and self._thread.is_alive())
        return state

    def set_mode(self, mode: str, active: bool) -> dict[str, Any]:
        if mode not in CONTROL_MODES:
            raise ValueError(f"unknown mode: {mode}")
        with self._lock:
            state = self._read_state()
            state["modes"][mode] = bool(active)
            state["updated_at"] = _utc_now()
            self._write_state(state)
        self.events.emit("robot_mode_changed", {"mode": mode, "active": bool(active)}, source="human")
        if mode == "continuous_intelligence" and active:
            self.start_worker()
        return self.state()

    def set_paused(self, paused: bool) -> dict[str, Any]:
        with self._lock:
            state = self._read_state()
            state["paused"] = bool(paused)
            state["updated_at"] = _utc_now()
            self._write_state(state)
        self.events.emit("robot_paused" if paused else "robot_resumed", {}, source="human")
        return self.state()

    def frontier(self, *, include_completed: bool = True) -> tuple[FrontierItem, ...]:
        base = {int(row["frontier_id"]): dict(row) for row in _read_jsonl(self.frontier_path) if "frontier_id" in row}
        for update in _read_jsonl(self.frontier_updates_path):
            try:
                frontier_id = int(update["frontier_id"])
            except (KeyError, TypeError, ValueError):
                continue
            if frontier_id in base:
                for key in ("status", "result", "updated_at"):
                    if key in update:
                        base[frontier_id][key] = update[key]
        items: list[FrontierItem] = []
        for frontier_id, row in base.items():
            status = str(row.get("status", "pending"))
            if not include_completed and status == "completed":
                continue
            items.append(FrontierItem(
                frontier_id=frontier_id,
                created_at=str(row.get("created_at", "")),
                kind=str(row.get("kind", "unknown")),
                goal=str(row.get("goal", "")),
                status=status,
                priority=float(row.get("priority", 0.0)),
                source=str(row.get("source", "unknown")),
                parent_id=int(row["parent_id"]) if row.get("parent_id") not in (None, "") else None,
                url=str(row["url"]) if row.get("url") else None,
                payload=row.get("payload") if isinstance(row.get("payload"), dict) else {},
            ))
        return tuple(sorted(items, key=lambda item: (item.status != "pending", -item.priority, item.frontier_id)))

    def add_frontier(
        self,
        kind: str,
        goal: str,
        *,
        priority: float = 1.0,
        source: str = "human",
        parent_id: int | None = None,
        url: str | None = None,
        payload: Mapping[str, Any] | None = None,
    ) -> FrontierItem:
        kind = _clean_text(kind, limit=80)
        goal = _clean_text(goal, limit=4_000)
        if not kind or not goal:
            raise ValueError("frontier item requires kind and goal")
        with self._lock:
            frontier_id = len(_read_jsonl(self.frontier_path)) + 1
            row = {
                "frontier_id": frontier_id,
                "created_at": _utc_now(),
                "kind": kind,
                "goal": goal,
                "status": "pending",
                "priority": float(priority),
                "source": source,
                "parent_id": parent_id,
                "url": url,
                "payload": dict(payload or {}),
                "truth_effect": 0,
            }
            _append_jsonl(self.frontier_path, row)
        self.events.emit("frontier_item_created", row, source=source)
        return self.frontier()[-1] if False else FrontierItem(
            frontier_id, row["created_at"], kind, goal, "pending", float(priority), source, parent_id, url, dict(payload or {})
        )

    def _update_frontier(self, frontier_id: int, status: str, *, result: Mapping[str, Any] | None = None) -> None:
        if status not in {"pending", "running", "completed", "blocked", "failed"}:
            raise ValueError("invalid frontier status")
        _append_jsonl(self.frontier_updates_path, {
            "frontier_id": int(frontier_id),
            "status": status,
            "updated_at": _utc_now(),
            "result": dict(result or {}),
        })
        self.events.emit("frontier_item_updated", {"frontier_id": frontier_id, "status": status, "result": dict(result or {})})

    def submit_event(self, kind: str, payload: Mapping[str, Any]) -> dict[str, Any]:
        kind = _clean_text(kind, limit=80).casefold().replace(" ", "_")
        text = _clean_text(payload.get("text", ""))
        if kind == "dialogue":
            item = self.events.enqueue_human_input(text, metadata={"kind": "dialogue", "truth_effect": 0})
            frame = ControlledEnglishAnalyzer().analyze(text, mission_id=f"dialogue-{item['input_id']}")
            summary = {
                "input_id": item["input_id"],
                "recognized_claims": len(frame.claims),
                "unresolved_sentences": list(frame.unresolved),
                "query": None if frame.query is None else {
                    "subject": frame.query.subject,
                    "predicate": frame.query.predicate,
                    "candidate_values": list(frame.query.candidate_values),
                },
                "truth_effect": 0,
            }
            self.events.emit("dialogue_interpreted", summary)
            return summary

        if kind in {"investigate", "explore_domain", "build_frontier"}:
            if not text:
                raise ValueError(f"{kind} requires text")
            priority = float(payload.get("priority", 5.0 if kind == "investigate" else 3.0))
            item = self.add_frontier(kind, text, priority=priority, payload={"origin": "control_event"})
            if self._read_state()["modes"].get("continuous_intelligence"):
                self.start_worker()
            return item.as_dict()

        if kind == "visit_url":
            url = _clean_text(payload.get("url", text), limit=4_000)
            parsed = urlparse(url)
            if parsed.scheme not in {"http", "https"} or not parsed.hostname:
                raise ValueError("visit_url requires an http(s) URL")
            item = self.add_frontier("visit_url", f"Observe {url}", priority=float(payload.get("priority", 4.0)), url=url)
            if self._read_state()["modes"].get("continuous_intelligence"):
                self.start_worker()
            return item.as_dict()

        if kind == "continuous_intelligence":
            active = bool(payload.get("active", True))
            return self.set_mode("continuous_intelligence", active)
        if kind == "pause":
            return self.set_paused(True)
        if kind == "resume":
            return self.set_paused(False)
        if kind == "mode":
            return self.set_mode(str(payload.get("mode", "")), bool(payload.get("active", True)))
        raise ValueError(f"unsupported Logical Robot input event: {kind}")

    def _execute_domain_search(self, item: FrontierItem) -> Mapping[str, Any]:
        if not self._read_state()["modes"].get("public_web"):
            raise RuntimeError("public_web mode is disabled")
        refs = WikipediaSearchBackend().search(item.goal, limit=6)
        children: list[int] = []
        self.events.emit("domain_exploration_observed", {
            "frontier_id": item.frontier_id,
            "query": item.goal,
            "references": [{"title": ref.title, "url": ref.url, "reference_id": ref.reference_id} for ref in refs],
            "source_is_evidence_not_truth": True,
        })
        if self._read_state()["modes"].get("build_own_frontier"):
            for index, ref in enumerate(refs[:4]):
                child = self.add_frontier(
                    "visit_url",
                    f"Read source discovered while exploring {item.goal}: {ref.title}",
                    priority=max(0.1, item.priority - (index + 1) * 0.2),
                    source="logical_robot",
                    parent_id=item.frontier_id,
                    url=ref.url,
                    payload={"reference_id": ref.reference_id, "title": ref.title, "search_query": item.goal},
                )
                children.append(child.frontier_id)
        return {"references": len(refs), "child_frontier_ids": children}

    def _execute_visit_url(self, item: FrontierItem) -> Mapping[str, Any]:
        if not item.url:
            raise RuntimeError("visit_url frontier item has no URL")
        parsed = urlparse(item.url)
        hostname = parsed.hostname or ""
        allowed = ("wikipedia.org",)
        if not (hostname == "wikipedia.org" or hostname.endswith(".wikipedia.org")):
            raise RuntimeError("current safe public-web body only reads wikipedia.org")
        reference = WebReference(
            str(item.payload.get("reference_id") or f"frontier:{item.frontier_id}"),
            str(item.payload.get("title") or hostname),
            item.url,
            provenance={"frontier_id": item.frontier_id, "external_truth_claim": False},
        )
        document = HttpWebReadBackend(allowed_domains=allowed).read(reference, max_chars=10_000)
        result = {
            "url": item.url,
            "title": reference.title,
            "chars": len(document.text),
            "excerpt": document.text[:700],
            "truth_effect": 0,
        }
        self.events.emit("web_page_observed", result, source="logical_robot")
        return result

    def _execute_mission(self, item: FrontierItem) -> Mapping[str, Any]:
        spec = item.payload.get("continuous_spec")
        if not isinstance(spec, Mapping):
            raise RuntimeError("mission frontier requires continuous_spec")
        result = run_continuous_reality_spec(spec, store_root=self.store_root)
        return result.as_dict()

    def process_one(self) -> FrontierItem | None:
        state = self._read_state()
        if state.get("paused"):
            return None
        pending = [item for item in self.frontier(include_completed=False) if item.status == "pending"]
        if not pending:
            return None
        item = pending[0]
        self._update_frontier(item.frontier_id, "running")
        try:
            if item.kind in {"explore_domain", "investigate", "build_frontier"}:
                result = self._execute_domain_search(item)
            elif item.kind == "visit_url":
                result = self._execute_visit_url(item)
            elif item.kind == "continuous_mission":
                result = self._execute_mission(item)
            else:
                raise RuntimeError(f"no executor for frontier kind {item.kind!r}")
        except Exception as exc:  # fail closed at the body/control boundary
            self._update_frontier(item.frontier_id, "blocked", result={"error": str(exc), "truth_effect": 0})
            return item
        self._update_frontier(item.frontier_id, "completed", result=result)
        return item

    def seed_continuous_spec(self, spec: Mapping[str, Any], *, priority: float = 10.0) -> FrontierItem:
        run_id = _clean_text(spec.get("run_id", "continuous-reality"), limit=200) or "continuous-reality"
        return self.add_frontier(
            "continuous_mission",
            f"Run represented Reality frontier: {run_id}",
            priority=priority,
            source="runtime",
            payload={"continuous_spec": dict(spec)},
        )

    def derive_frontier_from_events(self) -> int:
        if not self._read_state()["modes"].get("build_own_frontier"):
            return 0
        cursor_path = self.store_root / "logical_robot_frontier_event.cursor"
        try:
            cursor = int(cursor_path.read_text(encoding="utf-8")) if cursor_path.exists() else 0
        except (OSError, ValueError):
            cursor = 0
        events = self.events.events(after=cursor, limit=1000)
        created = 0
        interesting = {
            "conflicting_identifying_evidence": "Resolve conflicting evidence",
            "awaiting_identifying_evidence": "Acquire missing identifying evidence",
            "rule_quarantined": "Challenge quarantined rule",
            "cycle_quarantined": "Challenge quarantined Reality change",
        }
        for event in events:
            event_type = str(event.get("event_type", ""))
            if event_type not in interesting:
                continue
            mission_id = str(event.get("mission_id") or "represented-reality")
            self.add_frontier(
                "build_frontier",
                f"{interesting[event_type]} for {mission_id}",
                priority=8.0,
                source="logical_robot",
                payload={"origin_event_id": event.get("event_id"), "origin_event_type": event_type},
            )
            created += 1
        if events:
            cursor_path.write_text(str(max(int(event.get("event_id", 0)) for event in events)), encoding="utf-8")
        return created

    def _worker_loop(self) -> None:
        self.events.emit("continuous_intelligence_worker_started", {"bounded_frontier": True})
        while not self._stop.is_set():
            state = self._read_state()
            if not state["modes"].get("continuous_intelligence"):
                break
            if state.get("paused"):
                time.sleep(0.5)
                continue
            self.derive_frontier_from_events()
            processed = self.process_one()
            if processed is None:
                time.sleep(0.75)
        self.events.emit("continuous_intelligence_worker_stopped", {})

    def start_worker(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._worker_loop, name="qcds-logical-robot-control", daemon=True)
        self._thread.start()

    def stop_worker(self) -> None:
        self._stop.set()
        thread = self._thread
        if thread and thread.is_alive():
            thread.join(timeout=2.0)
