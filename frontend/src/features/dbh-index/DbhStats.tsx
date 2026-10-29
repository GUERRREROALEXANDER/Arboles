import { motion } from "framer-motion";
import { GitBranch, Layers, RotateCw, Sigma } from "lucide-react";
import type { DbhTree } from "../../api/types";
import { StatTile } from "../../components/ui/StatTile";
import { formatInt, formatTwo } from "../../lib/format";
import { staggerContainer } from "../../lib/motion";

export const theoreticalBound = (n: number) => (n > 0 ? 1.44 * Math.log2(n) : 0);

export function DbhStats({ tree }: { tree: DbhTree }) {
  const bound = theoreticalBound(tree.size);
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-4 xl:grid-cols-4"
    >
      <StatTile label="Size" value={tree.size} format={formatInt} unit="nodes" icon={Layers} hint="One node per specimen" />
      <StatTile
        label="Height"
        value={tree.height}
        format={formatInt}
        unit="levels"
        icon={GitBranch}
        accent="sky"
        hint={bound > 0 ? `${tree.height <= bound ? "Within" : "Above"} the AVL bound` : undefined}
      />
      <StatTile
        label="Rotations"
        value={tree.rotations}
        format={formatInt}
        icon={RotateCw}
        accent="amber"
        hint="Performed to keep |balance| <= 1"
      />
      <StatTile
        label="Theoretical bound"
        value={bound}
        format={formatTwo}
        unit="levels"
        icon={Sigma}
        accent="lime"
        hint="1.44 * log2(n), worst case AVL height"
      />
    </motion.div>
  );
}
