from __future__ import annotations

import math
import random
from typing import Any

import pytest

from canopy.structures import AVLTree


def describe(key: Any, value: Any) -> dict[str, Any]:
    return {"key": key, "value": value}


def assert_avl(tree: AVLTree[Any, Any]) -> None:
    """Check ordering, cached heights and the balance bound on every node."""

    def check(node: dict[str, Any] | None, low: Any, high: Any) -> int:
        if node is None:
            return 0
        if low is not None:
            assert node["key"] > low
        if high is not None:
            assert node["key"] < high
        left = check(node["left"], low, node["key"])
        right = check(node["right"], node["key"], high)
        assert node["height"] == 1 + max(left, right)
        assert node["balance"] == left - right
        assert -1 <= node["balance"] <= 1
        return node["height"]

    assert check(tree.to_dict(describe), None, None) == tree.height


def test_empty_tree() -> None:
    tree: AVLTree[int, str] = AVLTree()

    assert len(tree) == 0
    assert tree.height == 0
    assert tree.to_dict(describe) is None
    assert tree.first() is None
    assert tree.last() is None
    assert tree.range_query(0, 10).items == ()


def test_insert_then_find() -> None:
    tree: AVLTree[int, str] = AVLTree()
    tree.insert(5, "five")
    tree.insert(2, "two")

    assert tree.find(2) == "two"
    assert tree.find(7) is None
    assert 5 in tree
    assert len(tree) == 2


def test_insert_rejects_duplicate_key() -> None:
    tree: AVLTree[int, str] = AVLTree()
    tree.insert(1, "one")

    with pytest.raises(ValueError):
        tree.insert(1, "again")
    assert len(tree) == 1


def test_delete_returns_value_and_shrinks() -> None:
    tree: AVLTree[int, str] = AVLTree()
    for key in (4, 2, 6, 1, 3, 5, 7):
        tree.insert(key, str(key))

    assert tree.delete(4) == "4"
    assert 4 not in tree
    assert [key for key, _ in tree] == [1, 2, 3, 5, 6, 7]
    assert_avl(tree)


def test_delete_missing_key_raises() -> None:
    tree: AVLTree[int, str] = AVLTree()

    with pytest.raises(KeyError):
        tree.delete(3)


def test_single_rotation_on_ascending_inserts() -> None:
    tree: AVLTree[int, None] = AVLTree()
    for key in (1, 2, 3):
        tree.insert(key, None)

    root = tree.to_dict(describe)
    assert root is not None and root["key"] == 2
    assert tree.rotations == 1


def test_double_rotation_counts_two() -> None:
    tree: AVLTree[int, None] = AVLTree()
    for key in (3, 1, 2):
        tree.insert(key, None)

    root = tree.to_dict(describe)
    assert root is not None and root["key"] == 2
    assert tree.rotations == 2


def test_sorted_inserts_keep_logarithmic_height() -> None:
    tree: AVLTree[int, None] = AVLTree()
    for key in range(1023):
        tree.insert(key, None)

    assert tree.height == 10
    assert_avl(tree)


def test_invariants_hold_through_random_inserts_and_deletes() -> None:
    rng = random.Random(7)
    tree: AVLTree[int, int] = AVLTree()
    reference: set[int] = set()

    for step in range(3000):
        key = rng.randrange(800)
        if key in reference and rng.random() < 0.5:
            assert tree.delete(key) == key * 10
            reference.remove(key)
        elif key not in reference:
            tree.insert(key, key * 10)
            reference.add(key)
        if step % 100 == 0:
            assert_avl(tree)

    assert_avl(tree)
    assert [key for key, _ in tree.items()] == sorted(reference)
    assert len(tree) == len(reference)
    assert tree.height <= 1.45 * math.log2(len(reference) + 2)


def test_deleting_everything_empties_tree() -> None:
    rng = random.Random(3)
    keys = list(range(200))
    tree: AVLTree[int, int] = AVLTree()
    for key in keys:
        tree.insert(key, key)
    rng.shuffle(keys)

    for key in keys:
        tree.delete(key)
        assert_avl(tree)

    assert len(tree) == 0
    assert tree.height == 0


def test_range_query_is_inclusive_and_ordered() -> None:
    tree: AVLTree[int, str] = AVLTree()
    for key in (50, 20, 70, 10, 30, 60, 80, 40):
        tree.insert(key, str(key))

    result = tree.range_query(30, 60)

    assert [key for key, _ in result.items] == [30, 40, 50, 60]


def test_range_query_with_projection_keeps_duplicates_on_both_bounds() -> None:
    tree: AVLTree[tuple[float, str], str] = AVLTree()
    for dbh, name in [(40.0, "b"), (40.0, "a"), (55.0, "c"), (60.0, "e"), (60.0, "d"), (61.0, "f"), (39.9, "g")]:
        tree.insert((dbh, name), name)

    result = tree.range_query(40.0, 60.0, projection=lambda key: key[0])

    assert [value for _, value in result.items] == ["a", "b", "c", "d", "e"]


def test_range_query_visits_far_fewer_nodes_than_size_for_narrow_ranges() -> None:
    tree: AVLTree[int, None] = AVLTree()
    for key in range(1000):
        tree.insert(key, None)

    result = tree.range_query(500, 504)

    assert len(result.items) == 5
    assert result.visited < 40


def test_first_and_last_return_extremes() -> None:
    tree: AVLTree[int, str] = AVLTree()
    for key in (8, 3, 11, 1):
        tree.insert(key, str(key))

    assert tree.first() == (1, "1")
    assert tree.last() == (11, "11")


def test_to_dict_merges_payload_with_shape() -> None:
    tree: AVLTree[int, str] = AVLTree()
    tree.insert(2, "two")
    tree.insert(1, "one")

    root = tree.to_dict(lambda key, value: {"key": key, "label": value})

    assert root == {
        "key": 2,
        "label": "two",
        "height": 2,
        "balance": 1,
        "left": {"key": 1, "label": "one", "height": 1, "balance": 0, "left": None, "right": None},
        "right": None,
    }
