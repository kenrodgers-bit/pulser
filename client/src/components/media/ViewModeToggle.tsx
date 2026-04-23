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
  <div
    className="ig-segmented"
    style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
  >
    <motion.span
      className="ig-segmented__indicator"
      animate={{ x: value === "once" ? "0%" : "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      style={{ width: "calc(50% - 4px)" }}
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
        className={cn("ig-segmented__option", value === option.id && "ig-segmented__option--active")}
        onClick={() => onChange(option.id)}
      >
        <option.icon className="h-4 w-4" />
        {option.label}
      </button>
    ))}
  </div>
);
