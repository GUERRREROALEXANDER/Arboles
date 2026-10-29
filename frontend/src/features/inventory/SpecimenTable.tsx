import { useState } from "react";
import { ArrowRightLeft, SearchX } from "lucide-react";
import type { SpecimenSummary } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { HealthBadge } from "../../components/ui/HealthBadge";
import { formatOne } from "../../lib/format";
import { useUi } from "../../store/ui";
import { RiskMeter } from "../specimen/RiskMeter";

interface SpecimenTableProps {
  specimens: SpecimenSummary[];
  onMove: (specimen: SpecimenSummary) => void;
}

const PAGE = 25;

export function SpecimenTable({ specimens, onMove }: SpecimenTableProps) {
  const openSpecimen = useUi((s) => s.openSpecimen);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(specimens.length / PAGE));
  const current = Math.min(page, pages - 1);
  const rows = specimens.slice(current * PAGE, current * PAGE + PAGE);

  if (specimens.length === 0) {
    return <EmptyState icon={SearchX} title="No specimens match" description="Change the filters or pick another location." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-white/55">
            <tr>
              <th className="px-2 py-2 font-semibold">Tag</th>
              <th className="px-2 py-2 font-semibold">Species</th>
              <th className="px-2 py-2 font-semibold">Site</th>
              <th className="px-2 py-2 font-semibold">Health</th>
              <th className="px-2 py-2 font-semibold">Risk</th>
              <th className="px-2 py-2 text-right font-semibold">DBH cm</th>
              <th className="px-2 py-2 text-right font-semibold">Height m</th>
              <th className="px-2 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.03]">
                <td className="px-2 py-2">
                  <button type="button" onClick={() => openSpecimen(s.id)} className="focus-ring rounded font-mono text-xs text-emerald-300 hover:underline">
                    {s.tag}
                  </button>
                </td>
                <td className="px-2 py-2 text-white">{s.common_name}</td>
                <td className="px-2 py-2 text-white/70">{s.site_name}</td>
                <td className="px-2 py-2"><HealthBadge health={s.health} /></td>
                <td className="px-2 py-2"><RiskMeter risk={s.risk} /></td>
                <td className="px-2 py-2 text-right font-mono tabular-nums">{formatOne(s.dbh_cm)}</td>
                <td className="px-2 py-2 text-right font-mono tabular-nums">{formatOne(s.height_m)}</td>
                <td className="px-2 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => onMove(s)} icon={<ArrowRightLeft className="size-3.5" aria-hidden />}>
                    Move
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>
          {current * PAGE + 1}-{Math.min(specimens.length, (current + 1) * PAGE)} of {specimens.length}
        </span>
        <div className="flex gap-2">
          <Button size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</Button>
          <Button size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
