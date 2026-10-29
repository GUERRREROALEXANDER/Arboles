from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from canopy.domain.enums import HealthStatus
from canopy.domain.specimen import Specimen

_STATUSES = tuple(HealthStatus)


@dataclass(frozen=True, slots=True)
class Stats:
    """Aggregate figures for a group of specimens; combinable across subtrees."""

    specimens: int = 0
    species_ids: frozenset[str] = frozenset()
    health_total: int = 0
    at_risk: int = 0
    co2_kg: float = 0.0
    canopy_m2: float = 0.0
    health_counts: tuple[int, ...] = (0,) * len(_STATUSES)

    @classmethod
    def of(cls, specimen: Specimen) -> Stats:
        return cls(
            specimens=1,
            species_ids=frozenset({specimen.species.id}),
            health_total=specimen.health_score,
            at_risk=int(specimen.is_at_risk),
            co2_kg=specimen.co2_kg,
            canopy_m2=specimen.canopy_m2,
            health_counts=tuple(int(status is specimen.health) for status in _STATUSES),
        )

    @classmethod
    def combine(cls, parts: Iterable[Stats]) -> Stats:
        return sum(parts, cls())

    def __add__(self, other: Stats) -> Stats:
        return Stats(
            specimens=self.specimens + other.specimens,
            species_ids=self.species_ids | other.species_ids,
            health_total=self.health_total + other.health_total,
            at_risk=self.at_risk + other.at_risk,
            co2_kg=self.co2_kg + other.co2_kg,
            canopy_m2=self.canopy_m2 + other.canopy_m2,
            health_counts=tuple(a + b for a, b in zip(self.health_counts, other.health_counts, strict=True)),
        )

    @classmethod
    def collect(cls, specimens: Iterable[Specimen]) -> Stats:
        return cls.combine(cls.of(specimen) for specimen in specimens)

    @property
    def species(self) -> int:
        return len(self.species_ids)

    @property
    def mean_health(self) -> float:
        return self.health_total / self.specimens if self.specimens else 0.0

    @property
    def co2_tonnes(self) -> float:
        return self.co2_kg / 1000

    @property
    def health_breakdown(self) -> dict[HealthStatus, int]:
        return dict(zip(_STATUSES, self.health_counts, strict=True))
