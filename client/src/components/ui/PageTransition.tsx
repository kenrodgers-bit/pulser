import type { ReactNode } from "react";

import { motion } from "framer-motion";

import { pageTransitionProps } from "@/lib/motion";
import { cn } from "@/utils/cn";

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

export const PageTransition = ({
  children,
  className,
}: PageTransitionProps) => (
  <motion.section
    className={cn("pulse-page will-transform", className)}
    {...pageTransitionProps}
  >
    {children}
  </motion.section>
);
