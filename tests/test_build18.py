from __future__ import annotations

import csv
from pathlib import Path

from qcds_fabric.logical_space import CsvLogicalSpace, LogicalBinding
from qcds_fabric.logical_transform import (
    CsvLogicalTransformStore,
    LogicalSpaceResolver,
    LogicalTransformError,
    LogicalTransformRule,
)


def make_people(space: CsvLogicalSpace, count: int = 1000) -> None:
    rows = [
        LogicalBinding(
            binding_id=f"person:{i}",
            terms=(f"person_{i}", "human"),
            source_id="mvp:seed",
            confidence=1.0,
            mission_id="global-proof",
        )
        for i in range(count)
    ]
    rows.append(LogicalBinding("dog:1", ("dog_1", "dog"), "mvp:seed", 1.0))
    assert space.append(rows) == count + 1


def test_one_rule_affects_one_thousand_bindings_without_rewriting_base_space(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    make_people(space, 1000)
    before = space.path.read_bytes()

    store = CsvLogicalTransformStore(tmp_path)
    store.install(LogicalTransformRule(
        rule_id="human-mood",
        match_terms=("human",),
        emit_terms=("sour",),
        source_id="oracle:demo",
        provenance={"mvp_proof": True, "external_truth_claim": False},
    ))
    resolver = LogicalSpaceResolver(space, store)

    assert len(resolver.query("sour")) == 1000
    assert len(resolver.query("human", "sour")) == 1000
    assert not resolver.query("dog", "sour")
    assert space.path.read_bytes() == before
    assert "sour" not in space.path.read_text(encoding="utf-8")


def test_replacing_one_rule_changes_all_resolved_people_without_individual_rewrites(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    make_people(space, 1000)
    base_before = space.path.read_bytes()

    store = CsvLogicalTransformStore(tmp_path)
    store.install(LogicalTransformRule(
        "human-mood", ("human",), ("sour",), "oracle:genesis", 1.0,
        provenance={"challenge_survived": True},
    ))
    resolver = LogicalSpaceResolver(space, store)
    assert len(resolver.query("sour")) == 1000
    assert len(resolver.query("happy")) == 0

    changed = store.replace(
        "human-mood",
        emit_terms=("happy",),
        source_id="oracle:evolution",
        provenance={"replacement_reason": "new challenged logic"},
    )
    assert changed.version == 2

    assert len(resolver.query("sour")) == 0
    happy = resolver.query("happy")
    assert len(happy) == 1000
    assert all(item.applied_rules == ("human-mood@2",) for item in happy)
    assert space.path.read_bytes() == base_before
    assert "happy" not in space.path.read_text(encoding="utf-8")

    rows = list(csv.DictReader(store.current_path.open(encoding="utf-8")))
    assert len(rows) == 1
    assert rows[0]["rule_id"] == "human-mood"
    assert rows[0]["version"] == "2"


def test_rule_history_is_human_readable_and_append_only(tmp_path):
    store = CsvLogicalTransformStore(tmp_path)
    store.install(LogicalTransformRule("r", ("human",), ("sour",), "oracle:g"))
    store.replace("r", emit_terms=("happy",), source_id="oracle:e")
    store.retire("r", provenance={"why": "falsified"})

    rows = list(csv.DictReader(store.history_path.open(encoding="utf-8")))
    assert [row["event"] for row in rows] == ["GENESIS", "REPLACED", "RETIRED"]
    assert [row["version"] for row in rows] == ["1", "2", "3"]
    assert "sour" in rows[1]["previous_emit_terms"]
    assert "happy" in rows[1]["emit_terms"]


def test_retired_rule_stops_affecting_resolved_space(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    make_people(space, 3)
    store = CsvLogicalTransformStore(tmp_path)
    store.install(LogicalTransformRule("r", ("human",), ("happy",), "oracle:g"))
    resolver = LogicalSpaceResolver(space, store)
    assert len(resolver.query("happy")) == 3
    store.retire("r")
    assert resolver.query("happy") == ()


def test_rules_chain_to_fixed_point_without_materializing_derived_terms(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    make_people(space, 4)
    store = CsvLogicalTransformStore(tmp_path)
    store.install(LogicalTransformRule("r1", ("human",), ("happy",), "oracle:1"))
    store.install(LogicalTransformRule("r2", ("happy",), ("positive",), "oracle:2"))
    store.install(LogicalTransformRule("r3", ("positive",), ("approachable",), "oracle:3"))

    resolved = LogicalSpaceResolver(space, store).query("approachable")
    assert len(resolved) == 4
    assert all({"human", "happy", "positive", "approachable"}.issubset(item.resolved_terms) for item in resolved)
    assert "approachable" not in space.path.read_text(encoding="utf-8")


def test_rule_can_match_multiple_terms(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    space.append((
        LogicalBinding("a", ("alice", "human", "researcher"), "source:a", 1.0),
        LogicalBinding("b", ("bob", "human"), "source:b", 1.0),
    ))
    store = CsvLogicalTransformStore(tmp_path)
    store.install(LogicalTransformRule("r", ("human", "researcher"), ("scientist",), "oracle:r"))
    resolver = LogicalSpaceResolver(space, store)
    assert [item.base_binding_id for item in resolver.query("scientist")] == ["a"]


def test_rule_store_is_global_across_missions(tmp_path):
    space = CsvLogicalSpace(tmp_path)
    space.append((
        LogicalBinding("a", ("alice", "human"), "source:a", 1.0, mission_id="mission-a"),
        LogicalBinding("b", ("bob", "human"), "source:b", 1.0, mission_id="mission-b"),
    ))
    store = CsvLogicalTransformStore(tmp_path)
    store.install(LogicalTransformRule("r", ("human",), ("happy",), "oracle:global"))
    matches = LogicalSpaceResolver(space, store).query("happy")
    assert {item.base_binding_id for item in matches} == {"a", "b"}


def test_rule_does_not_claim_external_truth(tmp_path):
    store = CsvLogicalTransformStore(tmp_path)
    rule = store.install(LogicalTransformRule(
        "r", ("human",), ("happy",), "oracle:demo",
        provenance={"external_truth_claim": False, "challenge_required": True},
    ))
    assert rule.provenance["external_truth_claim"] is False
    assert rule.provenance["challenge_required"] is True


def test_invalid_empty_rule_fails_closed():
    try:
        LogicalTransformRule("r", (), ("happy",), "source")
    except LogicalTransformError:
        pass
    else:
        raise AssertionError("empty match terms must fail closed")
