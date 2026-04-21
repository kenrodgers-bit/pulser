import type { Variants } from "framer-motion";

export const APP_EASE = [0.25, 0.46, 0.45, 0.94] as const;

export type RouteMotionKind = "tab" | "chat-forward" | "chat-back";

export const shellRouteVariants: Variants = {
  initial: (kind: RouteMotionKind) => {
    if (kind === "chat-forward") {
      return {
        opacity: 0,
        x: "100%",
        scale: 1,
      };
    }

    if (kind === "chat-back") {
      return {
        opacity: 0.88,
        x: "-30%",
        scale: 0.97,
      };
    }

    return {
      opacity: 0,
      x: 0,
      scale: 1,
    };
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.32,
      ease: APP_EASE,
    },
  },
  exit: (kind: RouteMotionKind) => {
    if (kind === "chat-forward") {
      return {
        opacity: 0.72,
        x: "-30%",
        scale: 0.97,
        transition: {
          duration: 0.32,
          ease: APP_EASE,
        },
      };
    }

    if (kind === "chat-back") {
      return {
        opacity: 0,
        x: "100%",
        scale: 1,
        transition: {
          duration: 0.28,
          ease: [0.42, 0, 1, 1],
        },
      };
    }

    return {
      opacity: 0,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.15,
        ease: APP_EASE,
      },
    };
  },
};

export const pageTransitionProps = {
  initial: {
    opacity: 0,
    x: 40,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: -20,
  },
  transition: {
    duration: 0.28,
    ease: APP_EASE,
  },
};

export const modalBackdropTransition = {
  duration: 0.2,
  ease: APP_EASE,
};

export const sheetSpring = {
  type: "spring",
  stiffness: 400,
  damping: 40,
} as const;
