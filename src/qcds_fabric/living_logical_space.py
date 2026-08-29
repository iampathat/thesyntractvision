from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from itertools import combinations
from pathlib import Path
from typing import Any, Mapping

from .logical_universe import CsvLogicalUniverseStore


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _stable_id(prefix: str, *parts: str) -> str:
    digest = hashlib.sha256("\x1f".join(parts).encode("utf-8")).hexdigest()[:16]
    return f"{prefix}:{digest}"


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


def _append_jsonl(path: Path, value: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(dict(value), ensure_ascii=False, sort_keys=True) + "\n")


@dataclass
class LivingLogicalSpace:
    """Read-only projection of the represented Reality Logical Space.

    BUILD 26 deliberately does not define an ontology or hierarchy. The graph is
    only a current visual projection of generic logical bindings and governed
    rule transforms. Deleting this module does not alter QCDS or Reality state.
    """

    store_root: Path

    def __init__(self, store_root: str | Path = "./intelligence_store") -> None:
        self.store_root = Path(store_root)
        self.store_root.mkdir(parents=True, exist_ok=True)
        self.universes = CsvLogicalUniverseStore(self.store_root)
        self.universes.ensure_reality()
        self.history_path = self.store_root / "living_space_history.jsonl"

    def _snapshot_counts(self) -> dict[str, int]:
        space = self.universes.space("reality")
        rules = self.universes.rules("reality")
        bindings = space.bindings()
        terms = {term for binding in bindings for term in binding.terms}
        return {
            "bindings": len(bindings),
            "logical_terms": len(terms),
            "active_rules": len(rules.rules(active_only=True)),
        }

    def record_growth_snapshot(self, *, force: bool = False) -> dict[str, Any]:
        counts = self._snapshot_counts()
        history = _read_jsonl(self.history_path)
        previous = history[-1] if history else None
        changed = previous is None or any(previous.get(key) != value for key, value in counts.items())
        if changed or force:
            row = {
                "snapshot_id": len(history) + 1,
                "timestamp": _utc_now(),
                **counts,
            }
            _append_jsonl(self.history_path, row)
            return row
        return previous or {"snapshot_id": 0, "timestamp": _utc_now(), **counts}

    def growth_history(self, *, limit: int = 240) -> tuple[dict[str, Any], ...]:
        rows = _read_jsonl(self.history_path)
        return tuple(rows[-max(1, min(limit, 2000)):])

    def project(
        self,
        *,
        max_bindings: int = 600,
        max_nodes: int = 900,
        focus_terms: tuple[str, ...] = (),
    ) -> dict[str, Any]:
        if max_bindings <= 0 or max_nodes <= 0:
            raise ValueError("projection limits must be positive")
        self.record_growth_snapshot()
        space = self.universes.space("reality")
        rules = self.universes.rules("reality")
        all_bindings = list(space.bindings())
        normalized_focus = {term.casefold().strip() for term in focus_terms if term.strip()}
        if normalized_focus:
            focused = [
                binding for binding in all_bindings
                if normalized_focus.intersection({term.casefold() for term in binding.terms})
            ]
            remainder = [binding for binding in all_bindings if binding not in focused]
            bindings = (focused + remainder)[:max_bindings]
        else:
            bindings = all_bindings[-max_bindings:]

        node_map: dict[str, dict[str, Any]] = {}
        edges: list[dict[str, Any]] = []
        seen_edges: set[str] = set()

        def ensure_node(term: str, *, kind: str = "term") -> None:
            if term in node_map or len(node_map) >= max_nodes:
                return
            node_map[term] = {
                "id": term,
                "label": term,
                "kind": kind,
                "degree": 0,
                "sources": 0,
                "confidence": 0.0,
                "focused": term.casefold() in normalized_focus,
            }

        source_sets: dict[str, set[str]] = {}
        confidence_sums: dict[str, float] = {}
        confidence_counts: dict[str, int] = {}
        for binding in bindings:
            terms = tuple(dict.fromkeys(binding.terms))
            for term in terms:
                ensure_node(term)
                if term not in node_map:
                    continue
                source_sets.setdefault(term, set()).add(binding.source_id)
                confidence_sums[term] = confidence_sums.get(term, 0.0) + binding.confidence
                confidence_counts[term] = confidence_counts.get(term, 0) + 1
            for left, right in combinations(terms, 2):
                if left not in node_map or right not in node_map:
                    continue
                edge_id = _stable_id("binding", binding.binding_id, left, right)
                if edge_id in seen_edges:
                    continue
                seen_edges.add(edge_id)
                edges.append({
                    "id": edge_id,
                    "source": left,
                    "target": right,
                    "kind": "binding",
                    "binding_id": binding.binding_id,
                    "source_id": binding.source_id,
                    "confidence": binding.confidence,
                    "polarity": binding.polarity,
                    "mission_id": binding.mission_id,
                    "source_uri": binding.source_uri,
                })
                node_map[left]["degree"] += 1
                node_map[right]["degree"] += 1

        for rule in rules.rules(active_only=True):
            for term in (*rule.match_terms, *rule.emit_terms):
                ensure_node(term, kind="rule_term")
            for left in rule.match_terms:
                for right in rule.emit_terms:
                    if left not in node_map or right not in node_map:
                        continue
                    edge_id = _stable_id("rule", rule.rule_id, str(rule.version), left, right)
                    if edge_id in seen_edges:
                        continue
                    seen_edges.add(edge_id)
                    edges.append({
                        "id": edge_id,
                        "source": left,
                        "target": right,
                        "kind": "rule",
                        "rule_id": rule.rule_id,
                        "version": rule.version,
                        "confidence": rule.confidence,
                        "source_id": rule.source_id,
                    })
                    node_map[left]["degree"] += 1
                    node_map[right]["degree"] += 1

        for term, node in node_map.items():
            node["sources"] = len(source_sets.get(term, ()))
            count = confidence_counts.get(term, 0)
            node["confidence"] = round(confidence_sums.get(term, 0.0) / count, 4) if count else None

        nodes = sorted(node_map.values(), key=lambda item: (-int(item["focused"]), -item["degree"], item["label"]))
        universe_counts = self._snapshot_counts()
        version_material = json.dumps(
            {
                "nodes": [node["id"] for node in nodes],
                "edges": [edge["id"] for edge in edges],
                **universe_counts,
            },
            sort_keys=True,
        )
        return {
            "universe": "reality",
            "projection_is_not_ontology": True,
            "nodes": nodes,
            "edges": edges,
            "counts": universe_counts,
            "represented_bindings": len(bindings),
            "total_bindings": len(all_bindings),
            "truncated": len(bindings) < len(all_bindings) or len(node_map) >= max_nodes,
            "version": hashlib.sha256(version_material.encode("utf-8")).hexdigest()[:20],
            "growth_history": list(self.growth_history()),
            "provenance": {
                "build": 26,
                "read_only_projection": True,
                "derived_logic_materialized": False,
                "hierarchy_required": False,
                "knowledge_graph_claim": False,
                "qcds_core_modified": False,
                "canonical_spec_modified": False,
            },
        }
