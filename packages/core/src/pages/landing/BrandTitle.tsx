import { motion, Variants } from 'framer-motion';
import e from '../../assets/brand/e.svg?react';
import g from '../../assets/brand/g.svg?react';
import J from '../../assets/brand/J.svg?react';
import l from '../../assets/brand/l.svg?react';
import N from '../../assets/brand/N-1.svg?react';
import n from '../../assets/brand/n.svg?react';
import P from '../../assets/brand/P.svg?react';
import u from '../../assets/brand/u.svg?react';
import V from '../../assets/brand/V.svg?react';

const letters = [
  { Component: J, large: true, scale: 1, offsetY: 0 },
  { Component: u, large: false, scale: 1, offsetY: 0 },
  { Component: n, large: false, scale: 1, offsetY: 0 },
  { Component: g, large: false, scale: 1, offsetY: 0 },
  { Component: l, large: false, scale: 1.15, offsetY: 0 },
  { Component: e, large: false, scale: 1.15, offsetY: 0, offsetX: -2 },
  { Component: V, large: true, scale: 1, offsetY: 0 },
  { Component: P, large: true, scale: 1.05, offsetY: 0 },
  { Component: N, large: true, scale: 1, offsetY: 0 },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const letter: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.8 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

export function BrandTitle() {
  return (
    <motion.div
      role='img'
      aria-label='JungleVPN'
      dir='ltr'
      className='flex items-end'
      variants={container}
      initial='hidden'
      animate='show'
    >
      {letters.map(({ Component, large, scale, offsetY }) => (
        <motion.span
          key={Component.toString()}
          variants={letter}
          className={
            large
              ? 'block h-14 w-auto sm:h-20 md:h-24 lg:h-30'
              : 'block h-10 w-auto sm:h-14 md:h-16 lg:h-22'
          }
        >
          <div
            className='h-full w-auto origin-bottom'
            style={{ transform: `translateY(${offsetY}px) scale(${scale})` }}
          >
            <Component
              className='h-full w-auto [&_path[fill]:not([fill="none"])]:fill-white'
              aria-hidden='true'
            />
          </div>
        </motion.span>
      ))}
    </motion.div>
  );
}
