import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { EASE_OUT } from "../../lib/motion";

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(reduce ? value : 0);
  const text = useTransform(motionValue, (latest) => format(latest));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: reduce ? 0 : 1.1,
      ease: EASE_OUT,
    });
    return () => controls.stop();
  }, [motionValue, value, reduce]);

  return <motion.span className={className}>{text}</motion.span>;
}
