from __future__ import annotations

from flask import Blueprint

from api import serializers
from api.container import services
from api.serializers import Json

blueprint = Blueprint("system", __name__, url_prefix="/api")


@blueprint.get("/health")
def health() -> Json:
    return {"status": "ok"}


@blueprint.get("/summary")
def summary() -> Json:
    return serializers.summary(services().analytics.summary())


@blueprint.post("/reset")
def reset() -> Json:
    services().reset()
    return {"status": "ok"}
