import { Surface } from '@heroui/react';
import type { PropsWithChildren } from 'react';

export interface AppContainerProps extends PropsWithChildren {
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
export function AppContainer({ children, className }: AppContainerProps) {
  return (
    <Surface
      variant='transparent'
      className={`w-full max-w-xl mx-auto px-6 py-4 ${className || ''}`}
    >
      {children}
    </Surface>
  );
}
