from __future__ import annotations

from enum import StrEnum


class HealthStatus(StrEnum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    CRITICAL = "critical"
    DEAD = "dead"

    @property
    def score(self) -> int:
        return _HEALTH_SCORES[self]


_HEALTH_SCORES = {
    HealthStatus.EXCELLENT: 100,
    HealthStatus.GOOD: 80,
    HealthStatus.FAIR: 60,
    HealthStatus.POOR: 35,
    HealthStatus.CRITICAL: 15,
    HealthStatus.DEAD: 0,
}


class LocationKind(StrEnum):
    CITY = "city"
    LOCALITY = "locality"
    SITE = "site"


class TaxonRank(StrEnum):
    ROOT = "root"
    FAMILY = "family"
    GENUS = "genus"
    SPECIES = "species"


class WorkOrderKind(StrEnum):
    INSPECTION = "inspection"
    PRUNING = "pruning"
    PEST_TREATMENT = "pest_treatment"
    CABLING = "cabling"
    REMOVAL = "removal"
    PLANTING = "planting"


class WorkOrderStatus(StrEnum):
    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    DONE = "done"

    @property
    def is_open(self) -> bool:
        return self is not WorkOrderStatus.DONE
