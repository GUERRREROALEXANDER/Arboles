import { motion } from "framer-motion";
import { ClipboardList, Cloud, HeartPulse, Leaf, TreePine, TriangleAlert } from "lucide-react";
import type { Summary } from "../../api/types";
import { StatTile } from "../../components/ui/StatTile";
import { formatInt, formatOne, formatTwo } from "../../lib/format";
import { staggerContainer } from "../../lib/motion";

interface KpiGridProps {
  summary: Summary;
}

export function KpiGrid({ summary }: KpiGridProps) {
  const { stats } = summary;
  const atRiskShare = stats.specimens > 0 ? (stats.at_risk / stats.specimens) * 100 : 0;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6"
    >
      <StatTile
        label="Specimens"
        value={stats.specimens}
        format={formatInt}
        icon={TreePine}
        hint={`${summary.sites} sites in ${summary.localities} localities`}
      />
      <StatTile
        label="Mean health"
        value={stats.mean_health}
        format={formatOne}
        unit="/ 100"
        icon={HeartPulse}
        accent="lime"
        hint={`${stats.species} species surveyed`}
      />
      <StatTile
        label="At risk"
        value={stats.at_risk}
        format={formatInt}
        icon={TriangleAlert}
        accent="rose"
        hint={`${formatOne(atRiskShare)}% of the inventory`}
      />
      <StatTile
        label="CO2 stored"
        value={stats.co2_tonnes}
        format={formatTwo}
        unit="t"
        icon={Cloud}
        accent="sky"
        hint="Above-ground biomass, Chave 2014"
      />
      <StatTile
        label="Canopy cover"
        value={stats.canopy_m2}
        format={formatInt}
        unit="m2"
        icon={Leaf}
        hint="Sum of crown projections"
      />
      <StatTile
        label="Open work orders"
        value={summary.open_work_orders}
        format={formatInt}
        icon={ClipboardList}
        accent="amber"
        hint="Queued and in progress"
      />
    </motion.div>
  );
}
