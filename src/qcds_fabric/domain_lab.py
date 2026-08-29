from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping

from .logical_space import LogicalBinding
from .logical_universe import CsvLogicalUniverseStore, LogicalUniverse


@dataclass(frozen=True)
class DomainObservation:
    binding_id: str
    terms: tuple[str, ...]
    source_id: str
    confidence: float = 1.0


@dataclass(frozen=True)
class DomainLabPack:
    domain_id: str
    title: str
    tagline: str
    audience: str
    universe_mode: str
    description: str
    challenge: str
    learning_target: str
    explore_prompt: str
    observations: tuple[DomainObservation, ...]
    authority: str = ""
    provenance: Mapping[str, Any] = field(default_factory=dict)

    @property
    def universe_id(self) -> str:
        return f"domain-lab-{self.domain_id}"

    def as_dict(self, *, include_observations: bool = False) -> dict[str, Any]:
        value: dict[str, Any] = {
            "domain_id": self.domain_id,
            "title": self.title,
            "tagline": self.tagline,
            "audience": self.audience,
            "universe_id": self.universe_id,
            "universe_mode": self.universe_mode,
            "description": self.description,
            "challenge": self.challenge,
            "learning_target": self.learning_target,
            "explore_prompt": self.explore_prompt,
            "starter_observation_count": len(self.observations),
            "starter_rule_count": 0,
            "provenance": dict(self.provenance),
        }
        if include_observations:
            value["observations"] = [
                {
                    "binding_id": item.binding_id,
                    "terms": list(item.terms),
                    "source_id": item.source_id,
                    "confidence": item.confidence,
                }
                for item in self.observations
            ]
        return value


def _obs(prefix: str, rows: tuple[tuple[str, ...], ...]) -> tuple[DomainObservation, ...]:
    return tuple(
        DomainObservation(f"{prefix}-{index:03d}", tuple(terms), f"synthetic:{prefix}:{index:03d}")
        for index, terms in enumerate(rows, start=1)
    )


def builtin_domain_packs() -> tuple[DomainLabPack, ...]:
    common = {
        "starter_data_is_synthetic": True,
        "external_truth_claim": False,
        "fixed_ontology_required": False,
        "solution_rule_supplied": False,
        "same_logical_robot": True,
    }
    return (
        DomainLabPack(
            "materials",
            "Materials",
            "Composition, process, structure and properties in one open logical space.",
            "Materials scientists · chemists · process engineers",
            "simulation",
            "A synthetic materials lab where composition, thermal history, structure and measured properties coexist as independent logical terms. No hierarchy such as material → phase → property is required.",
            "Which represented conditions are actually load-bearing for high conductivity in unseen samples, and which apparent correlations collapse under challenge?",
            "The robot leaves the lab able to resolve a held-out material property it could not resolve before, using a reusable rule that survived rival-hypothesis challenge.",
            "Explore material composition, thermal processing, microstructure and conductivity; look for competing explanations and observations that would distinguish them.",
            _obs("materials", (
                ("sample-m1", "alloy-a", "annealed", "high-temperature", "fine-grain", "conductivity-high"),
                ("sample-m2", "alloy-a", "annealed", "medium-temperature", "fine-grain", "conductivity-high"),
                ("sample-m3", "alloy-a", "quenched", "high-temperature", "coarse-grain", "conductivity-low"),
                ("sample-m4", "alloy-b", "annealed", "high-temperature", "fine-grain", "conductivity-medium"),
                ("sample-m5", "alloy-b", "quenched", "medium-temperature", "coarse-grain", "conductivity-low"),
                ("sample-m6", "alloy-c", "annealed", "low-temperature", "fine-grain", "conductivity-medium"),
            )),
            provenance=common,
        ),
        DomainLabPack(
            "biology",
            "Biology",
            "Genes, cells, environment and phenotype without forcing a tree.",
            "Biologists · bioinformaticians · drug-discovery researchers",
            "simulation",
            "A synthetic cell-response space. Gene state, protein signal, cell context, environment and phenotype are peers in the logical space rather than levels in a taxonomy.",
            "Which combinations remain predictive of the response phenotype on held-out cell contexts, and which candidate biological explanations fail?",
            "A challenged rule generalizes to an unseen synthetic cell observation and creates a new resolved phenotype without the target rule being supplied.",
            "Explore gene state, protein signalling, cell context, environment and phenotype; identify discriminating observations for rival explanations.",
            _obs("biology", (
                ("cell-b1", "gene-g1-high", "signal-s1-on", "nutrient-rich", "response-r1"),
                ("cell-b2", "gene-g1-high", "signal-s1-on", "nutrient-low", "response-r1"),
                ("cell-b3", "gene-g1-low", "signal-s1-on", "nutrient-rich", "response-r2"),
                ("cell-b4", "gene-g1-high", "signal-s1-off", "nutrient-rich", "response-r2"),
                ("cell-b5", "gene-g2-high", "signal-s1-on", "nutrient-rich", "response-r2"),
                ("cell-b6", "gene-g1-high", "signal-s1-on", "stress-high", "response-r1"),
            )),
            provenance=common,
        ),
        DomainLabPack(
            "robotics",
            "Robotics",
            "Observe → infer → act → observe again.",
            "Roboticists · control engineers · embodied-AI researchers",
            "simulation",
            "A synthetic embodied loop where sensor state, environment, action and consequence coexist in the same logical space. The physical robot would be this same Logical Robot with a physical body attached.",
            "Which sensor/context conditions actually determine whether an action is safe and effective, and what should the robot observe next when rival action models disagree?",
            "The robot derives an action-relevant rule that improves an unseen simulated decision and can explain which observation made the rival policies diverge.",
            "Explore sensor state, environment, actions and outcomes; ask which next observation best separates competing action hypotheses.",
            _obs("robotics", (
                ("scene-r1", "surface-dry", "range-clear", "speed-low", "action-forward", "outcome-safe"),
                ("scene-r2", "surface-dry", "range-clear", "speed-medium", "action-forward", "outcome-safe"),
                ("scene-r3", "surface-wet", "range-clear", "speed-medium", "action-forward", "outcome-unstable"),
                ("scene-r4", "surface-wet", "range-short", "speed-low", "action-stop", "outcome-safe"),
                ("scene-r5", "surface-dry", "range-short", "speed-medium", "action-forward", "outcome-risk"),
                ("scene-r6", "surface-wet", "range-clear", "speed-low", "action-forward", "outcome-safe"),
            )),
            provenance=common,
        ),
        DomainLabPack(
            "software",
            "Software",
            "Code, tests, runtime observations and invariants as falsifiable logic.",
            "Software engineers · formal-methods researchers · maintainers",
            "simulation",
            "A synthetic debugging space where input shape, runtime state, dependency state, test outcome and failure mode are represented together. Passing/failing tests provide unusually crisp falsification signals.",
            "What reusable invariant explains the failure across unseen executions rather than merely fitting one stack trace?",
            "The robot discovers a testable invariant or failure condition that predicts a held-out execution and rejects at least one plausible but wrong cause.",
            "Explore test failures, runtime state, dependency state and inputs; search for invariants that survive held-out executions.",
            _obs("software", (
                ("run-s1", "input-small", "cache-warm", "dependency-v2", "test-pass"),
                ("run-s2", "input-large", "cache-warm", "dependency-v2", "test-pass"),
                ("run-s3", "input-large", "cache-cold", "dependency-v2", "test-fail", "failure-timeout"),
                ("run-s4", "input-small", "cache-cold", "dependency-v2", "test-pass"),
                ("run-s5", "input-large", "cache-cold", "dependency-v1", "test-fail", "failure-timeout"),
                ("run-s6", "input-medium", "cache-cold", "dependency-v2", "test-pass"),
            )),
            provenance=common,
        ),
        DomainLabPack(
            "physics",
            "Physics / Quantum",
            "States, controls, measurements and constraints in a flat logical space.",
            "Physicists · quantum researchers · experimentalists",
            "simulation",
            "A synthetic measurement lab. Preparation, control setting, environment and observed outcome coexist without claiming that the tiny classical pack models a physical QPU.",
            "Which represented control/context relation survives held-out measurements, and which additional measurement would maximally distinguish remaining hypotheses?",
            "The robot identifies a reusable relation that predicts unseen synthetic measurements, while keeping encoding, measurement and substrate claims explicit.",
            "Explore preparation, controls, measurement settings and outcomes; identify rival physical explanations and the next discriminating experiment.",
            _obs("physics", (
                ("trial-p1", "prep-a", "control-x", "field-low", "measurement-0"),
                ("trial-p2", "prep-a", "control-x", "field-medium", "measurement-0"),
                ("trial-p3", "prep-a", "control-y", "field-low", "measurement-1"),
                ("trial-p4", "prep-b", "control-x", "field-low", "measurement-1"),
                ("trial-p5", "prep-b", "control-y", "field-medium", "measurement-0"),
                ("trial-p6", "prep-a", "control-y", "field-medium", "measurement-1"),
            )),
            provenance={**common, "quantum_advantage_claim": False, "physical_qpu_claim": False},
        ),
        DomainLabPack(
            "law",
            "Law / Rules",
            "Declared rules, situations and consequences with epistemic identity preserved.",
            "Legal technologists · policy researchers · rule-system designers",
            "declared",
            "A fictional declared rulebook universe. Its rules can be constitutive inside the lab without being presented as external-world legal truth. This makes declared-vs-observed epistemics visible.",
            "Can the robot derive the consequences of a fictional rulebook across edge cases while preserving which statements are declared rules versus observed facts?",
            "The robot resolves a new case from declared logic, exposes conflicts or missing exceptions, and never relabels the fictional rulebook as real-world law.",
            "Explore a fictional rule system, exceptions, situations and consequences; look for ambiguous or conflicting cases that need new discriminating rules.",
            _obs("law", (
                ("case-l1", "permit-present", "age-adult", "zone-a", "action-allowed"),
                ("case-l2", "permit-absent", "age-adult", "zone-a", "action-denied"),
                ("case-l3", "permit-present", "age-minor", "zone-a", "action-denied"),
                ("case-l4", "permit-present", "age-adult", "zone-b", "exception-emergency", "action-allowed"),
                ("case-l5", "permit-absent", "age-adult", "zone-b", "action-denied"),
                ("case-l6", "permit-present", "age-adult", "zone-b", "action-allowed"),
            )),
            authority="fictional-domain-lab-rulebook",
            provenance={**common, "declared_not_external_truth": True},
        ),
    )


@dataclass
class DomainLabService:
    root: Path

    def __init__(self, root: str | Path = "./intelligence_store") -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.universes = CsvLogicalUniverseStore(self.root)

    def packs(self) -> tuple[DomainLabPack, ...]:
        return builtin_domain_packs()

    def get(self, domain_id: str) -> DomainLabPack:
        wanted = str(domain_id).strip().lower()
        match = next((item for item in self.packs() if item.domain_id == wanted), None)
        if match is None:
            raise ValueError(f"unknown domain lab: {domain_id}")
        return match

    def catalog(self) -> dict[str, Any]:
        return {
            "title": "Logical Robot Domain Lab",
            "same_logical_robot": True,
            "packs": [item.as_dict() for item in self.packs()],
            "truth_boundary": {
                "starter_data_is_synthetic_or_declared": True,
                "starter_rules_supplied": 0,
                "reality_modified_by_starting_lab": False,
            },
        }

    def start(self, domain_id: str) -> dict[str, Any]:
        pack = self.get(domain_id)
        existing = self.universes.get(pack.universe_id)
        created = False
        if existing is None:
            self.universes.create(LogicalUniverse(
                universe_id=pack.universe_id,
                mode=pack.universe_mode,
                description=pack.description,
                authority=pack.authority,
                provenance={
                    "domain_lab": pack.domain_id,
                    "starter_pack": True,
                    "external_truth_claim": False,
                    "solution_rule_supplied": False,
                },
            ))
            created = True
        space = self.universes.space(pack.universe_id)
        added = space.append([
            LogicalBinding(
                item.binding_id,
                item.terms,
                item.source_id,
                item.confidence,
                provenance={
                    "domain_lab": pack.domain_id,
                    "starter_observation": True,
                    "external_truth_claim": False,
                },
            )
            for item in pack.observations
        ])
        return {
            "domain_id": pack.domain_id,
            "universe_id": pack.universe_id,
            "universe_mode": pack.universe_mode,
            "created": created,
            "added_observations": added,
            "base_binding_count": len(space.bindings()),
            "active_rule_count": len(self.universes.rules(pack.universe_id).rules(active_only=True)),
            "challenge": pack.challenge,
            "learning_target": pack.learning_target,
            "truth_effect_on_reality": 0,
            "solution_rule_supplied": False,
        }
