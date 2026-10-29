from __future__ import annotations

import pytest

from canopy.structures import GeneralTree


@pytest.fixture
def tree() -> GeneralTree[str]:
    """r > (a > (a1 > a11, a2), b > b1)"""
    tree = GeneralTree("r", "root")
    for parent, child in [("r", "a"), ("r", "b"), ("a", "a1"), ("a", "a2"), ("b", "b1"), ("a1", "a11")]:
        tree.add_child(parent, child, child.upper())
    return tree


def ids(nodes) -> list[str]:
    return [node.id for node in nodes]


def test_add_child_links_parent_and_index(tree: GeneralTree[str]) -> None:
    node = tree.add_child("b", "b2", "B2")

    assert node.parent is tree.node("b")
    assert tree.node("b2") is node
    assert ids(tree.node("b").children) == ["b1", "b2"]


def test_add_child_rejects_duplicate_id(tree: GeneralTree[str]) -> None:
    with pytest.raises(ValueError):
        tree.add_child("r", "a1", "again")


def test_add_child_rejects_unknown_parent(tree: GeneralTree[str]) -> None:
    with pytest.raises(KeyError):
        tree.add_child("missing", "x", "X")


def test_find_returns_none_for_unknown_id(tree: GeneralTree[str]) -> None:
    assert tree.find("missing") is None


def test_len_and_contains_reflect_index(tree: GeneralTree[str]) -> None:
    assert len(tree) == 7
    assert "a11" in tree
    assert "zz" not in tree


def test_preorder_visits_parent_before_children_left_to_right(tree: GeneralTree[str]) -> None:
    assert ids(tree.preorder()) == ["r", "a", "a1", "a11", "a2", "b", "b1"]


def test_postorder_visits_children_before_parent(tree: GeneralTree[str]) -> None:
    assert ids(tree.postorder()) == ["a11", "a1", "a2", "a", "b1", "b", "r"]


def test_level_order_visits_by_depth(tree: GeneralTree[str]) -> None:
    assert ids(tree.level_order()) == ["r", "a", "b", "a1", "a2", "b1", "a11"]


def test_traversals_can_start_at_a_subtree(tree: GeneralTree[str]) -> None:
    assert ids(tree.preorder("a")) == ["a", "a1", "a11", "a2"]
    assert ids(tree.postorder("a")) == ["a11", "a1", "a2", "a"]
    assert ids(tree.level_order("a")) == ["a", "a1", "a2", "a11"]


def test_subtree_yields_values_of_node_and_descendants(tree: GeneralTree[str]) -> None:
    assert list(tree.subtree("a1")) == ["A1", "A11"]


def test_traversals_handle_deep_chains_without_recursion() -> None:
    tree = GeneralTree("n0", 0)
    for i in range(1, 20_000):
        tree.add_child(f"n{i - 1}", f"n{i}", i)

    assert sum(1 for _ in tree.postorder()) == 20_000
    assert len(tree.path_to_root("n19999")) == 20_000
    assert tree.node("n19999").depth == 19_999


def test_path_to_root_lists_ancestors_upwards(tree: GeneralTree[str]) -> None:
    assert ids(tree.path_to_root("a11")) == ["a11", "a1", "a", "r"]
    assert ids(tree.path_from_root("a11")) == ["r", "a", "a1", "a11"]


@pytest.mark.parametrize(
    ("first", "second", "expected"),
    [("a11", "a2", "a"), ("a11", "b1", "r"), ("a", "a11", "a"), ("b1", "b1", "b1"), ("r", "a2", "r")],
)
def test_lowest_common_ancestor(tree: GeneralTree[str], first: str, second: str, expected: str) -> None:
    assert tree.lowest_common_ancestor(first, second).id == expected


@pytest.mark.parametrize(
    ("first", "second", "expected"),
    [("a11", "b1", 5), ("a11", "a2", 3), ("a", "a11", 2), ("b", "b", 0)],
)
def test_distance_counts_edges(tree: GeneralTree[str], first: str, second: str, expected: int) -> None:
    assert tree.distance(first, second) == expected


def test_path_between_goes_through_common_ancestor(tree: GeneralTree[str]) -> None:
    assert ids(tree.path_between("a11", "b1")) == ["a11", "a1", "a", "r", "b", "b1"]
    assert ids(tree.path_between("a", "a11")) == ["a", "a1", "a11"]


def test_remove_detaches_whole_subtree(tree: GeneralTree[str]) -> None:
    removed = tree.remove("a1")

    assert ids(removed) == ["a1", "a11"]
    assert "a11" not in tree
    assert ids(tree.node("a").children) == ["a2"]
    assert len(tree) == 5


def test_remove_rejects_root(tree: GeneralTree[str]) -> None:
    with pytest.raises(ValueError):
        tree.remove("r")


def test_move_reparents_node_with_its_subtree(tree: GeneralTree[str]) -> None:
    tree.move("a1", "b")

    assert tree.node("a1").parent is tree.node("b")
    assert ids(tree.node("b").children) == ["b1", "a1"]
    assert ids(tree.path_to_root("a11")) == ["a11", "a1", "b", "r"]


def test_move_rejects_moving_under_own_descendant(tree: GeneralTree[str]) -> None:
    with pytest.raises(ValueError, match="cycle"):
        tree.move("a", "a11")

    assert tree.node("a").parent is tree.root


def test_move_rejects_moving_under_itself(tree: GeneralTree[str]) -> None:
    with pytest.raises(ValueError):
        tree.move("b", "b")


def test_move_rejects_root(tree: GeneralTree[str]) -> None:
    with pytest.raises(ValueError):
        tree.move("r", "a")


def test_is_ancestor(tree: GeneralTree[str]) -> None:
    assert tree.is_ancestor("a", "a11")
    assert tree.is_ancestor("a11", "a11")
    assert not tree.is_ancestor("b", "a11")


def test_fold_aggregates_bottom_up(tree: GeneralTree[str]) -> None:
    sizes = tree.fold(lambda node, children: 1 + sum(children))

    assert sizes == {"r": 7, "a": 4, "a1": 2, "a11": 1, "a2": 1, "b": 2, "b1": 1}


def test_fold_from_subtree_only_covers_that_subtree(tree: GeneralTree[str]) -> None:
    leaves = tree.fold(lambda node, children: sum(children) if children else 1, "b")

    assert leaves == {"b": 1, "b1": 1}


def test_node_properties(tree: GeneralTree[str]) -> None:
    node = tree.node("a11")

    assert node.value == "A11"
    assert node.is_leaf
    assert not node.is_root
    assert tree.root.is_root
    assert isinstance(tree.node("a").children, tuple)
