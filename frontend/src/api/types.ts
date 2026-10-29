// Types mirrored 1:1 from docs/API.md.

export type HealthStatus = "excellent" | "good" | "fair" | "poor" | "critical" | "dead";
export type LocationKind = "city" | "locality" | "site";
export type TaxonRank = "family" | "genus" | "species";
export type WorkOrderKind =
  | "inspection"
  | "pruning"
  | "pest_treatment"
  | "cabling"
  | "removal"
  | "planting";
export type WorkOrderStatus = "queued" | "in_progress" | "done";

export interface Stats {
  specimens: number;
  species: number;
  mean_health: number;
  at_risk: number;
  co2_tonnes: number;
  canopy_m2: number;
  health_breakdown: Record<HealthStatus, number>;
}

export interface SpecimenSummary {
  id: string;
  tag: string;
  species_id: string;
  common_name: string;
  scientific_name: string;
  site_id: string;
  site_name: string;
  health: HealthStatus;
  health_score: number;
  risk: number;
  height_m: number;
  dbh_cm: number;
  crown_m: number;
  lat: number;
  lng: number;
}

export interface Measurement {
  date: string;
  height_m: number;
  dbh_cm: number;
  crown_m: number;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface Growth {
  height_m_per_year: number;
  dbh_cm_per_year: number;
  crown_m_per_year: number;
}

export interface SpecimenDetail extends SpecimenSummary {
  planted_on: string;
  lean_deg: number;
  co2_kg: number;
  canopy_m2: number;
  path: Breadcrumb[];
  taxonomy: Breadcrumb[];
  measurements: Measurement[];
  growth: Growth;
  open_work_orders: WorkOrder[];
}

export interface LocationNode {
  id: string;
  name: string;
  kind: LocationKind;
  stats: Stats;
  children: LocationNode[];
}

export interface TaxonNode {
  id: string;
  name: string;
  rank: TaxonRank;
  common_name: string | null;
  specimens: number;
  children: TaxonNode[];
}

export interface TaxonomyRoot {
  id: "root";
  name: string;
  rank: "root";
  specimens: number;
  children: TaxonNode[];
}

export interface WorkOrder {
  id: string;
  specimen_id: string;
  specimen_tag: string;
  common_name: string;
  site_name: string;
  kind: WorkOrderKind;
  status: WorkOrderStatus;
  priority: number;
  notes: string;
  created_at: string;
  completed_at: string | null;
}

export interface AvlNode {
  key: number;
  specimen_id: string;
  tag: string;
  height: number;
  balance: number;
  left: AvlNode | null;
  right: AvlNode | null;
}

// Endpoint payloads

export interface TopSpecies {
  species_id: string;
  common_name: string;
  count: number;
}

export interface LocalityCo2 {
  id: string;
  name: string;
  co2_tonnes: number;
  mean_health: number;
}

export interface Summary {
  stats: Stats;
  sites: number;
  localities: number;
  open_work_orders: number;
  top_species: TopSpecies[];
  co2_by_locality: LocalityCo2[];
}

export interface LocationDetail {
  node: Omit<LocationNode, "children">;
  path: Breadcrumb[];
  specimens: SpecimenSummary[];
}

export type RankedBreadcrumb = Breadcrumb & { rank: TaxonRank | "root" };

export interface Relatedness {
  a: Breadcrumb;
  b: Breadcrumb;
  common_ancestor: RankedBreadcrumb;
  distance: number;
  path: Breadcrumb[];
}

export interface OutbreakSite {
  site_id: string;
  site_name: string;
  count: number;
}

export interface Outbreak {
  taxon: RankedBreadcrumb;
  total: number;
  at_risk: number;
  by_site: OutbreakSite[];
  specimens: SpecimenSummary[];
}

export interface SpecimenList {
  items: SpecimenSummary[];
  total: number;
}

export interface SpecimenQuery {
  site?: string;
  species?: string;
  health?: HealthStatus;
  q?: string;
  limit?: number;
}

export interface CreateSpecimenBody {
  site_id: string;
  species_id: string;
  tag: string;
  planted_on: string;
  health: HealthStatus;
  height_m: number;
  dbh_cm: number;
  crown_m: number;
  lean_deg: number;
  lat: number;
  lng: number;
}

export interface UpdateSpecimenBody {
  health?: HealthStatus;
  lean_deg?: number;
}

export interface DbhRange {
  min: number;
  max: number;
  items: SpecimenSummary[];
  visited: number;
}

export interface DbhTree {
  size: number;
  height: number;
  rotations: number;
  root: AvlNode | null;
}

export interface WorkOrderList {
  items: WorkOrder[];
}

export interface HeapItem {
  index: number;
  id: string;
  priority: number;
  kind: WorkOrderKind;
  specimen_tag: string;
}

export interface HeapSnapshot {
  size: number;
  items: HeapItem[];
}

export interface CreateWorkOrderBody {
  specimen_id: string;
  kind: WorkOrderKind;
  notes?: string;
  priority?: number;
}

export type ApiErrorCode = "not_found" | "validation" | "conflict";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}
