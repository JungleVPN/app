import { Card } from '@heroui/react';
import type { PropsWithChildren, ReactNode } from 'react';

type BlockProps = PropsWithChildren<{
  title?: string;
  description?: ReactNode;
  className?: string;
  variant?: 'default' | 'secondary';
}>;

export function Block({
  children,
  title,
  description,
  className,
  variant = 'secondary',
}: BlockProps) {
  return (
    <div className='flex w-full flex-col gap-2 rounded-[1rem]'>
      {title && (
        <h2 className='px-4 text-xs font-semibold tracking-[0.06em] text-muted uppercase'>
          {title}
        </h2>
      )}

      <Card className={`w-full overflow-hidden p-0 ${className ?? ''}`} variant={variant}>
        <Card.Content className='flex flex-col gap-0 p-0'>{children}</Card.Content>
      </Card>

      {description && <p className='px-4 text-xs text-muted'>{description}</p>}
    </div>
  );
}
