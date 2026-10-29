"""Generate data/bogota.json deterministically.

Localities, parks and species are real; specimens, surveys and work orders are
synthetic. Run from the project root: python scripts/generate_dataset.py
"""

from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

SEED = 20261029
OUTPUT = Path(__file__).resolve().parent.parent / "data" / "bogota.json"
LAST_SURVEY = date(2026, 8, 31)


@dataclass(frozen=True)
class SpeciesProfile:
    id: str
    scientific_name: str
    common_name: str
    wood_density: float
    max_height_m: float
    dbh_cm_per_year: float
    crown_ratio: float


@dataclass(frozen=True)
class SiteProfile:
    id: str
    name: str
    lat: float
    lng: float
    specimens: int
    palette: tuple[str, ...]
    spread: float = 0.0022
    end: tuple[float, float] | None = None


TAXONOMY: list[tuple[str, str, list[tuple[str, list[SpeciesProfile]]]]] = [
    ("fagaceae", "Fagaceae", [
        ("quercus", [SpeciesProfile("quercus-humboldtii", "Quercus humboldtii", "Andean oak", 0.70, 25, 0.55, 0.55)]),
    ]),
    ("arecaceae", "Arecaceae", [
        ("ceroxylon", [SpeciesProfile("ceroxylon-quindiuense", "Ceroxylon quindiuense", "Quindio wax palm", 0.38, 45, 0.45, 0.18)]),
    ]),
    ("oleaceae", "Oleaceae", [
        ("fraxinus", [SpeciesProfile("fraxinus-uhdei", "Fraxinus uhdei", "Tropical ash", 0.55, 25, 0.95, 0.50)]),
    ]),
    ("bignoniaceae", "Bignoniaceae", [
        ("jacaranda", [SpeciesProfile("jacaranda-mimosifolia", "Jacaranda mimosifolia", "Jacaranda", 0.60, 15, 0.80, 0.75)]),
        ("tecoma", [SpeciesProfile("tecoma-stans", "Tecoma stans", "Yellow trumpetbush", 0.68, 8, 0.45, 0.70)]),
    ]),
    ("myrtaceae", "Myrtaceae", [
        ("eucalyptus", [SpeciesProfile("eucalyptus-globulus", "Eucalyptus globulus", "Tasmanian blue gum", 0.69, 40, 1.30, 0.35)]),
    ]),
    ("fabaceae", "Fabaceae", [
        ("acacia", [
            SpeciesProfile("acacia-melanoxylon", "Acacia melanoxylon", "Blackwood", 0.62, 25, 0.90, 0.50),
            SpeciesProfile("acacia-decurrens", "Acacia decurrens", "Green wattle", 0.68, 15, 0.85, 0.55),
        ]),
    ]),
    ("altingiaceae", "Altingiaceae", [
        ("liquidambar", [SpeciesProfile("liquidambar-styraciflua", "Liquidambar styraciflua", "Sweetgum", 0.52, 30, 0.75, 0.45)]),
    ]),
    ("moraceae", "Moraceae", [
        ("ficus", [SpeciesProfile("ficus-soatensis", "Ficus soatensis", "Soata fig", 0.48, 20, 1.10, 0.95)]),
    ]),
    ("betulaceae", "Betulaceae", [
        ("alnus", [SpeciesProfile("alnus-acuminata", "Alnus acuminata", "Andean alder", 0.37, 25, 1.00, 0.45)]),
    ]),
    ("juglandaceae", "Juglandaceae", [
        ("juglans", [SpeciesProfile("juglans-neotropica", "Juglans neotropica", "Andean walnut", 0.55, 25, 0.70, 0.55)]),
    ]),
    ("meliaceae", "Meliaceae", [
        ("cedrela", [SpeciesProfile("cedrela-montana", "Cedrela montana", "Mountain cedar", 0.49, 25, 0.75, 0.50)]),
    ]),
    ("cunoniaceae", "Cunoniaceae", [
        ("weinmannia", [SpeciesProfile("weinmannia-tomentosa", "Weinmannia tomentosa", "Encenillo", 0.63, 15, 0.40, 0.55)]),
    ]),
    ("cupressaceae", "Cupressaceae", [
        ("cupressus", [SpeciesProfile("cupressus-lusitanica", "Cupressus lusitanica", "Mexican cypress", 0.43, 30, 0.95, 0.30)]),
    ]),
    ("pinaceae", "Pinaceae", [
        ("pinus", [
            SpeciesProfile("pinus-patula", "Pinus patula", "Mexican weeping pine", 0.45, 30, 1.05, 0.35),
            SpeciesProfile("pinus-radiata", "Pinus radiata", "Monterey pine", 0.45, 35, 1.10, 0.35),
        ]),
    ]),
    ("euphorbiaceae", "Euphorbiaceae", [
        ("croton", [SpeciesProfile("croton-magdalenensis", "Croton magdalenensis", "Sangregado", 0.50, 12, 0.55, 0.60)]),
    ]),
]

STREET = ("jacaranda-mimosifolia", "fraxinus-uhdei", "tecoma-stans", "liquidambar-styraciflua", "acacia-melanoxylon")
NATIVE = ("quercus-humboldtii", "alnus-acuminata", "juglans-neotropica", "cedrela-montana", "weinmannia-tomentosa",
          "croton-magdalenensis", "ficus-soatensis")
WETLAND = ("alnus-acuminata", "ficus-soatensis", "weinmannia-tomentosa", "croton-magdalenensis", "fraxinus-uhdei")
FOREST = ("eucalyptus-globulus", "pinus-patula", "pinus-radiata", "cupressus-lusitanica", "acacia-decurrens",
          "acacia-melanoxylon", "quercus-humboldtii")
PARK = ("fraxinus-uhdei", "jacaranda-mimosifolia", "ceroxylon-quindiuense", "liquidambar-styraciflua",
        "quercus-humboldtii", "ficus-soatensis", "acacia-melanoxylon", "eucalyptus-globulus", "tecoma-stans")

LOCALITIES: list[tuple[str, str, str, list[SiteProfile]]] = [
    ("usaquen", "Usaquén", "US", [
        SiteProfile("parque-usaquen", "Parque de Usaquén", 4.6948, -74.0307, 12, PARK + NATIVE, 0.0012),
        SiteProfile("carrera-septima-usaquen", "Carrera Séptima (Calle 100 a 127)", 4.6845, -74.0393, 14, STREET,
                    end=(4.7040, -74.0295)),
    ]),
    ("chapinero", "Chapinero", "CH", [
        SiteProfile("parque-el-virrey", "Parque El Virrey", 4.6732, -74.0548, 16, PARK + WETLAND,
                    0.0010, end=(4.6760, -74.0480)),
        SiteProfile("parque-de-la-93", "Parque de la 93", 4.6766, -74.0484, 10, STREET + ("ceroxylon-quindiuense",),
                    0.0008),
        SiteProfile("carrera-septima-chapinero", "Carrera Séptima (Calle 45 a 72)", 4.6327, -74.0655, 12, STREET,
                    end=(4.6545, -74.0592)),
    ]),
    ("teusaquillo", "Teusaquillo", "TE", [
        SiteProfile("parque-simon-bolivar", "Parque Metropolitano Simón Bolívar", 4.6580, -74.0937, 24,
                    PARK + NATIVE + FOREST, 0.0055),
        SiteProfile("parque-de-los-novios", "Parque de los Novios", 4.6593, -74.0712, 14, PARK + WETLAND, 0.0025),
        SiteProfile("park-way", "Park Way (Carrera 24)", 4.6290, -74.0757, 10, STREET + ("ceroxylon-quindiuense",),
                    end=(4.6405, -74.0738)),
    ]),
    ("suba", "Suba", "SU", [
        SiteProfile("humedal-cordoba", "Humedal Córdoba", 4.7040, -74.0700, 16, WETLAND + NATIVE, 0.0030),
        SiteProfile("parque-mirador-de-los-nevados", "Parque Mirador de los Nevados", 4.7389, -74.0846, 11,
                    NATIVE + FOREST, 0.0018),
    ]),
    ("kennedy", "Kennedy", "KE", [
        SiteProfile("parque-timiza", "Parque Timiza", 4.6087, -74.1530, 15, PARK + WETLAND, 0.0028),
        SiteProfile("humedal-el-burro", "Humedal El Burro", 4.6345, -74.1455, 11, WETLAND, 0.0022),
    ]),
    ("santa-fe", "Santa Fe", "SF", [
        SiteProfile("parque-nacional", "Parque Nacional Enrique Olaya Herrera", 4.6235, -74.0640, 18,
                    FOREST + NATIVE + ("fraxinus-uhdei",), 0.0030),
        SiteProfile("parque-de-la-independencia", "Parque de la Independencia", 4.6110, -74.0695, 12,
                    PARK + ("ceroxylon-quindiuense", "quercus-humboldtii"), 0.0013),
    ]),
]

HEALTH_WEIGHTS = {"excellent": 12, "good": 40, "fair": 28, "poor": 12, "critical": 5, "dead": 3}


class DatasetGenerator:
    def __init__(self, seed: int) -> None:
        self._random = random.Random(seed)
        self._species = {s.id: s for _, _, genera in TAXONOMY for _, members in genera for s in members}

    def build(self) -> dict[str, object]:
        specimens = self._specimens()
        return {
            "city": self._city(),
            "taxonomy": self._taxonomy(),
            "specimens": specimens,
            "work_orders": self._work_orders(specimens),
        }

    @staticmethod
    def _city() -> dict[str, object]:
        return {
            "id": "bogota",
            "name": "Bogotá",
            "localities": [
                {
                    "id": locality_id,
                    "name": name,
                    "sites": [{"id": s.id, "name": s.name, "lat": s.lat, "lng": s.lng} for s in sites],
                }
                for locality_id, name, _, sites in LOCALITIES
            ],
        }

    @staticmethod
    def _taxonomy() -> list[dict[str, object]]:
        return [
            {
                "id": family_id,
                "name": family_name,
                "genera": [
                    {
                        "id": genus_id,
                        "name": members[0].scientific_name.split()[0],
                        "species": [
                            {
                                "id": s.id,
                                "scientific_name": s.scientific_name,
                                "common_name": s.common_name,
                                "wood_density": s.wood_density,
                                "max_height_m": s.max_height_m,
                            }
                            for s in members
                        ],
                    }
                    for genus_id, members in genera
                ],
            }
            for family_id, family_name, genera in TAXONOMY
        ]

    def _specimens(self) -> list[dict[str, object]]:
        specimens = []
        for _, _, code, sites in LOCALITIES:
            tag_number = 0
            for site in sites:
                for _ in range(site.specimens):
                    tag_number += 1
                    specimen_id = f"SP-{len(specimens) + 1:04d}"
                    specimens.append(self._specimen(specimen_id, f"BOG-{code}-{tag_number:04d}", site))
        return specimens

    def _specimen(self, specimen_id: str, tag: str, site: SiteProfile) -> dict[str, object]:
        rng = self._random
        profile = self._species[rng.choice(site.palette)]
        planted_on = date(rng.randint(1955, 2021), rng.randint(1, 12), rng.randint(1, 28))
        health = rng.choices(list(HEALTH_WEIGHTS), weights=list(HEALTH_WEIGHTS.values()))[0]
        lean = rng.uniform(0, 5) if rng.random() < 0.8 else rng.uniform(6, 22)
        if health in ("critical", "dead"):
            lean += rng.uniform(2, 8)
        lat, lng = self._position(site)
        return {
            "id": specimen_id,
            "tag": tag,
            "species_id": profile.id,
            "site_id": site.id,
            "planted_on": planted_on.isoformat(),
            "health": health,
            "lean_deg": round(lean, 1),
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "measurements": self._measurements(profile, planted_on, health),
        }

    def _position(self, site: SiteProfile) -> tuple[float, float]:
        rng = self._random
        if site.end is not None:
            t = rng.random()
            jitter = site.spread * 0.12 if site.spread else 0.00015
            return (
                site.lat + (site.end[0] - site.lat) * t + rng.uniform(-jitter, jitter),
                site.lng + (site.end[1] - site.lng) * t + rng.uniform(-jitter, jitter),
            )
        angle = rng.uniform(0, 2 * math.pi)
        radius = site.spread * math.sqrt(rng.random())
        return site.lat + radius * math.sin(angle), site.lng + radius * math.cos(angle)

    def _measurements(self, profile: SpeciesProfile, planted_on: date, health: str) -> list[dict[str, object]]:
        rng = self._random
        first_year = max(planted_on.year + 1, 2017)
        years = sorted(rng.sample(range(first_year, 2027), k=min(rng.randint(2, 5), 2027 - first_year)))
        vigor = rng.uniform(0.75, 1.15) * (0.7 if health in ("poor", "critical", "dead") else 1.0)
        surveys = []
        previous = (0.0, 0.0, 0.0)
        for year in years:
            surveyed = min(date(year, rng.randint(2, 11), rng.randint(1, 28)), LAST_SURVEY)
            age = (surveyed - planted_on).days / 365.25
            height = profile.max_height_m * vigor * (1 - math.exp(-age / 18)) + 1.2
            dbh = min(profile.dbh_cm_per_year * vigor * age + 3, 140)
            crown = height * profile.crown_ratio * rng.uniform(0.9, 1.1)
            current = (
                round(max(height, previous[0]), 1),
                round(max(dbh, previous[1] + 0.1), 1),
                round(max(crown, previous[2]), 1),
            )
            surveys.append({"date": surveyed.isoformat(), "height_m": current[0], "dbh_cm": current[1],
                            "crown_m": current[2]})
            previous = current
        unique = {survey["date"]: survey for survey in surveys}
        return list(unique.values())

    def _work_orders(self, specimens: list[dict[str, object]]) -> list[dict[str, object]]:
        rng = self._random
        chosen: set[str] = set()

        def pick(candidates: list[dict[str, object]], count: int) -> list[dict[str, object]]:
            pool = [s for s in candidates if s["id"] not in chosen]
            picked = rng.sample(pool, k=min(count, len(pool)))
            chosen.update(str(s["id"]) for s in picked)
            return picked

        def with_health(*statuses: str) -> list[dict[str, object]]:
            return [s for s in specimens if s["health"] in statuses]

        leaning = [s for s in specimens if float(s["lean_deg"]) >= 12 and s["health"] != "dead"]
        plan = [
            *[(s, "removal", "Dead standing tree near a footpath", None) for s in pick(with_health("dead"), 3)],
            *[(s, "cabling", "Codominant stems with included bark", None) for s in pick(with_health("critical"), 2)],
            *[(s, "pruning", "Lean toward the cycle lane; reduce crown weight", None) for s in pick(leaning, 2)],
            *[(s, "pest_treatment", "Defoliation and borer exit holes reported", 70) for s in pick(with_health("poor"), 2)],
            *[(s, "inspection", "Routine pre-rainy-season inspection", 30) for s in pick(with_health("good"), 2)],
            *[(s, "inspection", "Root heave lifting the sidewalk", 55) for s in pick(with_health("fair"), 1)],
        ]
        statuses = ["done"] * 2 + ["in_progress"] * 2 + ["queued"] * (len(plan) - 4)
        rng.shuffle(statuses)
        start = datetime(2026, 9, 1, 13, 0, tzinfo=UTC)
        orders = []
        for number, ((specimen, kind, notes, priority), status) in enumerate(zip(plan, statuses, strict=True), 1):
            created = start + timedelta(days=rng.randint(0, 50), hours=rng.randint(0, 9), minutes=rng.randint(0, 59))
            completed = created + timedelta(days=rng.randint(1, 6), hours=3) if status == "done" else None
            orders.append({
                "id": f"WO-{number:04d}",
                "specimen_id": specimen["id"],
                "kind": kind,
                "status": status,
                "priority": priority,
                "notes": notes,
                "created_at": created.isoformat(),
                "completed_at": completed.isoformat() if completed else None,
            })
        return orders


def main() -> None:
    document = DatasetGenerator(SEED).build()
    OUTPUT.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
