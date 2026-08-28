from __future__ import annotations

from dataclasses import dataclass

from .kernel import ClassicalInferenceKernel
from .models import BaseBundle, ChannelView, StabilizedReturn, TruthDistribution
from .oracles import OracleStack
from .stabilize import DistributionStabilizer


@dataclass(frozen=True)
class NullBankResult:
    baseline_view: ChannelView
    baseline_distribution: TruthDistribution
    null_views: tuple[ChannelView, ...]
    null_distributions: tuple[TruthDistribution, ...]
    stabilized_return: StabilizedReturn


@dataclass(frozen=True)
class FabricLayer:
    kernel: ClassicalInferenceKernel = ClassicalInferenceKernel()
    stabilizer: DistributionStabilizer = DistributionStabilizer()

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
