import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { AnimatedNumber } from "./AnimatedNumber";
import { GlassCard } from "./GlassCard";

type Accent = "emerald" | "lime" | "amber" | "rose" | "sky";

interface StatTileProps {
  label: string;
  value: number;
  format: (value: number) => string;
  unit?: string;
  hint?: string;
  icon: LucideIcon;
  accent?: Accent;
}

const ACCENTS: Record<Accent, string> = {
  emerald: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
  lime: "text-lime-300 bg-lime-300/10 border-lime-300/20",
  amber: "text-amber-300 bg-amber-400/10 border-amber-400/20",
  rose: "text-rose-300 bg-rose-400/10 border-rose-400/20",
  sky: "text-sky-300 bg-sky-400/10 border-sky-400/20",
};

export function StatTile({ label, value, format, unit, hint, icon: Icon, accent = "emerald" }: StatTileProps) {
  return (
    <GlassCard staggered interactive className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/60">{label}</p>
        <span className={cn("flex size-8 items-center justify-center rounded-lg border", ACCENTS[accent])}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="flex items-baseline gap-1.5">
        <AnimatedNumber
          value={value}
          format={format}
          className="font-mono text-2xl font-semibold tabular-nums text-white xl:text-3xl"
        />
        {unit ? <span className="text-sm text-white/60">{unit}</span> : null}
      </p>
      {hint ? <p className="-mt-2 text-xs text-white/55">{hint}</p> : null}
    </GlassCard>
  );
}
