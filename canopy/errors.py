from __future__ import annotations


class CanopyError(Exception):
    """Base class for every error the application reports to its clients."""

    code = "error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(CanopyError):
    code = "not_found"


class ValidationError(CanopyError):
    code = "validation"


class ConflictError(CanopyError):
    code = "conflict"
