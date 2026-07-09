import { Card } from '@heroui/react';
import type { ReactNode } from 'react';
import { cn } from '../../utils';

interface WalletStepProps {
  step?: number;
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}

export function Step({ step, title, icon, description, className, children }: WalletStepProps) {
  return (
    <Card className={cn('relative overflow-hidden p-4', className)} variant='secondary'>
      <Card.Content className='flex flex-col gap-3 p-0 justify-between'>
        {(icon || step) && (
          <span className='flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white'>
            {icon || step}
          </span>
        )}
        <div>
          <p className='font-bold'>{title}</p>
          {description && <p className='text-sm text-muted'>{description}</p>}
        </div>
        {children}
      </Card.Content>
    </Card>
  );
}
