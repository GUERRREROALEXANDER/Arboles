import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ClipboardList } from "lucide-react";
import { useSpecimen } from "../../api/queries";
import type { Breadcrumb, SpecimenDetail } from "../../api/types";
import { Badge } from "../../components/ui/Badge";
import { Drawer } from "../../components/ui/Drawer";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { HealthBadge } from "../../components/ui/HealthBadge";
import { Skeleton, SkeletonRows } from "../../components/ui/Skeleton";
import { formatDate, formatInt, formatOne, WORK_ORDER_KIND_LABEL, WORK_ORDER_STATUS_LABEL } from "../../lib/format";
import { useUi } from "../../store/ui";
import { PriorityPill } from "../workshop/PriorityPill";
import { WorkOrderForm } from "../workshop/WorkOrderForm";
import { AddMeasurementForm } from "./AddMeasurementForm";
import { GrowthChart } from "./GrowthChart";
import { HealthUpdateSelect } from "./HealthUpdateSelect";
import { RiskGauge } from "./RiskGauge";

export function SpecimenDrawer() {
  const id = useUi((s) => s.selectedSpecimenId);
  const close = useUi((s) => s.closeSpecimen);
  const { data, isPending, isError, error, refetch } = useSpecimen(id);

  return (
    <Drawer open={id !== null} onClose={close} label="Specimen details">
      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} className="mt-16" />
      ) : isPending || !data ? (
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-64" />
          <SkeletonRows rows={6} />
        </div>
      ) : (
        <SpecimenDetailView specimen={data} />
      )}
    </Drawer>
  );
}

interface CrumbsProps {
  items: Breadcrumb[];
  label: string;
  onSelect?: (crumb: Breadcrumb) => void;
}

function Crumbs({ items, label, onSelect }: CrumbsProps) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-white/60">
        {items.map((crumb, index) => (
          <li key={crumb.id} className="flex items-center gap-1">
            {index > 0 ? <ChevronRight className="size-3 text-white/35" aria-hidden /> : null}
            {onSelect ? (
              <button type="button" onClick={() => onSelect(crumb)} className="focus-ring rounded hover:text-emerald-300">
                {crumb.name}
              </button>
            ) : (
              <span className={index === items.length - 1 ? "italic text-white/80" : undefined}>{crumb.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface MetricProps {
  label: string;
  value: string;
  hint?: string;
}

function Metric({ label, value, hint }: MetricProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] uppercase tracking-wider text-white/55">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-white">{value}</p>
      {hint ? <p className="font-mono text-[11px] text-lime-300/80">{hint}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-white/10 px-6 py-5">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {children}
    </section>
  );
}

function SpecimenDetailView({ specimen }: { specimen: SpecimenDetail }) {
  const navigate = useNavigate();
  const selectLocation = useUi((s) => s.selectLocation);
  const close = useUi((s) => s.closeSpecimen);
  const { growth } = specimen;

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-3 px-6 pb-5 pt-6 pr-16">
        <Crumbs
          items={specimen.path}
          label="Location"
          onSelect={(crumb) => {
            selectLocation(crumb.id);
            close();
            navigate("/inventory");
          }}
        />
        <div>
          <p className="font-mono text-xs text-emerald-300">{specimen.tag}</p>
          <h2 className="text-2xl font-extrabold text-white">{specimen.common_name}</h2>
          <p className="text-sm italic text-white/70">{specimen.scientific_name}</p>
        </div>
        <Crumbs items={specimen.taxonomy} label="Taxonomy" />
        <div className="flex flex-wrap items-center gap-2">
          <HealthBadge health={specimen.health} />
          <Badge>Planted {formatDate(specimen.planted_on)}</Badge>
          <Badge>Lean {formatOne(specimen.lean_deg)} deg</Badge>
        </div>
      </header>

      <div className="grid grid-cols-[auto_1fr] items-center gap-5 px-6 pb-5">
        <RiskGauge risk={specimen.risk} />
        <div className="grid grid-cols-2 gap-2">
          <Metric label="CO2 stored" value={`${formatInt(specimen.co2_kg)} kg`} />
          <Metric label="Canopy" value={`${formatOne(specimen.canopy_m2)} m2`} />
          <Metric label="Height" value={`${formatOne(specimen.height_m)} m`} hint={`+${formatOne(growth.height_m_per_year)} m/yr`} />
          <Metric label="DBH" value={`${formatOne(specimen.dbh_cm)} cm`} hint={`+${formatOne(growth.dbh_cm_per_year)} cm/yr`} />
        </div>
      </div>

      <Section title="Growth">
        <GrowthChart measurements={specimen.measurements} />
      </Section>

      <Section title="Add measurement">
        <AddMeasurementForm key={specimen.id} specimen={specimen} />
      </Section>

      <Section title="Health survey">
        <HealthUpdateSelect specimenId={specimen.id} health={specimen.health} />
      </Section>

      <Section title={`Open work orders (${specimen.open_work_orders.length})`}>
        {specimen.open_work_orders.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No open work orders" className="py-4" />
        ) : (
          <ul className="flex flex-col gap-2">
            {specimen.open_work_orders.map((order) => (
              <li key={order.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <PriorityPill priority={order.priority} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-white">{WORK_ORDER_KIND_LABEL[order.kind]}</span>
                  <span className="block truncate text-xs text-white/55">{order.notes || order.id}</span>
                </span>
                <Badge tone={order.status === "in_progress" ? "sky" : "neutral"}>{WORK_ORDER_STATUS_LABEL[order.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Create work order">
        <WorkOrderForm key={specimen.id} specimenId={specimen.id} />
      </Section>
    </div>
  );
}
