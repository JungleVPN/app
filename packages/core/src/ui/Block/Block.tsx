import { Card } from '@heroui/react';
import type { PropsWithChildren, ReactNode } from 'react';

type BlockProps = PropsWithChildren<{
  title?: string;
  /** Optional node rendered to the right of the title, e.g. a "2 / 3" badge. */
  titleBadge?: ReactNode;
  description?: ReactNode;
  className?: string;
  variant?: 'default' | 'secondary';
}>;

export function Block({
  children,
  title,
  titleBadge,
  description,
  className,
  variant = 'secondary',
}: BlockProps) {
  return (
    <div className='flex w-full flex-col gap-2 rounded-[1rem]'>
      {title && (
        <div className='flex items-center justify-between px-4'>
          <h2 className='text-xs font-semibold tracking-[0.06em] text-muted uppercase'>
            {title}
          </h2>
          {titleBadge && (
            <span className='text-xs font-medium text-muted'>{titleBadge}</span>
          )}
        </div>
      )}

      <Card className={`w-full overflow-hidden p-0 ${className ?? ''}`} variant={variant}>
        <Card.Content className='flex flex-col gap-0 p-0'>{children}</Card.Content>
      </Card>

      {description && <p className='px-4 text-xs text-muted'>{description}</p>}
    </div>
  );
}
