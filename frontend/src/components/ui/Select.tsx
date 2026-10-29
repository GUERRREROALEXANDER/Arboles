import type { Ref, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { fieldClass } from "./Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({ invalid = false, className, children, ref, ...rest }: SelectProps) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          fieldClass,
          "appearance-none pr-9",
          invalid ? "border-rose-400/60" : "border-white/10",
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/50"
        aria-hidden
      />
    </div>
  );
}
