import { GitFork } from "lucide-react";
import type { Relatedness } from "../../api/types";
import { CardHeader } from "../../components/ui/CardHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { GlassCard } from "../../components/ui/GlassCard";
import { Select } from "../../components/ui/Select";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { taxonLabel, type TaxonOption } from "../../lib/trees";
import { RANK_COLOR, RANK_LABEL } from "./rank";

interface RelatednessPanelProps {
  species: TaxonOption[];
  a: string | null;
  b: string | null;
  onChange: (a: string | null, b: string | null) => void;
  result: Relatedness | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function RelatednessPanel({
  species,
  a,
  b,
  onChange,
  result,
  isLoading,
  error,
  onRetry,
}: RelatednessPanelProps) {
  const ready = a !== null && b !== null && a !== b;

  const picker = (value: string | null, label: string, onPick: (id: string | null) => void) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-white/60">
      {label}
      <Select value={value ?? ""} onChange={(event) => onPick(event.target.value || null)}>
        <option value="">Choose a species</option>
        {species.map((option) => (
          <option key={option.id} value={option.id}>
            {taxonLabel(option)}
          </option>
        ))}
      </Select>
    </label>
  );

  return (
    <GlassCard staggered>
      <CardHeader title="Relatedness" caption="Pick two species to find their closest common ancestor." />
      <div className="flex flex-col gap-3 sm:flex-row">
        {picker(a, "Species A", (id) => onChange(id, b))}
        {picker(b, "Species B", (id) => onChange(a, id))}
      </div>
      <div className="mt-4">
        {!ready ? (
          <EmptyState
            icon={GitFork}
            title={a !== null && a === b ? "Pick two different species" : "No pair selected"}
            description="The path between both species lights up in the tree."
            className="py-6"
          />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} className="py-6" />
        ) : isLoading || !result ? (
          <SkeletonRows rows={3} />
        ) : (
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <dt className="text-[11px] uppercase tracking-wider text-white/50">Ancestor</dt>
                <dd className="mt-1 truncate text-sm font-semibold italic text-white">
                  {result.common_ancestor.name}
                </dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <dt className="text-[11px] uppercase tracking-wider text-white/50">Rank</dt>
                <dd
                  className="mt-1 text-sm font-semibold"
                  style={{ color: RANK_COLOR[result.common_ancestor.rank] }}
                >
                  {RANK_LABEL[result.common_ancestor.rank]}
                </dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <dt className="text-[11px] uppercase tracking-wider text-white/50">Distance</dt>
                <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-white">
                  {result.distance} edges
                </dd>
              </div>
            </dl>
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-white/70">
              {result.path.map((crumb, index) => (
                <li key={crumb.id} className="flex items-center gap-1.5">
                  {index > 0 ? <span className="text-white/30" aria-hidden>/</span> : null}
                  <span
                    className={
                      crumb.id === result.common_ancestor.id
                        ? "rounded-md bg-emerald-400/15 px-1.5 py-0.5 italic text-emerald-200"
                        : "italic"
                    }
                  >
                    {crumb.name}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
