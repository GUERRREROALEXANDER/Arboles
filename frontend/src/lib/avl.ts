import { hierarchy, tree, type HierarchyPointNode } from "d3-hierarchy";
import type { AvlNode } from "../api/types";

export interface AvlDatum {
  id: string;
  node: AvlNode | null;
  children?: AvlDatum[];
}

/** Builds a datum tree with placeholders so a lone child keeps its left/right side. */
function toDatum(node: AvlNode, id: string): AvlDatum {
  if (!node.left && !node.right) return { id, node };
  return {
    id,
    node,
    children: [
      node.left ? toDatum(node.left, node.left.specimen_id) : { id: `${id}:L`, node: null },
      node.right ? toDatum(node.right, node.right.specimen_id) : { id: `${id}:R`, node: null },
    ],
  };
}

export const AVL_NODE_GAP = 34;
export const AVL_LEVEL_GAP = 68;

export function layoutAvl(root: AvlNode): HierarchyPointNode<AvlDatum> {
  const h = hierarchy(toDatum(root, root.specimen_id));
  return tree<AvlDatum>()
    .nodeSize([AVL_NODE_GAP, AVL_LEVEL_GAP])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.25))(h);
}

/**
 * Replays the range query on the snapshot to know which nodes it touches.
 * Descends left while keys can still be >= min and right while keys can still be <= max.
 */
export function rangeVisitedIds(root: AvlNode | null, min: number, max: number): Set<string> {
  const visited = new Set<string>();
  const stack: AvlNode[] = root ? [root] : [];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) break;
    visited.add(node.specimen_id);
    if (node.left && node.key >= min) stack.push(node.left);
    if (node.right && node.key <= max) stack.push(node.right);
  }
  return visited;
}

export function keyBounds(root: AvlNode | null): { min: number; max: number } | null {
  if (!root) return null;
  let low = root;
  while (low.left) low = low.left;
  let high = root;
  while (high.right) high = high.right;
  return { min: low.key, max: high.key };
}
