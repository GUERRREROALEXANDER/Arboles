from __future__ import annotations

from collections import deque
from collections.abc import Callable, Iterator, Sequence


class TreeNode[T]:
    """A node of a rooted n-ary tree. Structure is changed only through GeneralTree."""

    __slots__ = ("_children", "_id", "_parent", "_value")

    def __init__(self, node_id: str, value: T) -> None:
        self._id = node_id
        self._value = value
        self._parent: TreeNode[T] | None = None
        self._children: list[TreeNode[T]] = []

    @property
    def id(self) -> str:
        return self._id

    @property
    def value(self) -> T:
        return self._value

    @property
    def parent(self) -> TreeNode[T] | None:
        return self._parent

    @property
    def children(self) -> tuple[TreeNode[T], ...]:
        return tuple(self._children)

    @property
    def is_root(self) -> bool:
        return self._parent is None

    @property
    def is_leaf(self) -> bool:
        return not self._children

    @property
    def depth(self) -> int:
        depth = 0
        node = self._parent
        while node is not None:
            depth += 1
            node = node._parent
        return depth

    def _attach(self, child: TreeNode[T]) -> None:
        child._parent = self
        self._children.append(child)

    def _detach(self, child: TreeNode[T]) -> None:
        self._children.remove(child)
        child._parent = None

    def __repr__(self) -> str:
        return f"TreeNode({self._id!r})"


class GeneralTree[T]:
    """Rooted n-ary tree with O(1) lookup by node id.

    Traversals are iterative generators, so arbitrarily deep trees are safe.
    """

    def __init__(self, root_id: str, root_value: T) -> None:
        self._root = TreeNode(root_id, root_value)
        self._index: dict[str, TreeNode[T]] = {root_id: self._root}

    @property
    def root(self) -> TreeNode[T]:
        return self._root

    def __len__(self) -> int:
        return len(self._index)

    def __contains__(self, node_id: object) -> bool:
        return node_id in self._index

    def find(self, node_id: str) -> TreeNode[T] | None:
        return self._index.get(node_id)

    def node(self, node_id: str) -> TreeNode[T]:
        try:
            return self._index[node_id]
        except KeyError:
            raise KeyError(node_id) from None

    def add_child(self, parent_id: str, node_id: str, value: T) -> TreeNode[T]:
        if node_id in self._index:
            raise ValueError(f"node id {node_id!r} already exists")
        parent = self.node(parent_id)
        child = TreeNode(node_id, value)
        parent._attach(child)
        self._index[node_id] = child
        return child

    def remove(self, node_id: str) -> tuple[TreeNode[T], ...]:
        """Detach a node with its whole subtree and return the removed nodes in preorder."""
        node = self.node(node_id)
        if node.parent is None:
            raise ValueError("the root cannot be removed")
        removed = tuple(self.preorder(node_id))
        node.parent._detach(node)
        for descendant in removed:
            del self._index[descendant.id]
        return removed

    def move(self, node_id: str, new_parent_id: str) -> None:
        node = self.node(node_id)
        new_parent = self.node(new_parent_id)
        if node.parent is None:
            raise ValueError("the root cannot be moved")
        if self.is_ancestor(node_id, new_parent_id):
            raise ValueError(f"moving {node_id!r} under {new_parent_id!r} would create a cycle")
        if node.parent is new_parent:
            return
        node.parent._detach(node)
        new_parent._attach(node)

    def is_ancestor(self, ancestor_id: str, node_id: str) -> bool:
        """True when ancestor_id lies on the path from node_id to the root (inclusive)."""
        ancestor = self.node(ancestor_id)
        node: TreeNode[T] | None = self.node(node_id)
        while node is not None:
            if node is ancestor:
                return True
            node = node.parent
        return False

    def preorder(self, start_id: str | None = None) -> Iterator[TreeNode[T]]:
        stack = [self._start(start_id)]
        while stack:
            node = stack.pop()
            yield node
            stack.extend(reversed(node._children))

    def postorder(self, start_id: str | None = None) -> Iterator[TreeNode[T]]:
        stack: list[tuple[TreeNode[T], bool]] = [(self._start(start_id), False)]
        while stack:
            node, expanded = stack.pop()
            if expanded:
                yield node
                continue
            stack.append((node, True))
            stack.extend((child, False) for child in reversed(node._children))

    def level_order(self, start_id: str | None = None) -> Iterator[TreeNode[T]]:
        queue = deque([self._start(start_id)])
        while queue:
            node = queue.popleft()
            yield node
            queue.extend(node._children)

    def subtree(self, node_id: str) -> Iterator[T]:
        """Values of a node and all its descendants, in preorder."""
        return (node.value for node in self.preorder(node_id))

    def path_to_root(self, node_id: str) -> list[TreeNode[T]]:
        path = []
        node: TreeNode[T] | None = self.node(node_id)
        while node is not None:
            path.append(node)
            node = node.parent
        return path

    def path_from_root(self, node_id: str) -> list[TreeNode[T]]:
        return self.path_to_root(node_id)[::-1]

    def lowest_common_ancestor(self, first_id: str, second_id: str) -> TreeNode[T]:
        first, second = self.node(first_id), self.node(second_id)
        first_depth, second_depth = first.depth, second.depth
        while first_depth > second_depth:
            first = first._parent  # type: ignore[assignment]
            first_depth -= 1
        while second_depth > first_depth:
            second = second._parent  # type: ignore[assignment]
            second_depth -= 1
        while first is not second:
            first = first._parent  # type: ignore[assignment]
            second = second._parent  # type: ignore[assignment]
        return first

    def distance(self, first_id: str, second_id: str) -> int:
        """Number of edges on the path between two nodes."""
        ancestor = self.lowest_common_ancestor(first_id, second_id)
        return self.node(first_id).depth + self.node(second_id).depth - 2 * ancestor.depth

    def path_between(self, first_id: str, second_id: str) -> list[TreeNode[T]]:
        ancestor = self.lowest_common_ancestor(first_id, second_id)
        ascent = self._climb(self.node(first_id), ancestor)
        descent = self._climb(self.node(second_id), ancestor)
        return ascent + [ancestor] + descent[::-1]

    def fold[R](
        self,
        combine: Callable[[TreeNode[T], Sequence[R]], R],
        start_id: str | None = None,
    ) -> dict[str, R]:
        """Aggregate bottom-up: combine(node, child_results) runs once per node in post-order."""
        results: dict[str, R] = {}
        for node in self.postorder(start_id):
            results[node.id] = combine(node, [results[child.id] for child in node._children])
        return results

    def _start(self, start_id: str | None) -> TreeNode[T]:
        return self._root if start_id is None else self.node(start_id)

    @staticmethod
    def _climb(node: TreeNode[T], ancestor: TreeNode[T]) -> list[TreeNode[T]]:
        path = []
        while node is not ancestor:
            path.append(node)
            node = node._parent  # type: ignore[assignment]
        return path
