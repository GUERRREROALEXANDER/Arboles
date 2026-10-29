import { Link } from "react-router-dom";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { useWorkOrders } from "../../api/queries";
import { CardHeader } from "../../components/ui/CardHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { GlassCard } from "../../components/ui/GlassCard";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { WORK_ORDER_KIND_LABEL } from "../../lib/format";
import { useUi } from "../../store/ui";
import { PriorityPill } from "../workshop/PriorityPill";

const PREVIEW = 5;

export function WorkQueuePreview() {
  const { data, isPending, isError, error, refetch } = useWorkOrders("queued");
  const openSpecimen = useUi((s) => s.openSpecimen);
  const items = data?.items.slice(0, PREVIEW) ?? [];

  return (
    <GlassCard staggered>
      <CardHeader
        title="Priority work queue"
        caption="Next jobs in pop order: highest priority first, older first on ties."
        actions={
          <Link
            to="/workshop"
            className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-white/[0.05]"
          >
            Workshop <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        }
      />
      {isPending ? (
        <SkeletonRows rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Queue is clear" description="No work orders are waiting for a crew." />
      ) : (
        <ol className="flex flex-col divide-y divide-white/5">
          {items.map((order, index) => (
            <li key={order.id}>
              <button
                type="button"
                onClick={() => openSpecimen(order.specimen_id)}
                className="focus-ring flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left hover:bg-white/[0.03]"
              >
                <span className="w-5 font-mono text-xs text-white/45">{index + 1}</span>
                <PriorityPill priority={order.priority} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">
                    {WORK_ORDER_KIND_LABEL[order.kind]} · {order.common_name}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-white/55">
                    {order.specimen_tag} · {order.site_name}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </GlassCard>
  );
}
