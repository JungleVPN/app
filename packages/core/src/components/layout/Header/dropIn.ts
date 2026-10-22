const DROP_IN_DELAY_SECONDS = 0.2;

export const dropIn = {
  initial: { y: '-100%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.2, ease: 'easeOut', delay: DROP_IN_DELAY_SECONDS },
} as const;
