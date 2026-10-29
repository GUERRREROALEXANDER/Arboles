import { useId, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LoaderCircle, Search } from "lucide-react";
import { useSpecimens } from "../../api/queries";
import type { SpecimenSummary } from "../../api/types";
import { cn } from "../../lib/cn";
import { useDebouncedValue } from "../../lib/hooks";
import { useUi } from "../../store/ui";
import { HealthBadge } from "../ui/HealthBadge";

const RESULT_LIMIT = 8;

/** Combobox over GET /specimens?q= (tag or name). Enter opens the highlighted specimen. */
export function SpecimenSearch() {
  const listId = useId();
  const openSpecimen = useUi((s) => s.openSpecimen);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const query = useDebouncedValue(text.trim(), 220);
  const enabled = query.length >= 2;
  const { data, isFetching, isError } = useSpecimens({ q: query, limit: RESULT_LIMIT }, enabled);
  const results: SpecimenSummary[] = enabled ? (data?.items ?? []) : [];
  const showPanel = open && enabled;

  const choose = (specimen: SpecimenSummary) => {
    openSpecimen(specimen.id);
    setOpen(false);
    setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      const target = results[active];
      if (target) choose(target);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50" aria-hidden />
      <input
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showPanel && results[active] ? `${listId}-${active}` : undefined}
        aria-label="Search specimens by tag or name"
        placeholder="Search tag or species, e.g. BOG-CH or Urapan"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="focus-ring h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] pl-9 pr-9 text-sm text-white placeholder:text-white/40"
      />
      {isFetching && enabled ? (
        <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-white/50" aria-hidden />
      ) : null}

      <AnimatePresence>
        {showPanel ? (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="glass-panel glass-overlay absolute inset-x-0 top-12 z-30 max-h-96 overflow-y-auto p-1.5"
          >
            {isError ? (
              <li className="px-3 py-3 text-xs text-rose-300">Search is unavailable right now.</li>
            ) : results.length === 0 && !isFetching ? (
              <li className="px-3 py-3 text-xs text-white/60">No specimens match "{query}".</li>
            ) : (
              results.map((specimen, index) => (
                <li
                  key={specimen.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(specimen)}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2",
                    index === active && "bg-white/[0.07]",
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-emerald-300">{specimen.tag}</p>
                    <p className="truncate text-sm text-white">
                      {specimen.common_name}
                      <span className="text-white/50"> · {specimen.site_name}</span>
                    </p>
                  </div>
                  <HealthBadge health={specimen.health} />
                </li>
              ))
            )}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
