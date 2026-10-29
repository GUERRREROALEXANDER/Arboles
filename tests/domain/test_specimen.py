from __future__ import annotations

from datetime import date

import pytest

from canopy.domain import Coordinates, HealthStatus, Location, LocationKind, Measurement, Species, Specimen
from canopy.domain.specimen import above_ground_biomass_kg, canopy_area_m2, risk_score, stored_co2_kg
from canopy.errors import ValidationError


@pytest.mark.parametrize(
    ("status", "score"),
    [("excellent", 100), ("good", 80), ("fair", 60), ("poor", 35), ("critical", 15), ("dead", 0)],
)
def test_health_scores(status: str, score: int) -> None:
    assert HealthStatus(status).score == score


def test_risk_score_combines_condition_height_and_lean() -> None:
    assert risk_score(HealthStatus.POOR, 20, 14) == 70


def test_risk_score_caps_height_and_lean() -> None:
    assert risk_score(HealthStatus.EXCELLENT, 45, 40) == 40


def test_biomass_follows_chave_2014() -> None:
    assert above_ground_biomass_kg(0.55, 38, 12) == pytest.approx(514.787, rel=1e-5)


def test_stored_co2_converts_biomass_to_carbon_dioxide() -> None:
    assert stored_co2_kg(0.55, 38, 12) == pytest.approx(514.787 * 0.47 * 3.667, rel=1e-5)


def test_canopy_area_is_crown_disc() -> None:
    assert canopy_area_m2(7) == pytest.approx(38.4845, rel=1e-5)


def test_current_size_is_latest_measurement(specimen: Specimen) -> None:
    assert (specimen.height_m, specimen.dbh_cm, specimen.crown_m) == (12, 38, 7)


def test_derived_figures(specimen: Specimen) -> None:
    assert specimen.health_score == 80
    assert specimen.risk == 24
    assert not specimen.is_at_risk
    assert specimen.co2_kg == pytest.approx(887.23, rel=1e-4)
    assert specimen.canopy_m2 == pytest.approx(38.48, rel=1e-3)


def test_growth_is_slope_between_first_and_last_measurement(specimen: Specimen) -> None:
    growth = specimen.growth

    assert growth.height_m_per_year == pytest.approx(0.5)
    assert growth.dbh_cm_per_year == pytest.approx(2.0)
    assert growth.crown_m_per_year == pytest.approx(0.25)


def test_growth_is_zero_with_a_single_measurement(ash: Species, site: Location) -> None:
    single = Specimen(
        "SP-9", "T-9", ash, site, date(2020, 1, 1), HealthStatus.GOOD, 0, Coordinates(4.6, -74.0),
        [Measurement(date(2024, 1, 1), 5, 10, 3)],
    )

    assert single.growth.dbh_cm_per_year == 0.0


def test_dead_specimen_is_always_at_risk(specimen: Specimen) -> None:
    specimen.assess(health=HealthStatus.DEAD)

    assert specimen.is_at_risk


def test_high_risk_marks_specimen_at_risk(specimen: Specimen) -> None:
    specimen.assess(health=HealthStatus.CRITICAL, lean_deg=15)

    assert specimen.risk == 76
    assert specimen.is_at_risk


def test_record_appends_later_measurement(specimen: Specimen) -> None:
    specimen.record(Measurement(date(2025, 3, 1), 12.5, 40, 7.5))

    assert specimen.dbh_cm == 40
    assert len(specimen.measurements) == 3


def test_record_rejects_measurement_not_after_latest(specimen: Specimen) -> None:
    with pytest.raises(ValidationError):
        specimen.record(Measurement(date(2024, 3, 1), 13, 39, 7))


def test_record_rejects_measurement_before_planting(specimen: Specimen) -> None:
    with pytest.raises(ValidationError):
        Specimen(
            "SP-2", "T-2", specimen.species, specimen.site, date(2020, 1, 1), HealthStatus.GOOD, 0,
            specimen.position, [Measurement(date(2019, 1, 1), 5, 10, 3)],
        )


def test_specimen_requires_a_measurement(ash: Species, site: Location) -> None:
    with pytest.raises(ValidationError):
        Specimen("SP-3", "T-3", ash, site, date(2020, 1, 1), HealthStatus.GOOD, 0, Coordinates(4.6, -74.0), [])


def test_specimen_must_stand_in_a_site(ash: Species) -> None:
    locality = Location("chapinero", "Chapinero", LocationKind.LOCALITY)

    with pytest.raises(ValidationError):
        Specimen(
            "SP-4", "T-4", ash, locality, date(2020, 1, 1), HealthStatus.GOOD, 0, Coordinates(4.6, -74.0),
            [Measurement(date(2024, 1, 1), 5, 10, 3)],
        )


def test_assess_rejects_out_of_range_lean_and_keeps_state(specimen: Specimen) -> None:
    with pytest.raises(ValidationError):
        specimen.assess(health=HealthStatus.POOR, lean_deg=120)

    assert specimen.health is HealthStatus.GOOD
    assert specimen.lean_deg == 2


def test_assess_rejects_unknown_health(specimen: Specimen) -> None:
    with pytest.raises(ValidationError):
        specimen.assess(health="sickly")  # type: ignore[arg-type]


def test_relocate_rejects_non_site(specimen: Specimen) -> None:
    with pytest.raises(ValidationError):
        specimen.relocate(Location("bogota", "Bogotá", LocationKind.CITY))


@pytest.mark.parametrize(
    ("height", "dbh", "crown"),
    [(0, 10, 3), (5, -1, 3), (5, 10, -2), ("5", 10, 3), (True, 10, 3), (float("nan"), 10, 3)],
)
def test_measurement_rejects_invalid_sizes(height: object, dbh: object, crown: object) -> None:
    with pytest.raises(ValidationError):
        Measurement(date(2024, 1, 1), height, dbh, crown)  # type: ignore[arg-type]


@pytest.mark.parametrize(("lat", "lng"), [(91, 0), (0, -181), ("4.6", -74)])
def test_coordinates_reject_out_of_range(lat: object, lng: object) -> None:
    with pytest.raises(ValidationError):
        Coordinates(lat, lng)  # type: ignore[arg-type]


def test_site_requires_center() -> None:
    with pytest.raises(ValidationError):
        Location("site", "Site", LocationKind.SITE)


def test_species_rejects_implausible_wood_density() -> None:
    with pytest.raises(ValidationError):
        Species("x", "X y", "Ex", 3.0, 10)
