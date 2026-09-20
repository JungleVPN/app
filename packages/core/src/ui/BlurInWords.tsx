import { motion, useReducedMotion, Variants } from 'framer-motion';

type BlurInWordsProps = {
  text: string;
  className?: string;
  as?: 'h1' | 'p' | 'span';
  delay?: number;
  stagger?: number;
};

const WORD: Variants = {
  hidden: { opacity: 0, y: 8, filter: 'blur(10px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: 'easeOut' } },
};

/**
 * Reveals a sentence one word at a time, each word resolving from blurred to
 * sharp. Words keep their own `inline-block` box so the surrounding text still
 * wraps and balances normally.
 */
export function BlurInWords({
  text,
  className,
  as = 'span',
  delay = 0,
  stagger = 0.06,
}: BlurInWordsProps) {
  const prefersReducedMotion = useReducedMotion();
  const MotionTag = motion[as];

  if (prefersReducedMotion) {
    const Tag = as;
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial='hidden'
      animate='show'
      variants={{ show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {text.split(' ').map((word, index) => (
        <motion.span key={word} variants={WORD} className='inline-block whitespace-pre'>
          {word}
          {index < text.split(' ').length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </MotionTag>
  );
}
