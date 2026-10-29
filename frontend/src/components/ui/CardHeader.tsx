import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface CardHeaderProps {
  title: string;
  caption?: string;
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, caption, actions, className }: CardHeaderProps) {
  return (
    <header className={cn("mb-4 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {caption ? <p className="mt-0.5 text-xs text-white/60">{caption}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
