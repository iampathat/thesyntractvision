"""QCDS Fabric v1.0 reference implementation.

The canonical architecture is authored by Patrik Sundblom. This package is a
software implementation and does not modify the locked QCDS Fabric v1.0 spec.
"""

from .accounting import LogicalSpaceAccounting, logical_space_accounting
from .benchmark import (
    DEFAULT_ABLATIONS, AblationResult, AblationVariant, BenchmarkMetrics,
    BenchmarkReport, ContradictionProbe, InjectedBiasKernel, OracleAblationReport,
    OracleExposureBias, OracleLeaveOneOutResult, SlotBias, evaluate_against_target,
    max_pairwise_l1, probe_contradictions, rank_dimension_influence,
    run_ablation_benchmark, run_oracle_leave_one_out,
)
from .engine import (
    ConvergenceConfig, ConvergenceSnapshot, RecursiveCycleTrace,
    RecursiveFabricEngine, RecursiveFabricResult, RecursiveFabricTrace,
    automatic_contraction_widths, compare_truth_distributions,
)
from .expansion import (
    ExpansionCompilation, ExpansionContractionResult, ExpansionCycleResult,
    ExpansionResult, ExpansionSpec, compile_syntract_expansion,
    contract_expansion, project_truth_distribution, run_expansion_cycle,
    run_syntract_expansion,
)
from .fabric import FabricLayer, NullBankResult, RotationBankResult, StabilizedRotationSuiteResult
from .funnel import BoundCondition, FunnelLayerResult, FunnelTrace, funnel_step, recursive_contraction_funnel
from .grover_depth import (
    AdaptiveGroverSubstrate, FixedGroverDepthBenchmarkResult,
    GroverDepthBenchmarkReport, GroverDepthConfig, GroverDepthSelection,
    GroverDepthTrial, expected_normalized_oracle_score, ideal_binary_grover_m_star,
    run_grover_depth_benchmark, select_grover_depth,
)
from .kernel import ClassicalInferenceKernel
from .models import BaseBundle, ChannelView, StabilizedReturn, Syntract, TruthDistribution
from .oracles import DistributionOracle, ExactOracle, MaskOracle, OracleStack
from .reentry import ReentryCompilation, ReentryResult, baseline_reentry_distribution, compile_bound_condition, run_bound_condition_reentry
from .rotations import circular_oracle_maps, circular_position_maps, crossed_views, oracle_exposure_views, positional_views
from .semantic import (
    CandidateProbability, EvidenceOracle, HumanProblemResult, OneHotOracle,
    SemanticAnalyzer, SemanticClaim, SemanticCompilation, SemanticCompileError,
    SemanticFrame, SemanticInferenceResult, SemanticQuery, bind_semantic_result,
    compile_semantic_frame, run_semantic_compilation,
)
from .semantic_ingress import ControlledEnglishAnalyzer, human_to_logic, run_human_problem
from .stabilize import DistributionStabilizer
from .substrate_benchmark import (
    DEFAULT_SUBSTRATES, SubstrateBenchmarkReport, SubstrateBenchmarkResult,
    SubstrateVariant, run_substrate_benchmark,
)
from .substrates import InferenceSubstrate, StatevectorGroverSubstrate

__all__ = [
    "BaseBundle", "ChannelView", "TruthDistribution", "StabilizedReturn", "Syntract",
    "ExactOracle", "MaskOracle", "DistributionOracle", "OracleStack",
    "InferenceSubstrate", "ClassicalInferenceKernel", "StatevectorGroverSubstrate",
    "AdaptiveGroverSubstrate", "GroverDepthConfig", "GroverDepthTrial",
    "GroverDepthSelection", "FixedGroverDepthBenchmarkResult",
    "GroverDepthBenchmarkReport", "expected_normalized_oracle_score",
    "ideal_binary_grover_m_star", "select_grover_depth", "run_grover_depth_benchmark",
    "ExpansionSpec", "ExpansionCompilation", "ExpansionResult",
    "ExpansionContractionResult", "ExpansionCycleResult", "compile_syntract_expansion",
    "project_truth_distribution", "run_syntract_expansion", "contract_expansion",
    "run_expansion_cycle", "SemanticQuery", "SemanticClaim", "SemanticFrame",
    "SemanticAnalyzer", "ControlledEnglishAnalyzer", "EvidenceOracle", "OneHotOracle",
    "SemanticCompilation", "CandidateProbability", "SemanticInferenceResult",
    "HumanProblemResult", "SemanticCompileError", "compile_semantic_frame",
    "human_to_logic", "run_semantic_compilation", "bind_semantic_result",
    "run_human_problem", "DistributionStabilizer", "FabricLayer", "NullBankResult",
    "RotationBankResult", "StabilizedRotationSuiteResult", "BoundCondition",
    "FunnelLayerResult", "FunnelTrace", "funnel_step", "recursive_contraction_funnel",
    "ReentryCompilation", "ReentryResult", "compile_bound_condition",
    "run_bound_condition_reentry", "baseline_reentry_distribution",
    "ConvergenceConfig", "ConvergenceSnapshot", "RecursiveCycleTrace",
    "RecursiveFabricTrace", "RecursiveFabricResult", "RecursiveFabricEngine",
    "automatic_contraction_widths", "compare_truth_distributions", "SlotBias",
    "OracleExposureBias", "InjectedBiasKernel", "BenchmarkMetrics", "AblationVariant",
    "AblationResult", "BenchmarkReport", "ContradictionProbe",
    "OracleLeaveOneOutResult", "OracleAblationReport", "DEFAULT_ABLATIONS",
    "evaluate_against_target", "max_pairwise_l1", "run_ablation_benchmark",
    "probe_contradictions", "rank_dimension_influence", "run_oracle_leave_one_out",
    "SubstrateVariant", "SubstrateBenchmarkResult", "SubstrateBenchmarkReport",
    "DEFAULT_SUBSTRATES", "run_substrate_benchmark", "LogicalSpaceAccounting",
    "logical_space_accounting", "circular_position_maps", "circular_oracle_maps",
    "positional_views", "oracle_exposure_views", "crossed_views",
]
