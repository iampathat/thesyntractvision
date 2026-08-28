from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class LogicalSpaceAccounting:
    independent_dimensions: int
    execution_perspectives: int
    candidate_binary_space_exponent: int

    @property
    def candidate_binary_space_label(self) -> str:
        return f"2^{self.candidate_binary_space_exponent}"


def logical_space_accounting(*, B: int, G: int, Vd: int | None = None, Vp: int = 1, Vo: int = 1) -> LogicalSpaceAccounting:
    for name, value in {"B": B, "G": G, "Vp": Vp, "Vo": Vo}.items():
        if value <= 0:
            raise ValueError(f"{name} must be positive")
    if Vd is None:
        Vd = B
    if Vd <= 0:
        raise ValueError("Vd must be positive")
    D = G * B
    E = G * Vd * Vp * Vo
    return LogicalSpaceAccounting(
        independent_dimensions=D,
        execution_perspectives=E,
        candidate_binary_space_exponent=D,
    )
