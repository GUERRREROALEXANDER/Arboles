from __future__ import annotations

from flask import Blueprint

from api import serializers
from api.container import services
from api.parsing import iso_date, json_body, member, query_integer, query_member, query_text, required
from api.serializers import Json
from canopy.domain import HealthStatus, Measurement, Specimen
from canopy.errors import ValidationError
from canopy.services import SpecimenDraft
from canopy.services.inventory import DEFAULT_SEARCH_LIMIT

blueprint = Blueprint("specimens", __name__, url_prefix="/api/specimens")


def _detail(specimen: Specimen) -> Json:
    container = services()
    return serializers.specimen_detail(
        specimen,
        path=container.inventory.path(specimen.id),
        lineage=container.taxonomy.lineage(specimen.species.id),
        open_orders=container.workshop.open_orders_for(specimen.id),
    )


@blueprint.get("")
def search() -> Json:
    container = services()
    taxon_id = query_text("species")
    page = container.inventory.search(
        location_id=query_text("site"),
        species_ids=container.taxonomy.species_under(taxon_id) if taxon_id else None,
        health=query_member("health", HealthStatus),
        query=query_text("q"),
        limit=query_integer("limit", DEFAULT_SEARCH_LIMIT),
    )
    return {"items": serializers.specimen_summaries(page.items), "total": page.total}


@blueprint.get("/<specimen_id>")
def detail(specimen_id: str) -> Json:
    return _detail(services().inventory.specimen(specimen_id))


@blueprint.post("")
def register() -> tuple[Json, int]:
    payload = json_body()
    draft = SpecimenDraft(
        site_id=required(payload, "site_id"),
        species_id=required(payload, "species_id"),
        tag=required(payload, "tag"),
        planted_on=iso_date("planted_on", required(payload, "planted_on")),
        health=member("health", required(payload, "health"), HealthStatus),
        height_m=required(payload, "height_m"),
        dbh_cm=required(payload, "dbh_cm"),
        crown_m=required(payload, "crown_m"),
        lean_deg=payload.get("lean_deg", 0.0),
        lat=required(payload, "lat"),
        lng=required(payload, "lng"),
    )
    return _detail(services().inventory.register(draft)), 201


@blueprint.patch("/<specimen_id>")
def assess(specimen_id: str) -> Json:
    payload = json_body()
    health = payload.get("health")
    specimen = services().inventory.assess(
        specimen_id,
        health=member("health", health, HealthStatus) if health is not None else None,
        lean_deg=payload.get("lean_deg"),
    )
    return _detail(specimen)


@blueprint.post("/<specimen_id>/measurements")
def record_measurement(specimen_id: str) -> tuple[Json, int]:
    payload = json_body()
    measurement = Measurement(
        date=iso_date("date", required(payload, "date")),
        height_m=required(payload, "height_m"),
        dbh_cm=required(payload, "dbh_cm"),
        crown_m=required(payload, "crown_m"),
    )
    return _detail(services().inventory.record_measurement(specimen_id, measurement)), 201


@blueprint.post("/<specimen_id>/move")
def move(specimen_id: str) -> Json:
    site_id = required(json_body(), "site_id")
    if not isinstance(site_id, str):
        raise ValidationError("site_id must be a string")
    return _detail(services().inventory.move(specimen_id, site_id))


@blueprint.delete("/<specimen_id>")
def remove(specimen_id: str) -> tuple[str, int]:
    services().inventory.remove(specimen_id)
    return "", 204
