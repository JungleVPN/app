import { motion, useReducedMotion, Variants } from 'framer-motion';

type BlurInWordsProps = {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
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

  const words = text.split(' ');

  return (
    <MotionTag
      className={className}
      initial='hidden'
      animate='show'
      variants={{ show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {words.map((word, index) => (
        // A sentence repeats words ("what … what"), so the position is the identity.
        // biome-ignore lint/suspicious/noArrayIndexKey: words are positional, never reordered
        <motion.span key={index} variants={WORD} className='inline-block whitespace-pre'>
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </MotionTag>
  );
}
