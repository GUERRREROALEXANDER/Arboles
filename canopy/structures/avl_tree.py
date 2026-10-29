from __future__ import annotations

from collections.abc import Callable, Iterator
from dataclasses import dataclass
from typing import Any, Protocol, Self


class Comparable(Protocol):
    def __lt__(self, other: Self, /) -> bool: ...

    def __le__(self, other: Self, /) -> bool: ...


@dataclass(frozen=True, slots=True)
class RangeResult[K, V]:
    items: tuple[tuple[K, V], ...]
    visited: int


class _Node[K, V]:
    __slots__ = ("height", "key", "left", "right", "value")

    def __init__(self, key: K, value: V) -> None:
        self.key = key
        self.value = value
        self.left: _Node[K, V] | None = None
        self.right: _Node[K, V] | None = None
        self.height = 1


def _height(node: _Node[Any, Any] | None) -> int:
    return node.height if node is not None else 0


def _balance(node: _Node[Any, Any]) -> int:
    return _height(node.left) - _height(node.right)


def _refresh(node: _Node[Any, Any]) -> None:
    node.height = 1 + max(_height(node.left), _height(node.right))


class AVLTree[K: Comparable, V]:
    """Self-balancing binary search tree with unique keys.

    Node heights count nodes, so a single leaf has height 1 and an empty tree 0.
    """

    def __init__(self) -> None:
        self._root: _Node[K, V] | None = None
        self._size = 0
        self._rotations = 0

    def __len__(self) -> int:
        return self._size

    def __contains__(self, key: object) -> bool:
        return self._locate(key) is not None  # type: ignore[arg-type]

    def __iter__(self) -> Iterator[tuple[K, V]]:
        return self.items()

    @property
    def height(self) -> int:
        return _height(self._root)

    @property
    def rotations(self) -> int:
        """Total single rotations performed since creation (a double rotation counts two)."""
        return self._rotations

    def find(self, key: K) -> V | None:
        node = self._locate(key)
        return node.value if node is not None else None

    def insert(self, key: K, value: V) -> None:
        self._root = self._insert(self._root, key, value)
        self._size += 1

    def delete(self, key: K) -> V:
        node = self._locate(key)
        if node is None:
            raise KeyError(key)
        value = node.value
        self._root = self._delete(self._root, key)
        self._size -= 1
        return value

    def first(self) -> tuple[K, V] | None:
        node = self._root
        if node is None:
            return None
        while node.left is not None:
            node = node.left
        return node.key, node.value

    def last(self) -> tuple[K, V] | None:
        node = self._root
        if node is None:
            return None
        while node.right is not None:
            node = node.right
        return node.key, node.value

    def items(self) -> Iterator[tuple[K, V]]:
        stack: list[_Node[K, V]] = []
        node = self._root
        while stack or node is not None:
            while node is not None:
                stack.append(node)
                node = node.left
            node = stack.pop()
            yield node.key, node.value
            node = node.right

    def range_query[P: Comparable](
        self,
        low: P,
        high: P,
        *,
        projection: Callable[[K], P] | None = None,
    ) -> RangeResult[K, V]:
        """Entries whose projected key lies in [low, high], in key order.

        The projection must preserve key order (for example, the first field of a
        tuple key). Subtrees that cannot contain matches are skipped, so the cost
        is O(log n + k); ``visited`` reports how many nodes were examined.
        """
        project = projection if projection is not None else (lambda key: key)
        found: list[tuple[K, V]] = []
        visited = 0

        def collect(node: _Node[K, V] | None) -> None:
            nonlocal visited
            if node is None:
                return
            visited += 1
            projected = project(node.key)
            if low <= projected:
                collect(node.left)
            if low <= projected <= high:
                found.append((node.key, node.value))
            if projected <= high:
                collect(node.right)

        collect(self._root)
        return RangeResult(tuple(found), visited)

    def to_dict(self, describe: Callable[[K, V], dict[str, Any]]) -> dict[str, Any] | None:
        """Nested dict of the tree shape; ``describe`` supplies each node's payload."""

        def render(node: _Node[K, V] | None) -> dict[str, Any] | None:
            if node is None:
                return None
            return {
                **describe(node.key, node.value),
                "height": node.height,
                "balance": _balance(node),
                "left": render(node.left),
                "right": render(node.right),
            }

        return render(self._root)

    def _locate(self, key: K) -> _Node[K, V] | None:
        node = self._root
        while node is not None:
            if key < node.key:
                node = node.left
            elif node.key < key:
                node = node.right
            else:
                return node
        return None

    def _insert(self, node: _Node[K, V] | None, key: K, value: V) -> _Node[K, V]:
        if node is None:
            return _Node(key, value)
        if key < node.key:
            node.left = self._insert(node.left, key, value)
        elif node.key < key:
            node.right = self._insert(node.right, key, value)
        else:
            raise ValueError(f"duplicate key {key!r}")
        return self._rebalance(node)

    def _delete(self, node: _Node[K, V] | None, key: K) -> _Node[K, V] | None:
        if node is None:
            return None
        if key < node.key:
            node.left = self._delete(node.left, key)
        elif node.key < key:
            node.right = self._delete(node.right, key)
        elif node.left is None:
            return node.right
        elif node.right is None:
            return node.left
        else:
            successor = node.right
            while successor.left is not None:
                successor = successor.left
            node.key, node.value = successor.key, successor.value
            node.right = self._delete(node.right, successor.key)
        return self._rebalance(node)

    def _rebalance(self, node: _Node[K, V]) -> _Node[K, V]:
        _refresh(node)
        balance = _balance(node)
        if balance > 1:
            assert node.left is not None
            if _balance(node.left) < 0:
                node.left = self._rotate_left(node.left)
            return self._rotate_right(node)
        if balance < -1:
            assert node.right is not None
            if _balance(node.right) > 0:
                node.right = self._rotate_right(node.right)
            return self._rotate_left(node)
        return node

    def _rotate_left(self, node: _Node[K, V]) -> _Node[K, V]:
        pivot = node.right
        assert pivot is not None
        node.right = pivot.left
        pivot.left = node
        _refresh(node)
        _refresh(pivot)
        self._rotations += 1
        return pivot

    def _rotate_right(self, node: _Node[K, V]) -> _Node[K, V]:
        pivot = node.left
        assert pivot is not None
        node.left = pivot.right
        pivot.right = node
        _refresh(node)
        _refresh(pivot)
        self._rotations += 1
        return pivot
