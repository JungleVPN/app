import { Card } from '@heroui/react';
import type { ReactNode } from 'react';

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card
      variant='secondary'
      className='flex flex-col items-center gap-3 p-6 text-center shadow-surface transition-all duration-300 hover:scale-[1.03] hover:shadow-md cursor-default'
    >
      <div className='text-primary'>{icon}</div>
      <Card.Header className='flex-col items-center gap-1 p-0'>
        <Card.Title className='text-base font-bold'>{title}</Card.Title>
        <Card.Description className='text-sm'>{description}</Card.Description>
      </Card.Header>
    </Card>
  );
}
