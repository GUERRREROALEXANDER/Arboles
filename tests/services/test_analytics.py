from __future__ import annotations

import pytest

from tests.conftest import Services


def test_summary_counts_hierarchy_and_open_orders(services: Services) -> None:
    summary = services.analytics.summary()

    assert summary.stats.specimens == 5
    assert summary.sites == 3
    assert summary.localities == 2
    assert summary.open_work_orders == 4


def test_top_species_ranked_by_count_then_name(services: Services) -> None:
    summary = services.analytics.summary()

    assert [(entry.species.id, entry.count) for entry in summary.top_species] == [
        ("fraxinus-uhdei", 2),
        ("acacia-melanoxylon", 1),
        ("acacia-decurrens", 1),
        ("jacaranda-mimosifolia", 1),
    ]


def test_locality_figures_follow_tree_order(services: Services) -> None:
    summary = services.analytics.summary()

    assert [entry.locality.id for entry in summary.by_locality] == ["chapinero", "teusaquillo"]
    assert summary.by_locality[1].stats.mean_health == pytest.approx(80)
