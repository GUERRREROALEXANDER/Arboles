from __future__ import annotations

from datetime import datetime

from canopy.domain.enums import WorkOrderKind, WorkOrderStatus
from canopy.domain.specimen import Specimen
from canopy.domain.validation import require_integer, require_member, require_text
from canopy.errors import ConflictError, ValidationError

MIN_PRIORITY = 1
MAX_PRIORITY = 100
MAX_NOTES_LENGTH = 500


def default_priority(specimen: Specimen) -> int:
    """Orders without an explicit priority inherit the specimen risk score."""
    return max(MIN_PRIORITY, min(MAX_PRIORITY, specimen.risk))


class WorkOrder:
    """A crew job on one specimen: queued, then in progress, then done."""

    def __init__(
        self,
        order_id: str,
        specimen: Specimen,
        kind: WorkOrderKind,
        priority: int,
        created_at: datetime,
        notes: str = "",
        status: WorkOrderStatus = WorkOrderStatus.QUEUED,
        completed_at: datetime | None = None,
    ) -> None:
        self._id = require_text("work order id", order_id)
        self._specimen = specimen
        self._kind = require_member("kind", kind, WorkOrderKind)
        self._priority = self._require_priority(priority)
        self._notes = self._require_notes(notes)
        self._created_at = self._require_moment("created_at", created_at)
        self._status = require_member("status", status, WorkOrderStatus)
        self._completed_at: datetime | None = None
        if self._status is WorkOrderStatus.DONE:
            if completed_at is None:
                raise ValidationError("a done work order needs completed_at")
            self._completed_at = self._require_completion(completed_at)
        elif completed_at is not None:
            raise ValidationError("only done work orders have completed_at")

    @property
    def id(self) -> str:
        return self._id

    @property
    def specimen(self) -> Specimen:
        return self._specimen

    @property
    def kind(self) -> WorkOrderKind:
        return self._kind

    @property
    def priority(self) -> int:
        return self._priority

    @property
    def notes(self) -> str:
        return self._notes

    @property
    def created_at(self) -> datetime:
        return self._created_at

    @property
    def status(self) -> WorkOrderStatus:
        return self._status

    @property
    def completed_at(self) -> datetime | None:
        return self._completed_at

    @property
    def is_open(self) -> bool:
        return self._status.is_open

    def start(self) -> None:
        if self._status is not WorkOrderStatus.QUEUED:
            raise ConflictError(f"work order {self._id} is {self._status}, not queued")
        self._status = WorkOrderStatus.IN_PROGRESS

    def complete(self, at: datetime) -> None:
        if self._status is WorkOrderStatus.DONE:
            raise ConflictError(f"work order {self._id} is already done")
        self._completed_at = self._require_completion(at)
        self._status = WorkOrderStatus.DONE

    def reprioritize(self, priority: int) -> None:
        if self._status is not WorkOrderStatus.QUEUED:
            raise ConflictError(f"only queued work orders can be reprioritized; {self._id} is {self._status}")
        self._priority = self._require_priority(priority)

    def _require_completion(self, at: datetime) -> datetime:
        moment = self._require_moment("completed_at", at)
        if moment < self._created_at:
            raise ValidationError("completed_at cannot precede created_at")
        return moment

    @staticmethod
    def _require_priority(priority: object) -> int:
        return require_integer("priority", priority, minimum=MIN_PRIORITY, maximum=MAX_PRIORITY)

    @staticmethod
    def _require_notes(notes: object) -> str:
        if not isinstance(notes, str):
            raise ValidationError("notes must be a string")
        if len(notes) > MAX_NOTES_LENGTH:
            raise ValidationError(f"notes must be at most {MAX_NOTES_LENGTH} characters")
        return notes.strip()

    @staticmethod
    def _require_moment(name: str, value: object) -> datetime:
        if not isinstance(value, datetime) or value.tzinfo is None:
            raise ValidationError(f"{name} must be a timezone-aware datetime")
        return value

    def __repr__(self) -> str:
        return f"WorkOrder({self._id!r}, {self._kind}, {self._status})"
