from __future__ import annotations

from flask import Blueprint

from api import serializers
from api.container import services
from api.serializers import Json

blueprint = Blueprint("locations", __name__, url_prefix="/api/locations")


@blueprint.get("/tree")
def tree() -> Json:
    inventory = services().inventory
    return serializers.location_node(inventory.location_node(inventory.city.id), inventory.location_stats())


@blueprint.get("/<location_id>")
def location(location_id: str) -> Json:
    inventory = services().inventory
    node = inventory.location_node(location_id)
    return {
        "node": serializers.location_node(node, {location_id: inventory.stats(location_id)}, nested=False),
        "path": [serializers.breadcrumb(step) for step in inventory.path(location_id)],
        "specimens": serializers.specimen_summaries(inventory.specimens_in(location_id)),
    }
