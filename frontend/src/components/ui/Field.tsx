import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-white/70">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-white/50">{hint}</p>
      ) : null}
    </div>
  );
}
