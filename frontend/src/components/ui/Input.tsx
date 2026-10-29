import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export const fieldClass =
  "focus-ring h-10 w-full min-w-0 rounded-xl border bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/40 transition-colors hover:bg-white/[0.06]";

export function Input({ invalid = false, className, ref, ...rest }: InputProps) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(fieldClass, invalid ? "border-rose-400/60" : "border-white/10", className)}
      {...rest}
    />
  );
}
