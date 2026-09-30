import { cn } from '@heroui/react';
import type { HTMLAttributes } from 'react';

export type ParagraphProps = HTMLAttributes<HTMLParagraphElement>;

const PARAGRAPH_CLASS = 'text-sm leading-relaxed lg:text-sm';

export function Paragraph({ className, ...props }: ParagraphProps) {
  return <p className={cn(PARAGRAPH_CLASS, className)} {...props} />;
}
