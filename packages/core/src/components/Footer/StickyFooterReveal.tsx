import { motion } from 'framer-motion';
import { ReactNode } from 'react';

type StickyFooterRevealProps = {
  children: ReactNode;
};

export function StickyFooterReveal({ children }: StickyFooterRevealProps) {
  return (
    <div className='sticky bottom-0 z-0 bg-[#1a1a1a] text-white'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
