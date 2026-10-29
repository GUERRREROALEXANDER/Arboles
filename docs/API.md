# REST API

Base path `/api`. JSON in and out. Field names are `snake_case`.
Errors: `{"error": {"code": "not_found" | "validation" | "conflict", "message": "..."}}`
with status 404, 422 or 409.

## Shared shapes

```ts
type HealthStatus = "excellent" | "good" | "fair" | "poor" | "critical" | "dead";
type LocationKind = "city" | "locality" | "site";
type TaxonRank = "family" | "genus" | "species";
type WorkOrderKind = "inspection" | "pruning" | "pest_treatment" | "cabling" | "removal" | "planting";
type WorkOrderStatus = "queued" | "in_progress" | "done";

interface Stats {            // aggregated over a subtree
  specimens: number;
  species: number;           // distinct species in the subtree
  mean_health: number;       // 0-100, one decimal; 0 when empty
  at_risk: number;
  co2_tonnes: number;        // two decimals
  canopy_m2: number;         // one decimal
  health_breakdown: Record<HealthStatus, number>;
}

interface SpecimenSummary {
  id: string;                // "SP-0001"
  tag: string;               // physical tag, "BOG-CH-0001"
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

interface Measurement { date: string; height_m: number; dbh_cm: number; crown_m: number; }

interface SpecimenDetail extends SpecimenSummary {
  planted_on: string;        // ISO date
  lean_deg: number;
  co2_kg: number;
  canopy_m2: number;
  path: Breadcrumb[];        // city -> locality -> site
  taxonomy: Breadcrumb[];    // family -> genus -> species
  measurements: Measurement[];   // ascending by date
  growth: { height_m_per_year: number; dbh_cm_per_year: number; crown_m_per_year: number };
  open_work_orders: WorkOrder[];
}

interface Breadcrumb { id: string; name: string; }

interface LocationNode {
  id: string; name: string; kind: LocationKind;
  stats: Stats;
  children: LocationNode[];  // sites have [] (specimens are not nested here)
}

interface TaxonNode {
  id: string; name: string; rank: TaxonRank;
  common_name: string | null; // species only
  specimens: number;          // in subtree
  children: TaxonNode[];
}

interface WorkOrder {
  id: string;                 // "WO-0001"
  specimen_id: string;
  specimen_tag: string;
  common_name: string;
  site_name: string;
  kind: WorkOrderKind;
  status: WorkOrderStatus;
  priority: number;           // 1-100
  notes: string;
  created_at: string;         // ISO datetime
  completed_at: string | null;
}

interface AvlNode {
  key: number;                // dbh_cm
  specimen_id: string;
  tag: string;
  height: number;
  balance: number;
  left: AvlNode | null;
  right: AvlNode | null;
}
```

## Endpoints

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/health` | | `{status: "ok"}` |
| GET | `/summary` | | `{stats: Stats, sites: number, localities: number, open_work_orders: number, top_species: {species_id, common_name, count}[] (top 6), co2_by_locality: {id, name, co2_tonnes, mean_health}[]}` |
| GET | `/locations/tree` | | `LocationNode` (root = city) |
| GET | `/locations/<id>` | | `{node: LocationNode without children, path: Breadcrumb[], specimens: SpecimenSummary[]}` (every specimen in the subtree) |
| GET | `/taxonomy/tree` | | `{id: "root", name: "Urban forest", rank: "root", specimens, children: TaxonNode[]}` |
| GET | `/taxonomy/relatedness?a=&b=` | species or taxon ids | `{a: Breadcrumb, b: Breadcrumb, common_ancestor: Breadcrumb & {rank}, distance: number, path: Breadcrumb[]}` (distance = edges between a and b) |
| POST | `/taxonomy/outbreak` | `{taxon_id}` | `{taxon: Breadcrumb & {rank}, total: number, at_risk: number, by_site: {site_id, site_name, count}[], specimens: SpecimenSummary[]}` |
| GET | `/specimens` | query: `site`, `species`, `health`, `q` (tag or name), `limit` (default 200) | `{items: SpecimenSummary[], total: number}` |
| GET | `/specimens/<id>` | | `SpecimenDetail` |
| POST | `/specimens` | `{site_id, species_id, tag, planted_on, health, height_m, dbh_cm, crown_m, lean_deg, lat, lng}` | `201 SpecimenDetail` |
| PATCH | `/specimens/<id>` | any of `{health, lean_deg}` | `SpecimenDetail` |
| POST | `/specimens/<id>/measurements` | `Measurement` | `201 SpecimenDetail` (updates current height/dbh/crown and re-indexes the AVL tree) |
| POST | `/specimens/<id>/move` | `{site_id}` | `SpecimenDetail` |
| DELETE | `/specimens/<id>` | | `204` |
| GET | `/index/dbh?min=&max=` | numbers, inclusive | `{min, max, items: SpecimenSummary[] (ascending dbh), visited: number}` |
| GET | `/index/dbh/tree` | | `{size, height, rotations, root: AvlNode \| null}` |
| GET | `/workorders` | query: `status` | `{items: WorkOrder[]}` queued items in pop order, then in_progress, then done (newest first) |
| GET | `/workorders/heap` | | `{size, items: {index, id, priority, kind, specimen_tag}[]}` raw array order |
| POST | `/workorders` | `{specimen_id, kind, notes?, priority?}` | `201 WorkOrder` |
| POST | `/workorders/dispatch` | | `WorkOrder` (popped, now `in_progress`); 409 when queue empty |
| POST | `/workorders/<id>/complete` | | `WorkOrder` |
| PATCH | `/workorders/<id>` | `{priority}` | `WorkOrder` (heap re-sifted) |
| DELETE | `/workorders/<id>` | | `204` |
| POST | `/reset` | | `{status: "ok"}` reloads `data/bogota.json` |
