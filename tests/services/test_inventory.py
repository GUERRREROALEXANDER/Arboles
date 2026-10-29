from __future__ import annotations

from datetime import date

import pytest

from canopy.domain import HealthStatus, LocationKind, Measurement
from canopy.errors import ConflictError, NotFoundError, ValidationError
from canopy.services import InventoryService, SpecimenDraft, WorkshopService


def draft(**overrides: object) -> SpecimenDraft:
    fields: dict[str, object] = {
        "site_id": "parque-de-la-93",
        "species_id": "tecoma-stans",
        "tag": "BOG-CH-0100",
        "planted_on": date(2025, 5, 1),
        "health": HealthStatus.GOOD,
        "height_m": 2.5,
        "dbh_cm": 6,
        "crown_m": 1.5,
        "lean_deg": 1,
        "lat": 4.6767,
        "lng": -74.0485,
    }
    fields.update(overrides)
    return SpecimenDraft(**fields)  # type: ignore[arg-type]


def index_keys(inventory: InventoryService) -> list[tuple[float, str]]:
    return [key for key, _ in inventory.dbh_index.items()]


def test_location_stats_aggregate_up_the_tree(inventory: InventoryService) -> None:
    stats = inventory.location_stats()

    assert stats["bogota"].specimens == 5
    assert stats["chapinero"].specimens == 3
    assert stats["parque-el-virrey"].at_risk == 1
    assert stats["bogota"].at_risk == 2
    assert stats["teusaquillo"].species == 2
    assert stats["bogota"].mean_health == pytest.approx((80 + 0 + 35 + 100 + 60) / 5)


def test_stats_for_single_location_match_fold(inventory: InventoryService) -> None:
    assert inventory.stats("chapinero") == inventory.location_stats()["chapinero"]


def test_locations_by_kind(inventory: InventoryService) -> None:
    assert [loc.id for loc in inventory.locations(LocationKind.LOCALITY)] == ["chapinero", "teusaquillo"]
    assert len(inventory.locations(LocationKind.SITE)) == 3


def test_path_for_specimen_ends_at_its_site(inventory: InventoryService) -> None:
    assert [loc.id for loc in inventory.path("SP-0003")] == ["bogota", "chapinero", "parque-de-la-93"]


def test_specimens_in_locality_cover_subtree(inventory: InventoryService) -> None:
    assert [s.id for s in inventory.specimens_in("chapinero")] == ["SP-0001", "SP-0002", "SP-0003"]


def test_unknown_location_is_not_found(inventory: InventoryService) -> None:
    with pytest.raises(NotFoundError):
        inventory.location("atlantis")


def test_specimen_id_is_not_a_location(inventory: InventoryService) -> None:
    with pytest.raises(NotFoundError):
        inventory.location_node("SP-0001")


def test_search_filters_combine(inventory: InventoryService) -> None:
    page = inventory.search(location_id="chapinero", health=HealthStatus.POOR)

    assert [s.id for s in page.items] == ["SP-0003"]


def test_search_matches_tag_and_names_case_insensitively(inventory: InventoryService) -> None:
    assert [s.id for s in inventory.search(query="ash").items] == ["SP-0001", "SP-0005"]
    assert [s.id for s in inventory.search(query="bog-te").items] == ["SP-0004", "SP-0005"]
    assert [s.id for s in inventory.search(query="ACACIA DEC").items] == ["SP-0004"]


def test_search_reports_total_before_limit(inventory: InventoryService) -> None:
    page = inventory.search(limit=2)

    assert len(page.items) == 2
    assert page.total == 5


def test_search_rejects_bad_limit(inventory: InventoryService) -> None:
    with pytest.raises(ValidationError):
        inventory.search(limit=0)


def test_search_by_species_set(inventory: InventoryService) -> None:
    page = inventory.search(species_ids=frozenset({"acacia-melanoxylon", "acacia-decurrens"}))

    assert [s.id for s in page.items] == ["SP-0003", "SP-0004"]


def test_register_assigns_next_id_and_indexes(inventory: InventoryService) -> None:
    specimen = inventory.register(draft())

    assert specimen.id == "SP-0006"
    assert specimen.measurements[0].date == date(2026, 10, 29)
    assert inventory.location_node("parque-de-la-93").children[-1].value is specimen
    assert (6.0, "SP-0006") in inventory.dbh_index


def test_register_rejects_duplicate_tag(inventory: InventoryService) -> None:
    with pytest.raises(ConflictError):
        inventory.register(draft(tag="bog-ch-0001"))


def test_register_requires_a_site(inventory: InventoryService) -> None:
    with pytest.raises(ValidationError):
        inventory.register(draft(site_id="chapinero"))


def test_register_rejects_unknown_species(inventory: InventoryService) -> None:
    with pytest.raises(NotFoundError):
        inventory.register(draft(species_id="baobab"))


def test_register_rejects_planting_after_first_measurement(inventory: InventoryService) -> None:
    with pytest.raises(ValidationError):
        inventory.register(draft(planted_on=date(2027, 1, 1)))
    assert len(inventory.specimens()) == 5


def test_assess_requires_a_field(inventory: InventoryService) -> None:
    with pytest.raises(ValidationError):
        inventory.assess("SP-0001")


def test_assess_changes_risk(inventory: InventoryService) -> None:
    specimen = inventory.assess("SP-0001", health=HealthStatus.CRITICAL, lean_deg=15)

    assert specimen.risk == 76


def test_new_measurement_rekeys_dbh_index(inventory: InventoryService) -> None:
    inventory.record_measurement("SP-0001", Measurement(date(2026, 9, 1), 13, 44, 8))

    assert (38.0, "SP-0001") not in inventory.dbh_index
    assert inventory.dbh_index.find((44.0, "SP-0001")).id == "SP-0001"
    assert len(inventory.dbh_index) == 5


def test_rejected_measurement_leaves_index_untouched(inventory: InventoryService) -> None:
    before = index_keys(inventory)

    with pytest.raises(ValidationError):
        inventory.record_measurement("SP-0001", Measurement(date(2019, 1, 1), 13, 44, 8))

    assert index_keys(inventory) == before


def test_move_updates_tree_site_and_stats(inventory: InventoryService) -> None:
    specimen = inventory.move("SP-0002", "parque-de-los-novios")

    assert specimen.site.id == "parque-de-los-novios"
    assert [s.id for s in inventory.specimens_in("parque-el-virrey")] == ["SP-0001"]
    assert inventory.location_stats()["teusaquillo"].at_risk == 1


def test_move_to_locality_is_rejected(inventory: InventoryService) -> None:
    with pytest.raises(ValidationError):
        inventory.move("SP-0002", "teusaquillo")


def test_remove_clears_tree_index_and_tag(inventory: InventoryService) -> None:
    inventory.remove("SP-0005")

    assert "SP-0005" not in [s.id for s in inventory.specimens()]
    assert (38.0, "SP-0005") not in inventory.dbh_index
    assert inventory.location_stats()["bogota"].specimens == 4
    assert inventory.register(draft(tag="BOG-TE-0002")).tag == "BOG-TE-0002"


def test_remove_discards_work_orders_for_specimen(inventory: InventoryService, workshop: WorkshopService) -> None:
    inventory.remove("SP-0002")

    assert "WO-0001" not in [order.id for order in workshop.orders()]
    assert "WO-0001" not in [order.id for order in workshop.queue_snapshot()]


def test_dbh_range_includes_duplicate_diameters(inventory: InventoryService) -> None:
    result = inventory.dbh_range(30, 41)

    assert [s.id for s in result.items] == ["SP-0001", "SP-0005"]
    assert result.visited >= 1


def test_dbh_range_defaults_cover_everything(inventory: InventoryService) -> None:
    result = inventory.dbh_range()

    assert (result.min, result.max) == (0.0, 45.0)
    assert [s.dbh_cm for s in result.items] == [15, 25, 38, 38, 45]


def test_dbh_range_rejects_inverted_bounds(inventory: InventoryService) -> None:
    with pytest.raises(ValidationError):
        inventory.dbh_range(50, 10)
