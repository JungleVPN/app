import type { PropsWithChildren } from 'react';

export type RoundedSectionProps = PropsWithChildren<{
  className?: string;
  id?: string;
  variant?: 'primary' | 'secondary';
}>;

/**
 * The rounded, background-coloured band that marketing pages stack their
 * sections into — the landing page uses it twice, the referrals page once.
 * `className` is appended, so callers own only what differs (z-index, margins).
 */
export function RoundedSection({
  children,
  className,
  id,
  variant = 'primary',
}: RoundedSectionProps) {
  const classes = [
    `flex flex-col gap-48 relative ${variant === 'primary' ? 'bg-background' : 'bg-white'} rounded-t-[4rem] rounded-b-[4rem] py-12 md:py-8`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div id={id} className={classes}>
      {children}
    </div>
  );
}
