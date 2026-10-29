from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from canopy.domain import HealthStatus, Specimen, WorkOrder, WorkOrderKind, WorkOrderStatus
from canopy.domain.work_order import default_priority
from canopy.errors import ConflictError, ValidationError

CREATED = datetime(2026, 10, 1, 9, 0, tzinfo=UTC)


@pytest.fixture
def order(specimen: Specimen) -> WorkOrder:
    return WorkOrder("WO-0001", specimen, WorkOrderKind.PRUNING, 50, CREATED, notes="  Lift crown  ")


def test_new_order_is_queued_with_trimmed_notes(order: WorkOrder) -> None:
    assert order.status is WorkOrderStatus.QUEUED
    assert order.is_open
    assert order.notes == "Lift crown"
    assert order.completed_at is None


def test_start_moves_queued_to_in_progress(order: WorkOrder) -> None:
    order.start()

    assert order.status is WorkOrderStatus.IN_PROGRESS


def test_start_twice_conflicts(order: WorkOrder) -> None:
    order.start()

    with pytest.raises(ConflictError):
        order.start()


def test_complete_sets_done_and_timestamp(order: WorkOrder) -> None:
    finished = CREATED + timedelta(hours=4)

    order.complete(finished)

    assert order.status is WorkOrderStatus.DONE
    assert order.completed_at == finished
    assert not order.is_open


def test_complete_twice_conflicts(order: WorkOrder) -> None:
    order.complete(CREATED + timedelta(hours=1))

    with pytest.raises(ConflictError):
        order.complete(CREATED + timedelta(hours=2))


def test_complete_before_creation_is_invalid(order: WorkOrder) -> None:
    with pytest.raises(ValidationError):
        order.complete(CREATED - timedelta(days=1))


def test_reprioritize_only_while_queued(order: WorkOrder) -> None:
    order.reprioritize(80)
    order.start()

    assert order.priority == 80
    with pytest.raises(ConflictError):
        order.reprioritize(10)


@pytest.mark.parametrize("priority", [0, 101, 50.5, "high", True])
def test_priority_must_be_integer_between_1_and_100(specimen: Specimen, priority: object) -> None:
    with pytest.raises(ValidationError):
        WorkOrder("WO-1", specimen, WorkOrderKind.INSPECTION, priority, CREATED)  # type: ignore[arg-type]


def test_created_at_must_be_timezone_aware(specimen: Specimen) -> None:
    with pytest.raises(ValidationError):
        WorkOrder("WO-1", specimen, WorkOrderKind.INSPECTION, 5, datetime(2026, 1, 1))


def test_done_order_requires_completed_at(specimen: Specimen) -> None:
    with pytest.raises(ValidationError):
        WorkOrder("WO-1", specimen, WorkOrderKind.INSPECTION, 5, CREATED, status=WorkOrderStatus.DONE)


def test_default_priority_is_specimen_risk(specimen: Specimen) -> None:
    assert default_priority(specimen) == specimen.risk == 24


def test_default_priority_is_at_least_one(specimen: Specimen) -> None:
    specimen.assess(health=HealthStatus.EXCELLENT, lean_deg=0)
    tiny = specimen.risk

    assert default_priority(specimen) == max(1, tiny)
