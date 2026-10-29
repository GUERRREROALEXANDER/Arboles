import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ClipboardList, Trash2 } from "lucide-react";
import { useCompleteWorkOrder, useDeleteWorkOrder, useUpdateWorkOrderPriority } from "../../api/queries";
import type { WorkOrder, WorkOrderStatus } from "../../api/types";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { GlassCard } from "../../components/ui/GlassCard";
import { IconButton } from "../../components/ui/IconButton";
import { formatDateTime, WORK_ORDER_KIND_LABEL, WORK_ORDER_STATUS_LABEL } from "../../lib/format";
import { useUi } from "../../store/ui";
import { PriorityPill } from "./PriorityPill";

const COLUMNS: WorkOrderStatus[] = ["queued", "in_progress", "done"];
const DONE_LIMIT = 20;

function sortColumn(status: WorkOrderStatus, orders: WorkOrder[]): WorkOrder[] {
  const copy = [...orders];
  if (status === "queued") {
    return copy.sort((a, b) => b.priority - a.priority || a.created_at.localeCompare(b.created_at));
  }
  if (status === "done") {
    return copy
      .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
      .slice(0, DONE_LIMIT);
  }
  return copy.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function PrioritySlider({ order }: { order: WorkOrder }) {
  const mutation = useUpdateWorkOrderPriority();
  const [draft, setDraft] = useState<number | null>(null);
  const value = draft ?? order.priority;

  const commit = () => {
    if (draft !== null && draft !== order.priority) mutation.mutate({ order, priority: draft });
    setDraft(null);
  };

  return (
    <label className="flex items-center gap-2 text-[11px] text-white/55">
      <span className="sr-only">Priority for {order.id}</span>
      <input
        type="range"
        min={1}
        max={100}
        value={value}
        className="range-input flex-1"
        aria-valuetext={`Priority ${value}`}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
      <span className="w-7 text-right font-mono tabular-nums text-white">{value}</span>
    </label>
  );
}

function OrderCard({ order }: { order: WorkOrder }) {
  const openSpecimen = useUi((s) => s.openSpecimen);
  const complete = useCompleteWorkOrder();
  const remove = useDeleteWorkOrder();

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"
    >
      <div className="flex items-start gap-2">
        <PriorityPill priority={order.priority} />
        <button
          type="button"
          onClick={() => openSpecimen(order.specimen_id)}
          className="focus-ring min-w-0 flex-1 rounded-md text-left"
        >
          <span className="block truncate text-sm font-semibold text-white">
            {WORK_ORDER_KIND_LABEL[order.kind]} · {order.common_name}
          </span>
          <span className="block truncate font-mono text-[11px] text-white/55">
            {order.id} · {order.specimen_tag} · {order.site_name}
          </span>
        </button>
        {order.status !== "done" ? (
          <IconButton
            label={`Delete ${order.id}`}
            className="size-7 hover:text-rose-300"
            disabled={remove.isPending}
            onClick={() => remove.mutate(order)}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </IconButton>
        ) : null}
      </div>
      {order.notes ? <p className="line-clamp-2 text-xs text-white/60">{order.notes}</p> : null}
      {order.status === "queued" ? <PrioritySlider order={order} /> : null}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-white/45">
          {order.completed_at ? `Done ${formatDateTime(order.completed_at)}` : `Created ${formatDateTime(order.created_at)}`}
        </span>
        {order.status === "in_progress" ? (
          <Button
            size="sm"
            variant="primary"
            loading={complete.isPending}
            icon={<Check className="size-3.5" aria-hidden />}
            onClick={() => complete.mutate(order.id)}
          >
            Complete
          </Button>
        ) : null}
      </div>
    </motion.li>
  );
}

const TONE: Record<WorkOrderStatus, "amber" | "sky" | "emerald"> = {
  queued: "amber",
  in_progress: "sky",
  done: "emerald",
};

interface WorkOrderBoardProps {
  orders: WorkOrder[];
}

export function WorkOrderBoard({ orders }: WorkOrderBoardProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {COLUMNS.map((status) => {
        const all = orders.filter((order) => order.status === status);
        const visible = sortColumn(status, all);
        return (
          <GlassCard key={status} className="flex flex-col gap-3">
            <header className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">{WORK_ORDER_STATUS_LABEL[status]}</h2>
              <Badge tone={TONE[status]}>{all.length}</Badge>
            </header>
            {visible.length === 0 ? (
              <EmptyState icon={ClipboardList} title={`No ${WORK_ORDER_STATUS_LABEL[status].toLowerCase()} orders`} />
            ) : (
              <ul className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {visible.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </AnimatePresence>
              </ul>
            )}
            {status === "done" && all.length > DONE_LIMIT ? (
              <p className="text-[11px] text-white/45">Showing the {DONE_LIMIT} most recent.</p>
            ) : null}
          </GlassCard>
        );
      })}
    </div>
  );
}
