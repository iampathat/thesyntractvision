from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

from .kernel import ClassicalInferenceKernel
from .models import BaseBundle, ChannelView, StabilizedReturn, TruthDistribution
from .oracles import OracleStack
from .rotations import crossed_views, oracle_exposure_views, positional_views
from .stabilize import DistributionStabilizer


@dataclass(frozen=True)
class NullBankResult:
    baseline_view: ChannelView
    baseline_distribution: TruthDistribution
    null_views: tuple[ChannelView, ...]
    null_distributions: tuple[TruthDistribution, ...]
    stabilized_return: StabilizedReturn


@dataclass(frozen=True)
class RotationBankResult:
    family: str
    views: tuple[ChannelView, ...]
    distributions: tuple[TruthDistribution, ...]
    diagnostics: Mapping[str, float]


@dataclass(frozen=True)
class FabricLayer:
    kernel: ClassicalInferenceKernel = ClassicalInferenceKernel()
    stabilizer: DistributionStabilizer = DistributionStabilizer()

    def _run_rotation_views(
        self,
        family: str,
        views: Sequence[ChannelView],
        oracle_stack: OracleStack,
    ) -> RotationBankResult:
        resolved = tuple(views)
        if not resolved:
            raise ValueError("rotation bank cannot be empty")
        distributions = tuple(self.kernel.run(view, oracle_stack) for view in resolved)
        entropies = [distribution.entropy for distribution in distributions]
        agreements = [distribution.oracle_agreement for distribution in distributions]
        return RotationBankResult(
            family=family,
            views=resolved,
            distributions=distributions,
            diagnostics={
                "view_count": float(len(resolved)),
                "entropy_spread": max(entropies) - min(entropies),
                "oracle_agreement_spread": max(agreements) - min(agreements),
            },
        )

    def run_null_bank(self, bundle: BaseBundle, oracle_stack: OracleStack) -> NullBankResult:
        baseline_view = ChannelView.baseline(
            bundle,
            oracle_stack_version=oracle_stack.identity,
            oracle_ids=oracle_stack.oracle_ids,
        )
        baseline_distribution = self.kernel.run(baseline_view, oracle_stack)
        null_views = tuple(
            ChannelView.null_dimension(
                bundle,
                index,
                oracle_stack_version=oracle_stack.identity,
                oracle_ids=oracle_stack.oracle_ids,
            )
            for index in range(bundle.width)
        )
        null_distributions = tuple(self.kernel.run(view, oracle_stack) for view in null_views)
        stabilized = self.stabilizer.stabilize(
            bundle,
            baseline_distribution,
            enumerate(null_distributions),
            oracle_stack_identity=oracle_stack.identity,
        )
        return NullBankResult(
            baseline_view=baseline_view,
            baseline_distribution=baseline_distribution,
            null_views=null_views,
            null_distributions=null_distributions,
            stabilized_return=stabilized,
        )

    def run_positional_bank(
        self,
        bundle: BaseBundle,
        oracle_stack: OracleStack,
        *,
        position_maps: Sequence[Sequence[int]] | None = None,
    ) -> RotationBankResult:
        return self._run_rotation_views(
            "position",
            positional_views(bundle, oracle_stack, position_maps=position_maps),
            oracle_stack,
        )

    def run_oracle_exposure_bank(
        self,
        bundle: BaseBundle,
        oracle_stack: OracleStack,
        *,
        oracle_maps: Sequence[Sequence[str]] | None = None,
    ) -> RotationBankResult:
        return self._run_rotation_views(
            "oracle_exposure",
            oracle_exposure_views(bundle, oracle_stack, oracle_maps=oracle_maps),
            oracle_stack,
        )

    def run_crossed_bank(
        self,
        bundle: BaseBundle,
        oracle_stack: OracleStack,
        *,
        null_indices: Sequence[int | None] | None = None,
        position_maps: Sequence[Sequence[int]] | None = None,
        oracle_maps: Sequence[Sequence[str]] | None = None,
    ) -> RotationBankResult:
        return self._run_rotation_views(
            "crossed",
            crossed_views(
                bundle,
                oracle_stack,
                null_indices=null_indices,
                position_maps=position_maps,
                oracle_maps=oracle_maps,
            ),
            oracle_stack,
        )
