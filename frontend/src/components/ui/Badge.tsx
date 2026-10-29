import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Tone = "neutral" | "emerald" | "amber" | "rose" | "sky" | "lime";

interface BadgeProps {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}

const TONES: Record<Tone, string> = {
  neutral: "text-white/70 bg-white/[0.06] border-white/10",
  emerald: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30",
  amber: "text-amber-300 bg-amber-400/10 border-amber-400/30",
  rose: "text-rose-300 bg-rose-400/10 border-rose-400/30",
  sky: "text-sky-300 bg-sky-400/10 border-sky-400/30",
  lime: "text-lime-300 bg-lime-300/10 border-lime-300/30",
};

export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
