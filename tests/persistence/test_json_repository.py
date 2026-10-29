from __future__ import annotations

import json
from pathlib import Path

import pytest

from canopy.domain import LocationKind, TaxonRank, WorkOrderStatus
from canopy.errors import ValidationError
from canopy.persistence import Dataset, JsonRepository
from tests.conftest import sample_document

BUNDLED = Path(__file__).resolve().parents[2] / "data" / "bogota.json"


def test_load_builds_location_and_taxonomy_trees(data_file: Path) -> None:
    dataset = JsonRepository(data_file).load()

    assert [node.id for node in dataset.locations.root.children] == ["chapinero", "teusaquillo"]
    assert dataset.taxonomy.root.value.rank is TaxonRank.ROOT
    assert dataset.taxonomy.node("acacia-decurrens").parent.id == "acacia"
    assert len(dataset.specimens) == 5
    assert len(dataset.work_orders) == 5


def test_save_then_load_round_trips(data_file: Path, tmp_path: Path) -> None:
    original = JsonRepository(data_file).load()
    copy = JsonRepository(tmp_path / "copy.json")

    copy.save(original)
    reloaded = copy.load()

    assert [s.id for s in reloaded.specimens] == [s.id for s in original.specimens]
    assert reloaded.specimens[0].measurements == original.specimens[0].measurements
    assert [(o.id, o.priority, o.status) for o in reloaded.work_orders] == [
        (o.id, o.priority, o.status) for o in original.work_orders
    ]


def test_unknown_species_reference_is_rejected(tmp_path: Path) -> None:
    document = sample_document()
    document["specimens"][0]["species_id"] = "baobab"
    path = tmp_path / "broken.json"
    path.write_text(json.dumps(document), encoding="utf-8")

    with pytest.raises(ValidationError):
        JsonRepository(path).load()


def test_missing_section_is_rejected(tmp_path: Path) -> None:
    path = tmp_path / "empty.json"
    path.write_text("{}", encoding="utf-8")

    with pytest.raises(ValidationError):
        JsonRepository(path).load()


@pytest.fixture(scope="module")
def dataset() -> Dataset:
    return JsonRepository(BUNDLED).load()


class TestBundledDataset:
    def test_has_six_localities_with_two_or_three_sites(self, dataset: Dataset) -> None:
        localities = dataset.locations.root.children

        assert len(localities) == 6
        assert all(2 <= len(locality.children) <= 3 for locality in localities)
        assert all(site.value.kind is LocationKind.SITE for loc in localities for site in loc.children)

    def test_species_catalog_size(self, dataset: Dataset) -> None:
        assert 14 <= len(dataset.species) <= 18

    def test_specimen_count_and_unique_tags(self, dataset: Dataset) -> None:
        tags = [s.tag for s in dataset.specimens]

        assert 160 <= len(dataset.specimens) <= 220
        assert len(set(tags)) == len(tags)

    def test_every_specimen_has_two_to_five_surveys(self, dataset: Dataset) -> None:
        assert all(2 <= len(s.measurements) <= 5 for s in dataset.specimens)

    def test_specimens_stand_near_their_site(self, dataset: Dataset) -> None:
        for specimen in dataset.specimens:
            center = specimen.site.center
            assert abs(specimen.position.lat - center.lat) < 0.03
            assert abs(specimen.position.lng - center.lng) < 0.03

    def test_seed_work_orders(self, dataset: Dataset) -> None:
        statuses = [order.status for order in dataset.work_orders]

        assert len(dataset.work_orders) == 12
        assert statuses.count(WorkOrderStatus.QUEUED) >= 6
