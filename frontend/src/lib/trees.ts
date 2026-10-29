import type { LocationNode, TaxonNode, TaxonomyRoot } from "../api/types";

export function collectSites(root: LocationNode | undefined): LocationNode[] {
  if (!root) return [];
  const sites: LocationNode[] = [];
  const visit = (node: LocationNode) => {
    if (node.kind === "site") sites.push(node);
    node.children.forEach(visit);
  };
  visit(root);
  return sites;
}

export interface TaxonOption {
  id: string;
  name: string;
  rank: TaxonNode["rank"];
  common_name: string | null;
  specimens: number;
  depth: number;
}

/** Pre-order list of every taxon, used to fill pickers. */
export function flattenTaxa(root: TaxonomyRoot | undefined): TaxonOption[] {
  if (!root) return [];
  const out: TaxonOption[] = [];
  const visit = (node: TaxonNode, depth: number) => {
    out.push({
      id: node.id,
      name: node.name,
      rank: node.rank,
      common_name: node.common_name,
      specimens: node.specimens,
      depth,
    });
    node.children.forEach((child) => visit(child, depth + 1));
  };
  root.children.forEach((child) => visit(child, 0));
  return out;
}

export function taxonLabel(option: Pick<TaxonOption, "name" | "common_name" | "rank">): string {
  return option.rank === "species" && option.common_name
    ? `${option.common_name} (${option.name})`
    : option.name;
}
