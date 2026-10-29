from __future__ import annotations

import pytest

from canopy.domain import TaxonRank
from canopy.errors import NotFoundError
from canopy.services import InventoryService, TaxonomyService


def test_specimen_counts_roll_up_to_root(taxonomy: TaxonomyService) -> None:
    counts = taxonomy.specimen_counts()

    assert counts["root"] == 5
    assert counts["fabaceae"] == 2
    assert counts["acacia"] == 2
    assert counts["fraxinus-uhdei"] == 2
    assert counts["tecoma-stans"] == 0


def test_lineage_runs_family_to_species(taxonomy: TaxonomyService) -> None:
    lineage = taxonomy.lineage("tecoma-stans")

    assert [t.id for t in lineage] == ["bignoniaceae", "tecoma", "tecoma-stans"]
    assert lineage[-1].common_name == "Yellow trumpetbush"


def test_species_under_genus(taxonomy: TaxonomyService) -> None:
    assert taxonomy.species_under("acacia") == {"acacia-melanoxylon", "acacia-decurrens"}


def test_relatedness_of_congeneric_species(taxonomy: TaxonomyService) -> None:
    result = taxonomy.relatedness("acacia-melanoxylon", "acacia-decurrens")

    assert result.common_ancestor.id == "acacia"
    assert result.distance == 2
    assert [t.id for t in result.path] == ["acacia-melanoxylon", "acacia", "acacia-decurrens"]


def test_relatedness_within_family(taxonomy: TaxonomyService) -> None:
    result = taxonomy.relatedness("jacaranda-mimosifolia", "tecoma-stans")

    assert result.common_ancestor.rank is TaxonRank.FAMILY
    assert result.distance == 4


def test_relatedness_across_families_meets_at_root(taxonomy: TaxonomyService) -> None:
    result = taxonomy.relatedness("fraxinus-uhdei", "acacia")

    assert result.common_ancestor.rank is TaxonRank.ROOT
    assert result.distance == 5


def test_relatedness_unknown_taxon(taxonomy: TaxonomyService) -> None:
    with pytest.raises(NotFoundError):
        taxonomy.relatedness("fraxinus-uhdei", "baobab")


def test_outbreak_lists_exposed_specimens_by_risk(taxonomy: TaxonomyService) -> None:
    outbreak = taxonomy.outbreak("fraxinus")

    assert [s.id for s in outbreak.specimens] == ["SP-0005", "SP-0001"]
    assert outbreak.total == 2
    assert outbreak.at_risk == 0
    assert [(e.site.id, e.count) for e in outbreak.by_site] == [
        ("parque-de-los-novios", 1),
        ("parque-el-virrey", 1),
    ]


def test_outbreak_on_family_counts_at_risk(taxonomy: TaxonomyService) -> None:
    outbreak = taxonomy.outbreak("fabaceae")

    assert outbreak.total == 2
    assert outbreak.at_risk == 1


def test_outbreak_follows_moved_specimens(taxonomy: TaxonomyService, inventory: InventoryService) -> None:
    inventory.move("SP-0001", "parque-de-los-novios")

    outbreak = taxonomy.outbreak("fraxinus-uhdei")

    assert [(e.site.id, e.count) for e in outbreak.by_site] == [("parque-de-los-novios", 2)]
