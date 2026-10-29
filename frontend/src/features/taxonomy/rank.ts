import type { TaxonNode, TaxonRank, TaxonomyRoot } from "../../api/types";
import { CATEGORICAL } from "../../lib/palette";

export type TreeRank = TaxonRank | "root";

export interface TreeDatum {
  id: string;
  name: string;
  rank: TreeRank;
  common_name: string | null;
  specimens: number;
  children: TreeDatum[];
}

export const RANK_COLOR: Record<TreeRank, string> = {
  root: "#e2e8f0",
  family: CATEGORICAL[0],
  genus: CATEGORICAL[1],
  species: CATEGORICAL[2],
};

export const RANK_LABEL: Record<TreeRank, string> = {
  root: "Root",
  family: "Family",
  genus: "Genus",
  species: "Species",
};

function fromTaxon(node: TaxonNode): TreeDatum {
  return {
    id: node.id,
    name: node.name,
    rank: node.rank,
    common_name: node.common_name,
    specimens: node.specimens,
    children: node.children.map(fromTaxon),
  };
}

export function toTreeDatum(root: TaxonomyRoot): TreeDatum {
  return {
    id: root.id,
    name: root.name,
    rank: "root",
    common_name: null,
    specimens: root.specimens,
    children: root.children.map(fromTaxon),
  };
}

export function findDatum(root: TreeDatum, id: string): TreeDatum | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findDatum(child, id);
    if (found) return found;
  }
  return null;
}

export function subtreeIds(node: TreeDatum): Set<string> {
  const ids = new Set<string>();
  const visit = (current: TreeDatum) => {
    ids.add(current.id);
    current.children.forEach(visit);
  };
  visit(node);
  return ids;
}
