"""QCDS Fabric 4.2 rotational research implementation.

Architecture and theory: Patrik Sundblom.
Implementation assistance: ChatGPT.
"""

from .adaptive import AdaptiveRotationPlanner, ExclusionRequest
from .bind import RotationalSyntractBind, lift_lane_distribution
from .engine import Fabric42CellEngine
from .grover import iteration_envelope, peak_iteration_count, run_grover
from .nisq import NISQRotationScheduler, PhysicalMapping, attribute_bias
from .oracle import OracleClause, SemanticOracle
from .parent import ParentInferenceEngine
from .recursive import RecursiveFabric42
from .rotation import RotationalIngressCell, RotationScheduler
from .stability import StabilityEngine
from .topology import EmulatedFabricScheduler, TopologyPlan, canonical_512x12_plan

__all__ = [
    "AdaptiveRotationPlanner",
    "EmulatedFabricScheduler",
    "ExclusionRequest",
    "Fabric42CellEngine",
    "NISQRotationScheduler",
    "OracleClause",
    "ParentInferenceEngine",
    "PhysicalMapping",
    "RecursiveFabric42",
    "RotationScheduler",
    "RotationalIngressCell",
    "RotationalSyntractBind",
    "SemanticOracle",
    "StabilityEngine",
    "TopologyPlan",
    "attribute_bias",
    "canonical_512x12_plan",
    "iteration_envelope",
    "lift_lane_distribution",
    "peak_iteration_count",
    "run_grover",
]
