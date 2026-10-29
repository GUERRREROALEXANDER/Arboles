/** Categorical series order: emerald-400, sky-400, amber-400, lime-300, violet-400, rose-400. */
export const CATEGORICAL = ["#34d399", "#38bdf8", "#fbbf24", "#bef264", "#a78bfa", "#fb7185"] as const;

export const ACCENT = {
  primary: "#34d399",
  growth: "#bef264",
  warning: "#fbbf24",
  critical: "#fb7185",
  info: "#38bdf8",
} as const;

export const CHART = {
  grid: "rgba(255,255,255,0.08)",
  tick: "rgba(255,255,255,0.5)",
  tickFont: "JetBrains Mono, ui-monospace, monospace",
} as const;
