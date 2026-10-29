from __future__ import annotations

from dataclasses import dataclass

from canopy.domain.enums import LocationKind
from canopy.domain.location import Location
from canopy.domain.species import Species
from canopy.domain.stats import Stats
from canopy.services.inventory import InventoryService
from canopy.services.taxonomy import TaxonomyService
from canopy.services.workshop import WorkshopService

TOP_SPECIES_COUNT = 6


@dataclass(frozen=True, slots=True)
class SpeciesCount:
    species: Species
    count: int


@dataclass(frozen=True, slots=True)
class LocalityFigures:
    locality: Location
    stats: Stats


@dataclass(frozen=True, slots=True)
class Summary:
    stats: Stats
    sites: int
    localities: int
    open_work_orders: int
    top_species: tuple[SpeciesCount, ...]
    by_locality: tuple[LocalityFigures, ...]


class AnalyticsService:
    """Dashboard aggregates across inventory, taxonomy and workshop."""

    def __init__(
        self,
        inventory: InventoryService,
        taxonomy: TaxonomyService,
        workshop: WorkshopService,
    ) -> None:
        self._inventory = inventory
        self._taxonomy = taxonomy
        self._workshop = workshop

    def summary(self) -> Summary:
        stats_by_node = self._inventory.location_stats()
        localities = self._inventory.locations(LocationKind.LOCALITY)
        ranked = sorted(
            self._inventory.count_by_species().items(),
            key=lambda item: (-item[1], self._taxonomy.species(item[0]).common_name.casefold()),
        )
        return Summary(
            stats=stats_by_node[self._inventory.city.id],
            sites=len(self._inventory.locations(LocationKind.SITE)),
            localities=len(localities),
            open_work_orders=self._workshop.open_count,
            top_species=tuple(
                SpeciesCount(self._taxonomy.species(species_id), count)
                for species_id, count in ranked[:TOP_SPECIES_COUNT]
            ),
            by_locality=tuple(
                LocalityFigures(locality, stats_by_node[locality.id]) for locality in localities
            ),
        )
