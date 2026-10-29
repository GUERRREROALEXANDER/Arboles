from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient

from api import create_app
from canopy.domain import Coordinates, HealthStatus, Location, LocationKind, Measurement, Species, Specimen
from canopy.persistence import JsonRepository
from canopy.services import AnalyticsService, InventoryService, TaxonomyService, WorkshopService

NOW = datetime(2026, 10, 29, 15, 0, tzinfo=UTC)


def _site(site_id: str, name: str, lat: float, lng: float) -> dict[str, Any]:
    return {"id": site_id, "name": name, "lat": lat, "lng": lng}


def _species(species_id: str, scientific: str, common: str, density: float, height: float) -> dict[str, Any]:
    return {
        "id": species_id,
        "scientific_name": scientific,
        "common_name": common,
        "wood_density": density,
        "max_height_m": height,
    }


def _specimen(
    specimen_id: str,
    tag: str,
    species_id: str,
    site_id: str,
    health: str,
    lean: float,
    measurements: list[tuple[str, float, float, float]],
) -> dict[str, Any]:
    return {
        "id": specimen_id,
        "tag": tag,
        "species_id": species_id,
        "site_id": site_id,
        "planted_on": "2010-04-01",
        "health": health,
        "lean_deg": lean,
        "lat": 4.67,
        "lng": -74.05,
        "measurements": [
            {"date": day, "height_m": height, "dbh_cm": dbh, "crown_m": crown}
            for day, height, dbh, crown in measurements
        ],
    }


def _order(
    order_id: str,
    specimen_id: str,
    kind: str,
    status: str,
    priority: int | None,
    created_at: str,
    completed_at: str | None = None,
) -> dict[str, Any]:
    return {
        "id": order_id,
        "specimen_id": specimen_id,
        "kind": kind,
        "status": status,
        "priority": priority,
        "notes": f"{kind} job",
        "created_at": created_at,
        "completed_at": completed_at,
    }


def sample_document() -> dict[str, Any]:
    """Small dataset with hand-checkable figures.

    Risks: SP-0001 24, SP-0002 77 (dead), SP-0003 70, SP-0004 5, SP-0005 42.
    SP-0001 and SP-0005 share a DBH of 38 cm.
    """
    return {
        "city": {
            "id": "bogota",
            "name": "Bogotá",
            "localities": [
                {
                    "id": "chapinero",
                    "name": "Chapinero",
                    "sites": [
                        _site("parque-el-virrey", "Parque El Virrey", 4.6732, -74.0548),
                        _site("parque-de-la-93", "Parque de la 93", 4.6766, -74.0484),
                    ],
                },
                {
                    "id": "teusaquillo",
                    "name": "Teusaquillo",
                    "sites": [_site("parque-de-los-novios", "Parque de los Novios", 4.6593, -74.0712)],
                },
            ],
        },
        "taxonomy": [
            {
                "id": "oleaceae",
                "name": "Oleaceae",
                "genera": [
                    {
                        "id": "fraxinus",
                        "name": "Fraxinus",
                        "species": [_species("fraxinus-uhdei", "Fraxinus uhdei", "Tropical ash", 0.55, 25)],
                    }
                ],
            },
            {
                "id": "bignoniaceae",
                "name": "Bignoniaceae",
                "genera": [
                    {
                        "id": "jacaranda",
                        "name": "Jacaranda",
                        "species": [_species("jacaranda-mimosifolia", "Jacaranda mimosifolia", "Jacaranda", 0.6, 15)],
                    },
                    {
                        "id": "tecoma",
                        "name": "Tecoma",
                        "species": [_species("tecoma-stans", "Tecoma stans", "Yellow trumpetbush", 0.68, 8)],
                    },
                ],
            },
            {
                "id": "fabaceae",
                "name": "Fabaceae",
                "genera": [
                    {
                        "id": "acacia",
                        "name": "Acacia",
                        "species": [
                            _species("acacia-melanoxylon", "Acacia melanoxylon", "Blackwood", 0.62, 25),
                            _species("acacia-decurrens", "Acacia decurrens", "Green wattle", 0.68, 15),
                        ],
                    }
                ],
            },
        ],
        "specimens": [
            _specimen(
                "SP-0001", "BOG-CH-0001", "fraxinus-uhdei", "parque-el-virrey", "good", 2,
                [("2020-03-01", 10, 30, 6), ("2024-03-01", 12, 38, 7)],
            ),
            _specimen(
                "SP-0002", "BOG-CH-0002", "jacaranda-mimosifolia", "parque-el-virrey", "dead", 10,
                [("2023-05-01", 8, 25, 5)],
            ),
            _specimen(
                "SP-0003", "BOG-CH-0003", "acacia-melanoxylon", "parque-de-la-93", "poor", 14,
                [("2022-06-01", 18, 41, 7), ("2025-06-01", 20, 45, 8)],
            ),
            _specimen(
                "SP-0004", "BOG-TE-0001", "acacia-decurrens", "parque-de-los-novios", "excellent", 0,
                [("2025-01-15", 6, 15, 4)],
            ),
            _specimen(
                "SP-0005", "BOG-TE-0002", "fraxinus-uhdei", "parque-de-los-novios", "fair", 5,
                [("2024-08-01", 15, 38, 9)],
            ),
        ],
        "work_orders": [
            _order("WO-0001", "SP-0002", "removal", "queued", None, "2026-10-10T09:00:00+00:00"),
            _order("WO-0002", "SP-0003", "pruning", "queued", 60, "2026-10-01T09:00:00+00:00"),
            _order("WO-0003", "SP-0005", "inspection", "queued", 60, "2026-09-15T09:00:00+00:00"),
            _order(
                "WO-0004", "SP-0001", "inspection", "done", 20,
                "2026-09-01T09:00:00+00:00", "2026-09-03T12:00:00+00:00",
            ),
            _order("WO-0005", "SP-0004", "planting", "in_progress", 10, "2026-09-20T09:00:00+00:00"),
        ],
    }


@dataclass(frozen=True)
class Services:
    inventory: InventoryService
    taxonomy: TaxonomyService
    workshop: WorkshopService
    analytics: AnalyticsService


@pytest.fixture
def data_file(tmp_path: Path) -> Path:
    path = tmp_path / "dataset.json"
    path.write_text(json.dumps(sample_document(), ensure_ascii=False), encoding="utf-8")
    return path


@pytest.fixture
def services(data_file: Path) -> Services:
    dataset = JsonRepository(data_file).load()
    inventory = InventoryService(dataset.locations, dataset.species, dataset.specimens, today=lambda: NOW.date())
    taxonomy = TaxonomyService(dataset.taxonomy, dataset.species, inventory)
    workshop = WorkshopService(inventory, dataset.work_orders, clock=lambda: NOW)
    return Services(inventory, taxonomy, workshop, AnalyticsService(inventory, taxonomy, workshop))


@pytest.fixture
def inventory(services: Services) -> InventoryService:
    return services.inventory


@pytest.fixture
def taxonomy(services: Services) -> TaxonomyService:
    return services.taxonomy


@pytest.fixture
def workshop(services: Services) -> WorkshopService:
    return services.workshop


@pytest.fixture
def app(data_file: Path, tmp_path: Path) -> Flask:
    return create_app(
        {
            "TESTING": True,
            "DATA_PATH": data_file,
            "CLOCK": lambda: NOW,
            "FRONTEND_DIST": tmp_path / "missing-dist",
        }
    )


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    return app.test_client()


@pytest.fixture
def ash() -> Species:
    return Species("fraxinus-uhdei", "Fraxinus uhdei", "Tropical ash", 0.55, 25)


@pytest.fixture
def site() -> Location:
    return Location("parque-el-virrey", "Parque El Virrey", LocationKind.SITE, Coordinates(4.6732, -74.0548))


@pytest.fixture
def specimen(ash: Species, site: Location) -> Specimen:
    return Specimen(
        specimen_id="SP-0001",
        tag="BOG-CH-0001",
        species=ash,
        site=site,
        planted_on=date(2010, 4, 1),
        health=HealthStatus.GOOD,
        lean_deg=2,
        position=Coordinates(4.67, -74.05),
        measurements=[
            Measurement(date(2020, 3, 1), 10, 30, 6),
            Measurement(date(2024, 3, 1), 12, 38, 7),
        ],
    )
