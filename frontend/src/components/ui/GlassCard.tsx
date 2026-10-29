import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/cn";
import { hoverLift, staggerItem } from "../../lib/motion";

interface GlassCardProps extends HTMLMotionProps<"section"> {
  /** Lift 2px on hover. Use for clickable or highlighted cards. */
  interactive?: boolean;
  /** Participate in a parent stagger animation. */
  staggered?: boolean;
  padded?: boolean;
}

export function GlassCard({
  interactive = false,
  staggered = false,
  padded = true,
  className,
  children,
  ...rest
}: GlassCardProps) {
  return (
    <motion.section
      variants={staggered ? staggerItem : undefined}
      whileHover={interactive ? hoverLift : undefined}
      className={cn("glass-panel min-w-0", padded && "p-5 lg:p-6", className)}
      {...rest}
    >
      {children}
    </motion.section>
  );
}
