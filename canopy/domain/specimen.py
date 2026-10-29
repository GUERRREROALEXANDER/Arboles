from __future__ import annotations

import math
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date

from canopy.domain.enums import HealthStatus
from canopy.domain.location import Coordinates, Location
from canopy.domain.species import Species
from canopy.domain.validation import require_member, require_number, require_text
from canopy.errors import ValidationError

AT_RISK_THRESHOLD = 50
CARBON_FRACTION = 0.47
CO2_PER_CARBON = 3.667
DAYS_PER_YEAR = 365.25


def risk_score(health: HealthStatus, height_m: float, lean_deg: float) -> int:
    """Failure risk on a 0-100 scale from condition, size and lean."""
    return round((100 - health.score) * 0.6 + min(height_m, 30) / 30 * 25 + min(lean_deg, 15))


def above_ground_biomass_kg(wood_density: float, dbh_cm: float, height_m: float) -> float:
    """Chave et al. (2014) pantropical allometry."""
    return 0.0673 * (wood_density * dbh_cm**2 * height_m) ** 0.976


def stored_co2_kg(wood_density: float, dbh_cm: float, height_m: float) -> float:
    return above_ground_biomass_kg(wood_density, dbh_cm, height_m) * CARBON_FRACTION * CO2_PER_CARBON


def canopy_area_m2(crown_m: float) -> float:
    return math.pi * (crown_m / 2) ** 2


@dataclass(frozen=True, slots=True)
class Measurement:
    date: date
    height_m: float
    dbh_cm: float
    crown_m: float

    def __post_init__(self) -> None:
        if not isinstance(self.date, date):
            raise ValidationError("measurement date must be a date")
        object.__setattr__(self, "height_m", require_number("height_m", self.height_m, positive=True, maximum=120))
        object.__setattr__(self, "dbh_cm", require_number("dbh_cm", self.dbh_cm, positive=True, maximum=1200))
        object.__setattr__(self, "crown_m", require_number("crown_m", self.crown_m, minimum=0, maximum=80))


@dataclass(frozen=True, slots=True)
class GrowthRate:
    height_m_per_year: float
    dbh_cm_per_year: float
    crown_m_per_year: float

    @classmethod
    def between(cls, first: Measurement, last: Measurement) -> GrowthRate:
        years = (last.date - first.date).days / DAYS_PER_YEAR
        if years <= 0:
            return cls(0.0, 0.0, 0.0)
        return cls(
            (last.height_m - first.height_m) / years,
            (last.dbh_cm - first.dbh_cm) / years,
            (last.crown_m - first.crown_m) / years,
        )


class Specimen:
    """An individual tree. Its current size is its latest measurement."""

    def __init__(
        self,
        specimen_id: str,
        tag: str,
        species: Species,
        site: Location,
        planted_on: date,
        health: HealthStatus,
        lean_deg: float,
        position: Coordinates,
        measurements: Iterable[Measurement],
    ) -> None:
        if not isinstance(planted_on, date):
            raise ValidationError("planted_on must be a date")
        self._id = require_text("specimen id", specimen_id)
        self._tag = require_text("tag", tag, max_length=32)
        self._species = species
        self._site = self._require_site(site)
        self._planted_on = planted_on
        self._health = require_member("health", health, HealthStatus)
        self._lean_deg = self._require_lean(lean_deg)
        self._position = position
        self._measurements: list[Measurement] = []
        for measurement in sorted(measurements, key=lambda m: m.date):
            self.record(measurement)
        if not self._measurements:
            raise ValidationError("a specimen needs at least one measurement")

    @property
    def id(self) -> str:
        return self._id

    @property
    def tag(self) -> str:
        return self._tag

    @property
    def species(self) -> Species:
        return self._species

    @property
    def site(self) -> Location:
        return self._site

    @property
    def planted_on(self) -> date:
        return self._planted_on

    @property
    def health(self) -> HealthStatus:
        return self._health

    @property
    def lean_deg(self) -> float:
        return self._lean_deg

    @property
    def position(self) -> Coordinates:
        return self._position

    @property
    def measurements(self) -> tuple[Measurement, ...]:
        return tuple(self._measurements)

    @property
    def latest(self) -> Measurement:
        return self._measurements[-1]

    @property
    def height_m(self) -> float:
        return self.latest.height_m

    @property
    def dbh_cm(self) -> float:
        return self.latest.dbh_cm

    @property
    def crown_m(self) -> float:
        return self.latest.crown_m

    @property
    def health_score(self) -> int:
        return self._health.score

    @property
    def risk(self) -> int:
        return risk_score(self._health, self.height_m, self._lean_deg)

    @property
    def is_at_risk(self) -> bool:
        return self._health is HealthStatus.DEAD or self.risk >= AT_RISK_THRESHOLD

    @property
    def co2_kg(self) -> float:
        return stored_co2_kg(self._species.wood_density, self.dbh_cm, self.height_m)

    @property
    def canopy_m2(self) -> float:
        return canopy_area_m2(self.crown_m)

    @property
    def growth(self) -> GrowthRate:
        return GrowthRate.between(self._measurements[0], self._measurements[-1])

    def record(self, measurement: Measurement) -> None:
        """Append a survey. Surveys must be dated after the previous one and not before planting."""
        if measurement.date < self._planted_on:
            raise ValidationError("a measurement cannot predate planted_on")
        if self._measurements and measurement.date <= self.latest.date:
            raise ValidationError(f"measurement date must be after {self.latest.date.isoformat()}")
        self._measurements.append(measurement)

    def assess(self, *, health: HealthStatus | None = None, lean_deg: float | None = None) -> None:
        new_health = require_member("health", health, HealthStatus) if health is not None else self._health
        new_lean = self._require_lean(lean_deg) if lean_deg is not None else self._lean_deg
        self._health, self._lean_deg = new_health, new_lean

    def relocate(self, site: Location) -> None:
        self._site = self._require_site(site)

    @staticmethod
    def _require_site(site: Location) -> Location:
        if not site.is_site:
            raise ValidationError(f"{site.id!r} is a {site.kind}, not a site")
        return site

    @staticmethod
    def _require_lean(lean_deg: object) -> float:
        return require_number("lean_deg", lean_deg, minimum=0, maximum=90)

    def __repr__(self) -> str:
        return f"Specimen({self._id!r}, {self._tag!r})"
