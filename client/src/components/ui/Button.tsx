import type { ReactNode } from "react";

import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/utils/cn";

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
  iconLeft?: ReactNode;
};

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "border-accent/50 bg-accent text-white shadow-glass shadow-glow hover:bg-[color-mix(in_srgb,var(--pulse-accent)_92%,white_8%)]",
  secondary:
    "glass-elevated border-border bg-white/5 text-[var(--ink)] hover:bg-white/10",
  ghost: "border-transparent bg-transparent text-[var(--muted)] hover:bg-white/6 hover:text-[var(--ink)]",
  danger: "border-danger/30 bg-danger/15 text-danger hover:bg-danger/20",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 rounded-[12px] px-3 text-sm",
  md: "h-11 rounded-[12px] px-4 text-sm",
  lg: "h-12 rounded-[12px] px-5 text-sm font-semibold",
};

export const Button = ({
  className,
  variant = "primary",
  size = "md",
  iconLeft,
  children,
  ...props
}: ButtonProps) => (
  <motion.button
    className={cn(
      "inline-flex items-center justify-center gap-2 font-semibold transition duration-150 will-transform disabled:cursor-not-allowed disabled:opacity-60",
      variantStyles[variant],
      sizeStyles[size],
      className,
    )}
    whileTap={{ scale: 0.95 }}
    onTapStart={() => {
      if ("vibrate" in navigator) {
        navigator.vibrate(8);
      }
    }}
    {...props}
  >
    {iconLeft}
    {children}
  </motion.button>
);
