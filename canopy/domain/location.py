from __future__ import annotations

from dataclasses import dataclass

from canopy.domain.enums import LocationKind
from canopy.domain.validation import require_member, require_number, require_text
from canopy.errors import ValidationError


@dataclass(frozen=True, slots=True)
class Coordinates:
    lat: float
    lng: float

    def __post_init__(self) -> None:
        object.__setattr__(self, "lat", require_number("lat", self.lat, minimum=-90, maximum=90))
        object.__setattr__(self, "lng", require_number("lng", self.lng, minimum=-180, maximum=180))


@dataclass(frozen=True, slots=True)
class Location:
    """A city, locality or site in the location hierarchy."""

    id: str
    name: str
    kind: LocationKind
    center: Coordinates | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "id", require_text("location id", self.id))
        object.__setattr__(self, "name", require_text("location name", self.name))
        object.__setattr__(self, "kind", require_member("location kind", self.kind, LocationKind))
        if self.kind is LocationKind.SITE and self.center is None:
            raise ValidationError(f"site {self.id!r} needs center coordinates")

    @property
    def is_site(self) -> bool:
        return self.kind is LocationKind.SITE
