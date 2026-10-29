import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineIcon } from "lucide-react";
import type { Measurement } from "../../api/types";
import { ChartTooltip, type TooltipRendererProps } from "../../components/ui/ChartTooltip";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDate, formatOne } from "../../lib/format";
import { ACCENT, CHART } from "../../lib/palette";

interface GrowthChartProps {
  measurements: Measurement[];
}

const tick = { fill: CHART.tick, fontSize: 12, fontFamily: CHART.tickFont };
const yearOf = (iso: string) => iso.slice(0, 4);

export function GrowthChart({ measurements }: GrowthChartProps) {
  if (measurements.length === 0) {
    return <EmptyState icon={LineIcon} title="No measurements yet" description="Record one below to start the growth curve." />;
  }

  const renderTooltip = ({ active, payload }: TooltipRendererProps) => {
    const row = payload[0]?.payload as Measurement | undefined;
    if (!active || !row) return null;
    return (
      <ChartTooltip
        title={formatDate(row.date)}
        rows={[
          { label: "Height", value: `${formatOne(row.height_m)} m`, color: ACCENT.growth },
          { label: "DBH", value: `${formatOne(row.dbh_cm)} cm`, color: ACCENT.info },
          { label: "Crown", value: `${formatOne(row.crown_m)} m` },
        ]}
      />
    );
  };

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={measurements} margin={{ left: -8, right: 4, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="grow-height" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT.growth} stopOpacity={0.35} />
              <stop offset="100%" stopColor={ACCENT.growth} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grow-dbh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT.info} stopOpacity={0.35} />
              <stop offset="100%" stopColor={ACCENT.info} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="date" tickFormatter={yearOf} tick={tick} stroke={CHART.grid} tickLine={false} minTickGap={24} />
          <YAxis yAxisId="height" tick={tick} stroke={CHART.grid} tickLine={false} unit="m" width={44} />
          <YAxis yAxisId="dbh" orientation="right" tick={tick} stroke={CHART.grid} tickLine={false} unit="cm" width={48} />
          <Tooltip content={renderTooltip} />
          <Area
            yAxisId="height"
            type="monotone"
            dataKey="height_m"
            name="Height"
            stroke={ACCENT.growth}
            strokeWidth={2}
            fill="url(#grow-height)"
            dot={{ r: 2.5, fill: ACCENT.growth, strokeWidth: 0 }}
          />
          <Area
            yAxisId="dbh"
            type="monotone"
            dataKey="dbh_cm"
            name="DBH"
            stroke={ACCENT.info}
            strokeWidth={2}
            fill="url(#grow-dbh)"
            dot={{ r: 2.5, fill: ACCENT.info, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
