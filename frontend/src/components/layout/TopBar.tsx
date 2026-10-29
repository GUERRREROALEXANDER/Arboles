import { ResetDemoButton } from "./ResetDemoButton";
import { SpecimenSearch } from "./SpecimenSearch";

export function TopBar() {
  return (
    <header className="glass-panel sticky top-3 z-30 flex h-16 items-center justify-between gap-4 px-4">
      <SpecimenSearch />
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-xs text-emerald-200 md:flex">
          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
          Bogota D.C.
        </span>
        <ResetDemoButton />
      </div>
    </header>
  );
}
