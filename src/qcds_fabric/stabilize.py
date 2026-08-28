from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, Sequence

from .metrics import normalized_lift
from .models import BaseBundle, ChannelView, StabilizedReturn, State, TruthDistribution


def _lift_null_distribution(bundle: BaseBundle, distribution: TruthDistribution, null_index: int) -> dict[State, float]:
    """Lift a null view back to canonical binary coordinates by marginalization."""
    lifted: dict[State, float] = {}
    for state, probability in zip(distribution.support, distribution.probabilities):
        if state[null_index] != -1:
            raise ValueError("expected -1 sentinel at null dimension")
        for value in (0, 1):
            canonical = list(state)
            canonical[null_index] = value
            key = tuple(canonical)
            lifted[key] = lifted.get(key, 0.0) + probability / 2.0
    return lifted


def _canonical_probability_map(
    bundle: BaseBundle,
    view: ChannelView,
    distribution: TruthDistribution,
) -> dict[State, float]:
    if view.base_bundle.bundle_id != bundle.bundle_id:
        raise ValueError("view belongs to a different base bundle")
    if view.null_dimension_id is None:
        return dict(zip(distribution.support, distribution.probabilities))
    null_index = bundle.dimension_ids.index(view.null_dimension_id)
    return _lift_null_distribution(bundle, distribution, null_index)


def _normalize_over_support(probabilities: Mapping[State, float], support: Sequence[State]) -> tuple[tuple[float, ...], float]:
    raw = tuple(probabilities.get(state, 0.0) for state in support)
    retained_mass = sum(raw)
    if retained_mass <= 0.0:
        return tuple(1.0 / len(support) for _ in support), 0.0
    return tuple(value / retained_mass for value in raw), retained_mass


@dataclass(frozen=True)
class DistributionStabilizer:
    top_k: int = 8

    def stabilize(
        self,
        bundle: BaseBundle,
        baseline: TruthDistribution,
        null_distributions: Iterable[tuple[int, TruthDistribution]],
        *,
        oracle_stack_identity: str,
    ) -> StabilizedReturn:
        """BUILD 0 compatibility path for the core full null bank."""
        nulls = list(null_distributions)
        if len(nulls) != bundle.width:
            raise ValueError("full core null bank requires one null distribution per dimension")
        if {index for index, _ in nulls} != set(range(bundle.width)):
            raise ValueError("null bank must cover every dimension exactly once")

        canonical_states = baseline.support
        aggregate = {state: 0.0 for state in canonical_states}
        influence: dict[str, dict[str, float]] = {}
        baseline_entropy = baseline.entropy
        baseline_lift = normalized_lift(baseline)
        contradiction_count = 0

        for null_index, distribution in nulls:
            lifted = _lift_null_distribution(bundle, distribution, null_index)
            for state in aggregate:
                aggregate[state] += lifted.get(state, 0.0) / len(nulls)
            influence[bundle.dimension_ids[null_index]] = {
                "entropy_delta": distribution.entropy - baseline_entropy,
                "lift_delta": normalized_lift(distribution) - baseline_lift,
                "agreement_delta": distribution.oracle_agreement - baseline.oracle_agreement,
            }
            contradiction_count += int(bool(distribution.contradiction_markers))

        probs = tuple(aggregate[state] for state in canonical_states)
        total = sum(probs)
        probs = tuple(p / total for p in probs)
        ordering = sorted(range(len(canonical_states)), key=lambda i: probs[i], reverse=True)
        top = tuple(canonical_states[i] for i in ordering[: min(self.top_k, len(canonical_states))])
        entropy = TruthDistribution.shannon_entropy(probs)

        stabilized = TruthDistribution(
            support=canonical_states,
            probabilities=probs,
            raw_scores=probs,
            top_k=top,
            entropy=entropy,
            oracle_agreement=sum(d.oracle_agreement for _, d in nulls) / len(nulls),
            contradiction_markers=tuple(marker for _, d in nulls for marker in d.contradiction_markers),
            normalization="mean_of_marginalized_null_views",
            provenance={
                "bundle_id": bundle.bundle_id,
                "oracle_stack": oracle_stack_identity,
                "stabilizer": "distribution_mean_v0",
                "views": bundle.width,
            },
        )

        return StabilizedReturn(
            stabilized_distribution=stabilized,
            per_dimension_influence=influence,
            rotation_sensitivity={"null_entropy_spread": max(d.entropy for _, d in nulls) - min(d.entropy for _, d in nulls)},
            retained_uncertainty=entropy,
            comparison_metrics={
                "baseline_entropy": baseline_entropy,
                "stabilized_entropy": entropy,
                "baseline_normalized_lift": baseline_lift,
                "null_contradiction_fraction": contradiction_count / len(nulls),
            },
            pruning_actions=(),
            provenance={
                "bundle_id": bundle.bundle_id,
                "oracle_stack": oracle_stack_identity,
                "full_dimension_null_coverage": True,
                "automatic_pruning": False,
            },
        )

    def stabilize_families(
        self,
        bundle: BaseBundle,
        baseline: TruthDistribution,
        families: Mapping[str, Sequence[tuple[ChannelView, TruthDistribution]]],
        *,
        oracle_stack_identity: str,
    ) -> StabilizedReturn:
        """Stabilize multiple diagnostic families with explicit equal-family weight.

        Each family is averaged internally first. The family means are then
        averaged equally. This prevents a crossed bank from receiving hidden
        extra weight merely because it generated more execution perspectives.
        """
        resolved = {name: tuple(items) for name, items in families.items() if items}
        if not resolved:
            raise ValueError("at least one non-empty diagnostic family is required")

        canonical_states = baseline.support
        family_probabilities: dict[str, tuple[float, ...]] = {}
        family_agreements: dict[str, float] = {}
        comparison_metrics: dict[str, float] = {
            "baseline_entropy": baseline.entropy,
            "baseline_normalized_lift": normalized_lift(baseline),
        }
        rotation_sensitivity: dict[str, float] = {}
        all_markers: list[str] = []
        per_dimension_influence: dict[str, dict[str, float]] = {}

        for family_name, items in resolved.items():
            aggregate = [0.0] * len(canonical_states)
            entropies: list[float] = []
            agreements: list[float] = []
            retained_masses: list[float] = []

            for view, distribution in items:
                canonical = _canonical_probability_map(bundle, view, distribution)
                normalized, retained_mass = _normalize_over_support(canonical, canonical_states)
                retained_masses.append(retained_mass)
                for i, probability in enumerate(normalized):
                    aggregate[i] += probability / len(items)
                entropies.append(distribution.entropy)
                agreements.append(distribution.oracle_agreement)
                all_markers.extend(distribution.contradiction_markers)

                if family_name == "dimension_null" and view.null_dimension_id is not None:
                    per_dimension_influence[view.null_dimension_id] = {
                        "entropy_delta": distribution.entropy - baseline.entropy,
                        "lift_delta": normalized_lift(distribution) - normalized_lift(baseline),
                        "agreement_delta": distribution.oracle_agreement - baseline.oracle_agreement,
                    }

            family_probabilities[family_name] = tuple(aggregate)
            family_agreements[family_name] = sum(agreements) / len(agreements)
            rotation_sensitivity[f"{family_name}_entropy_spread"] = max(entropies) - min(entropies)
            rotation_sensitivity[f"{family_name}_agreement_spread"] = max(agreements) - min(agreements)
            comparison_metrics[f"{family_name}_view_count"] = float(len(items))
            comparison_metrics[f"{family_name}_mean_retained_mass"] = sum(retained_masses) / len(retained_masses)

        family_count = len(family_probabilities)
        combined = [0.0] * len(canonical_states)
        for probabilities in family_probabilities.values():
            for i, probability in enumerate(probabilities):
                combined[i] += probability / family_count

        total = sum(combined)
        if total <= 0.0:
            probabilities = tuple(1.0 / len(canonical_states) for _ in canonical_states)
            all_markers.append("all_stabilization_family_mass_rejected")
        else:
            probabilities = tuple(value / total for value in combined)

        ordering = sorted(range(len(canonical_states)), key=lambda i: probabilities[i], reverse=True)
        top = tuple(canonical_states[i] for i in ordering[: min(self.top_k, len(canonical_states))])
        entropy = TruthDistribution.shannon_entropy(probabilities)
        mean_agreement = sum(family_agreements.values()) / family_count
        comparison_metrics["stabilized_entropy"] = entropy
        comparison_metrics["diagnostic_family_count"] = float(family_count)

        stabilized = TruthDistribution(
            support=canonical_states,
            probabilities=probabilities,
            raw_scores=probabilities,
            top_k=top,
            entropy=entropy,
            oracle_agreement=mean_agreement,
            contradiction_markers=tuple(all_markers),
            normalization="equal_family_mean_of_canonicalized_views",
            provenance={
                "bundle_id": bundle.bundle_id,
                "oracle_stack": oracle_stack_identity,
                "stabilizer": "equal_family_mean_v1",
                "families": tuple(resolved),
                "family_weighting": "equal_family",
            },
        )

        return StabilizedReturn(
            stabilized_distribution=stabilized,
            per_dimension_influence=per_dimension_influence,
            rotation_sensitivity=rotation_sensitivity,
            retained_uncertainty=entropy,
            comparison_metrics=comparison_metrics,
            pruning_actions=(),
            provenance={
                "bundle_id": bundle.bundle_id,
                "oracle_stack": oracle_stack_identity,
                "families": tuple(resolved),
                "family_weighting": "equal_family",
                "automatic_pruning": False,
                "preserve_uncertainty": True,
            },
        )
