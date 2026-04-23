import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

import { cn } from "@/utils/cn";

type AvatarProps = {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  ring?: boolean;
};

const sizes = {
  sm: 36,
  md: 46,
  lg: 52,
  xl: 72,
};

export const Avatar = ({
  src,
  alt,
  size = "md",
  online = false,
  ring = false,
}: AvatarProps) => {
  const { ref, inView } = useInView({
    fallbackInView: true,
    rootMargin: "160px",
    triggerOnce: true,
  });
  const initials = alt
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatarSize = sizes[size];

  return (
    <motion.div className="relative shrink-0" layout>
      <div
        ref={ref}
        className={cn(
          "grid place-items-center overflow-hidden rounded-full font-semibold",
          ring && "story-unseen",
        )}
        style={{
          width: avatarSize,
          height: avatarSize,
          padding: ring ? 2.5 : 0,
          background: ring ? "var(--grad-brand-3)" : "var(--bg-elevated)",
          border: ring ? "0" : "0.5px solid var(--border)",
          color: "var(--text-primary)",
        }}
      >
        <div
          className="grid h-full w-full place-items-center overflow-hidden rounded-full"
          style={{
            border: ring ? "2px solid var(--bg-base)" : "0",
            background: src ? "var(--bg-elevated)" : "var(--grad-brand-2)",
          }}
        >
          {src && inView ? (
            <img
              src={src}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
      </div>
      {online ? (
        <span
          className="online-dot absolute bottom-0 right-0 rounded-full border-2"
          style={{
            width: 12,
            height: 12,
            borderColor: "var(--bg-base)",
          }}
        />
      ) : null}
    </motion.div>
  );
};
