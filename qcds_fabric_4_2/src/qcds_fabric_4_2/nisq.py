from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from statistics import mean

from .types import BiasAttribution, MappingObservation


@dataclass(frozen=True)
class PhysicalMapping:
    mapping_id: str
    semantic_to_physical: dict[str, str]


class NISQRotationScheduler:
    """4.2H logical/physical mapping abstraction."""

    def mappings(self, dimensions: tuple[str, ...], *, banks: int | None = None) -> tuple[PhysicalMapping, ...]:
        n = len(dimensions)
        if n < 2:
            raise ValueError("Need at least two dimensions")
        count = banks or n
        physical = tuple(f"q{i}" for i in range(n))
        out: list[PhysicalMapping] = []
        for bank in range(count):
            shift = bank % n
            rotated = physical[shift:] + physical[:shift]
            out.append(
                PhysicalMapping(
                    mapping_id=f"map-{bank}",
                    semantic_to_physical=dict(zip(dimensions, rotated, strict=True)),
                )
            )
        return tuple(out)


def _group_mean_range(observations: tuple[MappingObservation, ...], key: str) -> float:
    groups: dict[str, list[float]] = defaultdict(list)
    for obs in observations:
        groups[getattr(obs, key)].append(obs.drift)
    means = [mean(values) for values in groups.values()]
    return max(means) - min(means) if means else 0.0


def attribute_bias(observations: tuple[MappingObservation, ...], *, margin: float = 1e-9) -> BiasAttribution:
    if not observations:
        raise ValueError("Need mapping observations")
    semantic = _group_mean_range(observations, "semantic_dimension")
    physical = _group_mean_range(observations, "physical_slot")
    if physical > semantic + margin:
        label = "substrate-position"
    elif semantic > physical + margin:
        label = "semantic-dimension"
    else:
        label = "unresolved"
    return BiasAttribution(
        semantic_explanatory_range=semantic,
        physical_explanatory_range=physical,
        attribution=label,
    )
