import { Surface } from '@heroui/react';
import type { PropsWithChildren } from 'react';

export interface LandingContainerProps extends PropsWithChildren {
  className?: string;
}

/**
 * Global layout wrapper that centers all page content horizontally
 * with a consistent max-width and horizontal padding.
 *
 * Place this at the root layout level — pages should never need to add
 * their own container.
 *
 * Compatible with web and Telegram Mini App layouts.
 */
export function LandingContainer({ children, className }: LandingContainerProps) {
  return (
    <Surface
      variant='transparent'
      className={`w-full px-4 md:px-8 lg:px-24 xl:px-72 ${className || ''}`}
    >
      {children}
    </Surface>
  );
}
