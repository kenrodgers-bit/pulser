import { motion } from "framer-motion";
import { Eye, Infinity } from "lucide-react";

import type { ViewMode } from "@/types";
import { cn } from "@/utils/cn";

type ViewModeToggleProps = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
};

export const ViewModeToggle = ({
  value,
  onChange,
}: ViewModeToggleProps) => (
  <div className="relative grid grid-cols-2 rounded-[12px] border border-border bg-white/6 p-1">
    <motion.span
      className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-[10px] bg-accent shadow-glow"
      animate={{ x: value === "once" ? "0%" : "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
    />
    {[
      {
        id: "once" as const,
        label: "View Once",
        icon: Eye,
      },
      {
        id: "unlimited" as const,
        label: "Unlimited",
        icon: Infinity,
      },
    ].map((option) => (
      <button
        key={option.id}
        type="button"
        className={cn(
          "relative z-10 flex h-11 items-center justify-center gap-2 rounded-[10px] text-sm font-semibold transition",
          value === option.id
            ? "text-white"
            : "text-[var(--muted)] hover:bg-white/6 hover:text-[var(--ink)]",
        )}
        onClick={() => onChange(option.id)}
      >
        <option.icon className="h-4 w-4" />
        {option.label}
      </button>
    ))}
  </div>
);
