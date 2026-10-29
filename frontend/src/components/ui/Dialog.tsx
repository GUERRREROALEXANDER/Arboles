import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { EASE_OUT } from "../../lib/motion";
import { IconButton } from "./IconButton";
import { useOverlay } from "./useOverlay";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useOverlay(open, panelRef, onClose);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="glass-panel glass-overlay relative flex max-h-[90vh] w-full max-w-xl flex-col outline-none"
          >
            <header className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
              <div>
                <h2 id={titleId} className="text-lg font-bold text-white">
                  {title}
                </h2>
                {description ? <p className="mt-0.5 text-sm text-white/60">{description}</p> : null}
              </div>
              <IconButton label="Close dialog" onClick={onClose}>
                <X className="size-4" aria-hidden />
              </IconButton>
            </header>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
