import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./endpoints";
import { queryKeys } from "./keys";
import type {
  CreateSpecimenBody,
  CreateWorkOrderBody,
  HeapSnapshot,
  Measurement,
  SpecimenQuery,
  UpdateSpecimenBody,
  WorkOrder,
  WorkOrderList,
  WorkOrderStatus,
} from "./types";

function notifyError(error: Error) {
  toast.error(error.message);
}

function invalidateAll(qc: QueryClient, keys: readonly QueryKey[]) {
  return Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

/** Keys touched when a specimen's attributes change (health, size, site). */
function specimenScope(specimenId?: string): QueryKey[] {
  const keys: QueryKey[] = [
    queryKeys.summary,
    queryKeys.locations,
    queryKeys.specimens,
    ["taxonomy", "outbreak"],
  ];
  if (specimenId) keys.push(queryKeys.specimen(specimenId));
  return keys;
}

/** Keys touched when a work order changes. */
function workOrderScope(specimenId?: string): QueryKey[] {
  const keys: QueryKey[] = [queryKeys.summary, queryKeys.workOrders];
  if (specimenId) keys.push(queryKeys.specimen(specimenId));
  return keys;
}

// Queries

export function useSummary() {
  return useQuery({ queryKey: queryKeys.summary, queryFn: api.summary });
}

export function useLocationTree() {
  return useQuery({ queryKey: queryKeys.locationTree, queryFn: api.locationTree });
}

export function useLocation(id: string | null) {
  return useQuery({
    queryKey: queryKeys.location(id ?? ""),
    queryFn: () => api.location(id ?? ""),
    enabled: id !== null,
    placeholderData: keepPreviousData,
  });
}

export function useTaxonomyTree() {
  return useQuery({ queryKey: queryKeys.taxonomyTree, queryFn: api.taxonomyTree });
}

export function useRelatedness(a: string | null, b: string | null) {
  return useQuery({
    queryKey: queryKeys.relatedness(a ?? "", b ?? ""),
    queryFn: () => api.relatedness(a ?? "", b ?? ""),
    enabled: a !== null && b !== null && a !== b,
  });
}

/** The outbreak endpoint is a POST but has no side effects, so it is cached as a query. */
export function useOutbreak(taxonId: string | null) {
  return useQuery({
    queryKey: queryKeys.outbreak(taxonId ?? ""),
    queryFn: () => api.outbreak(taxonId ?? ""),
    enabled: taxonId !== null,
  });
}

export function useSpecimens(query: SpecimenQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.specimenList(query),
    queryFn: () => api.specimens(query),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSpecimen(id: string | null) {
  return useQuery({
    queryKey: queryKeys.specimen(id ?? ""),
    queryFn: () => api.specimen(id ?? ""),
    enabled: id !== null,
  });
}

export function useDbhRange(min: number, max: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.dbhRange(min, max),
    queryFn: () => api.dbhRange(min, max),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useDbhTree() {
  return useQuery({ queryKey: queryKeys.dbhTree, queryFn: api.dbhTree });
}

export function useWorkOrders(status?: WorkOrderStatus) {
  return useQuery({
    queryKey: queryKeys.workOrderList(status),
    queryFn: () => api.workOrders(status),
  });
}

export function useHeap() {
  return useQuery({ queryKey: queryKeys.heap, queryFn: api.heap });
}

// Specimen mutations

export function useCreateSpecimen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSpecimenBody) => api.createSpecimen(body),
    onSuccess: (specimen) => {
      toast.success(`Specimen ${specimen.tag} added`);
      return invalidateAll(qc, [...specimenScope(), queryKeys.index, queryKeys.taxonomyTree]);
    },
    onError: notifyError,
  });
}

export function useUpdateSpecimen(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSpecimenBody) => api.updateSpecimen(id, body),
    onSuccess: () => {
      toast.success("Specimen updated");
      return invalidateAll(qc, specimenScope(id));
    },
    onError: notifyError,
  });
}

export function useAddMeasurement(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Measurement) => api.addMeasurement(id, body),
    onSuccess: () => {
      toast.success("Measurement recorded");
      return invalidateAll(qc, [...specimenScope(id), queryKeys.index]);
    },
    onError: notifyError,
  });
}

export function useMoveSpecimen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, siteId }: { id: string; siteId: string }) => api.moveSpecimen(id, siteId),
    onSuccess: (specimen) => {
      toast.success(`${specimen.tag} moved to ${specimen.site_name}`);
      return invalidateAll(qc, [...specimenScope(specimen.id), queryKeys.workOrders]);
    },
    onError: notifyError,
  });
}

// Work order mutations

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWorkOrderBody) => api.createWorkOrder(body),
    onSuccess: (order) => {
      toast.success(`${order.id} queued for ${order.specimen_tag}`);
      return invalidateAll(qc, workOrderScope(order.specimen_id));
    },
    onError: notifyError,
  });
}

export function useCreateInspectionOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ specimenIds, notes }: { specimenIds: string[]; notes: string }) => {
      const created: WorkOrder[] = [];
      for (const specimen_id of specimenIds) {
        created.push(await api.createWorkOrder({ specimen_id, kind: "inspection", notes }));
      }
      return created;
    },
    onSuccess: (orders) => {
      toast.success(`${orders.length} inspection orders queued`);
      return invalidateAll(qc, [...workOrderScope(), queryKeys.specimens]);
    },
    onError: (error) => {
      notifyError(error);
      return invalidateAll(qc, workOrderScope());
    },
  });
}

export function useDispatchWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.dispatchWorkOrder,
    onSuccess: (order) => {
      toast.success(`${order.id} dispatched to a crew`);
      return invalidateAll(qc, workOrderScope(order.specimen_id));
    },
    onError: notifyError,
  });
}

export function useCompleteWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.completeWorkOrder(id),
    onSuccess: (order) => {
      toast.success(`${order.id} completed`);
      return invalidateAll(qc, workOrderScope(order.specimen_id));
    },
    onError: notifyError,
  });
}

export function useDeleteWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: WorkOrder) => api.deleteWorkOrder(order.id),
    onSuccess: (_, order) => {
      toast.success(`${order.id} deleted`);
      return invalidateAll(qc, workOrderScope(order.specimen_id));
    },
    onError: notifyError,
  });
}

interface PriorityContext {
  lists: [QueryKey, WorkOrderList | undefined][];
  heap: HeapSnapshot | undefined;
}

/** Optimistic: the new priority shows immediately and rolls back on failure. */
export function useUpdateWorkOrderPriority() {
  const qc = useQueryClient();
  return useMutation<WorkOrder, Error, { order: WorkOrder; priority: number }, PriorityContext>({
    mutationFn: ({ order, priority }) => api.updateWorkOrderPriority(order.id, priority),
    onMutate: async ({ order, priority }) => {
      await qc.cancelQueries({ queryKey: queryKeys.workOrders });
      const lists = qc.getQueriesData<WorkOrderList>({ queryKey: ["workorders", "list"] });
      const heap = qc.getQueryData<HeapSnapshot>(queryKeys.heap);
      qc.setQueriesData<WorkOrderList>({ queryKey: ["workorders", "list"] }, (data) =>
        data
          ? {
              items: data.items.map((item) => (item.id === order.id ? { ...item, priority } : item)),
            }
          : data,
      );
      qc.setQueryData<HeapSnapshot>(queryKeys.heap, (data) =>
        data
          ? {
              ...data,
              items: data.items.map((item) => (item.id === order.id ? { ...item, priority } : item)),
            }
          : data,
      );
      return { lists, heap };
    },
    onError: (error, _vars, context) => {
      if (context) {
        for (const [key, data] of context.lists) qc.setQueryData(key, data);
        qc.setQueryData(queryKeys.heap, context.heap);
      }
      notifyError(error);
    },
    onSettled: (_data, _error, { order }) => invalidateAll(qc, workOrderScope(order.specimen_id)),
  });
}

// Demo data

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.reset,
    onSuccess: () => {
      toast.success("Demo data restored");
      return qc.invalidateQueries();
    },
    onError: notifyError,
  });
}
