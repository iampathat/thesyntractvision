from __future__ import annotations

from dataclasses import dataclass, replace
from math import asin, pi, sqrt
from typing import Any, Mapping, Sequence

from .benchmark import BenchmarkMetrics, evaluate_against_target
from .fabric import FabricLayer, StabilizedRotationSuiteResult
from .models import BaseBundle, ChannelView, State, TruthDistribution
from .oracles import OracleStack
from .substrates import StatevectorGroverSubstrate


@dataclass(frozen=True)
class GroverDepthConfig:
    """Bounded empirical search policy for view-local Grover depth.

    Selection is internal: it uses only the current view's oracle-score profile
    and resulting TruthDistributions. External benchmark targets are never
    consulted by this policy.
    """

    min_iterations: int = 0
    max_iterations: int = 8
    overshoot_patience: int = 1
    improvement_tolerance: float = 1e-12
    top_k: int = 8
    phase_scale: float = pi
    max_states: int = 4096

    def __post_init__(self) -> None:
        if self.min_iterations < 0:
            raise ValueError("min_iterations must be non-negative")
        if self.max_iterations < self.min_iterations:
            raise ValueError("max_iterations must be >= min_iterations")
        if self.overshoot_patience <= 0:
            raise ValueError("overshoot_patience must be positive")
        if self.improvement_tolerance < 0:
            raise ValueError("improvement_tolerance must be non-negative")
        if self.top_k <= 0:
            raise ValueError("top_k must be positive")
        if self.phase_scale <= 0:
            raise ValueError("phase_scale must be positive")
        if self.max_states <= 0:
            raise ValueError("max_states must be positive")


@dataclass(frozen=True)
class GroverDepthTrial:
    iterations: int
    distribution: TruthDistribution
    expected_normalized_oracle_score: float
    oracle_agreement: float
    peak_probability: float
    entropy: float


@dataclass(frozen=True)
class GroverDepthSelection:
    m_star: int
    selected_distribution: TruthDistribution
    trials: tuple[GroverDepthTrial, ...]
    overshoot_detected: bool
    stop_reason: str
    ideal_binary_m_star: int | None
    provenance: Mapping[str, Any]


def expected_normalized_oracle_score(distribution: TruthDistribution) -> float:
    """Expected score under the produced distribution, normalized within view."""
    max_score = max(distribution.raw_scores, default=0.0)
    if max_score <= 0.0:
        return 0.0
    return sum(
        probability * (score / max_score)
        for probability, score in zip(distribution.probabilities, distribution.raw_scores)
    )


def ideal_binary_grover_m_star(
    raw_scores: Sequence[float],
    *,
    tolerance: float = 1e-12,
) -> int | None:
    """Return the textbook binary-marking m* diagnostic when applicable.

    This is diagnostic only. Weighted/non-binary score profiles return ``None``.
    """
    scores = tuple(float(score) for score in raw_scores)
    if not scores:
        return None
    if any(score < 0 for score in scores):
        return None
    max_score = max(scores)
    if max_score <= tolerance:
        return None

    for score in scores:
        if abs(score) <= tolerance or abs(score - max_score) <= tolerance:
            continue
        return None

    marked = sum(1 for score in scores if abs(score - max_score) <= tolerance)
    total = len(scores)
    if marked <= 0:
        return None
    if marked >= total:
        return 0

    theta = asin(sqrt(marked / total))
    estimate = pi / (4.0 * theta) - 0.5
    return max(0, int(round(estimate)))


def _trial(
    view: ChannelView,
    oracle_stack: OracleStack,
    *,
    iterations: int,
    config: GroverDepthConfig,
) -> GroverDepthTrial:
    distribution = StatevectorGroverSubstrate(
        iterations=iterations,
        top_k=config.top_k,
        phase_scale=config.phase_scale,
        max_states=config.max_states,
    ).run(view, oracle_stack)
    return GroverDepthTrial(
        iterations=iterations,
        distribution=distribution,
        expected_normalized_oracle_score=expected_normalized_oracle_score(distribution),
        oracle_agreement=distribution.oracle_agreement,
        peak_probability=max(distribution.probabilities, default=0.0),
        entropy=distribution.entropy,
    )


def select_grover_depth(
    view: ChannelView,
    oracle_stack: OracleStack,
    *,
    config: GroverDepthConfig | None = None,
) -> GroverDepthSelection:
    """Empirically select the first stable local maximum before overshoot.

    The search walks m upward. The objective is expected normalized oracle score.
    Once the objective has fallen below the best-so-far value for the configured
    number of consecutive trials, the search stops and returns that earlier best
    depth. This avoids selecting a later recurrence after the first Grover
    overshoot cycle.
    """
    resolved = config or GroverDepthConfig()
    trials: list[GroverDepthTrial] = []

    first = _trial(
        view,
        oracle_stack,
        iterations=resolved.min_iterations,
        config=resolved,
    )
    trials.append(first)

    scores = first.distribution.raw_scores
    if scores and max(scores) - min(scores) <= resolved.improvement_tolerance:
        selected = replace(
            first.distribution,
            provenance={
                **dict(first.distribution.provenance),
                "substrate_id": "statevector_grover_adaptive_simulator",
                "adaptive_grover_depth": True,
                "selected_grover_iterations": first.iterations,
                "depth_stop_reason": "non_discriminative_oracle_profile",
                "depth_overshoot_detected": False,
                "depth_internal_objective": "expected_normalized_oracle_score",
                "depth_internal_objective_value": first.expected_normalized_oracle_score,
                "external_target_used_for_depth_selection": False,
            },
        )
        return GroverDepthSelection(
            m_star=first.iterations,
            selected_distribution=selected,
            trials=tuple(trials),
            overshoot_detected=False,
            stop_reason="non_discriminative_oracle_profile",
            ideal_binary_m_star=0 if max(scores, default=0.0) > 0 else None,
            provenance={
                "policy": "first_local_max_before_overshoot_v0",
                "external_target_used": False,
                "candidate_min": resolved.min_iterations,
                "candidate_max": resolved.max_iterations,
                "trial_count": 1,
            },
        )

    best = first
    declines_after_best = 0
    overshoot_detected = False
    stop_reason = "max_iterations_reached"

    for iterations in range(resolved.min_iterations + 1, resolved.max_iterations + 1):
        current = _trial(
            view,
            oracle_stack,
            iterations=iterations,
            config=resolved,
        )
        trials.append(current)

        if (
            current.expected_normalized_oracle_score
            > best.expected_normalized_oracle_score + resolved.improvement_tolerance
        ):
            best = current
            declines_after_best = 0
            continue

        if (
            current.iterations > best.iterations
            and current.expected_normalized_oracle_score
            < best.expected_normalized_oracle_score - resolved.improvement_tolerance
        ):
            declines_after_best += 1
            if declines_after_best >= resolved.overshoot_patience:
                overshoot_detected = True
                stop_reason = "overshoot_detected"
                break
        else:
            declines_after_best = 0

    ideal = (
        ideal_binary_grover_m_star(best.distribution.raw_scores)
        if abs(resolved.phase_scale - pi) <= resolved.improvement_tolerance
        else None
    )
    selected = replace(
        best.distribution,
        provenance={
            **dict(best.distribution.provenance),
            "substrate_id": "statevector_grover_adaptive_simulator",
            "adaptive_grover_depth": True,
            "selected_grover_iterations": best.iterations,
            "depth_stop_reason": stop_reason,
            "depth_overshoot_detected": overshoot_detected,
            "depth_trial_count": len(trials),
            "depth_internal_objective": "expected_normalized_oracle_score",
            "depth_internal_objective_value": best.expected_normalized_oracle_score,
            "ideal_binary_m_star": ideal,
            "external_target_used_for_depth_selection": False,
        },
    )
    return GroverDepthSelection(
        m_star=best.iterations,
        selected_distribution=selected,
        trials=tuple(trials),
        overshoot_detected=overshoot_detected,
        stop_reason=stop_reason,
        ideal_binary_m_star=ideal,
        provenance={
            "policy": "first_local_max_before_overshoot_v0",
            "external_target_used": False,
            "candidate_min": resolved.min_iterations,
            "candidate_max": resolved.max_iterations,
            "overshoot_patience": resolved.overshoot_patience,
            "trial_count": len(trials),
        },
    )


@dataclass(frozen=True)
class AdaptiveGroverSubstrate:
    """View-local adaptive statevector/Grover simulator."""

    config: GroverDepthConfig = GroverDepthConfig()

    @property
    def substrate_id(self) -> str:
        return "statevector_grover_adaptive_simulator"

    def run(self, view: ChannelView, oracle_stack: OracleStack) -> TruthDistribution:
        return select_grover_depth(
            view,
            oracle_stack,
            config=self.config,
        ).selected_distribution


@dataclass(frozen=True)
class FixedGroverDepthBenchmarkResult:
    iterations: int
    suite: StabilizedRotationSuiteResult
    baseline_metrics: BenchmarkMetrics
    stabilized_metrics: BenchmarkMetrics


@dataclass(frozen=True)
class GroverDepthBenchmarkReport:
    fixed_results: tuple[FixedGroverDepthBenchmarkResult, ...]
    adaptive_suite: StabilizedRotationSuiteResult
    adaptive_baseline_metrics: BenchmarkMetrics
    adaptive_stabilized_metrics: BenchmarkMetrics
    adaptive_selected_iterations: Mapping[str, int]
    external_best_fixed_iterations: int
    target_distribution: Mapping[State, float]
    provenance: Mapping[str, Any]

    @property
    def fixed_by_m(self) -> Mapping[int, FixedGroverDepthBenchmarkResult]:
        return {result.iterations: result for result in self.fixed_results}


def _selected_depths(suite: StabilizedRotationSuiteResult) -> dict[str, int]:
    result = {
        "baseline": int(suite.baseline_distribution.provenance["selected_grover_iterations"])
    }
    for family_name, bank in suite.families.items():
        for index, distribution in enumerate(bank.distributions):
            result[f"{family_name}:{index}"] = int(
                distribution.provenance["selected_grover_iterations"]
            )
    return result


def run_grover_depth_benchmark(
    bundle: BaseBundle,
    oracle_stack: OracleStack,
    target: Mapping[State, float],
    *,
    config: GroverDepthConfig | None = None,
    fixed_iterations: Sequence[int] | None = None,
    include_positional: bool = True,
    include_oracle_exposure: bool = True,
    include_crossed: bool = False,
) -> GroverDepthBenchmarkReport:
    """Compare fixed Grover depths with adaptive view-local depth selection.

    The external target is used only for post-hoc benchmark metrics. The
    adaptive selection itself never receives or reads the target.
    """
    resolved = config or GroverDepthConfig()
    fixed = (
        tuple(int(value) for value in fixed_iterations)
        if fixed_iterations is not None
        else tuple(range(resolved.min_iterations, resolved.max_iterations + 1))
    )
    if not fixed:
        raise ValueError("at least one fixed Grover depth is required")
    if any(value < 0 for value in fixed):
        raise ValueError("fixed Grover depths must be non-negative")
    if len(set(fixed)) != len(fixed):
        raise ValueError("fixed Grover depths must be unique")

    fixed_results: list[FixedGroverDepthBenchmarkResult] = []
    for iterations in fixed:
        layer = FabricLayer(
            kernel=StatevectorGroverSubstrate(
                iterations=iterations,
                top_k=resolved.top_k,
                phase_scale=resolved.phase_scale,
                max_states=resolved.max_states,
            )
        )
        suite = layer.run_stabilized_rotation_suite(
            bundle,
            oracle_stack,
            include_positional=include_positional,
            include_oracle_exposure=include_oracle_exposure,
            include_crossed=include_crossed,
        )
        fixed_results.append(
            FixedGroverDepthBenchmarkResult(
                iterations=iterations,
                suite=suite,
                baseline_metrics=evaluate_against_target(
                    suite.baseline_distribution,
                    target,
                ),
                stabilized_metrics=evaluate_against_target(
                    suite.stabilized_return.stabilized_distribution,
                    target,
                ),
            )
        )

    adaptive_suite = FabricLayer(
        kernel=AdaptiveGroverSubstrate(config=resolved)
    ).run_stabilized_rotation_suite(
        bundle,
        oracle_stack,
        include_positional=include_positional,
        include_oracle_exposure=include_oracle_exposure,
        include_crossed=include_crossed,
    )
    adaptive_baseline = evaluate_against_target(
        adaptive_suite.baseline_distribution,
        target,
    )
    adaptive_stabilized = evaluate_against_target(
        adaptive_suite.stabilized_return.stabilized_distribution,
        target,
    )
    external_best = min(
        fixed_results,
        key=lambda result: result.stabilized_metrics.l1_to_target,
    )

    target_total = sum(target.values())
    if target_total <= 0:
        raise ValueError("target distribution must contain positive mass")
    normalized_target = {
        state: probability / target_total
        for state, probability in target.items()
    }

    return GroverDepthBenchmarkReport(
        fixed_results=tuple(fixed_results),
        adaptive_suite=adaptive_suite,
        adaptive_baseline_metrics=adaptive_baseline,
        adaptive_stabilized_metrics=adaptive_stabilized,
        adaptive_selected_iterations=_selected_depths(adaptive_suite),
        external_best_fixed_iterations=external_best.iterations,
        target_distribution=normalized_target,
        provenance={
            "benchmark": "grover_depth_calibration_v0",
            "bundle_id": bundle.bundle_id,
            "oracle_stack": oracle_stack.identity,
            "fixed_iterations": fixed,
            "adaptive_policy": "first_local_max_before_overshoot_v0",
            "external_target_used_for_adaptive_selection": False,
            "external_target_used_for_posthoc_evaluation": True,
            "same_conditions": True,
            "same_oracle_regime": True,
            "same_rotation_topology": True,
            "same_stabilizer": True,
            "superiority_assumed": False,
            "native_qpu": False,
            "quantum_advantage_claim": False,
        },
    )
