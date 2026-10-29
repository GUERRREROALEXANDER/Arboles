import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { CardHeader } from "./CardHeader";
import { GlassCard } from "./GlassCard";

interface ChartCardProps {
  title: string;
  /** One line telling the reader what to take from the chart. */
  caption: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function ChartCard({ title, caption, actions, className, children }: ChartCardProps) {
  return (
    <GlassCard staggered className={cn("flex flex-col", className)}>
      <CardHeader title={title} caption={caption} actions={actions} />
      <div className="min-h-0 flex-1">{children}</div>
    </GlassCard>
  );
}
