import type { HTMLAttributes } from 'react';

export type HeadingElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingElement;
}

const HEADING_SIZE_CLASSES: Record<HeadingElement, string> = {
  h1: 'text-2xl md:text-4xl',
  h2: 'text-2xl md:text-3xl',
  h3: 'text-lg lg:text-xl',
  h4: 'text-base lg:text-lg',
  h5: 'text-sm lg:text-base',
  h6: 'text-xs lg:text-sm',
};

export function Heading({ as: Component = 'h1', className, ...props }: HeadingProps) {
  return (
    <Component
      className={['font-bold tracking-tight', HEADING_SIZE_CLASSES[Component], className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
