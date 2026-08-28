from __future__ import annotations

import csv
import json

import pytest

from qcds_fabric.logical_space import CsvLogicalSpace, LogicalBinding
from qcds_fabric.logical_transform import CsvLogicalTransformStore, LogicalSpaceResolver, LogicalTransformError, LogicalTransformRule


def seed(space: CsvLogicalSpace, n: int = 1000) -> None:
    bindings = [LogicalBinding(f"person:{i}", (f"person_{i}", "human"), "mvp:seed", 1.0, mission_id="global-proof") for i in range(n)]
    bindings.append(LogicalBinding("dog:1", ("dog_1", "dog"), "mvp:seed", 1.0))
    assert space.append(bindings) == n + 1


def base_terms(space: CsvLogicalSpace) -> tuple[tuple[str, ...], ...]:
    with space.path.open("r", encoding="utf-8", newline="") as handle:
        return tuple(tuple(json.loads(row["terms"])) for row in csv.DictReader(handle))


def test_global_rule_changes_1000_resolved_bindings_without_rewriting_base(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    seed(space)
    original = space.path.read_bytes()
    rules = CsvLogicalTransformStore(tmp_path)
    rules.install(LogicalTransformRule("human-state", ("human",), ("sour",), "oracle:genesis", provenance={"external_truth_claim": False}))
    resolver = LogicalSpaceResolver(space, rules)
    assert len(resolver.query("sour")) == 1000
    assert not resolver.query("dog", "sour")
    assert space.path.read_bytes() == original
    assert all("sour" not in terms for terms in base_terms(space))

    changed = rules.replace("human-state", emit_terms=("happy",), source_id="oracle:evolution")
    assert changed.version == 2
    assert resolver.query("sour") == ()
    happy = resolver.query("happy")
    assert len(happy) == 1000
    assert all(item.applied_rules == ("human-state@2",) for item in happy)
    assert space.path.read_bytes() == original
    assert all("happy" not in terms for terms in base_terms(space))


def test_current_rule_is_one_row_and_history_is_append_only(tmp_path):
    rules = CsvLogicalTransformStore(tmp_path)
    rules.install(LogicalTransformRule("r", ("human",), ("sour",), "oracle:g"))
    rules.replace("r", emit_terms=("happy",), source_id="oracle:e")
    current = list(csv.DictReader(rules.current_path.open(encoding="utf-8")))
    assert len(current) == 1 and current[0]["version"] == "2"
    history = list(csv.DictReader(rules.history_path.open(encoding="utf-8")))
    assert [row["event"] for row in history] == ["GENESIS", "REPLACED"]
    assert "sour" in history[1]["previous_emit_terms"] and "happy" in history[1]["emit_terms"]


def test_retirement_removes_resolved_effect(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    seed(space, 3)
    rules = CsvLogicalTransformStore(tmp_path)
    rules.install(LogicalTransformRule("r", ("human",), ("happy",), "oracle:g"))
    resolver = LogicalSpaceResolver(space, rules)
    assert len(resolver.query("happy")) == 3
    rules.retire("r")
    assert resolver.query("happy") == ()


def test_rules_chain_without_materializing_derived_terms(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    seed(space, 4)
    rules = CsvLogicalTransformStore(tmp_path)
    rules.install(LogicalTransformRule("r1", ("human",), ("happy",), "oracle:1"))
    rules.install(LogicalTransformRule("r2", ("happy",), ("positive",), "oracle:2"))
    rules.install(LogicalTransformRule("r3", ("positive",), ("approachable",), "oracle:3"))
    resolved = LogicalSpaceResolver(space, rules).query("approachable")
    assert len(resolved) == 4
    assert all({"human", "happy", "positive", "approachable"}.issubset(item.resolved_terms) for item in resolved)
    assert all("approachable" not in terms for terms in base_terms(space))


def test_multiple_match_terms_and_cross_mission_scope(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    space.append((
        LogicalBinding("a", ("alice", "human", "researcher"), "source:a", 1.0, mission_id="a"),
        LogicalBinding("b", ("bob", "human"), "source:b", 1.0, mission_id="b"),
    ))
    rules = CsvLogicalTransformStore(tmp_path)
    rules.install(LogicalTransformRule("scientist", ("human", "researcher"), ("scientist",), "oracle:r"))
    rules.install(LogicalTransformRule("state", ("human",), ("happy",), "oracle:global"))
    resolver = LogicalSpaceResolver(space, rules)
    assert [item.base_binding_id for item in resolver.query("scientist")] == ["a"]
    assert {item.base_binding_id for item in resolver.query("happy")} == {"a", "b"}


def test_rule_provenance_and_validation(tmp_path):
    rules = CsvLogicalTransformStore(tmp_path)
    rule = rules.install(LogicalTransformRule("r", ("human",), ("happy",), "oracle:demo", provenance={"external_truth_claim": False, "challenge_required": True}))
    assert rule.provenance["external_truth_claim"] is False
    assert rule.provenance["challenge_required"] is True
    with pytest.raises(LogicalTransformError):
        LogicalTransformRule("bad", (), ("happy",), "source")
