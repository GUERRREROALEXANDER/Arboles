"""Request parsing: turns raw JSON bodies and query strings into typed values."""

from __future__ import annotations

from datetime import date
from enum import StrEnum
from typing import Any

from flask import request

from canopy.domain.validation import require_member
from canopy.errors import ValidationError

_MISSING = object()


def json_body() -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValidationError("request body must be a JSON object")
    return payload


def required(payload: dict[str, Any], name: str) -> Any:
    value = payload.get(name, _MISSING)
    if value is _MISSING or value is None:
        raise ValidationError(f"{name} is required")
    return value


def iso_date(name: str, value: object) -> date:
    if not isinstance(value, str):
        raise ValidationError(f"{name} must be an ISO date (YYYY-MM-DD)")
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ValidationError(f"{name} must be an ISO date (YYYY-MM-DD)") from None


def member[E: StrEnum](name: str, value: object, enum_type: type[E]) -> E:
    return require_member(name, value, enum_type)


def query_text(name: str) -> str | None:
    value = request.args.get(name, "").strip()
    return value or None


def query_number(name: str) -> float | None:
    raw = query_text(name)
    if raw is None:
        return None
    try:
        return float(raw)
    except ValueError:
        raise ValidationError(f"{name} must be a number") from None


def query_integer(name: str, default: int) -> int:
    raw = query_text(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        raise ValidationError(f"{name} must be an integer") from None


def query_member[E: StrEnum](name: str, enum_type: type[E]) -> E | None:
    raw = query_text(name)
    return None if raw is None else require_member(name, raw, enum_type)
