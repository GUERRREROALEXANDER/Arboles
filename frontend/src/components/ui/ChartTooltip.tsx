import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

/** Props Recharts passes to a custom tooltip `content` renderer. */
export type TooltipRendererProps = TooltipContentProps<ValueType, NameType>;

export interface ChartTooltipRow {
  label: string;
  value: string;
  color?: string;
}

interface ChartTooltipProps {
  title?: string;
  rows: ChartTooltipRow[];
}

/** Small glass panel used as the content of every Recharts tooltip. */
export function ChartTooltip({ title, rows }: ChartTooltipProps) {
  return (
    <div className="glass-panel glass-overlay min-w-36 rounded-xl px-3 py-2 text-xs">
      {title ? <p className="mb-1 font-semibold text-white">{title}</p> : null}
      <ul className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 text-white/70">
            <span className="flex items-center gap-1.5">
              {row.color ? (
                <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} aria-hidden />
              ) : null}
              {row.label}
            </span>
            <span className="font-mono tabular-nums text-white">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
