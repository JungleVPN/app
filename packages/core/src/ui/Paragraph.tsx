import type { HTMLAttributes } from 'react';

export type ParagraphProps = HTMLAttributes<HTMLParagraphElement>;

const PARAGRAPH_CLASS = 'text-sm leading-relaxed lg:text-base';

export function Paragraph({ className, ...props }: ParagraphProps) {
  return <p className={[PARAGRAPH_CLASS, className].filter(Boolean).join(' ')} {...props} />;
}
