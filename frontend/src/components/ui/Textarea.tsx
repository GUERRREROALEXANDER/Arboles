import type { Ref, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ invalid = false, className, ref, ...rest }: TextareaProps) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "focus-ring min-h-20 w-full resize-y rounded-xl border bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/40",
        invalid ? "border-rose-400/60" : "border-white/10",
        className,
      )}
      {...rest}
    />
  );
}
