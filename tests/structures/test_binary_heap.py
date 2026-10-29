from __future__ import annotations

import random
from dataclasses import dataclass

import pytest

from canopy.structures import BinaryHeap


@dataclass
class Job:
    id: str
    priority: int


def make_heap(*jobs: Job) -> BinaryHeap[Job]:
    heap = BinaryHeap(key=lambda job: job.priority, identity=lambda job: job.id)
    for job in jobs:
        heap.push(job)
    return heap


def drain(heap: BinaryHeap[Job]) -> list[str]:
    return [heap.pop().id for _ in range(len(heap))]


def assert_heap_property(heap: BinaryHeap[Job]) -> None:
    items = heap.snapshot()
    for index in range(1, len(items)):
        assert items[(index - 1) // 2].priority >= items[index].priority


def test_pop_returns_highest_priority_first() -> None:
    heap = make_heap(Job("a", 10), Job("b", 90), Job("c", 50))

    assert drain(heap) == ["b", "c", "a"]


def test_equal_priorities_pop_in_insertion_order() -> None:
    heap = make_heap(Job("first", 5), Job("second", 5), Job("third", 5), Job("top", 9))

    assert drain(heap) == ["top", "first", "second", "third"]


def test_peek_does_not_remove() -> None:
    heap = make_heap(Job("a", 1), Job("b", 2))

    assert heap.peek().id == "b"
    assert len(heap) == 2


def test_pop_and_peek_on_empty_heap_raise() -> None:
    heap = make_heap()

    with pytest.raises(IndexError):
        heap.pop()
    with pytest.raises(IndexError):
        heap.peek()


def test_push_rejects_duplicate_id() -> None:
    heap = make_heap(Job("a", 1))

    with pytest.raises(ValueError):
        heap.push(Job("a", 2))


def test_remove_takes_arbitrary_item_and_keeps_order() -> None:
    heap = make_heap(*(Job(str(p), p) for p in (40, 10, 30, 90, 20, 70)))

    removed = heap.remove("30")

    assert removed.priority == 30
    assert "30" not in heap
    assert_heap_property(heap)
    assert drain(heap) == ["90", "70", "40", "20", "10"]


def test_remove_unknown_id_raises() -> None:
    heap = make_heap(Job("a", 1))

    with pytest.raises(KeyError):
        heap.remove("zzz")


def test_update_after_raising_priority_moves_item_up() -> None:
    low = Job("low", 1)
    heap = make_heap(Job("a", 50), Job("b", 40), low)

    low.priority = 99
    heap.update("low")

    assert heap.peek() is low


def test_update_after_lowering_priority_moves_item_down() -> None:
    top = Job("top", 99)
    heap = make_heap(top, Job("a", 50), Job("b", 40))

    top.priority = 1
    heap.update("top")

    assert drain(heap) == ["a", "b", "top"]


def test_snapshot_is_raw_array_order_with_top_first() -> None:
    heap = make_heap(Job("a", 1), Job("b", 3), Job("c", 2))

    assert [job.id for job in heap.snapshot()] == ["b", "a", "c"]


def test_ordered_lists_pop_order_without_mutating() -> None:
    heap = make_heap(Job("a", 1), Job("b", 3), Job("c", 2))
    before = heap.snapshot()

    assert [job.id for job in heap.ordered()] == ["b", "c", "a"]
    assert heap.snapshot() == before


def test_random_operations_match_sorted_reference() -> None:
    rng = random.Random(11)
    heap = make_heap()
    live: dict[str, Job] = {}

    for step in range(2000):
        action = rng.random()
        if action < 0.5 or not live:
            job = Job(f"j{step}", rng.randrange(100))
            heap.push(job)
            live[job.id] = job
        elif action < 0.7:
            victim = rng.choice(list(live))
            heap.remove(victim)
            del live[victim]
        elif action < 0.85:
            job = live[rng.choice(list(live))]
            job.priority = rng.randrange(100)
            heap.update(job.id)
        else:
            popped = heap.pop()
            assert popped.priority == max(job.priority for job in live.values())
            del live[popped.id]
        assert_heap_property(heap)

    assert len(heap) == len(live)
