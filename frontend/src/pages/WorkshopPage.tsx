import { useState } from "react";
import { Plus, Send } from "lucide-react";
import { useHeap, useWorkOrders } from "../api/queries";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { ErrorState } from "../components/ui/ErrorState";
import { GlassCard } from "../components/ui/GlassCard";
import { Skeleton, SkeletonRows } from "../components/ui/Skeleton";
import { HeapView } from "../features/workshop/HeapView";
import { useDispatchNext } from "../features/workshop/useDispatchNext";
import { WorkOrderBoard } from "../features/workshop/WorkOrderBoard";
import { WorkOrderForm } from "../features/workshop/WorkOrderForm";

export default function WorkshopPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const heap = useHeap();
  const orders = useWorkOrders();
  const dispatch = useDispatchNext();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Arborist workshop"
        title="Work order priority queue"
        description="Crews always take the highest-priority job next. Raise a priority and watch the heap sift it up; dispatch and the root leaves while the last element sinks into place."
        actions={
          <>
            <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setDialogOpen(true)}>
              New work order
            </Button>
            <Button
              variant="primary"
              loading={dispatch.isPending}
              disabled={heap.data?.size === 0}
              icon={<Send className="size-4" aria-hidden />}
              onClick={() => dispatch.mutate()}
            >
              Dispatch next
            </Button>
          </>
        }
      />

      {heap.isPending ? (
        <GlassCard>
          <Skeleton className="h-96" />
        </GlassCard>
      ) : heap.isError ? (
        <GlassCard>
          <ErrorState error={heap.error} onRetry={() => void heap.refetch()} />
        </GlassCard>
      ) : (
        <HeapView items={heap.data.items} />
      )}

      {orders.isPending ? (
        <GlassCard>
          <SkeletonRows rows={6} />
        </GlassCard>
      ) : orders.isError ? (
        <GlassCard>
          <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
        </GlassCard>
      ) : (
        <WorkOrderBoard orders={orders.data.items} />
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="New work order"
        description="Search a specimen by tag. Leave priority empty to use its risk score."
      >
        <WorkOrderForm onCreated={() => setDialogOpen(false)} />
      </Dialog>
    </div>
  );
}
