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
      <>
        <motion.button
          aria-label="Close modal"
          className="ig-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: APP_EASE }}
          onClick={onClose}
          type="button"
        />
        <div className="ig-modal-wrap">
          <motion.div
            className={cn("ig-modal-card", className)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.2, ease: APP_EASE }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              {title ? <h3 className="text-lg font-semibold">{title}</h3> : <span />}
              <button
                aria-label="Close modal"
                className="ig-icon-button"
                onClick={onClose}
                type="button"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      </>
    ) : null}
  </AnimatePresence>
);
