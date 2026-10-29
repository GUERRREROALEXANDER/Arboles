import { useMemo, useState } from "react";
import { Info, Network } from "lucide-react";
import { useDbhRange, useDbhTree } from "../api/queries";
import { PageHeader } from "../components/layout/PageHeader";
import { PageSkeleton } from "../components/layout/PageSkeleton";
import { CardHeader } from "../components/ui/CardHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { GlassCard } from "../components/ui/GlassCard";
import { RangeSlider } from "../components/ui/RangeSlider";
import { SkeletonRows } from "../components/ui/Skeleton";
import { AvlTreeView } from "../features/dbh-index/AvlTreeView";
import { DbhResultsTable } from "../features/dbh-index/DbhResultsTable";
import { DbhStats } from "../features/dbh-index/DbhStats";
import { keyBounds, rangeVisitedIds } from "../lib/avl";
import { formatInt } from "../lib/format";
import { useDebouncedValue } from "../lib/hooks";
import { useUi } from "../store/ui";

const formatCm = (value: number) => `${formatInt(value)} cm`;

export default function DbhIndexPage() {
  const tree = useDbhTree();
  const openSpecimen = useUi((s) => s.openSpecimen);
  const [range, setRange] = useState<[number, number] | null>(null);

  const root = tree.data?.root ?? null;
  const limits = useMemo(() => {
    const bounds = keyBounds(root);
    return bounds ? { min: Math.floor(bounds.min), max: Math.ceil(bounds.max) } : null;
  }, [root]);

  const value: [number, number] = range ?? (limits ? [limits.min, limits.max] : [0, 0]);
  const low = useDebouncedValue(value[0], 200);
  const high = useDebouncedValue(value[1], 200);
  const query = useDbhRange(low, high, limits !== null && range !== null);

  const visited = useMemo(
    () => (range !== null && root ? rangeVisitedIds(root, low, high) : null),
    [range, root, low, high],
  );
  const matched = useMemo(() => new Set(query.data?.items.map((s) => s.id) ?? []), [query.data]);

  if (tree.isPending) return <PageSkeleton />;

  const header = (
    <PageHeader
      eyebrow="DBH index"
      title="Specimens by trunk diameter"
      description="Every specimen is a node in a self-balancing AVL tree keyed by diameter at breast height. Range queries prune whole subtrees instead of scanning the census."
    />
  );

  if (tree.isError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <GlassCard>
          <ErrorState error={tree.error} onRetry={() => void tree.refetch()} />
        </GlassCard>
      </div>
    );
  }

  const data = tree.data;
  const k = query.data?.items.length ?? 0;
  const visitedCount = query.data?.visited ?? visited?.size ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {header}
      <DbhStats tree={data} />

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <GlassCard>
          <CardHeader
            title="AVL tree"
            caption="Key is DBH in cm. The corner badge is the balance factor (left height minus right height). Blue nodes were visited by the query, green nodes matched."
          />
          {data.root ? (
            <AvlTreeView root={data.root} visited={visited} matched={matched} onSelect={openSpecimen} />
          ) : (
            <EmptyState icon={Network} title="Index is empty" description="Add specimens to build the tree." />
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-5">
          <CardHeader title="Range query" caption="Drag either thumb to call GET /index/dbh with an inclusive range." />
          {limits ? (
            <RangeSlider
              label="DBH range"
              min={limits.min}
              max={limits.max}
              value={value}
              onChange={setRange}
              format={formatCm}
            />
          ) : null}

          {range === null ? (
            <p className="text-sm text-white/60">Move the slider to run a range query on the index.</p>
          ) : (
            <>
              <div
                role="status"
                className="flex gap-3 rounded-xl border border-sky-400/30 bg-sky-400/10 p-3 text-sm text-sky-100"
              >
                <Info className="mt-0.5 size-4 shrink-0 text-sky-300" aria-hidden />
                <p>
                  Visited <strong className="font-mono">{formatInt(visitedCount)}</strong> of{" "}
                  <strong className="font-mono">{formatInt(data.size)}</strong> nodes to return{" "}
                  <strong className="font-mono">{formatInt(k)}</strong> matches. The search walks one root-to-leaf
                  path per bound, O(log n), then reports each match, O(k): O(log n + k) instead of O(n).
                </p>
              </div>
              {query.isPending ? (
                <SkeletonRows rows={5} />
              ) : query.isError ? (
                <ErrorState error={query.error} onRetry={() => void query.refetch()} />
              ) : (
                <DbhResultsTable items={query.data.items} onSelect={openSpecimen} />
              )}
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
