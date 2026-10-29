import type { HealthStatus } from "../../api/types";
import { cn } from "../../lib/cn";
import { HEALTH } from "../../lib/health";

interface HealthBadgeProps {
  health: HealthStatus;
  className?: string;
}

export function HealthBadge({ health, className }: HealthBadgeProps) {
  const meta = HEALTH[health];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        meta.badge,
        className,
      )}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
      {meta.label}
    </span>
  );
}
