from __future__ import annotations

from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from canopy.domain.enums import TaxonRank
from canopy.domain.location import Location
from canopy.domain.species import Species, Taxon
from canopy.domain.specimen import Specimen
from canopy.errors import NotFoundError
from canopy.services.inventory import InventoryService
from canopy.structures import GeneralTree, TreeNode


@dataclass(frozen=True, slots=True)
class Relatedness:
    first: Taxon
    second: Taxon
    common_ancestor: Taxon
    distance: int
    path: tuple[Taxon, ...]


@dataclass(frozen=True, slots=True)
class SiteExposure:
    site: Location
    count: int


@dataclass(frozen=True, slots=True)
class Outbreak:
    taxon: Taxon
    specimens: tuple[Specimen, ...]
    by_site: tuple[SiteExposure, ...]

    @property
    def total(self) -> int:
        return len(self.specimens)

    @property
    def at_risk(self) -> int:
        return sum(specimen.is_at_risk for specimen in self.specimens)


class TaxonomyService:
    """Queries over the family > genus > species tree."""

    def __init__(
        self,
        taxonomy: GeneralTree[Taxon],
        species: Mapping[str, Species],
        inventory: InventoryService,
    ) -> None:
        self._tree = taxonomy
        self._species = species
        self._inventory = inventory

    @property
    def root(self) -> TreeNode[Taxon]:
        return self._tree.root

    def taxon(self, taxon_id: str) -> Taxon:
        return self._node(taxon_id).value

    def species(self, species_id: str) -> Species:
        try:
            return self._species[species_id]
        except KeyError:
            raise NotFoundError(f"no species with id {species_id!r}") from None

    def specimen_counts(self) -> dict[str, int]:
        """Specimens under every taxon, aggregated bottom-up."""
        per_species = self._inventory.count_by_species()

        def combine(node: TreeNode[Taxon], children: Sequence[int]) -> int:
            return per_species[node.id] if node.value.rank is TaxonRank.SPECIES else sum(children)

        return self._tree.fold(combine)

    def lineage(self, taxon_id: str) -> tuple[Taxon, ...]:
        """Ranked taxa from family down to the given taxon (the root is omitted)."""
        self._node(taxon_id)
        return tuple(node.value for node in self._tree.path_from_root(taxon_id) if not node.is_root)

    def species_under(self, taxon_id: str) -> frozenset[str]:
        self._node(taxon_id)
        return frozenset(taxon.id for taxon in self._tree.subtree(taxon_id) if taxon.rank is TaxonRank.SPECIES)

    def relatedness(self, first_id: str, second_id: str) -> Relatedness:
        first, second = self._node(first_id), self._node(second_id)
        ancestor = self._tree.lowest_common_ancestor(first_id, second_id)
        return Relatedness(
            first=first.value,
            second=second.value,
            common_ancestor=ancestor.value,
            distance=self._tree.distance(first_id, second_id),
            path=tuple(node.value for node in self._tree.path_between(first_id, second_id)),
        )

    def outbreak(self, taxon_id: str) -> Outbreak:
        """Every specimen exposed to a pest that attacks the given taxon."""
        taxon = self.taxon(taxon_id)
        exposed_species = self.species_under(taxon_id)
        specimens = tuple(
            sorted(
                (s for s in self._inventory.specimens() if s.species.id in exposed_species),
                key=lambda s: (-s.risk, s.id),
            )
        )
        sites = {specimen.site.id: specimen.site for specimen in specimens}
        counts = Counter(specimen.site.id for specimen in specimens)
        by_site = tuple(
            SiteExposure(sites[site_id], count)
            for site_id, count in sorted(counts.items(), key=lambda item: (-item[1], sites[item[0]].name.casefold()))
        )
        return Outbreak(taxon, specimens, by_site)

    def _node(self, taxon_id: str) -> TreeNode[Taxon]:
        node = self._tree.find(taxon_id)
        if node is None:
            raise NotFoundError(f"no taxon with id {taxon_id!r}")
        return node
