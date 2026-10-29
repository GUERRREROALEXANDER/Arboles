import { useState } from "react";
import { hierarchy, type HierarchyNode } from "d3-hierarchy";
import { linkHorizontal } from "d3-shape";
import { AnimatePresence, motion } from "framer-motion";
import type { LocationNode } from "../../api/types";
import { ZoomableSvg } from "../../components/ui/ZoomableSvg";
import { HEALTH, healthFromScore } from "../../lib/health";

interface LocationTreeExplorerProps {
  root: LocationNode;
  selectedId: string;
  onSelect: (id: string) => void;
}

const ROW = 44;
const INDENT = 30;
const RING = 13;
const CIRC = 2 * Math.PI * RING;

const link = linkHorizontal<{ source: [number, number]; target: [number, number] }, [number, number]>()
  .x((d) => d[0])
  .y((d) => d[1]);

interface Row {
  node: HierarchyNode<LocationNode>;
  x: number;
  y: number;
}

/** Indented City > Locality > Site tree. d3-hierarchy orders the rows; React draws them. */
export function LocationTreeExplorer({ root, selectedId, onSelect }: LocationTreeExplorerProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const rows: Row[] = [];
  hierarchy(root, (d) => (collapsed.has(d.id) ? [] : d.children)).eachBefore((node) => {
    rows.push({ node, x: node.depth * INDENT, y: rows.length * ROW });
  });
  const byId = new Map(rows.map((r) => [r.node.data.id, r]));
  const maxCount = Math.max(1, root.stats.specimens);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ZoomableSvg
      label="Location tree"
      bounds={{ x: -RING - 4, y: -RING - 4, width: 300, height: Math.max(rows.length * ROW, ROW) }}
      maxFitScale={1}
      padding={12}
      className="h-[520px]"
    >
      {rows.map(({ node, x, y }) => {
        const parent = node.parent ? byId.get(node.parent.data.id) : undefined;
        if (!parent) return null;
        const d = link({ source: [parent.x, parent.y + RING], target: [x - RING, y] }) ?? "";
        return (
          <motion.path
            key={`l-${node.data.id}`}
            d={d}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={1 + (node.data.stats.specimens / maxCount) * 4}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        );
      })}
      <AnimatePresence initial={false}>
        {rows.map(({ node, x, y }) => {
          const data = node.data;
          const color = HEALTH[healthFromScore(data.stats.mean_health)].color;
          const selected = data.id === selectedId;
          const hasChildren = data.children.length > 0;
          const parent = node.parent ? byId.get(node.parent.data.id) : undefined;
          return (
            <motion.g
              key={data.id}
              initial={{ x: parent?.x ?? x, y: parent?.y ?? y, opacity: 0 }}
              animate={{ x, y, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              role="button"
              tabIndex={0}
              aria-label={`${data.name}, ${data.stats.specimens} specimens, mean health ${data.stats.mean_health}`}
              aria-pressed={selected}
              onClick={() => onSelect(data.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(data.id);
                }
              }}
              className="cursor-pointer outline-none"
              style={{ filter: selected ? `drop-shadow(0 0 6px ${color})` : undefined }}
            >
              <circle r={RING} fill="rgba(4,19,13,0.9)" stroke="rgba(255,255,255,0.12)" strokeWidth={4} />
              <circle
                r={RING}
                fill="none"
                stroke={color}
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={`${(data.stats.mean_health / 100) * CIRC} ${CIRC}`}
                transform="rotate(-90)"
              />
              <text textAnchor="middle" dy="0.35em" className="fill-white font-mono text-[9px]">
                {Math.round(data.stats.mean_health)}
              </text>
              <text x={RING + 8} dy="-0.1em" className={selected ? "fill-emerald-300 text-[13px] font-semibold" : "fill-white text-[13px] font-semibold"}>
                {data.name}
              </text>
              <text x={RING + 8} dy="1.2em" className="fill-white/55 font-mono text-[10px]">
                {data.stats.specimens} trees · {data.stats.at_risk} at risk
              </text>
              {hasChildren ? (
                <g
                  transform={`translate(${-RING - 12}, 0)`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(data.id);
                  }}
                  role="button"
                  aria-label={collapsed.has(data.id) ? `Expand ${data.name}` : `Collapse ${data.name}`}
                >
                  <circle r={6} fill="rgba(255,255,255,0.08)" />
                  <text textAnchor="middle" dy="0.35em" className="fill-white/80 text-[10px]">
                    {collapsed.has(data.id) ? "+" : "-"}
                  </text>
                </g>
              ) : null}
            </motion.g>
          );
        })}
      </AnimatePresence>
    </ZoomableSvg>
  );
}
