import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "../../api/client";
import { api } from "../../api/endpoints";
import { queryKeys } from "../../api/keys";
import { WORK_ORDER_KIND_LABEL } from "../../lib/format";

/** POST /workorders/dispatch; a 409 means the heap is empty and is reported as information, not failure. */
export function useDispatchNext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.dispatchWorkOrder,
    onSuccess: (order) => {
      toast.success(
        `${order.id} dispatched: ${WORK_ORDER_KIND_LABEL[order.kind]} on ${order.specimen_tag} (priority ${order.priority})`,
      );
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.info("The queue is empty. Nothing to dispatch.");
        return;
      }
      toast.error(error.message);
    },
    onSettled: (order) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.summary }),
        qc.invalidateQueries({ queryKey: queryKeys.workOrders }),
        qc.invalidateQueries({ queryKey: queryKeys.heap }),
        order ? qc.invalidateQueries({ queryKey: queryKeys.specimen(order.specimen_id) }) : null,
      ]),
  });
}
