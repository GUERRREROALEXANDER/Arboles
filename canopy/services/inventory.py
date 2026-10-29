from __future__ import annotations

from collections import Counter
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import date

from canopy.domain.enums import HealthStatus, LocationKind
from canopy.domain.location import Coordinates, Location
from canopy.domain.species import Species
from canopy.domain.specimen import Measurement, Specimen
from canopy.domain.stats import Stats
from canopy.domain.validation import require_number, require_text
from canopy.errors import ConflictError, NotFoundError, ValidationError
from canopy.structures import AVLTree, GeneralTree, TreeNode

type Place = Location | Specimen
type DbhKey = tuple[float, str]

DEFAULT_SEARCH_LIMIT = 200
MAX_SEARCH_LIMIT = 1000


@dataclass(frozen=True, slots=True)
class SpecimenPage:
    items: tuple[Specimen, ...]
    total: int


@dataclass(frozen=True, slots=True)
class DbhRange:
    min: float
    max: float
    items: tuple[Specimen, ...]
    visited: int


@dataclass(frozen=True, slots=True)
class SpecimenDraft:
    """Field values for registering a new specimen."""

    site_id: str
    species_id: str
    tag: str
    planted_on: date
    health: HealthStatus
    height_m: float
    dbh_cm: float
    crown_m: float
    lean_deg: float
    lat: float
    lng: float


class InventoryService:
    """Owns the location tree (city > locality > site > specimen) and the DBH index.

    Every mutation keeps both structures and the tag registry in step.
    """

    def __init__(
        self,
        locations: GeneralTree[Location],
        species: Mapping[str, Species],
        specimens: Iterable[Specimen],
        *,
        today: Callable[[], date],
    ) -> None:
        self._species = species
        self._today = today
        self._tree: GeneralTree[Place] = GeneralTree(locations.root.id, locations.root.value)
        for node in locations.preorder():
            if node.parent is not None:
                self._tree.add_child(node.parent.id, node.id, node.value)
        self._specimens: dict[str, Specimen] = {}
        self._tags: dict[str, str] = {}
        self._dbh_index: AVLTree[DbhKey, Specimen] = AVLTree()
        self._removal_listeners: list[Callable[[Specimen], None]] = []
        for specimen in specimens:
            self._admit(specimen)

    @property
    def city(self) -> Location:
        return self._location_value(self._tree.root)

    @property
    def dbh_index(self) -> AVLTree[DbhKey, Specimen]:
        """Read access to the index; mutate specimens only through this service."""
        return self._dbh_index

    def on_specimen_removed(self, listener: Callable[[Specimen], None]) -> None:
        self._removal_listeners.append(listener)

    def location(self, location_id: str) -> Location:
        return self._location_value(self._location_node(location_id))

    def location_node(self, location_id: str) -> TreeNode[Place]:
        return self._location_node(location_id)

    def sublocations(self, location_id: str) -> tuple[Location, ...]:
        node = self._location_node(location_id)
        return tuple(child.value for child in node.children if isinstance(child.value, Location))

    def locations(self, kind: LocationKind) -> tuple[Location, ...]:
        return tuple(
            node.value
            for node in self._tree.preorder()
            if isinstance(node.value, Location) and node.value.kind is kind
        )

    def location_stats(self) -> dict[str, Stats]:
        """Stats of every node in one post-order pass over the location tree."""

        def combine(node: TreeNode[Place], children: Sequence[Stats]) -> Stats:
            if isinstance(node.value, Specimen):
                return Stats.of(node.value)
            return Stats.combine(children)

        return self._tree.fold(combine)

    def stats(self, location_id: str) -> Stats:
        self._location_node(location_id)
        return Stats.collect(self._specimens_below(location_id))

    def path(self, node_id: str) -> tuple[Location, ...]:
        """Locations from the city down to a location, or to a specimen's site."""
        if node_id not in self._tree:
            raise NotFoundError(f"no location or specimen with id {node_id!r}")
        return tuple(
            node.value for node in self._tree.path_from_root(node_id) if isinstance(node.value, Location)
        )

    def specimens_in(self, location_id: str) -> tuple[Specimen, ...]:
        self._location_node(location_id)
        return tuple(sorted(self._specimens_below(location_id), key=lambda s: s.id))

    def specimens(self) -> tuple[Specimen, ...]:
        return tuple(sorted(self._specimens.values(), key=lambda s: s.id))

    def specimen(self, specimen_id: str) -> Specimen:
        try:
            return self._specimens[specimen_id]
        except KeyError:
            raise NotFoundError(f"no specimen with id {specimen_id!r}") from None

    def species(self, species_id: str) -> Species:
        try:
            return self._species[species_id]
        except KeyError:
            raise NotFoundError(f"no species with id {species_id!r}") from None

    def count_by_species(self) -> Counter[str]:
        return Counter(specimen.species.id for specimen in self._specimens.values())

    def search(
        self,
        *,
        location_id: str | None = None,
        species_ids: frozenset[str] | None = None,
        health: HealthStatus | None = None,
        query: str | None = None,
        limit: int = DEFAULT_SEARCH_LIMIT,
    ) -> SpecimenPage:
        if not 1 <= limit <= MAX_SEARCH_LIMIT:
            raise ValidationError(f"limit must be between 1 and {MAX_SEARCH_LIMIT}")
        candidates = self.specimens_in(location_id) if location_id else self.specimens()
        needle = query.strip().casefold() if query else ""
        matches = [
            specimen
            for specimen in candidates
            if (species_ids is None or specimen.species.id in species_ids)
            and (health is None or specimen.health is health)
            and (not needle or _matches(specimen, needle))
        ]
        return SpecimenPage(tuple(matches[:limit]), len(matches))

    def register(self, draft: SpecimenDraft) -> Specimen:
        site = self._site(draft.site_id)
        species = self.species(draft.species_id)
        tag = require_text("tag", draft.tag, max_length=32)
        self._ensure_tag_available(tag)
        specimen = Specimen(
            specimen_id=self._next_id(),
            tag=tag,
            species=species,
            site=site,
            planted_on=draft.planted_on,
            health=draft.health,
            lean_deg=draft.lean_deg,
            position=Coordinates(draft.lat, draft.lng),
            measurements=[Measurement(self._today(), draft.height_m, draft.dbh_cm, draft.crown_m)],
        )
        self._admit(specimen)
        return specimen

    def assess(
        self, specimen_id: str, *, health: HealthStatus | None = None, lean_deg: float | None = None
    ) -> Specimen:
        if health is None and lean_deg is None:
            raise ValidationError("provide health or lean_deg")
        specimen = self.specimen(specimen_id)
        specimen.assess(health=health, lean_deg=lean_deg)
        return specimen

    def record_measurement(self, specimen_id: str, measurement: Measurement) -> Specimen:
        specimen = self.specimen(specimen_id)
        previous_key = _dbh_key(specimen)
        specimen.record(measurement)
        self._dbh_index.delete(previous_key)
        self._dbh_index.insert(_dbh_key(specimen), specimen)
        return specimen

    def move(self, specimen_id: str, site_id: str) -> Specimen:
        specimen = self.specimen(specimen_id)
        site = self._site(site_id)
        self._tree.move(specimen_id, site_id)
        specimen.relocate(site)
        return specimen

    def remove(self, specimen_id: str) -> Specimen:
        specimen = self.specimen(specimen_id)
        self._tree.remove(specimen_id)
        self._dbh_index.delete(_dbh_key(specimen))
        del self._specimens[specimen_id]
        del self._tags[specimen.tag.casefold()]
        for listener in self._removal_listeners:
            listener(specimen)
        return specimen

    def dbh_range(self, minimum: float | None = None, maximum: float | None = None) -> DbhRange:
        low = 0.0 if minimum is None else require_number("min", minimum, minimum=0)
        if maximum is None:
            largest = self._dbh_index.last()
            high = max(low, largest[0][0]) if largest is not None else low
        else:
            high = require_number("max", maximum, minimum=0)
        if low > high:
            raise ValidationError("min must not exceed max")
        result = self._dbh_index.range_query(low, high, projection=lambda key: key[0])
        return DbhRange(low, high, tuple(specimen for _, specimen in result.items), result.visited)

    def _admit(self, specimen: Specimen) -> None:
        if specimen.id in self._specimens:
            raise ConflictError(f"specimen {specimen.id} already exists")
        self._ensure_tag_available(specimen.tag)
        site = self._site(specimen.site.id)
        if site != specimen.site:
            raise ValidationError(f"specimen {specimen.id} refers to an unknown version of site {site.id}")
        self._tree.add_child(site.id, specimen.id, specimen)
        self._specimens[specimen.id] = specimen
        self._tags[specimen.tag.casefold()] = specimen.id
        self._dbh_index.insert(_dbh_key(specimen), specimen)

    def _ensure_tag_available(self, tag: str) -> None:
        if tag.casefold() in self._tags:
            raise ConflictError(f"tag {tag} is already in use")

    def _next_id(self) -> str:
        numbers = (int(sid.rsplit("-", 1)[-1]) for sid in self._specimens if sid.rsplit("-", 1)[-1].isdigit())
        return f"SP-{max(numbers, default=0) + 1:04d}"

    def _site(self, site_id: str) -> Location:
        location = self.location(site_id)
        if not location.is_site:
            raise ValidationError(f"{site_id!r} is a {location.kind}, not a site")
        return location

    def _location_node(self, location_id: str) -> TreeNode[Place]:
        node = self._tree.find(location_id)
        if node is None or not isinstance(node.value, Location):
            raise NotFoundError(f"no location with id {location_id!r}")
        return node

    def _specimens_below(self, location_id: str) -> Iterable[Specimen]:
        return (value for value in self._tree.subtree(location_id) if isinstance(value, Specimen))

    @staticmethod
    def _location_value(node: TreeNode[Place]) -> Location:
        assert isinstance(node.value, Location)
        return node.value


def _dbh_key(specimen: Specimen) -> DbhKey:
    return (specimen.dbh_cm, specimen.id)


def _matches(specimen: Specimen, needle: str) -> bool:
    return any(
        needle in text.casefold()
        for text in (specimen.tag, specimen.species.common_name, specimen.species.scientific_name)
    )
