import type { Transition, Variants } from "framer-motion";

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const pageTransition: Transition = { duration: 0.35, ease: EASE_OUT };

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: pageTransition },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE_OUT } },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: pageTransition },
};

export const hoverLift = { y: -2 };
