import type { ReactNode } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { APP_EASE } from "@/lib/motion";
import { cn } from "@/utils/cn";

type ModalProps = {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
};

export const Modal = ({ open, title, children, onClose, className }: ModalProps) => (
  <AnimatePresence>
    {open ? (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[8px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: APP_EASE }}
        onClick={onClose}
      >
        <motion.div
          className={cn(
            "glass-elevated relative w-full max-w-xl rounded-[20px] border border-border p-5 text-[var(--ink)] shadow-modal",
            className,
          )}
          initial={{ opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.2, ease: APP_EASE }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-xl font-semibold">{title}</h3>
            <button
              className="rounded-full bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/10 hover:text-[var(--ink)]"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
