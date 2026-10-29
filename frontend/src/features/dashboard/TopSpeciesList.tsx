import { motion } from "framer-motion";
import { Sprout } from "lucide-react";
import type { TopSpecies } from "../../api/types";
import { CardHeader } from "../../components/ui/CardHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { GlassCard } from "../../components/ui/GlassCard";
import { formatInt } from "../../lib/format";
import { EASE_OUT } from "../../lib/motion";
import { CATEGORICAL } from "../../lib/palette";

interface TopSpeciesListProps {
  species: TopSpecies[];
  total: number;
}

export function TopSpeciesList({ species, total }: TopSpeciesListProps) {
  const max = Math.max(1, ...species.map((s) => s.count));
  const covered = species.reduce((sum, s) => sum + s.count, 0);
  const share = total > 0 ? Math.round((covered / total) * 100) : 0;

  return (
    <GlassCard staggered>
      <CardHeader title="Top species" caption={`The six most planted species make up ${share}% of all trees.`} />
      {species.length === 0 ? (
        <EmptyState icon={Sprout} title="No species recorded" />
      ) : (
        <ol className="flex flex-col gap-3">
          {species.map((item, index) => (
            <li key={item.species_id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-white">{item.common_name}</span>
                <span className="font-mono text-xs tabular-nums text-white/70">{formatInt(item.count)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: CATEGORICAL[index % CATEGORICAL.length] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.count / max) * 100}%` }}
                  transition={{ duration: 0.8, ease: EASE_OUT, delay: index * 0.05 }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </GlassCard>
  );
}
