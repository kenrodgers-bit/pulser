import { useEffect } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { useUIStore } from "@/store/uiStore";

export const ToastViewport = () => {
  const toasts = useUIStore((state) => state.toasts);
  const dismissToast = useUIStore((state) => state.dismissToast);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), 4000),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissToast, toasts]);

  return (
    <div className="ig-toast-stack pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className="ig-toast pointer-events-auto"
            initial={{ opacity: 0, y: -80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            drag="y"
            dragConstraints={{ top: -120, bottom: 0 }}
            onDragEnd={(_event, info) => {
              if (info.offset.y < -40 || info.velocity.y < -250) {
                dismissToast(toast.id);
              }
            }}
          >
            <div className="ig-toast__avatar">
              {toast.title.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{toast.description}</p>
              ) : null}
            </div>
            <button
              aria-label="Dismiss notification"
              className="ig-icon-button h-8 w-8 rounded-full"
              onClick={() => dismissToast(toast.id)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
