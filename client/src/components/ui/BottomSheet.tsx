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
      <>
        <motion.button
          aria-label="Close sheet"
          className="ig-sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: APP_EASE }}
          onClick={onClose}
          type="button"
        />
        <motion.div
          className="ig-sheet-card"
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
          <div className="ig-sheet-handle" />
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="mt-4">{children}</div>
        </motion.div>
      </>
    ) : null}
  </AnimatePresence>
);
