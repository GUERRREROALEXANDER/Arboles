"""Argument checks shared by entities and value objects."""

from __future__ import annotations

import math
from enum import StrEnum

from canopy.errors import ValidationError


def require_text(name: str, value: object, *, max_length: int = 120) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"{name} must be a non-empty string")
    text = value.strip()
    if len(text) > max_length:
        raise ValidationError(f"{name} must be at most {max_length} characters")
    return text


def require_number(
    name: str,
    value: object,
    *,
    minimum: float | None = None,
    maximum: float | None = None,
    positive: bool = False,
) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float) or not math.isfinite(value):
        raise ValidationError(f"{name} must be a number")
    number = float(value)
    if positive and number <= 0:
        raise ValidationError(f"{name} must be greater than 0")
    if minimum is not None and number < minimum:
        raise ValidationError(f"{name} must be at least {minimum:g}")
    if maximum is not None and number > maximum:
        raise ValidationError(f"{name} must be at most {maximum:g}")
    return number


def require_integer(name: str, value: object, *, minimum: int, maximum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValidationError(f"{name} must be an integer")
    if not minimum <= value <= maximum:
        raise ValidationError(f"{name} must be between {minimum} and {maximum}")
    return value


def require_member[E: StrEnum](name: str, value: object, enum_type: type[E]) -> E:
    if isinstance(value, enum_type):
        return value
    try:
        return enum_type(value)
    except ValueError:
        allowed = ", ".join(member.value for member in enum_type)
        raise ValidationError(f"{name} must be one of: {allowed}") from None
