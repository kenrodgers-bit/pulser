import type { ReactNode } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { APP_EASE, sheetSpring } from "@/lib/motion";

type BottomSheetProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export const BottomSheet = ({
  open,
  title,
  children,
  onClose,
}: BottomSheetProps) => (
  <AnimatePresence>
    {open ? (
      <motion.div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[8px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.24, ease: APP_EASE }}
        onClick={onClose}
      >
        <motion.div
          className="glass-elevated absolute inset-x-0 bottom-0 rounded-t-[20px] border border-border p-5 shadow-modal"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={sheetSpring}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragEnd={(_event, info) => {
            if (info.offset.y > 120 || info.velocity.y > 650) {
              onClose();
            }
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-border" />
          <h3 className="font-heading text-lg font-semibold">{title}</h3>
          <div className="mt-4">{children}</div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
