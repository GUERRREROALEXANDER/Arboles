import type { HeapItem } from "../api/types";

export const HEAP_SLOT = 52;
export const HEAP_LEVEL = 74;

export interface HeapPoint {
  item: HeapItem;
  x: number;
  y: number;
  parentIndex: number | null;
}

export const heapDepth = (index: number) => Math.floor(Math.log2(index + 1));

/** Implicit binary tree: children of i are 2i + 1 and 2i + 2. */
export function layoutHeap(items: HeapItem[]): { points: HeapPoint[]; width: number; height: number } {
  if (items.length === 0) return { points: [], width: 0, height: 0 };
  const levels = heapDepth(items.length - 1) + 1;
  const width = Math.max(1, 2 ** (levels - 1)) * HEAP_SLOT;
  const points = items.map((item, index) => {
    const depth = heapDepth(index);
    const position = index - (2 ** depth - 1);
    const span = width / 2 ** depth;
    return {
      item,
      x: span * (position + 0.5),
      y: depth * HEAP_LEVEL,
      parentIndex: index === 0 ? null : Math.floor((index - 1) / 2),
    };
  });
  return { points, width, height: (levels - 1) * HEAP_LEVEL };
}

/** First step of pop: the last element takes the root slot before sifting down. */
export function popFirstStep(items: HeapItem[]): HeapItem[] {
  if (items.length <= 1) return [];
  const last = items[items.length - 1];
  if (!last) return [];
  return [{ ...last, index: 0 }, ...items.slice(1, -1)];
}
