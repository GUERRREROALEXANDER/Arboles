import { ShieldCheck } from "lucide-react";
import { useLocation, useLocationTree } from "../../api/queries";
import { CardHeader } from "../../components/ui/CardHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { GlassCard } from "../../components/ui/GlassCard";
import { HealthBadge } from "../../components/ui/HealthBadge";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { isAtRisk } from "../../lib/health";
import { useUi } from "../../store/ui";
import { RiskMeter } from "../specimen/RiskMeter";

const LIMIT = 8;

/** Every specimen of the city comes from /locations/<root>; at-risk ones are derived here. */
export function AtRiskList() {
  const tree = useLocationTree();
  const city = useLocation(tree.data?.id ?? null);
  const openSpecimen = useUi((s) => s.openSpecimen);

  const atRisk = (city.data?.specimens ?? [])
    .filter(isAtRisk)
    .sort((a, b) => b.risk - a.risk)
    .slice(0, LIMIT);

  const failed = tree.error ?? city.error;

  return (
    <GlassCard staggered>
      <CardHeader title="At-risk trees" caption="Risk 50 or higher, or dead. Sorted by risk score." />
      {failed ? (
        <ErrorState
          error={failed}
          onRetry={() => void (tree.isError ? tree.refetch() : city.refetch())}
        />
      ) : tree.isPending || city.isPending ? (
        <SkeletonRows rows={5} />
      ) : atRisk.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No trees at risk" description="Every specimen is below the risk threshold." />
      ) : (
        <ul className="flex flex-col divide-y divide-white/5">
          {atRisk.map((specimen) => (
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
  );
}
