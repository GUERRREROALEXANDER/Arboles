from __future__ import annotations

from flask import Blueprint

from api import serializers
from api.container import services
from api.parsing import query_number
from api.serializers import Json

blueprint = Blueprint("index", __name__, url_prefix="/api/index")


@blueprint.get("/dbh")
def dbh_range() -> Json:
    result = services().inventory.dbh_range(query_number("min"), query_number("max"))
    return serializers.dbh_range(result)


@blueprint.get("/dbh/tree")
def dbh_tree() -> Json:
    return serializers.dbh_tree(services().inventory.dbh_index)
