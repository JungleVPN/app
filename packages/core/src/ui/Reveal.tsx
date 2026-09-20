import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Seconds the fade takes. */
  duration?: number;
  /** Fraction of the block that must be visible before it starts fading in. */
  amount?: number;
};

/**
 * Fades a block in the first time it scrolls into view. Deliberately opacity
 * only: the landing page stacks large sections, and adding movement on top of
 * the fade fights the sticky hero and the rounded section overlaps.
 */
export function Reveal({ children, className, duration = 0.7, amount = 0.25 }: RevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount }}
      transition={{ duration, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
