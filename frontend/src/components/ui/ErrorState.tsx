import { RefreshCw, TriangleAlert } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "./Button";

interface ErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-3 px-6 py-10 text-center", className)}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-400/10">
        <TriangleAlert className="size-5 text-rose-300" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-white">Could not load this data</p>
        <p className="max-w-xs text-xs text-white/60">
          {error?.message ?? "The server returned an unexpected response."}
        </p>
      </div>
      {onRetry ? (
        <Button size="sm" onClick={onRetry} icon={<RefreshCw className="size-3.5" aria-hidden />}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
