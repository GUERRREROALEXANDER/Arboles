import { cn } from "../../lib/cn";

export function priorityTone(priority: number): string {
  if (priority >= 80) return "text-rose-300 bg-rose-400/10 border-rose-400/30";
  if (priority >= 50) return "text-amber-300 bg-amber-400/10 border-amber-400/30";
  return "text-emerald-300 bg-emerald-400/10 border-emerald-400/30";
}

export function priorityColor(priority: number): string {
  if (priority >= 80) return "#fb7185";
  if (priority >= 50) return "#fbbf24";
  return "#34d399";
}

interface PriorityPillProps {
  priority: number;
  className?: string;
}

export function PriorityPill({ priority, className }: PriorityPillProps) {
  return (
    <span
      aria-label={`Priority ${priority}`}
      className={cn(
        "inline-flex h-6 min-w-9 shrink-0 items-center justify-center rounded-md border px-1.5 font-mono text-xs font-semibold tabular-nums",
        priorityTone(priority),
        className,
      )}
    >
      {priority}
    </span>
  );
}
