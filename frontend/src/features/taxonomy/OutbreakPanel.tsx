import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Bug, ClipboardCheck, ShieldAlert, Trees } from "lucide-react";
import { useCreateInspectionOrders } from "../../api/queries";
import type { Outbreak, OutbreakSite } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { CardHeader } from "../../components/ui/CardHeader";
import { ChartCard } from "../../components/ui/ChartCard";
import { ChartTooltip } from "../../components/ui/ChartTooltip";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { GlassCard } from "../../components/ui/GlassCard";
import { HealthBadge } from "../../components/ui/HealthBadge";
import { Select } from "../../components/ui/Select";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { StatTile } from "../../components/ui/StatTile";
import { formatInt } from "../../lib/format";
import { isAtRisk } from "../../lib/health";
import { ACCENT, CHART } from "../../lib/palette";
import { taxonLabel, type TaxonOption } from "../../lib/trees";
import { useUi } from "../../store/ui";
import { RiskMeter } from "../specimen/RiskMeter";
import { RANK_LABEL } from "./rank";

interface OutbreakPickerProps {
  taxa: TaxonOption[];
  taxonId: string | null;
  onChange: (id: string | null) => void;
}

export function OutbreakPicker({ taxa, taxonId, onChange }: OutbreakPickerProps) {
  return (
    <GlassCard staggered>
      <CardHeader
        title="Outbreak simulator"
        caption="Choose a family, genus or species to see every specimen a host-specific pest could reach."
      />
      <Select value={taxonId ?? ""} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">Choose a taxon</option>
        {taxa.map((option) => (
          <option key={option.id} value={option.id}>
            {`${"  ".repeat(option.depth)}${RANK_LABEL[option.rank]}: ${taxonLabel(option)}`}
          </option>
        ))}
      </Select>
      <p className="mt-2 text-xs text-white/45">You can also click any node in the tree.</p>
    </GlassCard>
  );
}

const tick = { fill: CHART.tick, fontSize: 12, fontFamily: CHART.tickFont };

function renderSiteTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  const row = payload[0]?.payload as OutbreakSite | undefined;
  if (!active || !row) return null;
  return (
    <ChartTooltip
      title={row.site_name}
      rows={[{ label: "Exposed", value: formatInt(row.count), color: ACCENT.critical }]}
    />
  );
}

interface OutbreakResultsProps {
  taxonId: string | null;
  outbreak: Outbreak | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function OutbreakResults({ taxonId, outbreak, isLoading, error, onRetry }: OutbreakResultsProps) {
  const openSpecimen = useUi((s) => s.openSpecimen);
  const createOrders = useCreateInspectionOrders();

  if (taxonId === null) {
    return (
      <GlassCard staggered>
        <EmptyState
          icon={Bug}
          title="No outbreak simulated"
          description="Select a taxon to highlight its subtree and list the exposed specimens."
        />
      </GlassCard>
    );
  }
  if (error) {
    return (
      <GlassCard staggered>
        <ErrorState error={error} onRetry={onRetry} />
      </GlassCard>
    );
  }
  if (isLoading || !outbreak) {
    return (
      <GlassCard staggered>
        <SkeletonRows rows={6} />
      </GlassCard>
    );
  }

  const sites = [...outbreak.by_site].sort((x, y) => y.count - x.count);
  const exposed = [...outbreak.specimens].sort((x, y) => y.risk - x.risk);
  const atRiskIds = exposed.filter(isAtRisk).map((specimen) => specimen.id);
  const share = outbreak.total === 0 ? 0 : Math.round((outbreak.at_risk / outbreak.total) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          label="Exposed specimens"
          value={outbreak.total}
          format={formatInt}
          icon={Trees}
          accent="amber"
          hint={`${RANK_LABEL[outbreak.taxon.rank]} ${outbreak.taxon.name}`}
        />
        <StatTile
          label="Exposed and at risk"
          value={outbreak.at_risk}
          format={formatInt}
          icon={ShieldAlert}
          accent="rose"
          hint={`${share}% of exposed specimens`}
        />
      </div>

      <ChartCard
        title="Exposure by site"
        caption={
          sites[0]
            ? `${sites[0].site_name} hosts the most exposed specimens (${formatInt(sites[0].count)}).`
            : "No site hosts this taxon."
        }
      >
        {sites.length === 0 ? (
          <EmptyState icon={Trees} title="No exposed sites" />
        ) : (
          <div style={{ height: Math.max(200, sites.length * 34) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sites} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={tick} stroke={CHART.grid} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="site_name"
                  width={140}
                  tick={{ ...tick, fontFamily: "inherit" }}
                  stroke={CHART.grid}
                  tickLine={false}
                />
                <Tooltip content={renderSiteTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" fill={ACCENT.critical} radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <GlassCard staggered>
        <CardHeader
          title="Exposed specimens"
          caption="Sorted by risk. Open one to see its full record."
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={<ClipboardCheck className="size-3.5" aria-hidden />}
              loading={createOrders.isPending}
              disabled={atRiskIds.length === 0}
              onClick={() =>
                createOrders.mutate({
                  specimenIds: atRiskIds,
                  notes: `Outbreak check: ${RANK_LABEL[outbreak.taxon.rank].toLowerCase()} ${outbreak.taxon.name}`,
                })
              }
            >
              Create inspection orders ({formatInt(atRiskIds.length)})
            </Button>
          }
        />
        {exposed.length === 0 ? (
          <EmptyState icon={Trees} title="No specimens exposed" description="No living record belongs to this taxon." />
        ) : (
          <ul className="flex max-h-96 flex-col divide-y divide-white/5 overflow-y-auto pr-1">
            {exposed.map((specimen) => (
              <li key={specimen.id}>
                <button
                  type="button"
                  onClick={() => openSpecimen(specimen.id)}
                  className="focus-ring flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left hover:bg-white/[0.03]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{specimen.common_name}</span>
                    <span className="block truncate font-mono text-[11px] text-white/55">
                      {specimen.tag} · {specimen.site_name}
                    </span>
                  </span>
                  <HealthBadge health={specimen.health} className="hidden sm:inline-flex" />
                  <RiskMeter risk={specimen.risk} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
