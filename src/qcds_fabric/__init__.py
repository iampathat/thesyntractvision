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
from .evidence_planning import (
    ContinuationPolicy, DisagreementEvidencePlanner, EvidenceAcquisitionPlanner,
    EvidenceAcquisitionResult, EvidenceAction, EvidenceNeed, EvidencePlan,
    EvidencePlanningConfig, EvidencePlanningCycleResult, EvidencePlanningError,
    IntelligenceCheckpoint, apply_evidence_results,
    resume_evidence_planning_cycle, run_evidence_planning_cycle,
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
from .logical_robot import (
    LOGICAL_CAPABILITIES, LogicalObservation, LogicalRobotAttempt,
    LogicalRobotCycleResult, LogicalRobotError, LogicalRobotPolicy,
    LogicalRobotRequest, LogicalRobotRunResult, LogicalRobotTool,
    LogicalRobotToolResult, capability_sequence, execute_logical_robot_plans,
    observation_to_evidence, run_logical_robot_cycle,
)
from .models import BaseBundle, ChannelView, StabilizedReturn, Syntract, TruthDistribution
from .oracle_evolution import (
    OracleCaseEvaluation, OracleChallengeCase, OracleChallengeSuite,
    OracleEvolutionConfig, OracleEvolutionError, OracleEvolutionGeneration,
    OracleEvolutionResult, OracleHypothesis, OracleHypothesisEvaluation,
    OracleLineageRecord, OraclePopulationSnapshot, OracleProposalGenerator,
    OracleRetirementGenerator, SemanticRuleMutationGenerator,
    apply_evolved_oracle_population, challenge_case_from_problem,
    evaluate_oracle_hypothesis, evolve_oracle_population,
    extract_problem_rule_population, target_distribution_for_problem_assignments,
)
from .oracle_genesis import (
    DiscoveredGapProposalGenerator, OracleFailureObservation, OracleGap,
    OracleGapDiscovery, OracleGapDiscoveryConfig, OracleGapSignal,
    OracleGenesisError, OracleGenesisGenerator, OracleGenesisResult,
    PairwiseSemanticRuleGenesisGenerator, discover_oracle_gaps,
    run_oracle_genesis_cycle,
)
from .oracles import DistributionOracle, ExactOracle, MaskOracle, OracleStack
from .problem import (
    OntologyMap, ProblemCompilation, ProblemInferenceResult, ProblemQuery,
    ProblemResult, SemanticAtom, SemanticEntity, SemanticProblemAdapter,
    SemanticProblemFrame, SemanticRelation, SemanticRule, SemanticRuleOracle,
    bind_problem_result, canonicalize_problem_frame, compile_problem_frame,
    problem_to_syntract, run_problem_compilation, run_problem_text,
)
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
    "run_human_problem", "SemanticEntity", "ProblemQuery", "SemanticRelation",
    "SemanticAtom", "SemanticRule", "OntologyMap", "SemanticProblemFrame",
    "SemanticProblemAdapter", "SemanticRuleOracle", "ProblemCompilation",
    "ProblemInferenceResult", "ProblemResult", "canonicalize_problem_frame",
    "compile_problem_frame", "run_problem_compilation", "bind_problem_result",
    "problem_to_syntract", "run_problem_text", "OracleEvolutionError",
    "OracleChallengeCase", "OracleChallengeSuite", "OracleHypothesis",
    "OracleProposalGenerator", "SemanticRuleMutationGenerator",
    "OracleRetirementGenerator", "OracleEvolutionConfig", "OracleCaseEvaluation",
    "OracleHypothesisEvaluation", "OracleLineageRecord", "OracleEvolutionGeneration",
    "OracleEvolutionResult", "OraclePopulationSnapshot", "evaluate_oracle_hypothesis",
    "evolve_oracle_population", "extract_problem_rule_population",
    "apply_evolved_oracle_population", "target_distribution_for_problem_assignments",
    "challenge_case_from_problem", "OracleGenesisError", "OracleFailureObservation",
    "OracleGapSignal", "OracleGap", "OracleGapDiscoveryConfig", "OracleGapDiscovery",
    "OracleGenesisGenerator", "PairwiseSemanticRuleGenesisGenerator",
    "DiscoveredGapProposalGenerator", "OracleGenesisResult", "discover_oracle_gaps",
    "run_oracle_genesis_cycle", "EvidencePlanningError", "EvidencePlanningConfig",
    "EvidenceNeed", "EvidenceAction", "EvidencePlan", "EvidenceAcquisitionPlanner",
    "DisagreementEvidencePlanner", "ContinuationPolicy", "IntelligenceCheckpoint",
    "EvidenceAcquisitionResult", "EvidencePlanningCycleResult", "apply_evidence_results",
    "run_evidence_planning_cycle", "resume_evidence_planning_cycle",
    "LOGICAL_CAPABILITIES", "LogicalRobotError", "LogicalRobotPolicy",
    "LogicalRobotRequest", "LogicalObservation", "LogicalRobotToolResult",
    "LogicalRobotTool", "LogicalRobotAttempt", "LogicalRobotRunResult",
    "LogicalRobotCycleResult", "capability_sequence", "observation_to_evidence",
    "execute_logical_robot_plans", "run_logical_robot_cycle",
    "DistributionStabilizer", "FabricLayer", "NullBankResult", "RotationBankResult",
    "StabilizedRotationSuiteResult", "BoundCondition", "FunnelLayerResult",
    "FunnelTrace", "funnel_step", "recursive_contraction_funnel",
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
