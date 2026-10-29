import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LocalityCo2 } from "../../api/types";
import { ChartCard } from "../../components/ui/ChartCard";
import { ChartTooltip, type TooltipRendererProps } from "../../components/ui/ChartTooltip";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatOne, formatTwo } from "../../lib/format";
import { ACCENT, CHART } from "../../lib/palette";
import { Cloud } from "lucide-react";

interface Co2ByLocalityChartProps {
  localities: LocalityCo2[];
}

const tick = { fill: CHART.tick, fontSize: 12, fontFamily: CHART.tickFont };

export function Co2ByLocalityChart({ localities }: Co2ByLocalityChartProps) {
  const data = [...localities].sort((a, b) => b.co2_tonnes - a.co2_tonnes);
  const leader = data[0];

  const renderTooltip = ({ active, payload }: TooltipRendererProps) => {
    const row = payload[0]?.payload as LocalityCo2 | undefined;
    if (!active || !row) return null;
    return (
      <ChartTooltip
        title={row.name}
        rows={[
          { label: "CO2 stored", value: `${formatTwo(row.co2_tonnes)} t`, color: ACCENT.info },
          { label: "Mean health", value: formatOne(row.mean_health) },
        ]}
      />
    );
  };

  return (
    <ChartCard
      title="CO2 stored by locality"
      caption={
        leader
          ? `${leader.name} holds the largest carbon stock at ${formatTwo(leader.co2_tonnes)} t.`
          : "Carbon stock per locality."
      }
    >
      {data.length === 0 ? (
        <EmptyState icon={Cloud} title="No localities yet" />
      ) : (
        <div style={{ height: Math.max(220, data.length * 38) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" tick={tick} stroke={CHART.grid} tickLine={false} unit=" t" />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ ...tick, fontFamily: "inherit" }}
                stroke={CHART.grid}
                tickLine={false}
              />
              <Tooltip content={renderTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="co2_tonnes" fill={ACCENT.info} radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
