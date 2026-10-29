from __future__ import annotations

from flask import Blueprint

from api import serializers
from api.container import services
from api.parsing import json_body, member, query_member, required
from api.serializers import Json
from canopy.domain import WorkOrderKind, WorkOrderStatus
from canopy.errors import ValidationError

blueprint = Blueprint("workorders", __name__, url_prefix="/api/workorders")


@blueprint.get("")
def listing() -> Json:
    orders = services().workshop.orders(query_member("status", WorkOrderStatus))
    return {"items": [serializers.work_order(order) for order in orders]}


@blueprint.get("/heap")
def heap() -> Json:
    return serializers.work_queue(services().workshop.queue_snapshot())


@blueprint.post("")
def create() -> tuple[Json, int]:
    payload = json_body()
    specimen_id = required(payload, "specimen_id")
    if not isinstance(specimen_id, str):
        raise ValidationError("specimen_id must be a string")
    order = services().workshop.create(
        specimen_id,
        member("kind", required(payload, "kind"), WorkOrderKind),
        notes=payload.get("notes") or "",
        priority=payload.get("priority"),
    )
    return serializers.work_order(order), 201


@blueprint.post("/dispatch")
def dispatch() -> Json:
    return serializers.work_order(services().workshop.dispatch())


@blueprint.post("/<order_id>/complete")
def complete(order_id: str) -> Json:
    return serializers.work_order(services().workshop.complete(order_id))


@blueprint.patch("/<order_id>")
def reprioritize(order_id: str) -> Json:
    priority = required(json_body(), "priority")
    return serializers.work_order(services().workshop.reprioritize(order_id, priority))


@blueprint.delete("/<order_id>")
def delete(order_id: str) -> tuple[str, int]:
    services().workshop.delete(order_id)
    return "", 204
