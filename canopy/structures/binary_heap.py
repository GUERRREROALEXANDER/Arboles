from __future__ import annotations

from collections.abc import Callable, Iterator
from dataclasses import dataclass
from typing import Any, Protocol, Self


class Comparable(Protocol):
    def __lt__(self, other: Self, /) -> bool: ...


@dataclass(slots=True)
class _Entry[T]:
    item: T
    key: Any
    sequence: int


class BinaryHeap[T]:
    """Array-backed max-heap with addressable items.

    ``key`` gives each item's priority: the greatest key is served first and
    equal keys are served in insertion order. ``identity`` gives each item a
    unique id; a position map makes ``remove`` and ``update`` O(log n).
    """

    def __init__(self, *, key: Callable[[T], Comparable], identity: Callable[[T], str]) -> None:
        self._key = key
        self._identity = identity
        self._entries: list[_Entry[T]] = []
        self._positions: dict[str, int] = {}
        self._sequence = 0

    def __len__(self) -> int:
        return len(self._entries)

    def __bool__(self) -> bool:
        return bool(self._entries)

    def __contains__(self, item_id: object) -> bool:
        return item_id in self._positions

    def __iter__(self) -> Iterator[T]:
        return iter(self.snapshot())

    def push(self, item: T) -> None:
        item_id = self._identity(item)
        if item_id in self._positions:
            raise ValueError(f"item {item_id!r} is already in the heap")
        self._entries.append(_Entry(item, self._key(item), self._sequence))
        self._sequence += 1
        index = len(self._entries) - 1
        self._positions[item_id] = index
        self._sift_up(index)

    def peek(self) -> T:
        if not self._entries:
            raise IndexError("peek from an empty heap")
        return self._entries[0].item

    def pop(self) -> T:
        if not self._entries:
            raise IndexError("pop from an empty heap")
        return self._take(0)

    def remove(self, item_id: str) -> T:
        return self._take(self._position(item_id))

    def update(self, item_id: str) -> None:
        """Re-read an item's key after it changed and restore the heap order."""
        index = self._position(item_id)
        entry = self._entries[index]
        entry.key = self._key(entry.item)
        self._sift_up(index)
        self._sift_down(self._positions[item_id])

    def snapshot(self) -> tuple[T, ...]:
        """Items in raw array order (index 0 is the top)."""
        return tuple(entry.item for entry in self._entries)

    def ordered(self) -> list[T]:
        """Items in the order successive pops would return them, without mutating the heap."""
        clone = BinaryHeap(key=self._key, identity=self._identity)
        clone._entries = [_Entry(e.item, e.key, e.sequence) for e in self._entries]
        clone._positions = dict(self._positions)
        return [clone.pop() for _ in range(len(clone))]

    def _position(self, item_id: str) -> int:
        try:
            return self._positions[item_id]
        except KeyError:
            raise KeyError(item_id) from None

    def _take(self, index: int) -> T:
        last = len(self._entries) - 1
        self._swap(index, last)
        entry = self._entries.pop()
        del self._positions[self._identity(entry.item)]
        if index < len(self._entries):
            self._sift_up(index)
            self._sift_down(index)
        return entry.item

    def _outranks(self, i: int, j: int) -> bool:
        first, second = self._entries[i], self._entries[j]
        if second.key < first.key:
            return True
        if first.key < second.key:
            return False
        return first.sequence < second.sequence

    def _sift_up(self, index: int) -> None:
        while index > 0:
            parent = (index - 1) // 2
            if not self._outranks(index, parent):
                return
            self._swap(index, parent)
            index = parent

    def _sift_down(self, index: int) -> None:
        size = len(self._entries)
        while True:
            best = index
            for child in (2 * index + 1, 2 * index + 2):
                if child < size and self._outranks(child, best):
                    best = child
            if best == index:
                return
            self._swap(index, best)
            index = best

    def _swap(self, i: int, j: int) -> None:
        if i == j:
            return
        entries = self._entries
        entries[i], entries[j] = entries[j], entries[i]
        self._positions[self._identity(entries[i].item)] = i
        self._positions[self._identity(entries[j].item)] = j
