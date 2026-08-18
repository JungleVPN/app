import type { PropsWithChildren } from 'react';

export interface GridProps extends PropsWithChildren {
  className?: string;
}

/**
 * 12-column responsive grid, modeled after MUI's Grid v2 (container + per-item
 * breakpoint spans instead of the container declaring a fixed column count):
 * https://mui.com/material-ui/react-grid/
 *
 * Pair with `GridItem`, which sets each child's column span per breakpoint.
 */
export function Grid({ children, className }: GridProps) {
  return <div className={`grid grid-cols-12 gap-4 w-full py-1 ${className ?? ''}`}>{children}</div>;
}
