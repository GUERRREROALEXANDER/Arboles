import { SearchX } from "lucide-react";
import type { SpecimenSummary } from "../../api/types";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatOne } from "../../lib/format";
import { HEALTH } from "../../lib/health";
import { cn } from "../../lib/cn";

interface DbhResultsTableProps {
  items: SpecimenSummary[];
  onSelect: (specimenId: string) => void;
}

export function DbhResultsTable({ items, onSelect }: DbhResultsTableProps) {
  if (items.length === 0) {
    return <EmptyState icon={SearchX} title="No specimens in this range" description="Widen the DBH range to match more trees." />;
  }
  return (
    <div className="max-h-[28rem] overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-forest-950/90 text-[11px] uppercase tracking-wider text-white/55 backdrop-blur">
          <tr>
            <th scope="col" className="px-2 py-2 font-semibold">Tag</th>
            <th scope="col" className="px-2 py-2 font-semibold">Species</th>
            <th scope="col" className="px-2 py-2 font-semibold">Site</th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">DBH (cm)</th>
            <th scope="col" className="px-2 py-2 font-semibold">Health</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.map((specimen) => (
            <tr
              key={specimen.id}
              tabIndex={0}
              onClick={() => onSelect(specimen.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSelect(specimen.id);
              }}
              className="focus-ring cursor-pointer hover:bg-white/[0.04]"
            >
              <td className="px-2 py-2 font-mono text-xs text-white">{specimen.tag}</td>
              <td className="truncate px-2 py-2 text-white/80">{specimen.common_name}</td>
              <td className="truncate px-2 py-2 text-white/60">{specimen.site_name}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums text-white">{formatOne(specimen.dbh_cm)}</td>
              <td className="px-2 py-2">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    HEALTH[specimen.health].badge,
                  )}
                >
                  {HEALTH[specimen.health].label}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
