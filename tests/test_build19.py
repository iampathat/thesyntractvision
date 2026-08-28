from __future__ import annotations

import csv

import pytest

from qcds_fabric.logical_space import LogicalBinding
from qcds_fabric.logical_transform import LogicalSpaceResolver, LogicalTransformRule
from qcds_fabric.logical_universe import (
    CsvLogicalUniverseStore,
    LogicalRuleGovernance,
    LogicalUniverse,
    LogicalUniverseError,
    RuleDriftPolicy,
)


def seed_people(space, count: int) -> None:
    space.append(tuple(
        LogicalBinding(f"person:{i}", (f"person_{i}", "human"), "seed", 1.0)
        for i in range(count)
    ))


def test_reality_reuses_existing_root_logical_space(tmp_path):
    universes = CsvLogicalUniverseStore(tmp_path)
    reality = universes.ensure_reality()
    assert reality.mode == "observed"
    assert universes.universe_root("reality") == tmp_path
    universes.space("reality").append((LogicalBinding("a", ("alice", "human"), "seed", 1.0),))
    assert (tmp_path / "logical_space.csv").exists()
    assert not (tmp_path / "universes" / "reality" / "logical_space.csv").exists()


def test_declared_universe_is_physically_isolated_from_reality(tmp_path):
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    universes.create(LogicalUniverse("swedish-law-2026", "declared", authority="riksdagen"))
    universes.space("reality").append((LogicalBinding("r", ("alice", "human"), "obs", 1.0),))
    universes.space("swedish-law-2026").append((LogicalBinding("l", ("alice", "legal_subject"), "law", 1.0),))
    assert universes.space("reality").query("legal_subject") == ()
    assert len(universes.space("swedish-law-2026").query("legal_subject")) == 1


def test_declared_universe_requires_authority(tmp_path):
    with pytest.raises(LogicalUniverseError):
        LogicalUniverse("law", "declared")


def test_candidate_rule_does_not_modify_active_logic_before_promotion(tmp_path):
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    seed_people(universes.space("reality"), 4)
    governance = LogicalRuleGovernance(
        universes,
        RuleDriftPolicy(max_changed_fraction=1.0, max_changed_bindings=10),
    )
    candidate = governance.propose(
        "reality",
        candidate_id="c1",
        rule=LogicalTransformRule("human-state", ("human",), ("happy",), "oracle:genesis"),
    )
    assert candidate.status == "promotable"
    assert universes.rules("reality").rules() == ()
    assert LogicalSpaceResolver(universes.space("reality"), universes.rules("reality")).query("happy") == ()


def test_global_rule_is_quarantined_when_blast_radius_is_too_large(tmp_path):
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    seed_people(universes.space("reality"), 1000)
    governance = LogicalRuleGovernance(universes)
    candidate = governance.propose(
        "reality",
        candidate_id="wide",
        rule=LogicalTransformRule("human-state", ("human",), ("happy",), "oracle:genesis"),
    )
    report = candidate.drift_report
    assert candidate.status == "quarantined"
    assert report is not None
    assert report.changed_bindings == 1000
    assert report.changed_fraction == 1.0
    assert "changed_fraction_exceeds_policy" in report.reasons
    assert "changed_bindings_exceed_policy" in report.reasons
    assert universes.rules("reality").rules() == ()


def test_observed_universe_requires_challenge_even_for_small_safe_change(tmp_path):
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    universes.space("reality").append((LogicalBinding("a", ("alice", "human"), "seed", 1.0),))
    governance = LogicalRuleGovernance(
        universes,
        RuleDriftPolicy(max_changed_fraction=1.0, max_changed_bindings=10),
    )
    candidate = governance.propose(
        "reality",
        candidate_id="safe",
        rule=LogicalTransformRule("r", ("human",), ("mortal",), "oracle:g"),
    )
    with pytest.raises(LogicalUniverseError, match="challenge_passed"):
        governance.promote(candidate, approval_source="qcds:test")
    governance.promote(candidate, challenge_passed=True, approval_source="qcds:test")
    assert len(LogicalSpaceResolver(universes.space("reality"), universes.rules("reality")).query("mortal")) == 1


def test_quarantined_observed_rule_needs_blast_override_and_challenge(tmp_path):
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    seed_people(universes.space("reality"), 600)
    governance = LogicalRuleGovernance(universes)
    candidate = governance.propose(
        "reality",
        candidate_id="wide",
        rule=LogicalTransformRule("r", ("human",), ("happy",), "oracle:g"),
    )
    with pytest.raises(LogicalUniverseError, match="blast-radius override"):
        governance.promote(candidate, challenge_passed=True, approval_source="qcds:test")
    with pytest.raises(LogicalUniverseError, match="challenge_passed"):
        governance.promote(candidate, approval_source="qcds:test", override_blast=True)
    governance.promote(
        candidate,
        challenge_passed=True,
        approval_source="qcds:test",
        override_blast=True,
    )
    assert len(LogicalSpaceResolver(universes.space("reality"), universes.rules("reality")).query("happy")) == 600


def test_declared_rulebook_can_define_its_own_logic_without_reality_leakage(tmp_path):
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    universes.create(LogicalUniverse("lawbook", "declared", authority="demo-legislature"))
    seed_people(universes.space("reality"), 3)
    seed_people(universes.space("lawbook"), 3)
    governance = LogicalRuleGovernance(universes)
    candidate = governance.propose(
        "lawbook",
        candidate_id="law-1",
        rule=LogicalTransformRule("legal-status", ("human",), ("legal_person",), "law:section-1"),
    )
    assert candidate.status == "quarantined"  # 100% blast is visible even in a declared universe.
    governance.promote(candidate, approval_source="demo-legislature", override_blast=True)
    assert len(LogicalSpaceResolver(universes.space("lawbook"), universes.rules("lawbook")).query("legal_person")) == 3
    assert LogicalSpaceResolver(universes.space("reality"), universes.rules("reality")).query("legal_person") == ()


def test_replacement_report_measures_removed_and_added_derived_logic(tmp_path):
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    seed_people(universes.space("reality"), 10)
    rules = universes.rules("reality")
    rules.install(LogicalTransformRule("human-state", ("human",), ("sour",), "oracle:g"))
    governance = LogicalRuleGovernance(
        universes,
        RuleDriftPolicy(max_changed_fraction=1.0, max_changed_bindings=20),
    )
    candidate = governance.propose(
        "reality",
        candidate_id="replace-state",
        operation="replace",
        rule=LogicalTransformRule("human-state", ("human",), ("happy",), "oracle:e"),
    )
    report = candidate.drift_report
    assert report is not None
    assert report.changed_bindings == 10
    assert report.added_term_instances == 10
    assert report.removed_term_instances == 10
    assert report.max_term_delta_per_binding == 2


def test_rule_chains_are_included_in_blast_radius(tmp_path):
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    seed_people(universes.space("reality"), 5)
    universes.rules("reality").install(LogicalTransformRule("r2", ("happy",), ("positive",), "oracle:2"))
    governance = LogicalRuleGovernance(
        universes,
        RuleDriftPolicy(max_changed_fraction=1.0, max_changed_bindings=10),
    )
    candidate = governance.propose(
        "reality",
        candidate_id="chain",
        rule=LogicalTransformRule("r1", ("human",), ("happy",), "oracle:1"),
    )
    report = candidate.drift_report
    assert report is not None
    assert report.changed_bindings == 5
    assert report.added_term_instances == 10  # happy + downstream positive for every human
    assert report.max_term_delta_per_binding == 2


def test_zero_effect_rule_is_quarantined_by_default(tmp_path):
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    universes.space("reality").append((LogicalBinding("d", ("dog_1", "dog"), "seed", 1.0),))
    candidate = LogicalRuleGovernance(universes).propose(
        "reality",
        candidate_id="zero",
        rule=LogicalTransformRule("r", ("human",), ("happy",), "oracle:g"),
    )
    assert candidate.status == "quarantined"
    assert candidate.drift_report is not None
    assert candidate.drift_report.reasons == ("zero_effect",)


def test_candidate_csv_is_human_readable_and_contains_blast_measurements(tmp_path):
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    seed_people(universes.space("reality"), 2)
    governance = LogicalRuleGovernance(
        universes,
        RuleDriftPolicy(max_changed_fraction=1.0, max_changed_bindings=10),
    )
    governance.propose(
        "reality",
        candidate_id="readable",
        rule=LogicalTransformRule("r", ("human",), ("happy",), "oracle:g"),
    )
    path = tmp_path / "logical_rule_candidates.csv"
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    assert rows[0]["candidate_id"] == "readable"
    assert rows[0]["changed_bindings"] == "2"
    assert rows[0]["changed_fraction"] == "1.0"
    assert "human" in rows[0]["match_terms"]
    assert "happy" in rows[0]["emit_terms"]


def test_same_rule_id_can_exist_independently_in_two_universes(tmp_path):
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    universes.create(LogicalUniverse("fiction", "hypothetical"))
    universes.space("reality").append((LogicalBinding("r", ("alice", "human"), "seed", 1.0),))
    universes.space("fiction").append((LogicalBinding("f", ("alice", "human"), "seed", 1.0),))
    universes.rules("reality").install(LogicalTransformRule("state", ("human",), ("mortal",), "obs"))
    universes.rules("fiction").install(LogicalTransformRule("state", ("human",), ("immortal",), "story"))
    assert len(LogicalSpaceResolver(universes.space("reality"), universes.rules("reality")).query("mortal")) == 1
    assert LogicalSpaceResolver(universes.space("reality"), universes.rules("reality")).query("immortal") == ()
    assert len(LogicalSpaceResolver(universes.space("fiction"), universes.rules("fiction")).query("immortal")) == 1
