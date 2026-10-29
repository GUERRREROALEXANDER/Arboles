import { request } from "./client";
import type {
  CreateSpecimenBody,
  CreateWorkOrderBody,
  DbhRange,
  DbhTree,
  HeapSnapshot,
  LocationDetail,
  LocationNode,
  Measurement,
  Outbreak,
  Relatedness,
  SpecimenDetail,
  SpecimenList,
  SpecimenQuery,
  Summary,
  TaxonomyRoot,
  UpdateSpecimenBody,
  WorkOrder,
  WorkOrderList,
  WorkOrderStatus,
} from "./types";

export const api = {
  summary: () => request<Summary>("/summary"),

  locationTree: () => request<LocationNode>("/locations/tree"),
  location: (id: string) => request<LocationDetail>(`/locations/${encodeURIComponent(id)}`),

  taxonomyTree: () => request<TaxonomyRoot>("/taxonomy/tree"),
  relatedness: (a: string, b: string) =>
    request<Relatedness>("/taxonomy/relatedness", { query: { a, b } }),
  outbreak: (taxonId: string) =>
    request<Outbreak>("/taxonomy/outbreak", { method: "POST", body: { taxon_id: taxonId } }),

  specimens: (query: SpecimenQuery) =>
    request<SpecimenList>("/specimens", { query: { ...query } }),
  specimen: (id: string) => request<SpecimenDetail>(`/specimens/${encodeURIComponent(id)}`),
  createSpecimen: (body: CreateSpecimenBody) =>
    request<SpecimenDetail>("/specimens", { method: "POST", body }),
  updateSpecimen: (id: string, body: UpdateSpecimenBody) =>
    request<SpecimenDetail>(`/specimens/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  addMeasurement: (id: string, body: Measurement) =>
    request<SpecimenDetail>(`/specimens/${encodeURIComponent(id)}/measurements`, {
      method: "POST",
      body,
    }),
  moveSpecimen: (id: string, siteId: string) =>
    request<SpecimenDetail>(`/specimens/${encodeURIComponent(id)}/move`, {
      method: "POST",
      body: { site_id: siteId },
    }),

  dbhRange: (min: number, max: number) => request<DbhRange>("/index/dbh", { query: { min, max } }),
  dbhTree: () => request<DbhTree>("/index/dbh/tree"),

  workOrders: (status?: WorkOrderStatus) =>
    request<WorkOrderList>("/workorders", { query: { status } }),
  heap: () => request<HeapSnapshot>("/workorders/heap"),
  createWorkOrder: (body: CreateWorkOrderBody) =>
    request<WorkOrder>("/workorders", { method: "POST", body }),
  dispatchWorkOrder: () => request<WorkOrder>("/workorders/dispatch", { method: "POST" }),
  completeWorkOrder: (id: string) =>
    request<WorkOrder>(`/workorders/${encodeURIComponent(id)}/complete`, { method: "POST" }),
  updateWorkOrderPriority: (id: string, priority: number) =>
    request<WorkOrder>(`/workorders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { priority },
    }),
  deleteWorkOrder: (id: string) =>
    request<void>(`/workorders/${encodeURIComponent(id)}`, { method: "DELETE" }),

  reset: () => request<{ status: "ok" }>("/reset", { method: "POST" }),
};
