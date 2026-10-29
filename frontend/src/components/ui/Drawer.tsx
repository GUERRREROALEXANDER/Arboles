import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { EASE_OUT } from "../../lib/motion";
import { IconButton } from "./IconButton";
import { useOverlay } from "./useOverlay";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}

export function Drawer({ open, onClose, label, children }: DrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  useOverlay(open, panelRef, onClose);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-40">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 48 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="glass-panel glass-overlay absolute inset-y-3 right-3 flex w-[min(560px,calc(100vw-1.5rem))] flex-col outline-none"
          >
            <IconButton label="Close details" onClick={onClose} className="absolute right-4 top-4 z-10">
              <X className="size-4" aria-hidden />
            </IconButton>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
