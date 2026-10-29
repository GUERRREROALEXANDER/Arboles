import { motion } from "framer-motion";
import { useSummary } from "../api/queries";
import { PageHeader } from "../components/layout/PageHeader";
import { PageSkeleton } from "../components/layout/PageSkeleton";
import { ErrorState } from "../components/ui/ErrorState";
import { GlassCard } from "../components/ui/GlassCard";
import { AtRiskList } from "../features/dashboard/AtRiskList";
import { Co2ByLocalityChart } from "../features/dashboard/Co2ByLocalityChart";
import { HealthDonut } from "../features/dashboard/HealthDonut";
import { KpiGrid } from "../features/dashboard/KpiGrid";
import { TopSpeciesList } from "../features/dashboard/TopSpeciesList";
import { WorkQueuePreview } from "../features/dashboard/WorkQueuePreview";
import { staggerContainer } from "../lib/motion";

export default function DashboardPage() {
  const { data, isPending, isError, error, refetch } = useSummary();

  if (isPending) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Overview"
        title="Urban forest at a glance"
        description="Health, carbon and crew workload across every locality in the Bogota census slice."
      />
      {isError ? (
        <GlassCard>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </GlassCard>
      ) : (
        <>
          <KpiGrid summary={data} />
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3"
          >
            <HealthDonut stats={data.stats} />
            <Co2ByLocalityChart localities={data.co2_by_locality} />
            <TopSpeciesList species={data.top_species} total={data.stats.specimens} />
            <WorkQueuePreview />
            <div className="lg:col-span-2 2xl:col-span-2">
              <AtRiskList />
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
