import { motion } from "framer-motion";

import { cn } from "@/utils/cn";

type AvatarProps = {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  ring?: boolean;
};

const sizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

export const Avatar = ({
  src,
  alt,
  size = "md",
  online = false,
  ring = false,
}: AvatarProps) => {
  const initials = alt
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div className="relative shrink-0" layout>
      <div
        className={cn(
          "grid place-items-center overflow-hidden rounded-full border border-white/10 bg-white/6 font-semibold text-[var(--ink)]",
          sizes[size],
          ring && "pulse-story-ring",
        )}
        data-unseen={ring}
      >
        {src ? (
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {online ? (
        <span className="online-dot absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg)] bg-success" />
      ) : null}
    </motion.div>
  );
};
