from __future__ import annotations

from flask import Blueprint

from api import serializers
from api.container import services
from api.parsing import json_body, query_text, required
from api.serializers import Json
from canopy.errors import ValidationError

blueprint = Blueprint("taxonomy", __name__, url_prefix="/api/taxonomy")


@blueprint.get("/tree")
def tree() -> Json:
    taxonomy = services().taxonomy
    return serializers.taxonomy_tree(taxonomy.root, taxonomy.specimen_counts())


@blueprint.get("/relatedness")
def relatedness() -> Json:
    first, second = query_text("a"), query_text("b")
    if first is None or second is None:
        raise ValidationError("query parameters a and b are required")
    return serializers.relatedness(services().taxonomy.relatedness(first, second))


@blueprint.post("/outbreak")
def outbreak() -> Json:
    taxon_id = required(json_body(), "taxon_id")
    if not isinstance(taxon_id, str):
        raise ValidationError("taxon_id must be a string")
    return serializers.outbreak(services().taxonomy.outbreak(taxon_id))
