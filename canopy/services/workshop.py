from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import datetime

from canopy.domain.enums import WorkOrderKind, WorkOrderStatus
from canopy.domain.specimen import Specimen
from canopy.domain.work_order import WorkOrder, default_priority
from canopy.errors import ConflictError, NotFoundError
from canopy.services.inventory import InventoryService
from canopy.structures import BinaryHeap


def _urgency(order: WorkOrder) -> tuple[int, float]:
    """Higher priority first; among equals the older order wins."""
    return order.priority, -order.created_at.timestamp()


class WorkshopService:
    """Work order lifecycle around a priority queue of queued jobs."""

    def __init__(
        self,
        inventory: InventoryService,
        orders: Iterable[WorkOrder],
        *,
        clock: Callable[[], datetime],
    ) -> None:
        self._inventory = inventory
        self._clock = clock
        self._orders: dict[str, WorkOrder] = {}
        self._queue: BinaryHeap[WorkOrder] = BinaryHeap(key=_urgency, identity=lambda order: order.id)
        for order in sorted(orders, key=lambda o: (o.created_at, o.id)):
            self._admit(order)
        inventory.on_specimen_removed(self._discard_orders_for)

    @property
    def open_count(self) -> int:
        return sum(order.is_open for order in self._orders.values())

    def order(self, order_id: str) -> WorkOrder:
        try:
            return self._orders[order_id]
        except KeyError:
            raise NotFoundError(f"no work order with id {order_id!r}") from None

    def orders(self, status: WorkOrderStatus | None = None) -> tuple[WorkOrder, ...]:
        """Queued orders in dispatch order, then in-progress and done orders, newest first."""
        queued = self._queue.ordered()
        in_progress = self._newest_first(WorkOrderStatus.IN_PROGRESS, lambda o: o.created_at)
        done = self._newest_first(WorkOrderStatus.DONE, lambda o: o.completed_at or o.created_at)
        listing = {
            WorkOrderStatus.QUEUED: queued,
            WorkOrderStatus.IN_PROGRESS: in_progress,
            WorkOrderStatus.DONE: done,
        }
        if status is not None:
            return tuple(listing[status])
        return (*queued, *in_progress, *done)

    def queue_snapshot(self) -> tuple[WorkOrder, ...]:
        return self._queue.snapshot()

    def open_orders_for(self, specimen_id: str) -> tuple[WorkOrder, ...]:
        return tuple(
            sorted(
                (o for o in self._orders.values() if o.specimen.id == specimen_id and o.is_open),
                key=lambda o: (o.status is not WorkOrderStatus.IN_PROGRESS, -o.priority, o.created_at),
            )
        )

    def create(
        self,
        specimen_id: str,
        kind: WorkOrderKind,
        *,
        notes: str = "",
        priority: int | None = None,
    ) -> WorkOrder:
        specimen = self._inventory.specimen(specimen_id)
        if any(o.kind is kind for o in self.open_orders_for(specimen_id)):
            raise ConflictError(f"specimen {specimen.tag} already has an open {kind} order")
        order = WorkOrder(
            order_id=self._next_id(),
            specimen=specimen,
            kind=kind,
            priority=priority if priority is not None else default_priority(specimen),
            created_at=self._clock(),
            notes=notes,
        )
        self._admit(order)
        return order

    def dispatch(self) -> WorkOrder:
        if not self._queue:
            raise ConflictError("the work queue is empty")
        order = self._queue.pop()
        order.start()
        return order

    def complete(self, order_id: str) -> WorkOrder:
        order = self.order(order_id)
        order.complete(self._clock())
        if order.id in self._queue:
            self._queue.remove(order.id)
        return order

    def reprioritize(self, order_id: str, priority: int) -> WorkOrder:
        order = self.order(order_id)
        order.reprioritize(priority)
        self._queue.update(order.id)
        return order

    def delete(self, order_id: str) -> None:
        order = self.order(order_id)
        if order.id in self._queue:
            self._queue.remove(order.id)
        del self._orders[order.id]

    def _admit(self, order: WorkOrder) -> None:
        if order.id in self._orders:
            raise ConflictError(f"work order {order.id} already exists")
        self._inventory.specimen(order.specimen.id)
        self._orders[order.id] = order
        if order.status is WorkOrderStatus.QUEUED:
            self._queue.push(order)

    def _discard_orders_for(self, specimen: Specimen) -> None:
        for order in [o for o in self._orders.values() if o.specimen.id == specimen.id]:
            self.delete(order.id)

    def _newest_first(
        self, status: WorkOrderStatus, moment: Callable[[WorkOrder], datetime]
    ) -> list[WorkOrder]:
        return sorted(
            (o for o in self._orders.values() if o.status is status),
            key=lambda o: (moment(o), o.id),
            reverse=True,
        )

    def _next_id(self) -> str:
        numbers = (int(oid.rsplit("-", 1)[-1]) for oid in self._orders if oid.rsplit("-", 1)[-1].isdigit())
        return f"WO-{max(numbers, default=0) + 1:04d}"
