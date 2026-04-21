import { useEffect } from "react";

import { AnimatePresence, motion } from "framer-motion";

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
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-3 px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className="glass-elevated pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[14px] border border-border px-4 py-3 shadow-glass"
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
            <div className="mt-1 h-10 w-10 rounded-full bg-accent/16 ring-1 ring-accent/20" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {toast.description}
                </p>
              ) : null}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
