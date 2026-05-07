import { Card } from '@heroui/react';
import type { PropsWithChildren } from 'react';

type BlockProps = PropsWithChildren<{
  className?: string;
}>;

export function Block({ children, className }: BlockProps) {
  return (
    <Card className={className ?? ''} variant='default'>
      <Card.Content className='flex flex-col gap-4'>{children}</Card.Content>
    </Card>
  );
}
