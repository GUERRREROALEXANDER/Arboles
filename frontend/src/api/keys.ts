import type { SpecimenQuery, WorkOrderStatus } from "./types";

export const queryKeys = {
  summary: ["summary"] as const,

  locations: ["locations"] as const,
  locationTree: ["locations", "tree"] as const,
  location: (id: string) => ["locations", "detail", id] as const,

  taxonomy: ["taxonomy"] as const,
  taxonomyTree: ["taxonomy", "tree"] as const,
  relatedness: (a: string, b: string) => ["taxonomy", "relatedness", a, b] as const,
  outbreak: (taxonId: string) => ["taxonomy", "outbreak", taxonId] as const,

  specimens: ["specimens"] as const,
  specimenList: (query: SpecimenQuery) => ["specimens", "list", query] as const,
  specimen: (id: string) => ["specimens", "detail", id] as const,

  index: ["index"] as const,
  dbhRange: (min: number, max: number) => ["index", "dbh", "range", min, max] as const,
  dbhTree: ["index", "dbh", "tree"] as const,

  workOrders: ["workorders"] as const,
  workOrderList: (status?: WorkOrderStatus) => ["workorders", "list", status ?? "all"] as const,
  heap: ["workorders", "heap"] as const,
};
