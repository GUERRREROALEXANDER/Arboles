import { AnimatePresence, motion } from "framer-motion";
import { Network } from "lucide-react";
import type { HeapItem } from "../../api/types";
import { CardHeader } from "../../components/ui/CardHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { GlassCard } from "../../components/ui/GlassCard";
import { ZoomableSvg } from "../../components/ui/ZoomableSvg";
import { HEAP_SLOT, layoutHeap } from "../../lib/heap";
import { EASE_OUT } from "../../lib/motion";
import { WORK_ORDER_KIND_LABEL } from "../../lib/format";
import { PriorityPill, priorityColor } from "./PriorityPill";

const NODE_R = 18;
const sift = { type: "spring", stiffness: 260, damping: 28 } as const;

interface HeapViewProps {
  items: HeapItem[];
}

function HeapStrip({ items }: HeapViewProps) {
  return (
    <ol className="flex gap-1.5 overflow-x-auto pb-2" aria-label="Heap array">
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <motion.li
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={sift}
            title={`${item.id} · ${WORK_ORDER_KIND_LABEL[item.kind]}`}
            className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-1.5 py-2"
          >
            <span className="font-mono text-[10px] text-white/45">[{index}]</span>
            <PriorityPill priority={item.priority} />
            <span className="w-full truncate text-center font-mono text-[10px] text-white/70">
              {item.specimen_tag}
            </span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

function HeapTree({ items }: HeapViewProps) {
  const { points, width, height } = layoutHeap(items);

  return (
    <ZoomableSvg
      label="Implicit binary tree of the work order heap"
      bounds={{ x: 0, y: -NODE_R - 6, width: Math.max(width, HEAP_SLOT), height: height + NODE_R * 2 + 24 }}
      className="h-80 border border-white/5 bg-forest-950/30"
    >
      <g>
        {points.map((point, index) => {
          const parent = point.parentIndex === null ? undefined : points[point.parentIndex];
          if (!parent) return null;
          return (
            <motion.line
              key={`edge-${index}`}
              initial={false}
              animate={{ x1: parent.x, y1: parent.y, x2: point.x, y2: point.y }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={1.5}
            />
          );
        })}
      </g>
      <AnimatePresence initial={false}>
        {points.map((point, index) => (
          <motion.g
            key={point.item.id}
            initial={{ opacity: 0, x: point.x, y: point.y - 20 }}
            animate={{ opacity: 1, x: point.x, y: point.y }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={sift}
          >
            <title>{`[${index}] ${point.item.specimen_tag} · ${WORK_ORDER_KIND_LABEL[point.item.kind]} · priority ${point.item.priority}`}</title>
            <circle
              r={NODE_R}
              fill="rgba(6,24,18,0.9)"
              stroke={priorityColor(point.item.priority)}
              strokeWidth={index === 0 ? 2.5 : 1.5}
              style={index === 0 ? { filter: `drop-shadow(0 0 6px ${priorityColor(point.item.priority)})` } : undefined}
            />
            <text
              textAnchor="middle"
              dy="0.35em"
              className="fill-white font-mono text-[11px] font-semibold"
            >
              {point.item.priority}
            </text>
            <text y={NODE_R + 11} textAnchor="middle" className="fill-white/45 font-mono text-[9px]">
              {index}
            </text>
          </motion.g>
        ))}
      </AnimatePresence>
    </ZoomableSvg>
  );
}

export function HeapView({ items }: HeapViewProps) {
  return (
    <GlassCard>
      <CardHeader
        title="Binary max-heap"
        caption="One array, two views. The node at index i has children at 2i + 1 and 2i + 2; dispatch pops the root and sifts the last element down."
      />
      {items.length === 0 ? (
        <EmptyState icon={Network} title="Heap is empty" description="Queue a work order to see it sift into place." />
      ) : (
        <div className="flex flex-col gap-4">
          <HeapStrip items={items} />
          <HeapTree items={items} />
        </div>
      )}
    </GlassCard>
  );
}
