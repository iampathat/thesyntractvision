"""QCDS Fabric v1.0 reference implementation.

The canonical architecture is authored by Patrik Sundblom. This package is a
software implementation and does not modify the locked QCDS Fabric v1.0 spec.
"""

from .accounting import LogicalSpaceAccounting, logical_space_accounting
from .engine import (
    ConvergenceConfig,
    ConvergenceSnapshot,
    RecursiveCycleTrace,
    RecursiveFabricEngine,
    RecursiveFabricResult,
    RecursiveFabricTrace,
    automatic_contraction_widths,
    compare_truth_distributions,
)
from .fabric import FabricLayer, NullBankResult, RotationBankResult, StabilizedRotationSuiteResult
from .funnel import BoundCondition, FunnelLayerResult, FunnelTrace, funnel_step, recursive_contraction_funnel
from .kernel import ClassicalInferenceKernel
from .models import BaseBundle, ChannelView, StabilizedReturn, Syntract, TruthDistribution
from .oracles import DistributionOracle, ExactOracle, MaskOracle, OracleStack
from .reentry import ReentryCompilation, ReentryResult, baseline_reentry_distribution, compile_bound_condition, run_bound_condition_reentry
from .rotations import circular_oracle_maps, circular_position_maps, crossed_views, oracle_exposure_views, positional_views
from .stabilize import DistributionStabilizer

__all__ = [
    "BaseBundle",
    "ChannelView",
    "TruthDistribution",
    "StabilizedReturn",
    "Syntract",
    "ExactOracle",
    "MaskOracle",
    "DistributionOracle",
    "OracleStack",
    "ClassicalInferenceKernel",
    "DistributionStabilizer",
    "FabricLayer",
    "NullBankResult",
    "RotationBankResult",
    "StabilizedRotationSuiteResult",
    "BoundCondition",
    "FunnelLayerResult",
    "FunnelTrace",
    "funnel_step",
    "recursive_contraction_funnel",
    "ReentryCompilation",
    "ReentryResult",
    "compile_bound_condition",
    "run_bound_condition_reentry",
    "baseline_reentry_distribution",
    "ConvergenceConfig",
    "ConvergenceSnapshot",
    "RecursiveCycleTrace",
    "RecursiveFabricTrace",
    "RecursiveFabricResult",
    "RecursiveFabricEngine",
    "automatic_contraction_widths",
    "compare_truth_distributions",
    "LogicalSpaceAccounting",
    "logical_space_accounting",
    "circular_position_maps",
    "circular_oracle_maps",
    "positional_views",
    "oracle_exposure_views",
    "crossed_views",
]
