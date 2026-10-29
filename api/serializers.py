"""Domain objects to JSON-ready dicts, following docs/API.md field for field."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import datetime
from typing import Any

from canopy.domain import Location, Measurement, Specimen, Stats, Taxon, WorkOrder
from canopy.services import DbhRange, Outbreak, Relatedness, Summary
from canopy.services.inventory import Place
from canopy.structures import AVLTree, TreeNode

type Json = dict[str, Any]


def breadcrumb(item: Location | Taxon) -> Json:
    return {"id": item.id, "name": item.name}


def ranked_breadcrumb(taxon: Taxon) -> Json:
    return {**breadcrumb(taxon), "rank": taxon.rank.value}


def stats(figures: Stats) -> Json:
    return {
        "specimens": figures.specimens,
        "species": figures.species,
        "mean_health": round(figures.mean_health, 1),
        "at_risk": figures.at_risk,
        "co2_tonnes": round(figures.co2_tonnes, 2),
        "canopy_m2": round(figures.canopy_m2, 1),
        "health_breakdown": {status.value: count for status, count in figures.health_breakdown.items()},
    }


def specimen_summary(specimen: Specimen) -> Json:
    return {
        "id": specimen.id,
        "tag": specimen.tag,
        "species_id": specimen.species.id,
        "common_name": specimen.species.common_name,
        "scientific_name": specimen.species.scientific_name,
        "site_id": specimen.site.id,
        "site_name": specimen.site.name,
        "health": specimen.health.value,
        "health_score": specimen.health_score,
        "risk": specimen.risk,
        "height_m": round(specimen.height_m, 1),
        "dbh_cm": round(specimen.dbh_cm, 1),
        "crown_m": round(specimen.crown_m, 1),
        "lat": round(specimen.position.lat, 6),
        "lng": round(specimen.position.lng, 6),
    }


def specimen_summaries(specimens: Iterable[Specimen]) -> list[Json]:
    return [specimen_summary(specimen) for specimen in specimens]


def measurement(survey: Measurement) -> Json:
    return {
        "date": survey.date.isoformat(),
        "height_m": round(survey.height_m, 1),
        "dbh_cm": round(survey.dbh_cm, 1),
        "crown_m": round(survey.crown_m, 1),
    }


def specimen_detail(
    specimen: Specimen,
    *,
    path: Iterable[Location],
    lineage: Iterable[Taxon],
    open_orders: Iterable[WorkOrder],
) -> Json:
    growth = specimen.growth
    return {
        **specimen_summary(specimen),
        "planted_on": specimen.planted_on.isoformat(),
        "lean_deg": round(specimen.lean_deg, 1),
        "co2_kg": round(specimen.co2_kg, 1),
        "canopy_m2": round(specimen.canopy_m2, 1),
        "path": [breadcrumb(location) for location in path],
        "taxonomy": [breadcrumb(taxon) for taxon in lineage],
        "measurements": [measurement(survey) for survey in specimen.measurements],
        "growth": {
            "height_m_per_year": round(growth.height_m_per_year, 2),
            "dbh_cm_per_year": round(growth.dbh_cm_per_year, 2),
            "crown_m_per_year": round(growth.crown_m_per_year, 2),
        },
        "open_work_orders": [work_order(order) for order in open_orders],
    }


def location_node(node: TreeNode[Place], figures: Mapping[str, Stats], *, nested: bool = True) -> Json:
    location = node.value
    assert isinstance(location, Location)
    rendered: Json = {
        "id": location.id,
        "name": location.name,
        "kind": location.kind.value,
        "stats": stats(figures[location.id]),
    }
    if nested:
        rendered["children"] = [
            location_node(child, figures)
            for child in node.children
            if isinstance(child.value, Location)
        ]
    return rendered


def taxonomy_tree(root: TreeNode[Taxon], counts: Mapping[str, int]) -> Json:
    def render(node: TreeNode[Taxon]) -> Json:
        taxon = node.value
        return {
            "id": taxon.id,
            "name": taxon.name,
            "rank": taxon.rank.value,
            "common_name": taxon.common_name,
            "specimens": counts[taxon.id],
            "children": [render(child) for child in node.children],
        }

    return {
        "id": root.value.id,
        "name": root.value.name,
        "rank": root.value.rank.value,
        "specimens": counts[root.id],
        "children": [render(child) for child in root.children],
    }


def relatedness(result: Relatedness) -> Json:
    return {
        "a": breadcrumb(result.first),
        "b": breadcrumb(result.second),
        "common_ancestor": ranked_breadcrumb(result.common_ancestor),
        "distance": result.distance,
        "path": [breadcrumb(taxon) for taxon in result.path],
    }


def outbreak(result: Outbreak) -> Json:
    return {
        "taxon": ranked_breadcrumb(result.taxon),
        "total": result.total,
        "at_risk": result.at_risk,
        "by_site": [
            {"site_id": exposure.site.id, "site_name": exposure.site.name, "count": exposure.count}
            for exposure in result.by_site
        ],
        "specimens": specimen_summaries(result.specimens),
    }


def summary(result: Summary) -> Json:
    return {
        "stats": stats(result.stats),
        "sites": result.sites,
        "localities": result.localities,
        "open_work_orders": result.open_work_orders,
        "top_species": [
            {"species_id": entry.species.id, "common_name": entry.species.common_name, "count": entry.count}
            for entry in result.top_species
        ],
        "co2_by_locality": [
            {
                "id": entry.locality.id,
                "name": entry.locality.name,
                "co2_tonnes": round(entry.stats.co2_tonnes, 2),
                "mean_health": round(entry.stats.mean_health, 1),
            }
            for entry in result.by_locality
        ],
    }


def dbh_range(result: DbhRange) -> Json:
    return {
        "min": result.min,
        "max": result.max,
        "items": specimen_summaries(result.items),
        "visited": result.visited,
    }


def dbh_tree(index: AVLTree[tuple[float, str], Specimen]) -> Json:
    def describe(key: tuple[float, str], specimen: Specimen) -> Json:
        return {"key": round(key[0], 1), "specimen_id": specimen.id, "tag": specimen.tag}

    return {
        "size": len(index),
        "height": index.height,
        "rotations": index.rotations,
        "root": index.to_dict(describe),
    }


def work_order(order: WorkOrder) -> Json:
    return {
        "id": order.id,
        "specimen_id": order.specimen.id,
        "specimen_tag": order.specimen.tag,
        "common_name": order.specimen.species.common_name,
        "site_name": order.specimen.site.name,
        "kind": order.kind.value,
        "status": order.status.value,
        "priority": order.priority,
        "notes": order.notes,
        "created_at": _timestamp(order.created_at),
        "completed_at": _timestamp(order.completed_at) if order.completed_at else None,
    }


def work_queue(orders: Iterable[WorkOrder]) -> Json:
    items = [
        {
            "index": index,
            "id": order.id,
            "priority": order.priority,
            "kind": order.kind.value,
            "specimen_tag": order.specimen.tag,
        }
        for index, order in enumerate(orders)
    ]
    return {"size": len(items), "items": items}


def _timestamp(moment: datetime) -> str:
    return moment.isoformat(timespec="seconds")
