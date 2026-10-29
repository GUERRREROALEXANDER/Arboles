from __future__ import annotations

import pytest

from canopy.domain import HealthStatus, Specimen, Stats


def test_empty_stats_are_zero() -> None:
    stats = Stats.collect([])

    assert stats.specimens == 0
    assert stats.species == 0
    assert stats.mean_health == 0.0
    assert stats.health_breakdown == {status: 0 for status in HealthStatus}


def test_stats_of_one_specimen(specimen: Specimen) -> None:
    stats = Stats.of(specimen)

    assert stats.specimens == 1
    assert stats.species == 1
    assert stats.mean_health == 80
    assert stats.at_risk == 0
    assert stats.co2_tonnes == pytest.approx(specimen.co2_kg / 1000)
    assert stats.health_breakdown[HealthStatus.GOOD] == 1


def test_combine_sums_figures_and_unions_species(specimen: Specimen) -> None:
    first = Stats.of(specimen)
    specimen.assess(health=HealthStatus.DEAD)
    second = Stats.of(specimen)

    combined = Stats.combine([first, second])

    assert combined.specimens == 2
    assert combined.species == 1
    assert combined.mean_health == 40
    assert combined.at_risk == 1
    assert combined.health_breakdown[HealthStatus.DEAD] == 1
    assert combined.health_breakdown[HealthStatus.GOOD] == 1
