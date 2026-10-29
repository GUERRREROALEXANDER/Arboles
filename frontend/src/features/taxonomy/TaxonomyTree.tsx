import { useMemo } from "react";
import { motion } from "framer-motion";
import { hierarchy, tree, type HierarchyPointLink, type HierarchyPointNode } from "d3-hierarchy";
import { linkHorizontal } from "d3-shape";
import { ZoomableSvg, type Bounds } from "../../components/ui/ZoomableSvg";
import { formatInt } from "../../lib/format";
import { EASE_OUT } from "../../lib/motion";
import { RANK_COLOR, RANK_LABEL, type TreeDatum } from "./rank";

interface TaxonomyTreeProps {
  data: TreeDatum;
  highlightIds: ReadonlySet<string> | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type PointNode = HierarchyPointNode<TreeDatum>;
type PointLink = HierarchyPointLink<TreeDatum>;

const ROW = 26;
const COLUMN = 240;

const linkPath = linkHorizontal<PointLink, PointNode>()
  .source((link) => link.source)
  .target((link) => link.target)
  .x((node) => node.y)
  .y((node) => node.x);

export function TaxonomyTree({ data, highlightIds, selectedId, onSelect }: TaxonomyTreeProps) {
  const layout = useMemo(() => {
    const root = tree<TreeDatum>().nodeSize([ROW, COLUMN])(hierarchy(data));
    const nodes = root.descendants();
    const links = root.links();
    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = 0;
    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    }
    const bounds: Bounds = { x: -40, y: minX - ROW, width: maxY + 260, height: maxX - minX + ROW * 2 };
    const maxSpecimens = Math.max(1, ...nodes.filter((n) => n.depth > 0).map((n) => n.data.specimens));
    return { nodes, links, bounds, maxSpecimens };
  }, [data]);

  const radius = (node: PointNode) =>
    node.depth === 0 ? 8 : 4 + 10 * Math.sqrt(node.data.specimens / layout.maxSpecimens);

  const isLit = (id: string) => highlightIds === null || highlightIds.has(id);

  return (
    <ZoomableSvg bounds={layout.bounds} label="Taxonomy tree from family to species" className="h-[560px]">
      <g fill="none">
        {layout.links.map((link) => {
          const lit = isLit(link.source.data.id) && isLit(link.target.data.id);
          return (
            <motion.path
              key={`${link.source.data.id}-${link.target.data.id}`}
              d={linkPath(link) ?? undefined}
              stroke={lit && highlightIds ? RANK_COLOR[link.target.data.rank] : "rgba(255,255,255,0.18)"}
              strokeWidth={1 + 4 * Math.sqrt(link.target.data.specimens / layout.maxSpecimens)}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: lit ? 1 : 0.25 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            />
          );
        })}
      </g>
      {layout.nodes.map((node) => {
        const { id, name, rank, common_name, specimens } = node.data;
        const lit = isLit(id);
        const glowing = (highlightIds !== null && highlightIds.has(id)) || selectedId === id;
        const r = radius(node);
        const leaf = node.children === undefined;
        const color = RANK_COLOR[rank];
        return (
          <motion.g
            key={id}
            initial={{ opacity: 0, x: node.parent?.y ?? 0, y: node.parent?.x ?? 0 }}
            animate={{ opacity: lit ? 1 : 0.25, x: node.y, y: node.x }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            style={{ filter: glowing ? `drop-shadow(0 0 6px ${color})` : undefined }}
            className={rank === "root" ? undefined : "cursor-pointer"}
            onClick={rank === "root" ? undefined : () => onSelect(id)}
          >
            <title>{`${RANK_LABEL[rank]} ${name}: ${formatInt(specimens)} specimens`}</title>
            <circle
              r={r}
              fill={color}
              fillOpacity={rank === "root" ? 0.4 : 0.85}
              stroke={selectedId === id ? "#ffffff" : color}
              strokeWidth={selectedId === id ? 2 : 1}
            />
            <text
              x={leaf ? r + 6 : -(r + 6)}
              dy="0.32em"
              textAnchor={leaf ? "start" : "end"}
              className="select-none fill-white text-[11px]"
              fontStyle={rank === "root" ? undefined : "italic"}
            >
              {name}
              {leaf && common_name ? (
                <tspan className="fill-white/50" fontStyle="normal">
                  {`  ${common_name} · ${formatInt(specimens)}`}
                </tspan>
              ) : null}
            </text>
          </motion.g>
        );
      })}
    </ZoomableSvg>
  );
}

export function RankLegend() {
  const ranks = ["family", "genus", "species"] as const;
  return (
    <ul className="flex flex-wrap items-center gap-3 text-xs text-white/60">
      {ranks.map((rank) => (
        <li key={rank} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: RANK_COLOR[rank] }} aria-hidden />
          {RANK_LABEL[rank]}
        </li>
      ))}
      <li className="text-white/45">Node size = specimens</li>
    </ul>
  );
}
