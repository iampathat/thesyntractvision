from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Mapping, Sequence

from .parallel_syntracts import ParallelSyntractInput, ParallelSyntractResult, run_parallel_syntracts
from .problem import ProblemQuery, SemanticProblemFrame, SemanticRuleOracle
from .semantic import SemanticClaim
from .syntract_system import SyntractExecution, SyntractSystem


@dataclass(frozen=True)
class ComponentSpec:
    branch_id: str
    label: str
    subject: str
    predicate: str
    candidates: tuple[str, str]
    observed: str
    confidence: float


@dataclass(frozen=True)
class LinkSpec:
    link_id: str
    left_branch: str
    left_value: str
    right_branch: str
    right_value: str
    confidence: float
    description: str


@dataclass(frozen=True)
class DemoSpec:
    demo_id: str
    title: str
    subtitle: str
    components: tuple[ComponentSpec, ...]
    links: tuple[LinkSpec, ...]
    synthetic_notice: str


def _biomedicine() -> DemoSpec:
    return DemoSpec(
        demo_id="biomedicine",
        title="DNA + protein + cell + patient + drug",
        subtitle="Five independently inferred Syntracts enter QCDS in parallel and become one higher-order Syntract.",
        components=(
            ComponentSpec("dna", "DNA Syntract", "dna", "variant_signal", ("altered", "reference"), "altered", 0.78),
            ComponentSpec("protein", "Protein Syntract", "protein", "repair_signal", ("suppressed", "normal"), "suppressed", 0.68),
            ComponentSpec("cell", "Cell Syntract", "cell", "repair_state", ("impaired", "intact"), "impaired", 0.62),
            ComponentSpec("patient", "Patient Syntract", "patient", "response_state", ("responsive", "uncertain"), "uncertain", 0.58),
            ComponentSpec("drug", "Drug Syntract", "drug", "target_relation", ("matched", "mismatched"), "matched", 0.72),
        ),
        links=(
            LinkSpec("dna-protein", "dna", "altered", "protein", "suppressed", 0.90, "represented DNA alteration implies the represented protein suppression"),
            LinkSpec("protein-cell", "protein", "suppressed", "cell", "impaired", 0.90, "represented protein suppression implies impaired cellular repair"),
            LinkSpec("drug-patient", "drug", "matched", "patient", "responsive", 0.76, "represented target match supports the represented response state"),
            LinkSpec("cell-patient", "cell", "impaired", "patient", "responsive", 0.64, "represented cellular state contributes to the represented response state"),
        ),
        synthetic_notice="Synthetic capability demo only. It does not model a real patient, gene, drug, diagnosis or treatment decision.",
    )


def _investigation() -> DemoSpec:
    return DemoSpec(
        demo_id="investigation",
        title="person + phone data + car + camera + timeline + witness",
        subtitle="Six evidence-domain Syntracts stay separate until QCDS composes their distributions and explicit cross-links.",
        components=(
            ComponentSpec("person", "Person Syntract", "person", "location", ("east", "west"), "east", 0.58),
            ComponentSpec("phone", "Phone-data Syntract", "phone", "location", ("east", "west"), "east", 0.82),
            ComponentSpec("car", "Car Syntract", "car", "location", ("east", "west"), "west", 0.70),
            ComponentSpec("camera", "Camera Syntract", "camera", "vehicle_match", ("match", "no_match"), "match", 0.74),
            ComponentSpec("timeline", "Timeline Syntract", "timeline", "consistency", ("compatible", "incompatible"), "compatible", 0.66),
            ComponentSpec("witness", "Witness Syntract", "witness", "reported_location", ("east", "west"), "west", 0.61),
        ),
        links=(
            LinkSpec("phone-person", "phone", "east", "person", "east", 0.88, "represented phone location supports person-east"),
            LinkSpec("witness-person", "witness", "west", "person", "west", 0.68, "represented witness account supports person-west"),
            LinkSpec("camera-car", "camera", "match", "car", "east", 0.72, "represented camera match links the car to east"),
            LinkSpec("person-timeline", "person", "east", "timeline", "compatible", 0.80, "person-east is compatible with the represented timeline"),
        ),
        synthetic_notice="Synthetic investigation demo. Inputs are invented and are not allegations or facts about a real person.",
    )


def _robotics() -> DemoSpec:
    return DemoSpec(
        demo_id="robotics",
        title="robot + environment + mission + safety rules + people",
        subtitle="Robot state, world state, mission, safety and humans become parallel Syntract inputs to one QCDS decision space.",
        components=(
            ComponentSpec("robot", "Robot Syntract", "robot", "traction", ("stable", "unstable"), "stable", 0.72),
            ComponentSpec("environment", "Environment Syntract", "environment", "surface", ("dry", "slippery"), "slippery", 0.76),
            ComponentSpec("mission", "Mission Syntract", "mission", "route", ("route_a", "route_b"), "route_a", 0.60),
            ComponentSpec("safety", "Safety-rule Syntract", "safety", "permission", ("clear", "block"), "clear", 0.58),
            ComponentSpec("people", "People Syntract", "people", "zone", ("clear", "occupied"), "occupied", 0.80),
        ),
        links=(
            LinkSpec("surface-traction", "environment", "slippery", "robot", "unstable", 0.90, "slippery surface implies elevated traction instability in the represented logic"),
            LinkSpec("people-safety", "people", "occupied", "safety", "block", 0.97, "occupied human zone implies safety block"),
            LinkSpec("safety-route", "safety", "block", "mission", "route_b", 0.96, "safety block redirects the represented mission to route B"),
            LinkSpec("traction-route", "robot", "unstable", "mission", "route_b", 0.82, "unstable traction supports the alternate route"),
        ),
        synthetic_notice="Synthetic robotics demo. The browser result is an inference demonstration, not authorization for physical actuation.",
    )


DEMO_SPECS: Mapping[str, DemoSpec] = {
    "biomedicine": _biomedicine(),
    "investigation": _investigation(),
    "robotics": _robotics(),
}


def _component_frame(spec: ComponentSpec, demo_id: str) -> SemanticProblemFrame:
    query_id = f"q:{spec.branch_id}"
    return SemanticProblemFrame(
        mission_id=f"parallel-demo:{demo_id}:{spec.branch_id}",
        raw_text=f"Synthetic represented {spec.label} input",
        queries=(ProblemQuery(query_id, spec.subject, spec.predicate, spec.candidates),),
        claims=(SemanticClaim(spec.subject, spec.predicate, spec.observed, f"demo:{demo_id}:{spec.branch_id}", spec.confidence),),
        analyzer_id="synthetic-parallel-syntract-demo",
        provenance={"synthetic_demo": True, "branch_id": spec.branch_id},
    )


def _candidate_dimension(execution: SyntractExecution, query_id: str, value: str) -> str:
    group = execution.compilation.query_groups[query_id]
    values = execution.compilation.group_values[group]
    dims = execution.compilation.group_dimensions[group]
    return dims[values.index(value)]


def _cross_oracles(
    spec: DemoSpec,
    executions: Mapping[str, SyntractExecution],
) -> tuple[SemanticRuleOracle, ...]:
    out = []
    for link in spec.links:
        left_query = f"q:{link.left_branch}"
        right_query = f"q:{link.right_branch}"
        left = _candidate_dimension(executions[link.left_branch], left_query, link.left_value)
        right = _candidate_dimension(executions[link.right_branch], right_query, link.right_value)
        out.append(SemanticRuleOracle(
            oracle_id=f"parallel-link:{spec.demo_id}:{link.link_id}",
            antecedent_dimension=f"{link.left_branch}::{left}",
            consequent_dimension=f"{link.right_branch}::{right}",
            kind="implies",
            relation_class="logical",
            confidence=link.confidence,
            source_id=f"demo-link:{link.link_id}",
        ))
    return tuple(out)


def _decode_top_world(
    spec: DemoSpec,
    executions: Mapping[str, SyntractExecution],
    result: ParallelSyntractResult,
) -> dict[str, str]:
    if not result.truth_distribution.top_k:
        return {}
    top = result.truth_distribution.top_k[0]
    index = {dimension_id: i for i, dimension_id in enumerate(result.joint_bundle.dimension_ids)}
    decoded: dict[str, str] = {}
    for component in spec.components:
        execution = executions[component.branch_id]
        query_id = f"q:{component.branch_id}"
        group = execution.compilation.query_groups[query_id]
        values = execution.compilation.group_values[group]
        dims = execution.compilation.group_dimensions[group]
        for value, dim in zip(values, dims):
            if top[index[f"{component.branch_id}::{dim}"]] == 1:
                decoded[component.label] = value
                break
    return decoded


def run_syntract_demo(demo_id: str) -> dict[str, object]:
    try:
        spec = DEMO_SPECS[demo_id]
    except KeyError as exc:
        raise ValueError(f"unknown Syntract parallel demo {demo_id!r}") from exc

    system = SyntractSystem(max_width=20, default_universe_id=f"demo:{demo_id}")
    executions: dict[str, SyntractExecution] = {}
    inputs: list[ParallelSyntractInput] = []
    component_rows: list[dict[str, object]] = []

    for component in spec.components:
        execution = system.run_frame(_component_frame(component, spec.demo_id))
        executions[component.branch_id] = execution
        query_id = f"q:{component.branch_id}"
        leaders = execution.inference.leading_candidates(query_id)
        inputs.append(ParallelSyntractInput(
            branch_id=component.branch_id,
            syntract=execution.syntract,
            dimension_ids=execution.compilation.bundle.dimension_ids,
            label=component.label,
            provenance={"demo_id": demo_id},
        ))
        component_rows.append({
            "branch_id": component.branch_id,
            "label": component.label,
            "syntract_id": execution.syntract.syntract_id,
            "leading_candidates": leaders,
            "logical_width": execution.logical_width,
            "input_observation": component.observed,
            "input_confidence": component.confidence,
        })

    links = _cross_oracles(spec, executions)
    result = run_parallel_syntracts(
        tuple(inputs),
        composition_id=f"demo:{demo_id}",
        cross_oracles=links,
        fabric_layer=system.fabric_layer,
        central_fabric=system.central_fabric,
        max_joint_width=16,
        syntract_id=f"syntract:demo:{demo_id}:higher-order",
    )

    top_probability = 0.0
    if result.truth_distribution.top_k:
        top_state = result.truth_distribution.top_k[0]
        top_probability = result.truth_distribution.probabilities[result.truth_distribution.support.index(top_state)]

    return {
        "demo_id": demo_id,
        "title": spec.title,
        "subtitle": spec.subtitle,
        "synthetic_notice": spec.synthetic_notice,
        "components": component_rows,
        "links": [
            {"id": link.link_id, "description": link.description, "confidence": link.confidence}
            for link in spec.links
        ],
        "parallel_branch_count": len(result.branch_runs),
        "joint_logical_width": result.joint_bundle.width,
        "candidate_binary_space": f"2^{result.joint_bundle.width}",
        "joint_oracle_count": len(result.joint_oracle_stack.oracles),
        "higher_order_syntract_id": result.syntract.syntract_id,
        "top_world": _decode_top_world(spec, executions, result),
        "top_world_probability_mass": top_probability,
        "entropy": result.truth_distribution.entropy,
        "contradictions": result.truth_distribution.contradiction_markers,
        "execution_path": (
            "component material → component QCDS → component Syntracts → parallel QCDS branches → "
            "complete branch TruthDistributions → joint Logical Space + explicit cross-oracles → QCDS → higher-order Syntract"
        ),
        "hard_collapse": False,
        "majority_vote": False,
        "new_inference_engine": False,
        "external_truth_claim": False,
    }


def run_syntract_demo_json(payload_json: str) -> str:
    payload = json.loads(payload_json)
    return json.dumps(run_syntract_demo(str(payload.get("demo_id", ""))), ensure_ascii=False, sort_keys=True)


__all__ = ["DEMO_SPECS", "run_syntract_demo", "run_syntract_demo_json"]
