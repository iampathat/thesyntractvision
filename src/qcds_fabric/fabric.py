from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Mapping, Sequence

from .kernel import ClassicalInferenceKernel
from .models import BaseBundle, ChannelView, StabilizedReturn, TruthDistribution
from .oracles import OracleStack
from .rotations import crossed_views, oracle_exposure_views, positional_views
from .stabilize import DistributionStabilizer
from .substrates import InferenceSubstrate


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
class StabilizedRotationSuiteResult:
    baseline_view: ChannelView
    baseline_distribution: TruthDistribution
    families: Mapping[str, RotationBankResult]
    stabilized_return: StabilizedReturn


@dataclass(frozen=True)
class FabricLayer:
    kernel: InferenceSubstrate = ClassicalInferenceKernel()
    stabilizer: DistributionStabilizer = DistributionStabilizer()

    @property
    def substrate_id(self) -> str:
        return self.kernel.substrate_id

    def _view_for_substrate(self, view: ChannelView) -> ChannelView:
        """Attach execution-target provenance without changing logical identity."""
        if view.substrate_target == self.substrate_id:
            return view
        return replace(
            view,
            substrate_target=self.substrate_id,
            transformation_provenance={
                **dict(view.transformation_provenance),
                "substrate_target": self.substrate_id,
            },
        )

    @staticmethod
    def _diagnostics(distributions: Sequence[TruthDistribution]) -> Mapping[str, float]:
        resolved = tuple(distributions)
        if not resolved:
            raise ValueError("diagnostic bank cannot be empty")
        entropies = [distribution.entropy for distribution in resolved]
        agreements = [distribution.oracle_agreement for distribution in resolved]
        return {
            "view_count": float(len(resolved)),
            "entropy_spread": max(entropies) - min(entropies),
            "oracle_agreement_spread": max(agreements) - min(agreements),
        }

    @staticmethod
    def _reuse_equivalent_classical_distribution(
        distribution: TruthDistribution,
        view: ChannelView,
        *,
        reason: str,
    ) -> TruthDistribution:
        """Bind an exact classical distribution to an equivalent rotation view.

        The unbiased ClassicalInferenceKernel enumerates candidate states in
        canonical coordinates. ``position_map`` never changes those states or
        the logical dimension mapping, and ``OracleStack.score`` combines the
        same oracle set with order-independent multiplication/agreement.

        This optimization is intentionally restricted to the *exact* reference
        kernel type. Benchmark/fault-injection subclasses must execute every
        rotation so implementation bias remains observable.
        """
        return replace(
            distribution,
            provenance={
                **dict(distribution.provenance),
                "null_dimension_id": view.null_dimension_id,
                "transformation": dict(view.transformation_provenance),
                "equivalent_classical_rotation_reuse": True,
                "equivalent_classical_rotation_reason": reason,
            },
        )

    def _rotation_bank_from_distribution(
        self,
        family: str,
        views: Sequence[ChannelView],
        distribution: TruthDistribution,
        *,
        reason: str,
    ) -> RotationBankResult:
        resolved = tuple(self._view_for_substrate(view) for view in views)
        if not resolved:
            raise ValueError("rotation bank cannot be empty")
        distributions = tuple(
            self._reuse_equivalent_classical_distribution(distribution, view, reason=reason)
            for view in resolved
        )
        return RotationBankResult(
            family=family,
            views=resolved,
            distributions=distributions,
            diagnostics=self._diagnostics(distributions),
        )

    def _run_rotation_views(
        self,
        family: str,
        views: Sequence[ChannelView],
        oracle_stack: OracleStack,
    ) -> RotationBankResult:
        resolved = tuple(self._view_for_substrate(view) for view in views)
        if not resolved:
            raise ValueError("rotation bank cannot be empty")

        # Position-only and oracle-order-only rotations are exact invariances of
        # the unbiased reference kernel only. Diagnostic/fault-injection kernels
        # and every other substrate still execute each requested view.
        if type(self.kernel) is ClassicalInferenceKernel and family in {"position", "oracle_exposure"}:
            seed = self.kernel.run(resolved[0], oracle_stack)
            distributions = (seed,) + tuple(
                self._reuse_equivalent_classical_distribution(
                    seed,
                    view,
                    reason=f"{family}_is_exactly_invariant_in_classical_reference",
                )
                for view in resolved[1:]
            )
        else:
            distributions = tuple(self.kernel.run(view, oracle_stack) for view in resolved)

        return RotationBankResult(
            family=family,
            views=resolved,
            distributions=distributions,
            diagnostics=self._diagnostics(distributions),
        )

    def run_null_bank(self, bundle: BaseBundle, oracle_stack: OracleStack) -> NullBankResult:
        baseline_view = self._view_for_substrate(
            ChannelView.baseline(
                bundle,
                oracle_stack_version=oracle_stack.identity,
                oracle_ids=oracle_stack.oracle_ids,
            )
        )
        baseline_distribution = self.kernel.run(baseline_view, oracle_stack)
        null_views = tuple(
            self._view_for_substrate(
                ChannelView.null_dimension(
                    bundle,
                    index,
                    oracle_stack_version=oracle_stack.identity,
                    oracle_ids=oracle_stack.oracle_ids,
                )
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

    def run_stabilized_rotation_suite(
        self,
        bundle: BaseBundle,
        oracle_stack: OracleStack,
        *,
        include_positional: bool = True,
        include_oracle_exposure: bool = True,
        include_crossed: bool = False,
    ) -> StabilizedRotationSuiteResult:
        null_result = self.run_null_bank(bundle, oracle_stack)
        families: dict[str, RotationBankResult] = {
            "dimension_null": RotationBankResult(
                family="dimension_null",
                views=null_result.null_views,
                distributions=null_result.null_distributions,
                diagnostics=self._diagnostics(null_result.null_distributions),
            )
        }
        if include_positional:
            if type(self.kernel) is ClassicalInferenceKernel:
                families["position"] = self._rotation_bank_from_distribution(
                    "position",
                    positional_views(bundle, oracle_stack),
                    null_result.baseline_distribution,
                    reason="position_is_exactly_invariant_in_classical_reference",
                )
            else:
                families["position"] = self.run_positional_bank(bundle, oracle_stack)
        if include_oracle_exposure:
            if type(self.kernel) is ClassicalInferenceKernel:
                families["oracle_exposure"] = self._rotation_bank_from_distribution(
                    "oracle_exposure",
                    oracle_exposure_views(bundle, oracle_stack),
                    null_result.baseline_distribution,
                    reason="oracle_exposure_order_is_exactly_invariant_in_classical_reference",
                )
            else:
                families["oracle_exposure"] = self.run_oracle_exposure_bank(bundle, oracle_stack)
        if include_crossed:
            families["crossed"] = self.run_crossed_bank(bundle, oracle_stack)

        stabilized = self.stabilizer.stabilize_families(
            bundle,
            null_result.baseline_distribution,
            {
                name: tuple(zip(bank.views, bank.distributions))
                for name, bank in families.items()
            },
            oracle_stack_identity=oracle_stack.identity,
        )
        return StabilizedRotationSuiteResult(
            baseline_view=null_result.baseline_view,
            baseline_distribution=null_result.baseline_distribution,
            families=families,
            stabilized_return=stabilized,
        )
