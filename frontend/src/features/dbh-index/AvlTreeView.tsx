import { useMemo } from "react";
import { motion } from "framer-motion";
import type { AvlNode } from "../../api/types";
import { ZoomableSvg, type Bounds } from "../../components/ui/ZoomableSvg";
import { layoutAvl } from "../../lib/avl";
import { EASE_OUT } from "../../lib/motion";
import { formatOne } from "../../lib/format";

const R = 14;

interface AvlTreeViewProps {
  root: AvlNode;
  visited: Set<string> | null;
  matched: Set<string>;
  onSelect: (specimenId: string) => void;
}

function balanceTone(balance: number): string {
  if (balance === 0) return "#34d399";
  return Math.abs(balance) === 1 ? "#fbbf24" : "#fb7185";
}

export function AvlTreeView({ root, visited, matched, onSelect }: AvlTreeViewProps) {
  const { nodes, links, bounds } = useMemo(() => {
    const layout = layoutAvl(root);
    const placed = layout.descendants().filter((d) => d.data.node !== null);
    const xs = placed.map((n) => n.x);
    const ys = placed.map((n) => n.y);
    const minX = Math.min(...xs) - R * 2;
    const maxX = Math.max(...xs) + R * 2;
    const maxY = Math.max(...ys) + R * 2;
    const box: Bounds = { x: minX, y: -R * 2, width: maxX - minX, height: maxY + R * 2 };
    return {
      nodes: placed,
      links: layout.links().filter((l) => l.target.data.node !== null),
      bounds: box,
    };
  }, [root]);

  const active = visited !== null;

  return (
    <ZoomableSvg
      label="AVL tree of specimens keyed by trunk diameter"
      bounds={bounds}
      maxFitScale={1.4}
      className="h-[28rem] border border-white/5 bg-forest-950/30"
    >
      <g>
        {links.map((link) => {
          const targetId = link.target.data.id;
          const onPath = active && visited.has(targetId) && visited.has(link.source.data.id);
          return (
            <motion.path
              key={targetId}
              initial={false}
              animate={{
                d: `M${link.source.x},${link.source.y}C${link.source.x},${(link.source.y + link.target.y) / 2} ${link.target.x},${(link.source.y + link.target.y) / 2} ${link.target.x},${link.target.y}`,
                opacity: !active || onPath ? 1 : 0.25,
              }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              fill="none"
              stroke={onPath ? "#38bdf8" : "rgba(255,255,255,0.18)"}
              strokeWidth={onPath ? 2 : 1.25}
            />
          );
        })}
      </g>
      {nodes.map((d) => {
        const node = d.data.node;
        if (!node) return null;
        const isMatch = matched.has(node.specimen_id);
        const isVisited = active && visited.has(node.specimen_id);
        const stroke = isMatch ? "#34d399" : isVisited ? "#38bdf8" : "rgba(255,255,255,0.3)";
        return (
          <motion.g
            key={node.specimen_id}
            initial={false}
            animate={{ x: d.x, y: d.y, opacity: !active || isVisited || isMatch ? 1 : 0.25 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={`${node.tag}, DBH ${formatOne(node.key)} cm, balance ${node.balance}`}
            onClick={() => onSelect(node.specimen_id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(node.specimen_id);
            }}
          >
            <title>{`${node.tag} · DBH ${formatOne(node.key)} cm · height ${node.height} · balance ${node.balance}`}</title>
            <circle
              r={R}
              fill={isMatch ? "rgba(52,211,153,0.22)" : "rgba(6,24,18,0.9)"}
              stroke={stroke}
              strokeWidth={isMatch ? 2.5 : 1.5}
              style={isMatch ? { filter: "drop-shadow(0 0 6px #34d399)" } : undefined}
            />
            <text textAnchor="middle" dy="0.35em" className="pointer-events-none fill-white font-mono text-[9px] font-semibold">
              {Math.round(node.key)}
            </text>
            <g transform={`translate(${R - 2},${-R + 2})`}>
              <circle r={6} fill="rgba(6,24,18,0.95)" stroke={balanceTone(node.balance)} strokeWidth={1} />
              <text
                textAnchor="middle"
                dy="0.35em"
                className="pointer-events-none font-mono text-[7px] font-semibold"
                fill={balanceTone(node.balance)}
              >
                {node.balance > 0 ? `+${node.balance}` : node.balance}
              </text>
            </g>
          </motion.g>
        );
      })}
    </ZoomableSvg>
  );
}
