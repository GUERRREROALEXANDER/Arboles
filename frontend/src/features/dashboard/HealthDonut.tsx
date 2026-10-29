import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { HealthStatus, Stats } from "../../api/types";
import { ChartCard } from "../../components/ui/ChartCard";
import { ChartTooltip, type TooltipRendererProps } from "../../components/ui/ChartTooltip";
import { formatInt, formatOne } from "../../lib/format";
import { HEALTH, HEALTH_ORDER } from "../../lib/health";

interface HealthDonutProps {
  stats: Stats;
}

interface Slice {
  health: HealthStatus;
  count: number;
}

export function HealthDonut({ stats }: HealthDonutProps) {
  const slices: Slice[] = HEALTH_ORDER.map((health) => ({
    health,
    count: stats.health_breakdown[health],
  }));
  const total = stats.specimens;
  const healthyShare =
    total > 0 ? ((stats.health_breakdown.excellent + stats.health_breakdown.good) / total) * 100 : 0;

  const renderTooltip = ({ active, payload }: TooltipRendererProps) => {
    const slice = payload[0]?.payload as Slice | undefined;
    if (!active || !slice) return null;
    return (
      <ChartTooltip
        title={HEALTH[slice.health].label}
        rows={[
          { label: "Specimens", value: formatInt(slice.count), color: HEALTH[slice.health].color },
          { label: "Share", value: `${formatOne(total ? (slice.count / total) * 100 : 0)}%` },
        ]}
      />
    );
  };

  return (
    <ChartCard
      title="Health distribution"
      caption={`${formatOne(healthyShare)}% of trees are in good or excellent health.`}
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative h-52 w-full max-w-52 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="count"
                nameKey="health"
                innerRadius="70%"
                outerRadius="100%"
                paddingAngle={2}
                stroke="none"
                cornerRadius={4}
              >
                {slices.map((slice) => (
                  <Cell key={slice.health} fill={HEALTH[slice.health].color} />
                ))}
              </Pie>
              <Tooltip content={renderTooltip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-semibold tabular-nums text-white">{formatInt(total)}</span>
            <span className="text-[11px] uppercase tracking-wider text-white/55">trees</span>
          </div>
        </div>
        <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-1">
          {slices.map((slice) => (
            <li key={slice.health} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-white/70">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: HEALTH[slice.health].color }} aria-hidden />
                {HEALTH[slice.health].label}
              </span>
              <span className="font-mono tabular-nums text-white">{formatInt(slice.count)}</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}
