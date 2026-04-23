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
  primary: "ig-button--primary",
  secondary: "ig-button--secondary",
  ghost: "ig-button--ghost",
  danger: "ig-button--danger",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "ig-button--sm",
  md: "ig-button--md",
  lg: "ig-button--lg",
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
      "ig-button will-transform",
      variantStyles[variant],
      sizeStyles[size],
      className,
    )}
    whileTap={{ scale: 0.95 }}
    onTapStart={() => {
      if (variant === "primary" && "vibrate" in navigator) {
        navigator.vibrate(8);
      }
    }}
    {...props}
  >
    {iconLeft}
    {children}
  </motion.button>
);
