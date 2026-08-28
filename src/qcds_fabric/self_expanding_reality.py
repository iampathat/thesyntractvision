from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Sequence

from .logical_space import LogicalBinding
from .logical_transform import LogicalSpaceResolver, LogicalTransformRule
from .logical_universe import CsvLogicalUniverseStore, LogicalRuleGovernance, RuleDriftPolicy
from .oracle_evolution import (
    OracleChallengeSuite,
    OracleEvolutionConfig,
    challenge_case_from_problem,
)
from .oracle_genesis import (
    OracleFailureObservation,
    OracleGapDiscoveryConfig,
    PairwiseSemanticRuleGenesisGenerator,
    run_oracle_genesis_cycle,
)
from .problem import (
    ProblemCompilation,
    ProblemQuery,
    SemanticClaim,
    SemanticProblemFrame,
    SemanticRuleOracle,
    compile_problem_frame,
)


class SelfExpandingRealityError(ValueError):
    """Raised when the BUILD 21 overlay cannot proceed without inventing logic."""


def _require_mapping(value: Any, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise SelfExpandingRealityError(f"{label} must be an object")
    return value


def _require_sequence(value: Any, label: str) -> Sequence[Any]:
    if isinstance(value, (str, bytes)) or not isinstance(value, Sequence):
        raise SelfExpandingRealityError(f"{label} must be an array")
    return value


def _strings(value: Any, label: str) -> tuple[str, ...]:
    items = _require_sequence(value, label)
    resolved = tuple(str(item).strip() for item in items if str(item).strip())
    if not resolved:
        raise SelfExpandingRealityError(f"{label} must contain at least one value")
    return resolved


def _slug(value: str) -> str:
    out: list[str] = []
    prior_sep = False
    for char in value.strip().lower():
        if char.isalnum():
            out.append(char)
            prior_sep = False
        elif not prior_sep:
            out.append("_")
            prior_sep = True
    return "".join(out).strip("_") or "unknown"


def _sha256(path: Path) -> str | None:
    if not path.exists():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _frame_from_spec(raw: Mapping[str, Any], label: str) -> SemanticProblemFrame:
    if raw.get("rules"):
        raise SelfExpandingRealityError(
            f"{label}.rules must be empty: BUILD 21 must discover the missing rule rather than receive it"
        )

    queries = []
    for index, item_raw in enumerate(_require_sequence(raw.get("queries", ()), f"{label}.queries")):
        item = _require_mapping(item_raw, f"{label}.queries[{index}]")
        queries.append(
            ProblemQuery(
                query_id=str(item.get("query_id", "")).strip(),
                subject=str(item.get("subject", "")).strip(),
                predicate=str(item.get("predicate", "")).strip(),
                candidate_values=_strings(item.get("candidate_values", ()), f"{label}.queries[{index}].candidate_values"),
                original_text=str(item.get("original_text", "")).strip(),
            )
        )

    claims = []
    for index, item_raw in enumerate(_require_sequence(raw.get("claims", ()), f"{label}.claims")):
        item = _require_mapping(item_raw, f"{label}.claims[{index}]")
        claims.append(
            SemanticClaim(
                subject=str(item.get("subject", "")).strip(),
                predicate=str(item.get("predicate", "")).strip(),
                value=str(item.get("value", "")).strip(),
                source_id=str(item.get("source_id", "")).strip(),
                confidence=float(item.get("confidence", 1.0)),
                polarity=bool(item.get("polarity", True)),
                original_text=str(item.get("original_text", "")).strip(),
            )
        )

    return SemanticProblemFrame(
        mission_id=str(raw.get("mission_id", "")).strip(),
        raw_text=str(raw.get("raw_text", "")).strip(),
        queries=tuple(queries),
        claims=tuple(claims),
        analyzer_id=str(raw.get("analyzer_id", "build21-spec")).strip(),
        provenance={
            **dict(_require_mapping(raw.get("provenance", {}), f"{label}.provenance")),
            "build21_input_has_solution_rule": False,
        },
    )


def _binding_from_spec(raw: Mapping[str, Any]) -> LogicalBinding:
    terms = _strings(raw.get("terms", ()), "reality_bindings[].terms")
    if len(terms) < 2:
        raise SelfExpandingRealityError("reality bindings require at least two logical terms")
    return LogicalBinding(
        binding_id=str(raw.get("binding_id", "")).strip(),
        terms=terms,
        source_id=str(raw.get("source_id", "build21:seed")).strip(),
        confidence=float(raw.get("confidence", 1.0)),
        polarity=bool(raw.get("polarity", True)),
        source_uri=str(raw.get("source_uri", "")).strip() or None,
        mission_id=str(raw.get("mission_id", "build21-reality")).strip(),
        observation_id=str(raw.get("observation_id", "")).strip(),
        excerpt=str(raw.get("excerpt", "")).strip(),
        provenance={
            **dict(_require_mapping(raw.get("provenance", {}), "reality binding provenance")),
            "universe_id": "reality",
            "ingress": "build21_self_expanding_reality",
            "external_truth_claim": False,
        },
    )


def _failure_from_spec(raw: Mapping[str, Any]) -> OracleFailureObservation:
    return OracleFailureObservation(
        observation_id=str(raw.get("observation_id", "")).strip(),
        kind=str(raw.get("kind", "prediction_failure")).strip(),
        query_ids=tuple(str(item).strip() for item in raw.get("query_ids", ()) if str(item).strip()),
        dimension_ids=tuple(str(item).strip() for item in raw.get("dimension_ids", ()) if str(item).strip()),
        severity=float(raw.get("severity", 1.0)),
        description=str(raw.get("description", "")).strip(),
        target_visible_to_discovery=False,
        provenance={
            **dict(_require_mapping(raw.get("provenance", {}), "failure provenance")),
            "target_visible_to_discovery": False,
        },
    )


def _dimension_descriptor(compilation: ProblemCompilation, dimension_id: str) -> Mapping[str, str]:
    for group_key, dimensions in compilation.group_dimensions.items():
        if dimension_id not in dimensions:
            continue
        values = compilation.group_values[group_key]
        value = values[dimensions.index(dimension_id)]
        subject, predicate = group_key.split("::", 1)
        return {
            "dimension_id": dimension_id,
            "group_key": group_key,
            "subject": subject,
            "predicate": predicate,
            "value": value,
        }
    raise SelfExpandingRealityError(f"cannot map generated dimension to logical term: {dimension_id}")


def _rule_signature(compilation: ProblemCompilation, oracle: SemanticRuleOracle) -> Mapping[str, Any]:
    left = _dimension_descriptor(compilation, oracle.antecedent_dimension)
    right = _dimension_descriptor(compilation, oracle.consequent_dimension)
    return {
        "oracle_id": oracle.oracle_id,
        "kind": oracle.kind,
        "confidence": oracle.confidence,
        "antecedent": left,
        "consequent": right,
    }


@dataclass(frozen=True)
class RealityExpansionResult:
    mission_id: str
    status: str
    added_base_bindings: int
    base_binding_count: int
    before_probe_count: int
    after_probe_count: int
    knowledge_gain: int
    oracle_gap_count: int
    oracle_hypothesis_count: int
    oracle_rejected_count: int
    oracle_promoted_count: int
    governed_rule_outcomes: tuple[Mapping[str, Any], ...]
    rejected_oracle_examples: tuple[Mapping[str, Any], ...]
    active_reality_rule_count: int
    base_space_sha256_before_rules: str | None
    base_space_sha256_after_cycle: str | None
    probe_terms: tuple[str, ...]
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "mission_id": self.mission_id,
            "status": self.status,
            "added_base_bindings": self.added_base_bindings,
            "base_binding_count": self.base_binding_count,
            "probe_terms": list(self.probe_terms),
            "before_probe_count": self.before_probe_count,
            "after_probe_count": self.after_probe_count,
            "knowledge_gain": self.knowledge_gain,
            "oracle_gap_count": self.oracle_gap_count,
            "oracle_hypothesis_count": self.oracle_hypothesis_count,
            "oracle_rejected_count": self.oracle_rejected_count,
            "oracle_promoted_count": self.oracle_promoted_count,
            "governed_rule_outcomes": list(self.governed_rule_outcomes),
            "rejected_oracle_examples": list(self.rejected_oracle_examples),
            "active_reality_rule_count": self.active_reality_rule_count,
            "base_space_sha256_before_rules": self.base_space_sha256_before_rules,
            "base_space_sha256_after_cycle": self.base_space_sha256_after_cycle,
            "base_space_unchanged_by_derived_logic": (
                self.base_space_sha256_before_rules == self.base_space_sha256_after_cycle
            ),
            "provenance": dict(self.provenance),
        }


@dataclass
class SelfExpandingRealityRunner:
    """BUILD 21 overlay that bridges challenged oracle genesis into reality logic.

    The runner owns no QCDS kernel, Fabric, rotation, nulling, oracle-evolution,
    Logical Space, rule resolver or universe-governance implementation. It only
    composes those existing boundaries and therefore remains removable without
    changing their semantics.
    """

    store_root: str | Path

    def __post_init__(self) -> None:
        self.store_root = Path(self.store_root)
        self.store_root.mkdir(parents=True, exist_ok=True)
        self.universes = CsvLogicalUniverseStore(self.store_root)
        self.universes.ensure_reality()

    def _challenge_suite(self, spec: Mapping[str, Any]) -> OracleChallengeSuite:
        suite_id = str(spec.get("suite_id", "")).strip()
        cases = []
        for index, raw_case in enumerate(_require_sequence(spec.get("cases", ()), "challenge.cases")):
            case = _require_mapping(raw_case, f"challenge.cases[{index}]")
            frame = _frame_from_spec(
                _require_mapping(case.get("frame"), f"challenge.cases[{index}].frame"),
                f"challenge.cases[{index}].frame",
            )
            compilation = compile_problem_frame(frame)
            expected = {
                str(key): str(value)
                for key, value in _require_mapping(
                    case.get("expected_assignments"),
                    f"challenge.cases[{index}].expected_assignments",
                ).items()
            }
            cases.append(
                challenge_case_from_problem(
                    compilation,
                    population_oracle_ids=(),
                    expected_assignments=expected,
                    case_id=str(case.get("case_id", "")).strip(),
                    role=str(case.get("role", "")).strip(),
                    provenance={
                        "build21": True,
                        "external_targets_visible_only_to_challenge": True,
                    },
                )
            )
        return OracleChallengeSuite(
            suite_id=suite_id,
            cases=tuple(cases),
            provenance={
                "build21": True,
                "targets_passed_to_generator": False,
            },
        )

    def _bridge_promoted_oracle(
        self,
        compilation: ProblemCompilation,
        oracle: SemanticRuleOracle,
        *,
        challenge_suite_id: str,
    ) -> Mapping[str, Any]:
        signature = _rule_signature(compilation, oracle)
        if oracle.kind != "implies":
            return {
                **signature,
                "status": "unsupported_bridge_kind",
                "active": False,
                "reason": "BUILD 21 only bridges positive implication into global LogicalTransformRule",
            }

        match_term = signature["antecedent"]["value"]
        emit_term = signature["consequent"]["value"]
        rule_id = f"genesis:{_slug(match_term)}:implies:{_slug(emit_term)}"
        source_id = f"oracle-genesis:{oracle.oracle_id}"
        rule = LogicalTransformRule(
            rule_id=rule_id,
            match_terms=(match_term,),
            emit_terms=(emit_term,),
            source_id=source_id,
            confidence=oracle.confidence,
            provenance={
                "bridge": "build21_oracle_to_reality_rule_v0",
                "oracle_id": oracle.oracle_id,
                "oracle_kind": oracle.kind,
                "oracle_relation_class": oracle.relation_class,
                "oracle_source_id": oracle.source_id,
                "challenge_suite_id": challenge_suite_id,
                "oracle_challenge_passed": True,
                "target_visible_to_generator": False,
                "holdout_visible_to_generator": False,
                "external_truth_claim": False,
                "canonical_spec_modified": False,
            },
        )

        store = self.universes.rules("reality")
        existing = store.get(rule_id)
        if existing is not None:
            same = (
                tuple(existing.match_terms) == tuple(rule.match_terms)
                and tuple(existing.emit_terms) == tuple(rule.emit_terms)
                and existing.status == "active"
            )
            if not same:
                raise SelfExpandingRealityError(
                    f"generated rule id collides with different active logic: {rule_id}"
                )
            return {
                **signature,
                "logical_rule_id": rule_id,
                "status": "already_active",
                "active": True,
                "changed_bindings": None,
                "changed_fraction": None,
            }

        governance = LogicalRuleGovernance(
            self.universes,
            policy=RuleDriftPolicy(),
        )
        candidate = governance.propose(
            "reality",
            candidate_id=f"build21:{_slug(challenge_suite_id)}:{_slug(rule_id)}",
            rule=rule,
            provenance={
                "origin": "challenged_oracle_genesis",
                "challenge_suite_id": challenge_suite_id,
                "automatic_reality_promotion_requires_promotable_blast": True,
            },
        )
        report = candidate.drift_report
        if candidate.status != "promotable":
            return {
                **signature,
                "logical_rule_id": rule_id,
                "status": "quarantined_by_reality_governance",
                "active": False,
                "changed_bindings": report.changed_bindings if report else None,
                "changed_fraction": report.changed_fraction if report else None,
                "drift_reasons": list(report.reasons) if report else [],
            }

        promoted = governance.promote(
            candidate,
            challenge_passed=True,
            approval_source=f"oracle-challenge:{challenge_suite_id}",
            override_blast=False,
        )
        return {
            **signature,
            "logical_rule_id": promoted.rule_id,
            "logical_rule_version": promoted.version,
            "status": "promoted_to_reality",
            "active": True,
            "changed_bindings": report.changed_bindings if report else None,
            "changed_fraction": report.changed_fraction if report else None,
            "blast_override": False,
        }

    def run(self, spec: Mapping[str, Any]) -> RealityExpansionResult:
        mission_id = str(spec.get("mission_id", "build21-reality-cycle")).strip()
        probe_terms = _strings(spec.get("probe_terms", ()), "probe_terms")

        space = self.universes.space("reality")
        bindings = tuple(
            _binding_from_spec(_require_mapping(item, "reality_bindings[]"))
            for item in _require_sequence(spec.get("reality_bindings", ()), "reality_bindings")
        )
        added = space.append(bindings)

        resolver_before = LogicalSpaceResolver(space, self.universes.rules("reality"))
        before_count = len(resolver_before.query(*probe_terms))
        base_path = self.universes.universe_root("reality") / "logical_space.csv"
        base_hash_before = _sha256(base_path)

        genesis_spec = _require_mapping(spec.get("genesis"), "genesis")
        frame = _frame_from_spec(
            _require_mapping(genesis_spec.get("problem"), "genesis.problem"),
            "genesis.problem",
        )
        compilation = compile_problem_frame(frame)
        challenge = self._challenge_suite(
            _require_mapping(genesis_spec.get("challenge"), "genesis.challenge")
        )
        failures = tuple(
            _failure_from_spec(_require_mapping(item, "genesis.failure_observations[]"))
            for item in _require_sequence(
                genesis_spec.get("failure_observations", ()),
                "genesis.failure_observations",
            )
        )

        genesis = run_oracle_genesis_cycle(
            compilation,
            challenge,
            observations=failures,
            genesis_generators=(
                PairwiseSemanticRuleGenesisGenerator(
                    kinds=("implies",),
                    confidence_values=(1.0,),
                    bidirectional_candidates=True,
                    max_proposals_per_gap=int(genesis_spec.get("max_proposals_per_gap", 96)),
                ),
            ),
            discovery_config=OracleGapDiscoveryConfig(
                include_contradiction_resolution=False,
                include_null_influence=False,
                min_failure_severity=float(genesis_spec.get("min_failure_severity", 0.1)),
                max_gaps=int(genesis_spec.get("max_gaps", 8)),
            ),
            evolution_config=OracleEvolutionConfig(
                evaluation_mode=str(genesis_spec.get("evaluation_mode", "baseline")),
                max_generations=int(genesis_spec.get("max_generations", 1)),
                max_promotions_per_generation=int(genesis_spec.get("max_promotions_per_generation", 1)),
                min_selection_cases=int(genesis_spec.get("min_selection_cases", 1)),
                min_holdout_cases=int(genesis_spec.get("min_holdout_cases", 1)),
                min_selection_mean_l1_improvement=float(
                    genesis_spec.get("min_selection_mean_l1_improvement", 1e-6)
                ),
                min_holdout_mean_l1_improvement=float(
                    genesis_spec.get("min_holdout_mean_l1_improvement", 0.0)
                ),
                max_case_l1_regression=float(genesis_spec.get("max_case_l1_regression", 0.0)),
                max_total_contradiction_increase=int(
                    genesis_spec.get("max_total_contradiction_increase", 0)
                ),
                min_effect_cases=int(genesis_spec.get("min_effect_cases", 1)),
            ),
        )

        evaluations = tuple(
            evaluation
            for generation in (() if genesis.evolution is None else genesis.evolution.generations)
            for evaluation in generation.evaluations
        )
        rejected = tuple(evaluation for evaluation in evaluations if not evaluation.promotable)
        rejected_examples: list[Mapping[str, Any]] = []
        for evaluation in rejected[:12]:
            oracle = evaluation.hypothesis.oracle
            if not isinstance(oracle, SemanticRuleOracle):
                continue
            rejected_examples.append(
                {
                    **_rule_signature(compilation, oracle),
                    "hypothesis_id": evaluation.hypothesis.hypothesis_id,
                    "rejection_reasons": list(evaluation.rejection_reasons),
                    "selection_mean_l1_improvement": evaluation.selection_mean_l1_improvement,
                    "holdout_mean_l1_improvement": evaluation.holdout_mean_l1_improvement,
                }
            )

        promoted_oracle_ids = set(genesis.newly_added_oracle_ids)
        promoted_semantic = tuple(
            oracle
            for oracle in (() if genesis.evolution is None else genesis.evolution.final_stack.oracles)
            if isinstance(oracle, SemanticRuleOracle) and oracle.oracle_id in promoted_oracle_ids
        )
        outcomes = tuple(
            self._bridge_promoted_oracle(
                compilation,
                oracle,
                challenge_suite_id=challenge.suite_id,
            )
            for oracle in promoted_semantic
        )

        resolver_after = LogicalSpaceResolver(space, self.universes.rules("reality"))
        after_count = len(resolver_after.query(*probe_terms))
        base_hash_after = _sha256(base_path)
        active_rules = self.universes.rules("reality").rules(active_only=True)

        active_new = sum(outcome.get("active") is True for outcome in outcomes)
        if active_new and after_count > before_count:
            status = "expanded"
        elif any(outcome.get("status") == "quarantined_by_reality_governance" for outcome in outcomes):
            status = "quarantined"
        elif genesis.promotion_count == 0:
            status = "no_challenged_oracle_survived"
        elif outcomes:
            status = "no_new_resolved_effect"
        else:
            status = "no_bridgeable_oracle"

        return RealityExpansionResult(
            mission_id=mission_id,
            status=status,
            added_base_bindings=added,
            base_binding_count=len(space.bindings()),
            before_probe_count=before_count,
            after_probe_count=after_count,
            knowledge_gain=after_count - before_count,
            oracle_gap_count=len(genesis.discovery.gaps),
            oracle_hypothesis_count=len(evaluations),
            oracle_rejected_count=len(rejected),
            oracle_promoted_count=genesis.promotion_count,
            governed_rule_outcomes=outcomes,
            rejected_oracle_examples=tuple(rejected_examples),
            active_reality_rule_count=len(active_rules),
            base_space_sha256_before_rules=base_hash_before,
            base_space_sha256_after_cycle=base_hash_after,
            probe_terms=probe_terms,
            provenance={
                "engine": "self_expanding_reality_overlay_v0",
                "overlay_only": True,
                "qcds_core_modified": False,
                "fabric_core_modified": False,
                "oracle_core_modified": False,
                "logical_universe_core_modified": False,
                "canonical_spec_modified": False,
                "solution_rule_supplied_to_genesis": False,
                "external_targets_visible_only_after_proposal": True,
                "holdout_visible_to_generator": False,
                "reality_rule_requires_oracle_challenge": True,
                "reality_rule_requires_drift_governance": True,
                "automatic_blast_override": False,
                "derived_logic_materialized_into_base_space": False,
            },
        )


def load_reality_cycle_spec(path: str | Path) -> Mapping[str, Any]:
    with Path(path).open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return _require_mapping(payload, "root spec")


def run_reality_cycle_spec(
    spec: Mapping[str, Any],
    *,
    store_root: str | Path = "./intelligence_store",
) -> RealityExpansionResult:
    return SelfExpandingRealityRunner(store_root).run(spec)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Run the BUILD 21 self-expanding reality overlay: oracle gap -> target-blind "
            "genesis -> challenge/holdout -> drift governance -> non-materialized reality rule."
        )
    )
    parser.add_argument("spec", help="Path to a BUILD 21 JSON spec")
    parser.add_argument("--store", default="./intelligence_store", help="Persistent intelligence-store root")
    args = parser.parse_args(argv)

    try:
        result = run_reality_cycle_spec(load_reality_cycle_spec(args.spec), store_root=args.store)
    except (OSError, json.JSONDecodeError, SelfExpandingRealityError, ValueError) as exc:
        parser.error(str(exc))
        return 2

    print(json.dumps(result.as_dict(), ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
