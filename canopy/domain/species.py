from __future__ import annotations

from dataclasses import dataclass

from canopy.domain.enums import TaxonRank
from canopy.domain.validation import require_member, require_number, require_text


@dataclass(frozen=True, slots=True)
class Species:
    """Reference data for a species. Wood density is in g/cm3."""

    id: str
    scientific_name: str
    common_name: str
    wood_density: float
    max_height_m: float

    def __post_init__(self) -> None:
        object.__setattr__(self, "id", require_text("species id", self.id))
        object.__setattr__(self, "scientific_name", require_text("scientific_name", self.scientific_name))
        object.__setattr__(self, "common_name", require_text("common_name", self.common_name))
        object.__setattr__(
            self, "wood_density", require_number("wood_density", self.wood_density, minimum=0.1, maximum=1.5)
        )
        object.__setattr__(
            self, "max_height_m", require_number("max_height_m", self.max_height_m, positive=True, maximum=120)
        )


@dataclass(frozen=True, slots=True)
class Taxon:
    """A node of the taxonomy: family, genus or species (or the synthetic root)."""

    id: str
    name: str
    rank: TaxonRank
    common_name: str | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "id", require_text("taxon id", self.id))
        object.__setattr__(self, "name", require_text("taxon name", self.name))
        object.__setattr__(self, "rank", require_member("taxon rank", self.rank, TaxonRank))

    @classmethod
    def of_species(cls, species: Species) -> Taxon:
        return cls(species.id, species.scientific_name, TaxonRank.SPECIES, species.common_name)
