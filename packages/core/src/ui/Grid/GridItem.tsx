import type { PropsWithChildren } from 'react';

type Span = 3 | 4 | 6 | 12;

export interface GridItemProps extends PropsWithChildren {
  /** Column span out of 12 at each breakpoint, MUI-style (defaults to full width). */
  size?: { base?: Span; sm?: Span; md?: Span; lg?: Span };
  className?: string;
}

const BASE_SPAN_CLASSES: Record<Span, string> = {
  3: 'col-span-3',
  4: 'col-span-4',
  6: 'col-span-6',
  12: 'col-span-12',
};

const SM_SPAN_CLASSES: Record<Span, string> = {
  3: 'sm:col-span-3',
  4: 'sm:col-span-4',
  6: 'sm:col-span-6',
  12: 'sm:col-span-12',
};

const MD_SPAN_CLASSES: Record<Span, string> = {
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  6: 'md:col-span-6',
  12: 'md:col-span-12',
};

const LG_SPAN_CLASSES: Record<Span, string> = {
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
  12: 'lg:col-span-12',
};

export function GridItem({ children, size = { base: 12 }, className }: GridItemProps) {
  const classes = [
    size.base && BASE_SPAN_CLASSES[size.base],
    size.sm && SM_SPAN_CLASSES[size.sm],
    size.md && MD_SPAN_CLASSES[size.md],
    size.lg && LG_SPAN_CLASSES[size.lg],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
}
