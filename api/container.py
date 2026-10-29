from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime

from flask import current_app

from canopy.persistence import JsonRepository
from canopy.services import AnalyticsService, InventoryService, TaxonomyService, WorkshopService

EXTENSION_KEY = "canopy"


def utc_now() -> datetime:
    return datetime.now(UTC)


class ServiceContainer:
    """Holds the single in-memory instance of every service, built from the repository."""

    def __init__(self, repository: JsonRepository, clock: Callable[[], datetime] = utc_now) -> None:
        self._repository = repository
        self._clock = clock
        self.reset()

    @property
    def inventory(self) -> InventoryService:
        return self._inventory

    @property
    def taxonomy(self) -> TaxonomyService:
        return self._taxonomy

    @property
    def workshop(self) -> WorkshopService:
        return self._workshop

    @property
    def analytics(self) -> AnalyticsService:
        return self._analytics

    def reset(self) -> None:
        """Discard in-memory changes and rebuild every service from the dataset file."""
        dataset = self._repository.load()
        inventory = InventoryService(
            dataset.locations,
            dataset.species,
            dataset.specimens,
            today=lambda: self._clock().date(),
        )
        taxonomy = TaxonomyService(dataset.taxonomy, dataset.species, inventory)
        workshop = WorkshopService(inventory, dataset.work_orders, clock=self._clock)
        self._inventory, self._taxonomy, self._workshop = inventory, taxonomy, workshop
        self._analytics = AnalyticsService(inventory, taxonomy, workshop)


def services() -> ServiceContainer:
    return current_app.extensions[EXTENSION_KEY]
