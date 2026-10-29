from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

from canopy.domain.enums import HealthStatus, LocationKind, TaxonRank, WorkOrderKind, WorkOrderStatus
from canopy.domain.location import Coordinates, Location
from canopy.domain.species import Species, Taxon
from canopy.domain.specimen import Measurement, Specimen
from canopy.domain.work_order import WorkOrder, default_priority
from canopy.errors import ValidationError
from canopy.structures import GeneralTree

TAXONOMY_ROOT = Taxon("root", "Urban forest", TaxonRank.ROOT)


@dataclass(frozen=True, slots=True)
class Dataset:
    locations: GeneralTree[Location]
    taxonomy: GeneralTree[Taxon]
    species: Mapping[str, Species]
    specimens: tuple[Specimen, ...]
    work_orders: tuple[WorkOrder, ...]


class JsonRepository:
    """Reads and writes the whole dataset as one JSON document."""

    def __init__(self, path: Path | str) -> None:
        self._path = Path(path)

    @property
    def path(self) -> Path:
        return self._path

    def load(self) -> Dataset:
        with self._path.open(encoding="utf-8") as handle:
            document = json.load(handle)
        try:
            return _DocumentReader(document).read()
        except (KeyError, TypeError) as error:
            raise ValidationError(f"malformed dataset {self._path.name}: {error!r}") from error

    def save(self, dataset: Dataset) -> None:
        document = _DocumentWriter(dataset).write()
        self._path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


class _DocumentReader:
    def __init__(self, document: dict[str, Any]) -> None:
        self._document = document
        self._sites: dict[str, Location] = {}
        self._species: dict[str, Species] = {}

    def read(self) -> Dataset:
        locations = self._read_locations(self._document["city"])
        taxonomy = self._read_taxonomy(self._document["taxonomy"])
        specimens = {raw["id"]: self._read_specimen(raw) for raw in self._document["specimens"]}
        orders = tuple(self._read_order(raw, specimens) for raw in self._document.get("work_orders", []))
        return Dataset(locations, taxonomy, dict(self._species), tuple(specimens.values()), orders)

    def _read_locations(self, raw_city: dict[str, Any]) -> GeneralTree[Location]:
        tree = GeneralTree(raw_city["id"], Location(raw_city["id"], raw_city["name"], LocationKind.CITY))
        for raw_locality in raw_city["localities"]:
            locality = Location(raw_locality["id"], raw_locality["name"], LocationKind.LOCALITY)
            tree.add_child(tree.root.id, locality.id, locality)
            for raw_site in raw_locality["sites"]:
                site = Location(
                    raw_site["id"],
                    raw_site["name"],
                    LocationKind.SITE,
                    Coordinates(raw_site["lat"], raw_site["lng"]),
                )
                tree.add_child(locality.id, site.id, site)
                self._sites[site.id] = site
        return tree

    def _read_taxonomy(self, raw_families: list[dict[str, Any]]) -> GeneralTree[Taxon]:
        tree = GeneralTree(TAXONOMY_ROOT.id, TAXONOMY_ROOT)
        for raw_family in raw_families:
            tree.add_child(tree.root.id, raw_family["id"], Taxon(raw_family["id"], raw_family["name"], TaxonRank.FAMILY))
            for raw_genus in raw_family["genera"]:
                genus = Taxon(raw_genus["id"], raw_genus["name"], TaxonRank.GENUS)
                tree.add_child(raw_family["id"], genus.id, genus)
                for raw_species in raw_genus["species"]:
                    species = Species(
                        raw_species["id"],
                        raw_species["scientific_name"],
                        raw_species["common_name"],
                        raw_species["wood_density"],
                        raw_species["max_height_m"],
                    )
                    tree.add_child(genus.id, species.id, Taxon.of_species(species))
                    self._species[species.id] = species
        return tree

    def _read_specimen(self, raw: dict[str, Any]) -> Specimen:
        return Specimen(
            specimen_id=raw["id"],
            tag=raw["tag"],
            species=self._lookup(self._species, raw["species_id"], "species"),
            site=self._lookup(self._sites, raw["site_id"], "site"),
            planted_on=date.fromisoformat(raw["planted_on"]),
            health=HealthStatus(raw["health"]),
            lean_deg=raw["lean_deg"],
            position=Coordinates(raw["lat"], raw["lng"]),
            measurements=[
                Measurement(date.fromisoformat(m["date"]), m["height_m"], m["dbh_cm"], m["crown_m"])
                for m in raw["measurements"]
            ],
        )

    def _read_order(self, raw: dict[str, Any], specimens: Mapping[str, Specimen]) -> WorkOrder:
        specimen = self._lookup(specimens, raw["specimen_id"], "specimen")
        completed_at = raw.get("completed_at")
        priority = raw.get("priority")
        return WorkOrder(
            order_id=raw["id"],
            specimen=specimen,
            kind=WorkOrderKind(raw["kind"]),
            priority=priority if priority is not None else default_priority(specimen),
            created_at=datetime.fromisoformat(raw["created_at"]),
            notes=raw.get("notes", ""),
            status=WorkOrderStatus(raw["status"]),
            completed_at=datetime.fromisoformat(completed_at) if completed_at else None,
        )

    @staticmethod
    def _lookup[V](registry: Mapping[str, V], key: str, label: str) -> V:
        try:
            return registry[key]
        except KeyError:
            raise ValidationError(f"dataset refers to unknown {label} {key!r}") from None


class _DocumentWriter:
    def __init__(self, dataset: Dataset) -> None:
        self._dataset = dataset

    def write(self) -> dict[str, Any]:
        return {
            "city": self._write_city(),
            "taxonomy": self._write_taxonomy(),
            "specimens": [self._write_specimen(s) for s in self._dataset.specimens],
            "work_orders": [self._write_order(o) for o in self._dataset.work_orders],
        }

    def _write_city(self) -> dict[str, Any]:
        city = self._dataset.locations.root
        return {
            "id": city.id,
            "name": city.value.name,
            "localities": [
                {
                    "id": locality.id,
                    "name": locality.value.name,
                    "sites": [self._write_site(site.value) for site in locality.children],
                }
                for locality in city.children
            ],
        }

    @staticmethod
    def _write_site(site: Location) -> dict[str, Any]:
        center = site.center
        assert center is not None
        return {"id": site.id, "name": site.name, "lat": center.lat, "lng": center.lng}

    def _write_taxonomy(self) -> list[dict[str, Any]]:
        species = self._dataset.species
        return [
            {
                "id": family.id,
                "name": family.value.name,
                "genera": [
                    {
                        "id": genus.id,
                        "name": genus.value.name,
                        "species": [self._write_species(species[leaf.id]) for leaf in genus.children],
                    }
                    for genus in family.children
                ],
            }
            for family in self._dataset.taxonomy.root.children
        ]

    @staticmethod
    def _write_species(species: Species) -> dict[str, Any]:
        return {
            "id": species.id,
            "scientific_name": species.scientific_name,
            "common_name": species.common_name,
            "wood_density": species.wood_density,
            "max_height_m": species.max_height_m,
        }

    @staticmethod
    def _write_specimen(specimen: Specimen) -> dict[str, Any]:
        return {
            "id": specimen.id,
            "tag": specimen.tag,
            "species_id": specimen.species.id,
            "site_id": specimen.site.id,
            "planted_on": specimen.planted_on.isoformat(),
            "health": specimen.health.value,
            "lean_deg": specimen.lean_deg,
            "lat": specimen.position.lat,
            "lng": specimen.position.lng,
            "measurements": [
                {"date": m.date.isoformat(), "height_m": m.height_m, "dbh_cm": m.dbh_cm, "crown_m": m.crown_m}
                for m in specimen.measurements
            ],
        }

    @staticmethod
    def _write_order(order: WorkOrder) -> dict[str, Any]:
        return {
            "id": order.id,
            "specimen_id": order.specimen.id,
            "kind": order.kind.value,
            "status": order.status.value,
            "priority": order.priority,
            "notes": order.notes,
            "created_at": order.created_at.isoformat(),
            "completed_at": order.completed_at.isoformat() if order.completed_at else None,
        }
