from __future__ import annotations

import pytest

from canopy.domain import WorkOrderKind, WorkOrderStatus
from canopy.errors import ConflictError, NotFoundError, ValidationError
from canopy.services import WorkshopService
from tests.conftest import NOW


def order_ids(orders) -> list[str]:
    return [order.id for order in orders]


def test_seed_order_without_priority_defaults_to_risk(workshop: WorkshopService) -> None:
    assert workshop.order("WO-0001").priority == 77


def test_orders_list_queue_in_pop_order_then_in_progress_then_done(workshop: WorkshopService) -> None:
    assert order_ids(workshop.orders()) == ["WO-0001", "WO-0003", "WO-0002", "WO-0005", "WO-0004"]


def test_orders_filter_by_status(workshop: WorkshopService) -> None:
    assert order_ids(workshop.orders(WorkOrderStatus.DONE)) == ["WO-0004"]


def test_dispatch_pops_highest_priority_and_starts_it(workshop: WorkshopService) -> None:
    order = workshop.dispatch()

    assert order.id == "WO-0001"
    assert order.status is WorkOrderStatus.IN_PROGRESS
    assert "WO-0001" not in order_ids(workshop.queue_snapshot())


def test_dispatch_breaks_ties_by_older_creation(workshop: WorkshopService) -> None:
    workshop.dispatch()

    assert workshop.dispatch().id == "WO-0003"


def test_dispatch_on_empty_queue_conflicts(workshop: WorkshopService) -> None:
    for _ in range(3):
        workshop.dispatch()

    with pytest.raises(ConflictError):
        workshop.dispatch()


def test_create_defaults_priority_to_specimen_risk(workshop: WorkshopService) -> None:
    order = workshop.create("SP-0003", WorkOrderKind.CABLING, notes="Brace leader")

    assert order.id == "WO-0006"
    assert order.priority == 70
    assert order.created_at == NOW
    assert order_ids(workshop.orders(WorkOrderStatus.QUEUED))[1] == "WO-0006"


def test_create_with_explicit_priority_can_jump_the_queue(workshop: WorkshopService) -> None:
    workshop.create("SP-0004", WorkOrderKind.INSPECTION, priority=100)

    assert workshop.dispatch().specimen.id == "SP-0004"


def test_create_rejects_duplicate_open_order_of_same_kind(workshop: WorkshopService) -> None:
    with pytest.raises(ConflictError):
        workshop.create("SP-0003", WorkOrderKind.PRUNING)


def test_create_allows_same_kind_once_previous_is_done(workshop: WorkshopService) -> None:
    order = workshop.create("SP-0001", WorkOrderKind.INSPECTION)

    assert order.status is WorkOrderStatus.QUEUED


def test_create_for_unknown_specimen(workshop: WorkshopService) -> None:
    with pytest.raises(NotFoundError):
        workshop.create("SP-9999", WorkOrderKind.PRUNING)


def test_create_rejects_out_of_range_priority(workshop: WorkshopService) -> None:
    with pytest.raises(ValidationError):
        workshop.create("SP-0001", WorkOrderKind.PRUNING, priority=0)


def test_complete_queued_order_leaves_the_heap(workshop: WorkshopService) -> None:
    order = workshop.complete("WO-0002")

    assert order.status is WorkOrderStatus.DONE
    assert order.completed_at == NOW
    assert "WO-0002" not in order_ids(workshop.queue_snapshot())


def test_complete_done_order_conflicts(workshop: WorkshopService) -> None:
    with pytest.raises(ConflictError):
        workshop.complete("WO-0004")


def test_done_orders_listed_newest_first(workshop: WorkshopService) -> None:
    workshop.complete("WO-0005")

    assert order_ids(workshop.orders(WorkOrderStatus.DONE)) == ["WO-0005", "WO-0004"]


def test_reprioritize_resifts_heap(workshop: WorkshopService) -> None:
    workshop.reprioritize("WO-0002", 95)

    assert workshop.queue_snapshot()[0].id == "WO-0002"


def test_reprioritize_in_progress_order_conflicts(workshop: WorkshopService) -> None:
    with pytest.raises(ConflictError):
        workshop.reprioritize("WO-0005", 50)


def test_delete_removes_from_queue_and_registry(workshop: WorkshopService) -> None:
    workshop.delete("WO-0001")

    assert workshop.dispatch().id == "WO-0003"
    with pytest.raises(NotFoundError):
        workshop.order("WO-0001")


def test_open_orders_for_specimen(workshop: WorkshopService) -> None:
    assert order_ids(workshop.open_orders_for("SP-0003")) == ["WO-0002"]
    assert workshop.open_orders_for("SP-0001") == ()


def test_open_count_excludes_done(workshop: WorkshopService) -> None:
    assert workshop.open_count == 4
