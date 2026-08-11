import { Surface } from '@heroui/react';
import type { PropsWithChildren } from 'react';

export interface ProfileContainerProps extends PropsWithChildren {
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
export function ProfileContainer({ children, className }: ProfileContainerProps) {
  return (
    <Surface
      variant='transparent'
      className={`flex flex-col items-center justify-center w-full px-4 sm:px-4 md:px-48 lg:px-72 xl:px-156 pt-4 pb-24 ${className || ''}`}
    >
      {children}
    </Surface>
  );
}
