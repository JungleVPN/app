import type { PropsWithChildren } from 'react';

export type ContainerMaxWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;

export interface ContainerProps extends PropsWithChildren {
  /**
   * Caps content width, mirroring MUI's Container breakpoint values (px):
   * https://mui.com/material-ui/api/container/
   * xs=444, sm=600, md=900, lg=1200, xl=1536. `false` disables the cap (fluid).
   */
  maxWidth?: ContainerMaxWidth;
  /** Removes the responsive horizontal padding (MUI's `disableGutters`). */
  disableGutters?: boolean;
  className?: string;
  id?: string;
}

const MAX_WIDTH_CLASSES: Record<Exclude<ContainerMaxWidth, false>, string> = {
  xs: 'max-w-[444px]',
  sm: 'max-w-[600px]',
  md: 'max-w-[900px]',
  lg: 'max-w-[1200px]',
  xl: 'max-w-[1536px]',
};

export function Container({
  children,
  maxWidth = 'lg',
  disableGutters = false,
  className,
  id,
}: ContainerProps) {
  const classes = [
    'mx-auto w-full',
    maxWidth && MAX_WIDTH_CLASSES[maxWidth],
    !disableGutters && 'px-4 sm:px-6 lg:px-8',
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
